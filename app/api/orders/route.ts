import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { orderEmitter } from '@/lib/sse';

// GET /api/orders - Fetch user orders, or all orders for Admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let orders;

    if (session.user.role === 'ADMIN') {
      const where: any = {};
      if (status) {
        where.orderStatus = status;
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
    const { items, address, couponCode, paymentMethod, notes } = body;

    if (!items || items.length === 0 || !address) {
      return NextResponse.json({ error: 'Missing items or address details' }, { status: 400 });
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
        return NextResponse.json({ error: `ఉత్పత్తి లభ్యం కాలేదు: ${cartItem.name}` }, { status: 400 });
      }

      if (product.stock < cartItem.quantity) {
        return NextResponse.json({
          error: `క్షమించండి, ${product.name} తగినంత స్టాక్ లేదు. అందుబాటులో ఉన్న స్టాక్: ${product.stock} (Insufficient stock for ${product.name})`
        }, { status: 400 });
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
    }

    // Apply Coupon if applicable
    let discount = 0;
    let validCouponCode = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
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

    // Custom Order ID
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const customOrderId = `NUNE-${dateStr}-${randomSuffix}`;

    // Execute order creation in transaction
    const order = await prisma.$transaction(async (tx) => {
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

      // 2. If COD, we can immediately deduct inventory stock
      if (paymentMethod === 'COD') {
        for (const item of itemsToCreate) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return newOrder;
    });

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
