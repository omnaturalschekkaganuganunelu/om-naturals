import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { orderEmitter } from '@/lib/sse';
import { revalidatePath } from 'next/cache';
import { sendOrderConfirmationEmail } from '@/lib/orderEmail';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/orders - Fetch user orders, or all orders for Admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Background Garbage Collection: Delete stale pending/failed PhonePe orders older than 1 hour
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      await prisma.order.deleteMany({
        where: {
          paymentMethod: 'PHONEPE',
          paymentStatus: { in: ['PENDING', 'FAILED'] },
          createdAt: { lt: oneHourAgo },
        },
      });
    } catch (gcErr) {
      console.error('Garbage collection error:', gcErr);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const includePending = searchParams.get('includePending') === 'true';
    let orders: any;

    if (session.user.role === 'ADMIN') {
      const where: any = {
        AND: [
          {
            OR: [
              { paymentMethod: { not: 'PHONEPE' } },
              { paymentStatus: 'COMPLETED' }
            ]
          }
        ]
      };
      if (status) {
        where.AND.push({ orderStatus: status });
      }
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        where.AND.push({
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          }
        });
      }
      orders = await prisma.order.findMany({
        where,
        include: {
          items: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      const where: any = {
        userId: session.user.id,
      };
      if (!includePending) {
        where.OR = [
          { paymentMethod: { not: 'PHONEPE' } },
          { paymentStatus: 'COMPLETED' }
        ];
      }
      orders = await prisma.order.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: includePending ? 1 : undefined,
      });
    }

    return NextResponse.json(orders);
  } catch (err: any) {
    console.error('Error fetching orders:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Generate a unique alphanumeric COD reference number (e.g. COD-A3B7K2MN)
function generateCODReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'COD-';
  for (let i = 0; i < 8; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

// POST /api/orders - Create a new order
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Please log in to place an order' }, { status: 401 });
    }

    // Clean up any old pending/failed PhonePe orders for this user to save space
    try {
      await prisma.order.deleteMany({
        where: {
          userId: session.user.id,
          paymentMethod: 'PHONEPE',
          paymentStatus: { in: ['PENDING', 'FAILED'] },
        },
      });
    } catch (cleanupErr) {
      console.error('Error cleaning up old user orders:', cleanupErr);
    }

    const body = await req.json();
    const { items, address, couponCode, paymentMethod, notes, email, language } = body;

    const lang = language || 'te';

    if (!items || items.length === 0 || !address) {
      return NextResponse.json({ error: lang === 'en' ? 'Missing items or address details' : 'ఐటెమ్‌లు లేదా చిరునామా వివరాలు లేవు' }, { status: 400 });
    }

    // SECURITY: COD is disabled site-wide. Only PhonePe online payments are accepted.
    if (paymentMethod === 'COD') {
      return NextResponse.json({
        error: lang === 'en'
          ? 'Cash on Delivery is not available. Please use PhonePe to complete your payment.'
          : 'క్యాష్ ఆన్ డెలివరీ అందుబాటులో లేదు. దయచేసి PhonePe ద్వారా చెల్లింపు పూర్తి చేయండి.',
      }, { status: 400 });
    }

    // PERFORMANCE: Run user lookup and settings fetch in parallel
    let userEmail = session.user.email;
    const [currentUser, settings, couponRecord] = await Promise.all([
      email && email.trim() !== ''
        ? prisma.user.findUnique({ where: { id: session.user.id } })
        : Promise.resolve(null),
      prisma.siteSettings.findUnique({ where: { id: 'singleton' } }),
      couponCode
        ? prisma.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } })
        : Promise.resolve(null),
    ]);

    // Update email if user has placeholder
    if (email && email.trim() !== '' && currentUser && currentUser.email.endsWith('@no-email.com')) {
      const emailInUse = await prisma.user.findFirst({ where: { email: email.trim() } });
      if (!emailInUse) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { email: email.trim() }
        });
        userEmail = email.trim();
      }
    }

    const shippingFee = settings?.shippingFee ?? 30;
    const packingFee = settings?.packingFee ?? 20;
    const freeShippingAbove = settings?.freeShippingAbove ?? 500;
    const gstRate = settings?.gstRate ?? 5;

    // PERFORMANCE: Fetch all required products in a single batch query instead of N serial queries
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Verify products, stock, and calculate subtotal
    let subtotal = 0;
    const itemsToCreate: {
      productId: string;
      name: string;
      nameTe: string;
      price: number;
      quantity: number;
      image: string;
    }[] = [];

    for (const cartItem of items) {
      const product = productMap.get(cartItem.productId);

      if (!product || !product.isActive) {
        const errorMsg = lang === 'en' 
          ? `Product not available: ${cartItem.name}` 
          : `ఉత్పత్తి లభ్యం కాలేదు: ${cartItem.name}`;
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      if (product.stock < cartItem.quantity) {
        const errorMsg = lang === 'en'
          ? `Sorry, insufficient stock for ${product.name}. Available stock: ${product.stock}`
          : `క్షమించండి, ${product.name} తగినంత స్టాక్ లేదు. అందుబాటులో ఉన్న స్టాక్: ${product.stock}`;
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      const itemTotal = product.price * cartItem.quantity;
      subtotal += itemTotal;

      const images = JSON.parse(product.images);
      itemsToCreate.push({
        productId: product.id,
        name: product.name,
        nameTe: product.nameTe,
        price: product.price,
        quantity: cartItem.quantity,
        image: images[0] || '',
      });
    }

    // Apply Coupon if applicable
    let discount = 0;
    let validCouponCode = null;

    if (couponRecord && couponRecord.isActive && subtotal >= couponRecord.minOrderValue) {
      if (!couponRecord.expiresAt || new Date(couponRecord.expiresAt) >= new Date()) {
        validCouponCode = couponRecord.code;
        if (couponRecord.type === 'PERCENT') {
          discount = (subtotal * couponRecord.value) / 100;
          if (couponRecord.maxDiscount && discount > couponRecord.maxDiscount) {
            discount = couponRecord.maxDiscount;
          }
        } else {
          discount = couponRecord.value;
        }
        
        if (discount > subtotal) {
          discount = subtotal;
        }
      }
    }

    // Calculate Tax, Shipping & Packing
    const taxableAmount = subtotal - discount;
    const tax = parseFloat(((taxableAmount * gstRate) / 100).toFixed(2));
    const shipping = taxableAmount >= freeShippingAbove ? 0 : shippingFee;
    const total = parseFloat((taxableAmount + tax + shipping + packingFee).toFixed(2));

    // Execute order creation in transaction with collision retry protection
    let retries = 3;
    let order: any = null;
    while (retries > 0) {
      try {
        order = await prisma.$transaction(async (tx) => {
          let customOrderId: string;
          if (paymentMethod === 'PHONEPE') {
            customOrderId = `UNPAID-${crypto.randomUUID()}`;
          } else {
            const orderCount = await tx.order.count({
              where: { orderId: { startsWith: 'Om-' } }
            });
            const nextNum = orderCount + 1;
            const serialStr = nextNum.toString().padStart(5, '0');

            const today = new Date();
            const y = today.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' });
            const m = today.toLocaleDateString('en-US', { month: '2-digit', timeZone: 'Asia/Kolkata' });
            const day = today.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Kolkata' });
            const dateStr = `${y}${m}${day}`;
            customOrderId = `Om-${dateStr}-${serialStr}`;
          }

          // 1. Create the order
          const newOrder = await tx.order.create({
            data: {
              orderId: customOrderId,
              userId: session.user.id,
              name: address.name,
              phone: address.phone,
              line1: address.line1,
              line2: address.line2,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              latitude: address.latitude ? parseFloat(address.latitude) : null,
              longitude: address.longitude ? parseFloat(address.longitude) : null,
              subtotal,
              shipping,
              tax,
              discount,
              total,
              couponCode: validCouponCode,
              paymentMethod,
              paymentStatus: 'PENDING',
              orderStatus: 'PENDING',
              transactionRef: paymentMethod === 'COD' ? generateCODReference() : null,
              notes: notes || `Packing: ₹${packingFee} + Shipping: ₹${shipping}`,
              items: {
                create: itemsToCreate,
              },
            },
            include: {
              items: true,
            },
          });

          // 2. For COD, deduct inventory immediately inside the transaction
          if (paymentMethod === 'COD') {
            for (const item of itemsToCreate) {
              const updatedProduct = await tx.product.update({
                where: { id: item.productId },
                data: {
                  stock: { decrement: item.quantity },
                  salesCount: { increment: item.quantity },
                },
              });

              if (updatedProduct.stock < 0) {
                throw new Error(lang === 'en'
                  ? `Sorry, insufficient stock for ${updatedProduct.name}`
                  : `క్షమించండి, ${updatedProduct.name} తగినంత స్టాక్ లేదు.`);
              }

              if (updatedProduct.stock < 5) {
                const admin = await tx.user.findFirst({ where: { role: 'ADMIN' } });
                if (admin) {
                  await tx.notification.create({
                    data: {
                      title: '⚠️ Low Stock Alert!',
                      body: `Product "${updatedProduct.name}" has critically low stock (${updatedProduct.stock} left).`,
                      type: 'INFO',
                      userId: admin.id,
                    }
                  });
                }
              }
            }
          }

          return newOrder;
        });
        break;
      } catch (err: any) {
        if (err.code === 'P2002' && (err.meta?.target?.includes('orderId') || err.message?.includes('orderId'))) {
          retries--;
          if (retries === 0) throw err;
          await new Promise((resolve) => setTimeout(resolve, 50));
        } else {
          throw err;
        }
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'Order creation failed' }, { status: 500 });
    }

    // Broadcast SSE alert for ADMIN
    orderEmitter.emit('new-order', {
      ...order,
      user: {
        name: session.user.name,
        email: session.user.email,
      },
    });

    // PERFORMANCE: Notifications and email are fire-and-forget for both COD and PhonePe.
    // This allows the API to return the order immediately so the client can redirect faster.
    if (paymentMethod === 'COD') {
      // Notifications (awaited to ensure delivery in serverless environment)
      try {
        await prisma.notification.create({
          data: {
            title: '🛒 Order Placed Successfully!',
            body: `Your order ${order.orderId} for ₹${order.total} has been placed. Pay on delivery. Expected delivery in 5 days.`,
            type: 'ORDER',
            userId: session.user.id,
            orderId: order.id,
          },
        });
      } catch (err: any) {
        console.error('Order-placed notification failed:', err);
      }

      // Admin notifications (awaited to ensure delivery in serverless environment)
      try {
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        await Promise.all(admins.map((admin) =>
          prisma.notification.create({
            data: {
              title: `🛒 New Order Placed!`,
              body: `Order ${order.orderId} for ₹${order.total} has been placed by ${session.user.name || 'Customer'}.`,
              type: 'ORDER',
              userId: admin.id,
              orderId: order.id,
            },
          })
        ));
      } catch (err: any) {
        console.error('Admin order-placed notification failed:', err);
      }

      // Invalidate cache
      revalidatePath('/', 'layout');

      // Confirmation email (awaited to ensure delivery in serverless environment)
      try {
        await sendOrderConfirmationEmail(order.id, userEmail as string, session.user.name as string);
      } catch (err: any) {
        console.error('COD confirmation email failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      order,
      triggerPayment: paymentMethod === 'PHONEPE',
    });
  } catch (err: any) {
    console.error('Error creating order:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
