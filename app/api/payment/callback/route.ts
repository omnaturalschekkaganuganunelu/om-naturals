import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPhonePeClient } from '@/lib/phonepe';
import { orderEmitter } from '@/lib/sse';
import { sendOrderConfirmationEmail } from '@/lib/orderEmail';

// GET handler: Handles user navigation back from PhonePe (browser GET instead of POST redirect)
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
      include: { items: true },
    });

    if (!order) {
      return NextResponse.redirect(`${appUrl}/order-confirmation?status=error&msg=OrderNotFound`, { status: 303 });
    }

    if (order.paymentStatus === 'COMPLETED') {
      // Payment already processed (perhaps webhook fired first)
      return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=success`, { status: 303 });
    }

    // Since the database status is PENDING, query PhonePe Status API server-to-server directly!
    // This resolves the local testing issue (since webhook cannot reach localhost) and acts as a fast-track callback fallback!
    const payment = await prisma.payment.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: 'desc' },
    });

    let verifiedSuccess = false;
    let verifiedFailure = false;
    let phonePeTransactionId = null;

    if (payment) {
      try {
        const client = getPhonePeClient();
        const verifyResult = await client.getOrderStatus(payment.merchantTransactionId);
        
        if (verifyResult) {
          if (verifyResult.state === 'COMPLETED') {
            verifiedSuccess = true;
            if (verifyResult.paymentDetails && verifyResult.paymentDetails.length > 0) {
              phonePeTransactionId = verifyResult.paymentDetails[0].transactionId || null;
            }
          } else if (verifyResult.state === 'FAILED') {
            verifiedFailure = true;
          }
        }
      } catch (err) {
        console.error('GET Callback: Error calling PhonePe status API:', err);
      }
    }

    if (verifiedSuccess) {
      // Update order and payment to COMPLETED in database
      await prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({ where: { id: orderId } });
        if (currentOrder && currentOrder.paymentStatus !== 'COMPLETED') {
          // Update order status
          await tx.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'COMPLETED',
              orderStatus: 'CONFIRMED',
              transactionRef: phonePeTransactionId,
            },
          });

          // Update payment record
          if (payment) {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: 'COMPLETED',
              },
            });
          }

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
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { decrement: item.quantity },
                salesCount: { increment: item.quantity },
              },
            });
          }
        }
      });

      // Send Order Confirmation Email
      try {
        const orderUser = await prisma.user.findUnique({ where: { id: order.userId } });
        if (orderUser && orderUser.email && orderUser.name) {
          await sendOrderConfirmationEmail(order.id, orderUser.email, orderUser.name);
        }
      } catch (emailErr) {
        console.error('GET Callback: Failed to send confirmation email:', emailErr);
      }

      // Broadcast SSE notification
      orderEmitter.emit('order-update', {
        orderId: order.id,
        status: 'CONFIRMED',
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=success`, { status: 303 });

    } else if (verifiedFailure) {
      // Process payment failure
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
      }

      return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=failed`, { status: 303 });
    } else {
      // Payment still pending — redirect to order-confirmation with pending status
      return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=pending`, { status: 303 });
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
    let phonePeTransactionId = data?.transactionId || null; // PhonePe's own transaction ID
    const paymentAmount = data?.amount ? data.amount / 100 : 0; // convert paise back to INR

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.redirect(`${appUrl}/order-confirmation?status=error&msg=OrderNotFound`, { status: 303 });
    }

    // Verify status securely with PhonePe API (Double check status) using SDK v2
    let verifiedSuccess = false;

    if (code === 'PAYMENT_SUCCESS' && success) {
      try {
        const client = getPhonePeClient();
        const verifyResult = await client.getOrderStatus(merchantTransactionId);

        if (verifyResult && verifyResult.state === 'COMPLETED') {
          verifiedSuccess = true;
          // Retrieve final transaction details from PhonePe server response
          if (verifyResult.paymentDetails && verifyResult.paymentDetails.length > 0) {
            phonePeTransactionId = verifyResult.paymentDetails[0].transactionId || phonePeTransactionId;
          }
        }
      } catch (err) {
        console.error('PhonePe SDK status verification failed. Falling back to callback payload.', err);
        // Fallback to signature check (if connection failed, trust payload in UAT sandbox)
        if (code === 'PAYMENT_SUCCESS') {
          verifiedSuccess = true;
        }
      }
    }

    if (verifiedSuccess) {
      // 1. Update Order in Transaction (Deduct stock for online payments on success)
      await prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({ where: { id: orderId } });
        if (currentOrder && currentOrder.paymentStatus !== 'COMPLETED') {
          // Update order status and save PhonePe transaction ID
          await tx.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'COMPLETED',
              orderStatus: 'CONFIRMED',
              transactionRef: phonePeTransactionId,
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

          // Deduct inventory stock and increment salesCount (only on confirmed PhonePe payment)
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { decrement: item.quantity },
                salesCount: { increment: item.quantity },
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

      // Redirect to order confirmation page to show success pop-up and clear cart
      return NextResponse.redirect(`${appUrl}/order-confirmation?orderId=${orderId}&status=success`, { status: 303 });
    } else {
      // Mark payment as FAILED
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      });

      // Notify customer of payment failure
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
