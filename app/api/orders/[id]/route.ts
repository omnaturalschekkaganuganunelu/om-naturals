import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { orderEmitter } from '@/lib/sse';

// GET /api/orders/[id] - Fetch single order details
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { orderId: id }
        ]
      },
      include: {
        items: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if the current user owns this order or is Admin
    if (session.user.role !== 'ADMIN' && order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized to view this order' }, { status: 401 });
    }

    return NextResponse.json(order);
  } catch (err: any) {
    console.error('Error fetching order:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/orders/[id] - Update order/payment status (Admin or Customer cancel)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { orderStatus, paymentStatus, notes } = body;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'ADMIN';

    // Authorization & Validation
    if (!isAdmin) {
      // Customer is attempting to update the order
      if (existingOrder.userId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized to update this order' }, { status: 401 });
      }

      // Customer can ONLY transition status to CANCELLED
      if (orderStatus !== 'CANCELLED') {
        return NextResponse.json({ error: 'Unauthorized action. Customers can only cancel their orders.' }, { status: 400 });
      }

      // Customer can only cancel if status is PENDING, CONFIRMED, PROCESSING, or PACKED
      const cancelableStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'];
      if (!cancelableStatuses.includes(existingOrder.orderStatus)) {
        return NextResponse.json({ error: 'Cancellation is only allowed before the order is Out for Delivery.' }, { status: 400 });
      }
    }

    // Process inventory release if order is cancelled and it was COD (since COD stock was deducted immediately)
    // For online payments, if payment fails/cancels we release stock or if admin cancels confirmed order we release stock.
    const isCancelling = orderStatus === 'CANCELLED' && existingOrder.orderStatus !== 'CANCELLED';
    const isRestoring = orderStatus !== 'CANCELLED' && existingOrder.orderStatus === 'CANCELLED';

    const order = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          orderStatus,
          paymentStatus: isAdmin ? paymentStatus : existingOrder.paymentStatus,
          notes,
        },
        include: {
          items: true,
        },
      });

      // Adjust inventory if cancelled
      if (isCancelling) {
        for (const item of existingOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      } else if (isRestoring) {
        // Dedect inventory back
        for (const item of existingOrder.items) {
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

      return updatedOrder;
    });

    // Broadcast update event via SSE for live customer tracking
    orderEmitter.emit('order-update', {
      orderId: order.id,
      status: order.orderStatus,
      updatedAt: new Date().toISOString(),
    });

    // Auto-create a notification for the order's user
    const STATUS_NOTIF: Record<string, { title: string; body: string }> = {
      CONFIRMED:        { title: '✅ Order Confirmed!',        body: `Your order ${order.orderId} has been confirmed by our team. We're preparing it fresh for you!` },
      PROCESSING:       { title: '⚙️ Order Processing',       body: `Your order ${order.orderId} is currently being prepared. Fresh wood-pressed oils on the way!` },
      PACKED:           { title: '📦 Order Packed!',           body: `Your order ${order.orderId} is securely packed and ready to dispatch. Almost there!` },
      OUT_FOR_DELIVERY: { title: '🛵 Out for Delivery!',       body: `Your order ${order.orderId} is out for delivery! Our delivery executive is heading your way.` },
      DELIVERED:        { title: '🎉 Order Delivered!',        body: `Your order ${order.orderId} has been delivered successfully. Enjoy your pure oils! Thank you for choosing OM Natural.` },
      CANCELLED:        { title: '❌ Order Cancelled',          body: `Your order ${order.orderId} has been cancelled. ${body.notes ? `Reason: ${body.notes}` : ''}` },
    };

    const notifData = STATUS_NOTIF[order.orderStatus];
    if (notifData) {
      try {
        await prisma.notification.create({
          data: {
            title: notifData.title,
            body: notifData.body,
            type: 'ORDER',
            userId: existingOrder.userId,
            orderId: order.id,
          },
        });
      } catch (notifErr) {
        console.error('Failed to create notification:', notifErr);
      }
    }

    return NextResponse.json(order);
  } catch (err: any) {
    console.error('Error updating order:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
