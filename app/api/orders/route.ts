import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { orderEmitter } from '@/lib/sse';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';
import { sendOrderConfirmationEmail } from '@/lib/orderEmail';

export const dynamic = 'force-dynamic';

// GET /api/orders - Fetch user orders, or all orders for Admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    let orders;

    if (session.user.role === 'ADMIN') {
      const where: any = {};
      if (status) {
        where.orderStatus = status;
      }
      if (date) {
        // Find orders created on exactly this date (local timezone or UTC depending on DB, assume UTC for now)
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        where.createdAt = {
          gte: startOfDay,
          lte: endOfDay,
        };
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
      orders = await prisma.order.findMany({
        where: {
          userId: session.user.id,
        },
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(orders);
  } catch (err: any) {
    console.error('Error fetching orders:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/orders - Create a new order
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'உత్తర్వు సృష్టించడానికి దయచేసి లాగిన్ చేయండి. (Please log in to place an order)' }, { status: 401 });
    }

    const body = await req.json();
    const { items, address, couponCode, paymentMethod, notes, email, language } = body;

    const lang = language || 'te'; // Default to Telugu if not provided

    if (!items || items.length === 0 || !address) {
      return NextResponse.json({ error: lang === 'en' ? 'Missing items or address details' : 'ఐటెమ్‌లు లేదా చిరునామా వివరాలు లేవు' }, { status: 400 });
    }

    // If they supplied an email at checkout, update their profile email if they had a placeholder
    let userEmail = session.user.email;
    if (email && email.trim() !== '') {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id }
      });
      if (currentUser && currentUser.email.endsWith('@no-email.com')) {
        // Enforce email uniqueness
        const emailInUse = await prisma.user.findFirst({
          where: { email: email.trim() }
        });
        if (!emailInUse) {
          await prisma.user.update({
            where: { id: session.user.id },
            data: { email: email.trim() }
          });
          userEmail = email.trim();
        }
      }
    }

    // Fetch site settings
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
    });
    const shippingFee = settings?.shippingFee ?? 30;
    const packingFee = settings?.packingFee ?? 20;
    const freeShippingAbove = settings?.freeShippingAbove ?? 500;
    const gstRate = settings?.gstRate ?? 5;

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
      const product = await prisma.product.findUnique({
        where: { id: cartItem.productId },
      });

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

      itemsToCreate.push({
        productId: product.id,
        name: product.name,
        nameTe: product.nameTe,
        price: product.price,
        quantity: cartItem.quantity,
        image: JSON.parse(product.images)[0] || '',
      });

      // Note: stock deduction happens ONLY:
      //  - For COD orders: inside the transaction below (line 261)
      //  - For PhonePe orders: in the callback/webhook AFTER payment is confirmed
      // We do NOT deduct stock here to avoid phantom stock reduction on failed payments.
    }

    // Apply Coupon if applicable
    let discount = 0;
    let validCouponCode = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });

      if (coupon && coupon.isActive && subtotal >= coupon.minOrderValue) {
        // Verify expiration
        if (!coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()) {
          validCouponCode = coupon.code;
          if (coupon.type === 'PERCENT') {
            discount = (subtotal * coupon.value) / 100;
            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
              discount = coupon.maxDiscount;
            }
          } else {
            discount = coupon.value;
          }
          
          if (discount > subtotal) {
            discount = subtotal;
          }
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
          // Get the next sequential number across all orders
          const orderCount = await tx.order.count();
          const nextNum = orderCount + 1;
          const serialStr = nextNum.toString().padStart(5, '0');

          const today = new Date();
          const y = today.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' });
          const m = today.toLocaleDateString('en-US', { month: '2-digit', timeZone: 'Asia/Kolkata' });
          const day = today.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Kolkata' });
          const dateStr = `${y}${m}${day}`;
          const customOrderId = `Om-${dateStr}-${serialStr}`;

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
              notes: notes || `Packing: ₹${packingFee} + Shipping: ₹${shipping}`,
              items: {
                create: itemsToCreate,
              },
            },
            include: {
              items: true,
            },
          });

          // 2. If COD, we can immediately deduct inventory stock and increment salesCount
          if (paymentMethod === 'COD') {
            for (const item of itemsToCreate) {
              const updatedProduct = await tx.product.update({
                where: { id: item.productId },
                data: {
                  stock: { decrement: item.quantity },
                  salesCount: { increment: item.quantity },
                },
              });

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
        break; // Successfully created, break retry loop
      } catch (err: any) {
        if (err.code === 'P2002' && (err.meta?.target?.includes('orderId') || err.message?.includes('orderId'))) {
          retries--;
          if (retries === 0) throw err;
          // Wait a tiny bit (50ms) and retry with the updated order count
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

    // Auto-notify user that order was placed
    try {
      await prisma.notification.create({
        data: {
          title: '🛒 Order Placed Successfully!',
          body: `Your order ${order.orderId} for ₹${order.total} has been placed. ${paymentMethod === 'COD' ? 'Pay on delivery.' : 'Complete your payment to confirm.'} Expected delivery in 2-3 days.`,
          type: 'ORDER',
          userId: session.user.id,
          orderId: order.id,
        },
      });
    } catch (notifErr) {
      console.error('Order-placed notification failed:', notifErr);
    }

    // Notify ADMIN that a new order was placed
    try {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            title: `🛒 New Order Placed!`,
            body: `Order ${order.orderId} for ₹${order.total} has been placed by ${session.user.name || 'Customer'}.`,
            type: 'ORDER',
            userId: admin.id,
            orderId: order.id,
          },
        });
      }
    } catch (adminNotifErr) {
      console.error('Admin order-placed notification failed:', adminNotifErr);
    }

    // Instantly invalidate the cache globally so the frontend shows accurate live stock!
    if (paymentMethod === 'COD') {
      revalidatePath('/', 'layout');
    }

    // Send Order Confirmation Email immediately ONLY for COD
    // Prepaid orders will send this email upon successful payment in the webhook
    if (paymentMethod === 'COD') {
      await sendOrderConfirmationEmail(order.id, userEmail as string, session.user.name as string);
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
