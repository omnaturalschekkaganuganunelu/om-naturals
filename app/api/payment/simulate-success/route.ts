import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { orderEmitter } from '@/lib/sse';
import { revalidatePath } from 'next/cache';
import { sendOrderConfirmationEmail } from '@/lib/orderEmail';
import { confirmPaidOrder, deleteFailedOrder } from '@/lib/paymentConfirm';

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
      const merchantTransactionId = `SIM-TXN-${order.orderId}-${Date.now()}`;
      await confirmPaidOrder(orderId, merchantTransactionId, { simulated: true, code: 'PAYMENT_SUCCESS' });
      return NextResponse.json({ success: true });
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      });
      // Notify customer of payment failure
      await prisma.notification.create({
        data: {
          title: '❌ Payment Failed',
          body: `The payment for your online order of ₹${order.total} was not completed. Please retry payment.`,
          type: 'ORDER',
          userId: order.userId,
          orderId: order.id,
        },
      }).catch((err) => console.error('Failed to create failure notification:', err));

      return NextResponse.json({ success: true, message: 'Payment simulated as failed' });
    }
  } catch (err: any) {
    console.error('Error simulating payment success:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
