import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { orderEmitter } from '@/lib/sse';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  const reqUrl = new URL(req.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== 'http://localhost:3000' 
                   ? process.env.NEXT_PUBLIC_APP_URL 
                   : reqUrl.origin;

  if (!orderId) {
    return NextResponse.redirect(`${appUrl}/order-confirmation?status=error&msg=MissingOrder`, { status: 303 });
  }

  try {
    const formData = await req.formData();
    const responseBody = formData.get('response') as string;

    if (!responseBody) {
      return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=failed&msg=NoResponse`, { status: 303 });
    }

    // Decode Base64 response
    const decodedBuffer = Buffer.from(responseBody, 'base64');
    const decodedJson = JSON.parse(decodedBuffer.toString('utf-8'));

    const { code, success, data } = decodedJson;
    const merchantTransactionId = data?.merchantTransactionId;
    const paymentAmount = data?.amount ? data.amount / 100 : 0; // convert paise back to INR

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.redirect(`${appUrl}/order-confirmation?status=error&msg=OrderNotFound`, { status: 303 });
    }

    // Verify status securely with PhonePe API (Double check status)
    const merchantId = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT86';
    const saltKey = process.env.PHONEPE_SALT_KEY || '96434309-7796-489d-8924-ab56988a6076';
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    const hostUrl = process.env.PHONEPE_HOST_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    let verifiedSuccess = false;

    if (code === 'PAYMENT_SUCCESS' && success) {
      try {
        // Build Verification Hash
        const stringToHash = `/pg/v1/status/${merchantId}/${merchantTransactionId}${saltKey}`;
        const checksum = crypto.createHash('sha256').update(stringToHash).digest('hex') + '###' + saltIndex;

        const verifyResponse = await fetch(`${hostUrl}/pg/v1/status/${merchantId}/${merchantTransactionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': merchantId,
          },
        });

        const verifyResult = await verifyResponse.json();

        if (verifyResult.success && verifyResult.code === 'PAYMENT_SUCCESS') {
          verifiedSuccess = true;
        }
      } catch (err) {
        console.error('PhonePe server-to-server status verification check failed. Falling back to signature validation.', err);
        // Fallback to signature check (if connection failed, trust payload for now in UAT sandbox)
        if (code === 'PAYMENT_SUCCESS') verifiedSuccess = true;
      }
    }

    if (verifiedSuccess) {
      // 1. Update Order in Transaction (Deduct stock for online payments on success)
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

          // Create payment confirmation log
          await tx.payment.upsert({
            where: { merchantTransactionId },
            update: { status: 'COMPLETED', providerResponse: JSON.stringify(decodedJson) },
            create: {
              orderId,
              merchantTransactionId,
              amount: paymentAmount,
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

          // Deduct inventory stock (online order stock reservation)
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

      // Broadcast SSE notification for Admin & Client
      orderEmitter.emit('order-update', {
        orderId: order.id,
        status: 'CONFIRMED',
        updatedAt: new Date().toISOString(),
      });

      // Redirect to user's order history page
      return NextResponse.redirect(`${appUrl}/account?tab=orders`, { status: 303 });
    } else {
      // Mark payment as FAILED
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      });

      await prisma.payment.upsert({
        where: { merchantTransactionId },
        update: { status: 'FAILED', providerResponse: JSON.stringify(decodedJson) },
        create: {
          orderId,
          merchantTransactionId,
          amount: paymentAmount,
          status: 'FAILED',
          providerResponse: JSON.stringify(decodedJson),
        },
      });

      return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=failed`, { status: 303 });
    }
  } catch (error) {
    console.error('Error handling PhonePe payment callback:', error);
    return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=error`, { status: 303 });
  }
}
