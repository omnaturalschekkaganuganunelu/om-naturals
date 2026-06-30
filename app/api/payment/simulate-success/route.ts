import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { orderEmitter } from '@/lib/sse';
import { revalidatePath } from 'next/cache';
import { sendOrderConfirmationEmail } from '@/lib/orderEmail';

export async function POST(req: NextRequest) {
  // Hard security gate: Block simulation endpoints completely in production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (status === 'success') {
      await prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({ where: { id: orderId } });
        if (currentOrder && currentOrder.paymentStatus !== 'COMPLETED') {
          // Update order status
          await tx.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'COMPLETED',
              orderStatus: 'CONFIRMED',
            },
          });

          // Create payment record
          const merchantTransactionId = `SIM-TXN-${order.orderId}-${Date.now()}`;
          await tx.payment.create({
            data: {
              orderId,
              merchantTransactionId,
              amount: order.total,
              status: 'COMPLETED',
              providerResponse: JSON.stringify({ simulated: true, code: 'PAYMENT_SUCCESS' }),
            },
          });

          // Notify customer
          await tx.notification.create({
            data: {
              title: '💳 Payment Successful!',
              body: `Your payment for Order ${order.orderId} was successful and your order is confirmed.`,
              type: 'ORDER',
              userId: order.userId,
              orderId: order.id,
            },
          });

          // Notify admins
          const admins = await tx.user.findMany({ where: { role: 'ADMIN' } });
          for (const admin of admins) {
            await tx.notification.create({
              data: {
                title: '💰 Order Paid!',
                body: `Payment for Order ${order.orderId} (₹${order.total}) was successful.`,
                type: 'ORDER',
                userId: admin.id,
                orderId: order.id,
              },
            });
          }

          // Deduct stock
          for (const item of order.items) {
            const updatedProduct = await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity,
                },
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
      });

      // Broadcast SSE notification
      orderEmitter.emit('order-update', {
        orderId: order.id,
        status: 'CONFIRMED',
        updatedAt: new Date().toISOString(),
      });

      // Direct SSE event for new orders if Admin dashboard needs to refresh
      orderEmitter.emit('new-order', {
        ...order,
        paymentStatus: 'COMPLETED',
        orderStatus: 'CONFIRMED',
        user: {
          name: 'Demo Customer',
          email: 'customer@demo.com',
        },
      });

      // Instantly invalidate the cache globally so the frontend shows accurate live stock!
      revalidatePath('/', 'layout');

      // Send Order Confirmation Email (mirrors what real webhook does)
      try {
        const orderUser = await prisma.user.findUnique({ where: { id: order.userId } });
        if (orderUser && orderUser.email && orderUser.name) {
          await sendOrderConfirmationEmail(order.id, orderUser.email, orderUser.name);
        }
      } catch (emailErr) {
        console.error('Simulate: Failed to send confirmation email:', emailErr);
      }

      return NextResponse.json({ success: true });
    } else {
      // Mark payment as FAILED
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      });

      return NextResponse.json({ success: true, message: 'Payment simulated as failed' });
    }
  } catch (err: any) {
    console.error('Error simulating payment success:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
