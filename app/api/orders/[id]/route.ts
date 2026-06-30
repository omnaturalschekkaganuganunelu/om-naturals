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

    if (session.user.role !== 'ADMIN' && order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized to view this order' }, { status: 401 });
    }

    return NextResponse.json(order);
  } catch (err: any) {
    console.error('Error fetching order:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/orders/[id] - Update order/payment status
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { orderStatus, paymentStatus, notes, cancelReason } = body;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'ADMIN';

    // ── Authorization ─────────────────────────────────────────────────
    if (!isAdmin) {
      if (existingOrder.userId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized to update this order' }, { status: 401 });
      }

      // Customer can ONLY request cancellation
      if (orderStatus !== 'CANCEL_REQUESTED') {
        return NextResponse.json({ error: 'Customers can only request cancellation.' }, { status: 400 });
      }

      // Cannot request cancellation if already cancelled or out for delivery
      const notCancellableStatuses = ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'CANCEL_REQUESTED'];
      if (notCancellableStatuses.includes(existingOrder.orderStatus)) {
        return NextResponse.json({
          error: 'Cancellation is not allowed at this order stage.'
        }, { status: 400 });
      }
    }

    // ── Inventory Management ──────────────────────────────────────────
    // Only restore stock when admin ACTUALLY cancels (not on CANCEL_REQUESTED)
    const isActuallyCancelling = orderStatus === 'CANCELLED' && existingOrder.orderStatus !== 'CANCELLED';
    const isRestoringFromCancel = orderStatus !== 'CANCELLED' && existingOrder.orderStatus === 'CANCELLED';

    const order = await prisma.$transaction(async (tx) => {
      const updateData: any = {};

      if (isAdmin) {
        updateData.orderStatus = orderStatus;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        
        // Auto-mark PhonePe payments as REFUNDED if cancelling an already paid order
        if (
          orderStatus === 'CANCELLED' && 
          existingOrder.orderStatus !== 'CANCELLED' &&
          existingOrder.paymentMethod === 'PHONEPE' &&
          existingOrder.paymentStatus === 'COMPLETED'
        ) {
          updateData.paymentStatus = 'REFUNDED';
        }

        if (notes !== undefined) updateData.notes = notes;
        // Keep cancelReason intact for both approval and rejection to prevent double-cancels
      } else {
        // Customer requesting cancellation
        updateData.orderStatus = 'CANCEL_REQUESTED';
        updateData.cancelReason = cancelReason || null;
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: updateData,
        include: { items: true },
      });

      // Restore stock only on actual cancellation
      if (isActuallyCancelling) {
        for (const item of existingOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { 
              stock: { increment: item.quantity },
              salesCount: { decrement: item.quantity },
            },
          });
        }
      } else if (isRestoringFromCancel) {
        for (const item of existingOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { 
              stock: { decrement: item.quantity },
              salesCount: { increment: item.quantity },
            },
          });
        }
      }

      return updatedOrder;
    });

    // ── SSE Broadcast ─────────────────────────────────────────────────
    orderEmitter.emit('order-update', {
      orderId: order.id,
      status: order.orderStatus,
      updatedAt: new Date().toISOString(),
    });

    // ── Notifications ─────────────────────────────────────────────────
    const STATUS_NOTIF: Record<string, { title: string; body: string }> = {
      CONFIRMED:        { title: '✅ Order Confirmed!',        body: `Your order ${order.orderId} has been confirmed by our team. We're preparing it fresh for you!` },
      PROCESSING:       { title: '⚙️ Order Processing',       body: `Your order ${order.orderId} is currently being prepared. Fresh wood-pressed oils on the way!` },
      PACKED:           { title: '📦 Order Packed!',           body: `Your order ${order.orderId} is securely packed and ready to dispatch. Almost there!` },
      SHIPPED:          { title: '🚚 Order Shipped!',          body: `Your order ${order.orderId} has been shipped and is on its way to you via courier.` },
      OUT_FOR_DELIVERY: { title: '🛵 Out for Delivery!',       body: `Your order ${order.orderId} is out for delivery! Our delivery executive is heading your way.` },
      DELIVERED:        { title: '🎉 Order Delivered!',        body: `Your order ${order.orderId} has been delivered successfully. Enjoy your pure oils!` },
      CANCELLED:        { title: '❌ Order Cancelled',          body: `Your order ${order.orderId} has been cancelled. ${body.notes ? `Reason: ${body.notes}` : ''}` },
    };

    if (!isAdmin) {
      // Customer submitted a cancellation request — notify all admins
      try {
        const reason = (order as any).cancelReason || cancelReason || 'No reason provided';
        const customerName = existingOrder.name || session.user.name || 'Customer';
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });

        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                title: `🚨 Cancellation Requested`,
                body: `${customerName} has requested cancellation for Order ${order.orderId}. Reason: ${reason}. Please review and approve or reject.`,
                type: 'ORDER',
                userId: admin.id,
                orderId: order.id,
              },
            })
          )
        );

        // Confirm to customer that request was received
        await prisma.notification.create({
          data: {
            title: '⏳ Cancellation Request Received',
            body: `We've received your cancellation request for Order ${order.orderId}. Our team will review and process it within 24 hours.`,
            type: 'ORDER',
            userId: existingOrder.userId,
            orderId: order.id,
          },
        });
      } catch (err) {
        console.error('Failed to create cancellation request notifications:', err);
      }
    } else {
      // Admin changed status — notify customer if relevant
      const notifData = STATUS_NOTIF[order.orderStatus];
      // Suppress duplicate confirmation status notification when admin rejects a cancellation request
      const isRejection = existingOrder.orderStatus === 'CANCEL_REQUESTED' && order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'CANCEL_REQUESTED';
      
      // ONLY send order status notification if the orderStatus actually changed
      const orderStatusChanged = existingOrder.orderStatus !== order.orderStatus;
      
      if (notifData && !isRejection && orderStatusChanged) {
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
        } catch (err) {
          console.error('Failed to create status notification:', err);
        }
      }

      // Check if paymentStatus changed and send notification
      const paymentStatusChanged = existingOrder.paymentStatus !== order.paymentStatus;
      if (paymentStatusChanged) {
        let payTitle = '';
        let payBody = '';
        if (order.paymentStatus === 'COMPLETED') {
          payTitle = '💳 Payment Received!';
          payBody = `We have received your payment for Order ${order.orderId}. Thank you!`;
        } else if (order.paymentStatus === 'FAILED') {
          payTitle = '❌ Payment Failed';
          payBody = `The payment for Order ${order.orderId} failed or was declined. Please try again or choose COD.`;
        } else if (order.paymentStatus === 'REFUNDED') {
          payTitle = '💸 Payment Refunded';
          payBody = `Your payment for Order ${order.orderId} has been successfully refunded.`;
        }
        
        if (payTitle) {
          try {
            await prisma.notification.create({
              data: {
                title: payTitle,
                body: payBody,
                type: 'ORDER',
                userId: existingOrder.userId,
                orderId: order.id,
              },
            });
          } catch (err) {
            console.error('Failed to create payment notification:', err);
          }
        }
      }

      // If admin APPROVED the cancel request
      if (order.orderStatus === 'CANCELLED' && existingOrder.orderStatus === 'CANCEL_REQUESTED') {
        try {
          await prisma.notification.create({
            data: {
              title: '✅ Cancellation Approved',
              body: `Your cancellation request for Order ${order.orderId} has been approved. Your order has been cancelled.`,
              type: 'ORDER',
              userId: existingOrder.userId,
              orderId: order.id,
            },
          });
        } catch (err) {
          console.error('Failed to create approval notification:', err);
        }
      }

      // If admin REJECTED the cancel request (moved back to active status)
      if (existingOrder.orderStatus === 'CANCEL_REQUESTED' && order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'CANCEL_REQUESTED') {
        try {
          await prisma.notification.create({
            data: {
              title: '❌ Cancellation Request Rejected',
              body: `Your cancellation request for Order ${order.orderId} has been reviewed and rejected. Your order will continue as normal. Contact us if you have any questions.`,
              type: 'ORDER',
              userId: existingOrder.userId,
              orderId: order.id,
            },
          });
        } catch (err) {
          console.error('Failed to create rejection notification:', err);
        }
      }
    }

    return NextResponse.json(order);
  } catch (err: any) {
    console.error('Error updating order:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
