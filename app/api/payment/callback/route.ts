import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPhonePeClient } from '@/lib/phonepe';
import { orderEmitter } from '@/lib/sse';
import { sendOrderConfirmationEmail } from '@/lib/orderEmail';

// GET handler: Handles user navigation back from PhonePe (browser GET instead of POST redirect)
// Actively checks PhonePe status so abandoned/cancelled payments are resolved immediately.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  const reqUrl = new URL(req.url);
  let appUrl = process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== 'http://localhost:3000'
                   ? process.env.NEXT_PUBLIC_APP_URL
                   : reqUrl.origin;

  if (appUrl.endsWith('/')) {
    appUrl = appUrl.slice(0, -1);
  }

  if (!orderId) {
    return NextResponse.redirect(`${appUrl}/account?tab=orders`, { status: 303 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, paymentStatus: true, transactionRef: true, orderId: true, userId: true },
    });

    if (!order) {
      return NextResponse.redirect(`${appUrl}/order-confirmation?status=error&msg=OrderNotFound`, { status: 303 });
    }

    // Already resolved by webhook — fast path
    if (order.paymentStatus === 'COMPLETED') {
      return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=success`, { status: 303 });
    }
    if (order.paymentStatus === 'FAILED') {
      return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=failed`, { status: 303 });
    }

    // Payment still PENDING — actively check PhonePe right now
    // Look up the merchantTransactionId from the Payment table
    try {
      const paymentRecord = await prisma.payment.findFirst({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
        select: { merchantTransactionId: true },
      });

      if (!paymentRecord?.merchantTransactionId) {
        // No payment record yet (fire-and-forget write may not have landed) — go to verifying
        return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=verifying`, { status: 303 });
      }

      const client = getPhonePeClient();
      const result = await client.getOrderStatus(paymentRecord.merchantTransactionId);
      const state = result?.state?.toUpperCase();

      if (state === 'COMPLETED') {
        // Payment actually succeeded (webhook was slow) — mark COMPLETED
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'COMPLETED', orderStatus: 'CONFIRMED' },
        });
        return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=success`, { status: 303 });

      } else if (state === 'FAILED' || state === 'CANCELLED' || state === 'PAYMENT_CANCELLED') {
        // Explicitly cancelled or failed by PhonePe — mark FAILED
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'FAILED' },
        });
        prisma.notification.create({
          data: {
            title: '❌ Payment Not Completed',
            body: `Payment for Order ${order.orderId} was not completed. Please retry or place a new order.`,
            type: 'ORDER',
            userId: order.userId,
            orderId: order.id,
          },
        }).catch(() => {});
        return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=failed`, { status: 303 });

      } else {
        // PENDING or unknown state — user may have paid but PhonePe still processing.
        // DO NOT mark as failed. Go to verifying so polling + webhook can resolve it.
        return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=verifying`, { status: 303 });
      }
    } catch (sdkErr) {
      console.error('GET Callback: PhonePe status check failed:', sdkErr);
      // SDK error — fall back to verifying so client polling can handle it
      return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=verifying`, { status: 303 });
    }

  } catch (err) {
    console.error('GET Callback: Error checking order status:', err);
    return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=error`, { status: 303 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  const reqUrl = new URL(req.url);
  let appUrl = process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== 'http://localhost:3000' 
                   ? process.env.NEXT_PUBLIC_APP_URL 
                   : reqUrl.origin;

  if (appUrl.endsWith('/')) {
    appUrl = appUrl.slice(0, -1);
  }

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
    let phonePeTransactionId = data?.transactionId || null;
    const paymentAmount = data?.amount ? data.amount / 100 : 0;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.redirect(`${appUrl}/order-confirmation?status=error&msg=OrderNotFound`, { status: 303 });
    }

    // Verify status securely with PhonePe API using SDK v2
    let verifiedSuccess = false;

    if (code === 'PAYMENT_SUCCESS' && success) {
      try {
        const client = getPhonePeClient();
        const verifyResult = await client.getOrderStatus(merchantTransactionId);

        if (verifyResult && verifyResult.state === 'COMPLETED') {
          verifiedSuccess = true;
          if (verifyResult.paymentDetails && verifyResult.paymentDetails.length > 0) {
            phonePeTransactionId = verifyResult.paymentDetails[0].transactionId || phonePeTransactionId;
          }
        }
      } catch (err) {
        console.error('PhonePe SDK status verification failed. Falling back to callback payload.', err);
        // Secure Guard: Only allow fallback in development/test mock setups, NEVER in production!
        if (process.env.NODE_ENV !== 'production' && code === 'PAYMENT_SUCCESS') {
          verifiedSuccess = true;
        }
      }
    }

    if (verifiedSuccess) {
      // Update Order in Transaction
      await prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({ where: { id: orderId } });
        if (currentOrder && currentOrder.paymentStatus !== 'COMPLETED') {
          await tx.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'COMPLETED',
              orderStatus: 'CONFIRMED',
              transactionRef: phonePeTransactionId,
            },
          });

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

          await tx.notification.create({
            data: {
              title: '💳 Payment Successful!',
              body: `Your payment for Order ${order.orderId} was successful and your order is confirmed.`,
              type: 'ORDER',
              userId: order.userId,
              orderId: order.id,
            },
          });

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

          for (const item of order.items) {
            const updatedProduct = await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { decrement: item.quantity },
                salesCount: { increment: item.quantity },
              },
            });

            if (updatedProduct.stock < 0) {
              throw new Error(`Insufficient stock for product ${updatedProduct.name}`);
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
      });

      // Broadcast SSE notification for Admin & Client
      orderEmitter.emit('order-update', {
        orderId: order.id,
        status: 'CONFIRMED',
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=success`, { status: 303 });
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
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

      if (merchantTransactionId) {
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
      }

      return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=failed`, { status: 303 });
    }
  } catch (error) {
    console.error('Error handling PhonePe payment callback:', error);
    return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=error`, { status: 303 });
  }
}
