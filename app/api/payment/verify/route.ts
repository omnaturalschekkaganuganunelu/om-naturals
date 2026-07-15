import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPhonePeClient } from '@/lib/phonepe';
import { confirmPaidOrder } from '@/lib/paymentConfirm';

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
        const phonePeTransactionId = result.paymentDetails?.[0]?.transactionId || paymentRecord.merchantTransactionId;
        
        await confirmPaidOrder(orderId, phonePeTransactionId, result);

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
            body: `The payment for your online order of ₹${order.total} was not completed. Please retry payment.`,
            type: 'ORDER',
            userId: order.userId,
            orderId: order.id,
          },
        }).catch((err) => console.error('Failed to create failure notification:', err));

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
