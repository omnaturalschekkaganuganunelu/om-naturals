import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPhonePeClient } from '@/lib/phonepe';
import { orderEmitter } from '@/lib/sse';
import { sendOrderConfirmationEmail } from '@/lib/orderEmail';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Auth security guard: only the customer who placed the order or an ADMIN can verify it
    if (session.user.role !== 'ADMIN' && order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized to view this order' }, { status: 401 });
    }

    // 1. If already completed, return successful status immediately
    if (order.paymentStatus === 'COMPLETED') {
      return NextResponse.json({ status: 'COMPLETED', orderStatus: order.orderStatus });
    }

    // 2. Fetch the latest payment attempt record
    const paymentRecord = await prisma.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    if (!paymentRecord) {
      return NextResponse.json({ status: 'PENDING', message: 'No payment record found yet' });
    }

    // 3. Actively query PhonePe API for the current transaction status
    try {
      const client = getPhonePeClient();
      const result = await client.getOrderStatus(paymentRecord.merchantTransactionId);
      const state = result?.state?.toUpperCase();

      if (state === 'COMPLETED') {
        const phonePeTransactionId = result.paymentDetails?.[0]?.transactionId || null;

        // Perform transactional update (idempotent row locks)
        await prisma.$transaction(async (tx) => {
          const lockedOrder = await tx.order.findUnique({
            where: { id: orderId },
            select: { id: true, paymentStatus: true, orderId: true, total: true, userId: true, items: true },
          });

          if (lockedOrder && lockedOrder.paymentStatus !== 'COMPLETED') {
            // Confirm the order
            await tx.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: 'COMPLETED',
                orderStatus: 'CONFIRMED',
                transactionRef: phonePeTransactionId,
              },
            });

            // Mark payment as completed
            await tx.payment.update({
              where: { merchantTransactionId: paymentRecord.merchantTransactionId },
              data: {
                status: 'COMPLETED',
                providerResponse: JSON.stringify(result),
              },
            });

            // Create notification for customer
            await tx.notification.create({
              data: {
                title: '💳 Payment Successful!',
                body: `Your payment for Order ${lockedOrder.orderId} was successful and your order is confirmed.`,
                type: 'ORDER',
                userId: lockedOrder.userId,
                orderId: lockedOrder.id,
              },
            });

            // Create notifications for admins
            const admins = await tx.user.findMany({ where: { role: 'ADMIN' } });
            for (const admin of admins) {
              await tx.notification.create({
                data: {
                  title: '💰 Order Paid!',
                  body: `Payment for Order ${lockedOrder.orderId} (₹${lockedOrder.total}) was successful.`,
                  type: 'ORDER',
                  userId: admin.id,
                  orderId: lockedOrder.id,
                },
              });
            }

            // Deduct stock safely
            for (const item of order.items) {
              const updatedProduct = await tx.product.update({
                where: { id: item.productId },
                data: {
                  stock: { decrement: item.quantity },
                  salesCount: { increment: item.quantity },
                },
              });

              if (updatedProduct.stock < 0) {
                console.error(`Insufficient stock for product ${updatedProduct.name} after order ${lockedOrder.orderId}`);
              }

              if (updatedProduct.stock < 5 && admins.length > 0) {
                await tx.notification.create({
                  data: {
                    title: '⚠️ Low Stock Alert!',
                    body: `Product "${updatedProduct.name}" has critically low stock (${updatedProduct.stock} left).`,
                    type: 'INFO',
                    userId: admins[0].id,
                  },
                });
              }
            }
          }
        });

        // Fire order updates to SSE clients
        orderEmitter.emit('order-update', {
          orderId: order.id,
          status: 'CONFIRMED',
          updatedAt: new Date().toISOString(),
        });

        // Send email (awaited to ensure delivery in serverless environment)
        const user = await prisma.user.findUnique({ where: { id: order.userId } });
        if (user?.email) {
          await sendOrderConfirmationEmail(orderId, user.email, user.name || 'Customer').catch(console.error);
        }

        return NextResponse.json({ status: 'COMPLETED', orderStatus: 'CONFIRMED' });

      } else if (state === 'FAILED' || state === 'CANCELLED' || state === 'PAYMENT_CANCELLED') {
        // Mark order as FAILED
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'FAILED' },
        });

        await prisma.payment.update({
          where: { merchantTransactionId: paymentRecord.merchantTransactionId },
          data: { status: 'FAILED', providerResponse: JSON.stringify(result) },
        });

        await prisma.notification.create({
          data: {
            title: '❌ Payment Failed',
            body: `The payment for Order ${order.orderId} was not completed or declined. Please try again.`,
            type: 'ORDER',
            userId: order.userId,
            orderId: order.id,
          },
        });

        return NextResponse.json({ status: 'FAILED' });
      } else {
        return NextResponse.json({ status: 'PENDING' });
      }
    } catch (sdkErr) {
      console.error('Verify Route PhonePe Status SDK check error:', sdkErr);
      return NextResponse.json({ status: 'PENDING', error: 'PhonePe communication error' });
    }
  } catch (error: any) {
    console.error('Verify Route Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
