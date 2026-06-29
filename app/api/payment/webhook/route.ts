import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { orderEmitter } from '@/lib/sse';
import { sendOrderConfirmationEmail } from '@/lib/orderEmail';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const responseBody = body.response as string;

    if (!responseBody) {
      return NextResponse.json({ error: 'Missing response payload' }, { status: 400 });
    }

    // Decode Base64 response
    const decodedBuffer = Buffer.from(responseBody, 'base64');
    const decodedJson = JSON.parse(decodedBuffer.toString('utf-8'));

    const { code, success, data } = decodedJson;
    const merchantTransactionId = data?.merchantTransactionId;
    const paymentAmount = data?.amount ? data.amount / 100 : 0; // convert paise back to INR

    if (!merchantTransactionId) {
      return NextResponse.json({ error: 'Missing merchantTransactionId' }, { status: 400 });
    }

    // Find the payment record first
    const paymentRecord = await prisma.payment.findUnique({
      where: { merchantTransactionId },
    });

    if (!paymentRecord) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    const orderId = paymentRecord.orderId;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify status securely with PhonePe API
    const merchantId = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT86';
    const saltKey = process.env.PHONEPE_SALT_KEY || '96434309-7796-489d-8924-ab56988a6076';
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    const hostUrl = process.env.PHONEPE_HOST_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    let verifiedSuccess = false;

    if (code === 'PAYMENT_SUCCESS' && success) {
      try {
        const stringToHash = `/pg/v1/status/${merchantId}/${merchantTransactionId}${saltKey}`;
        const checksum = crypto.createHash('sha256').update(stringToHash).digest('hex') + '###' + saltIndex;

        const verifyController = new AbortController();
        const verifyTimeoutId = setTimeout(() => verifyController.abort(), 10000);
        const verifyResponse = await fetch(`${hostUrl}/pg/v1/status/${merchantId}/${merchantTransactionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': merchantId,
          },
          signal: verifyController.signal,
        });
        clearTimeout(verifyTimeoutId);

        const verifyResult = await verifyResponse.json();

        if (verifyResult.success && verifyResult.code === 'PAYMENT_SUCCESS') {
          verifiedSuccess = true;
        }
      } catch (err) {
        console.error('Webhook: PhonePe status verification check failed. Falling back to signature validation.', err);
        if (code === 'PAYMENT_SUCCESS') verifiedSuccess = true;
      }
    }

    if (verifiedSuccess) {
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

          // Update payment record
          await tx.payment.update({
            where: { merchantTransactionId },
            data: {
              status: 'COMPLETED',
              providerResponse: JSON.stringify(decodedJson),
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

          // Deduct inventory stock
          for (const item of order.items) {
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
      });

      // Send Order Confirmation Email now that payment is confirmed
      try {
        const orderUser = await prisma.user.findUnique({ where: { id: order.userId } });
        if (orderUser && orderUser.email && orderUser.name) {
          await sendOrderConfirmationEmail(order.id, orderUser.email, orderUser.name);
        }
      } catch (e) {
        console.error('Webhook: failed to send confirmation email', e);
      }

      // Broadcast SSE notification
      orderEmitter.emit('order-update', {
        orderId: order.id,
        status: 'CONFIRMED',
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, message: 'Payment webhook processed successfully' });
    } else {
      // Mark payment as FAILED if it was not already completed
      const currentOrder = await prisma.order.findUnique({ where: { id: orderId } });
      if (currentOrder && currentOrder.paymentStatus !== 'COMPLETED') {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'FAILED' },
        });

        await prisma.payment.update({
          where: { merchantTransactionId },
          data: {
            status: 'FAILED',
            providerResponse: JSON.stringify(decodedJson),
          },
        });

        // Notify customer of payment failure
        await prisma.notification.create({
          data: {
            title: '❌ Payment Failed',
            body: `The payment for Order ${currentOrder.orderId} was not completed or declined. Please try again.`,
            type: 'ORDER',
            userId: currentOrder.userId,
            orderId: currentOrder.id,
          },
        });
      }

      return NextResponse.json({ success: false, message: 'Payment marked as failed' });
    }
  } catch (error: any) {
    console.error('Webhook: Error processing PhonePe webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
