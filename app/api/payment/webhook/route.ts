import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPhonePeClient } from '@/lib/phonepe';
import { orderEmitter } from '@/lib/sse';
import { sendOrderConfirmationEmail } from '@/lib/orderEmail';
import { confirmPaidOrder, deleteFailedOrder } from '@/lib/paymentConfirm';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const responseBody = body?.response as string;

    if (!responseBody) {
      return NextResponse.json({ error: 'Missing response payload' }, { status: 400 });
    }

    // Decode Base64 response
    const decodedBuffer = Buffer.from(responseBody, 'base64');
    const decodedJson = JSON.parse(decodedBuffer.toString('utf-8'));

    const { code, success, data } = decodedJson;
    const merchantTransactionId = data?.merchantTransactionId;
    let phonePeTransactionId = data?.transactionId || null; // PhonePe's own transaction ID
    const paymentAmount = data?.amount ? data.amount / 100 : 0; // convert paise back to INR

    if (!merchantTransactionId) {
      return NextResponse.json({ error: 'Missing merchantTransactionId' }, { status: 400 });
    }

    // Find the payment record first
    let paymentRecord = await prisma.payment.findUnique({
      where: { merchantTransactionId },
    });

    let orderId: string;

    if (!paymentRecord) {
      // Payment record may not exist yet due to a race condition between the fire-and-forget
      // Payment.create in /api/payment/initiate and the webhook arriving almost simultaneously.
      // Attempt to recover by finding the order through the Payment table by orderId extracted
      // from the merchantTransactionId format: TXN-{orderId}-{timestamp}
      // merchantTransactionId format: TXN-Om-YYYYMMDD-NNNNN-{timestamp}
      // The orderId is the Order.orderId (custom), not the UUID. We need to look up by orderId field.
      // Find the most recent PENDING PhonePe order that doesn't have a completed payment record yet.
      const pendingOrder = await prisma.order.findFirst({
        where: {
          paymentMethod: 'PHONEPE',
          paymentStatus: { in: ['PENDING', 'FAILED'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!pendingOrder) {
        console.error(`Webhook: No payment record found for ${merchantTransactionId} and no pending order found.`);
        return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
      }

      // Upsert the missing payment record so future lookups work
      paymentRecord = await prisma.payment.upsert({
        where: { merchantTransactionId },
        update: {},
        create: {
          orderId: pendingOrder.id,
          merchantTransactionId,
          amount: paymentAmount,
          status: 'PENDING',
        },
      });

      console.warn(`Webhook: Recovered missing payment record for order ${pendingOrder.orderId} (${merchantTransactionId})`);
      orderId = pendingOrder.id;
    } else {
      orderId = paymentRecord.orderId;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify status securely with PhonePe API (Double check status) using SDK v2
    const client = getPhonePeClient();
    const callbackUsername = process.env.PHONEPE_CALLBACK_USERNAME;
    const callbackPassword = process.env.PHONEPE_CALLBACK_PASSWORD;
    const authorization = req.headers.get('Authorization') || req.headers.get('authorization') || '';

    let verifiedSuccess = false;
    let verificationError = false;

    // 1. Try to validate with the SDK validateCallback first if credentials are set
    if (callbackUsername && callbackPassword && authorization) {
      try {
        const callbackResult = client.validateCallback(
          callbackUsername,
          callbackPassword,
          authorization,
          rawBody
        );
        if (callbackResult && callbackResult.payload?.state === 'COMPLETED') {
          verifiedSuccess = true;
          phonePeTransactionId = callbackResult.payload.orderId || phonePeTransactionId;
        }
      } catch (err) {
        console.error('Webhook signature validation failed, trying direct status API check:', err);
      }
    }

    // 2. If signature validation failed or credentials/headers were not present,
    // verify securely by calling client.getOrderStatus(merchantTransactionId) directly (Server-to-Server Status API).
    if (!verifiedSuccess && code === 'PAYMENT_SUCCESS' && success) {
      try {
        const verifyResult = await client.getOrderStatus(merchantTransactionId);
        if (verifyResult && verifyResult.state === 'COMPLETED') {
          verifiedSuccess = true;
          if (verifyResult.paymentDetails && verifyResult.paymentDetails.length > 0) {
            phonePeTransactionId = verifyResult.paymentDetails[0].transactionId || phonePeTransactionId;
          }
        }
      } catch (err) {
        console.error('Webhook: PhonePe status API check failed. Falling back to body success code.', err);
        // Secure Guard: Only allow fallback in development/test mock setups, NEVER in production!
        if (process.env.NODE_ENV !== 'production' && code === 'PAYMENT_SUCCESS') {
          verifiedSuccess = true;
        } else {
          verificationError = true;
        }
      }
    }

    if (verifiedSuccess) {
      await confirmPaidOrder(orderId, phonePeTransactionId || merchantTransactionId, decodedJson);
      return NextResponse.json({ success: true, message: 'Payment webhook processed successfully' });
    } else {
      if (verificationError) {
        console.error('Webhook: Failing with 500 status due to API validation error to trigger PhonePe retry.');
        return NextResponse.json({ error: 'Temporary status verification error. Please retry.' }, { status: 500 });
      }

      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      });
      await prisma.payment.upsert({
        where: { merchantTransactionId },
        update: {
          status: 'FAILED',
          providerResponse: JSON.stringify(decodedJson),
        },
        create: {
          orderId,
          merchantTransactionId,
          amount: paymentAmount,
          status: 'FAILED',
          providerResponse: JSON.stringify(decodedJson),
        },
      });
      // Notify customer of payment failure
      if (order) {
        await prisma.notification.create({
          data: {
            title: '❌ Payment Failed',
            body: `The payment for your online order of ₹${order.total} was not completed. Please retry payment.`,
            type: 'ORDER',
            userId: order.userId,
            orderId: order.id,
          },
        }).catch((err) => console.error('Failed to create failure notification:', err));
      }
      return NextResponse.json({ success: false, message: 'Payment marked as failed' });
    }
  } catch (error: any) {
    console.error('Webhook: Error processing PhonePe webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
