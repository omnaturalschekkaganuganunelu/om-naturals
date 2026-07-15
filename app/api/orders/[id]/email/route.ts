import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendOrderConfirmationEmail } from '@/lib/orderEmail';

export const dynamic = 'force-dynamic';

// POST /api/orders/[id]/email - Sends order confirmation email in background
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { email, name } = body;

    // Security check: Only allow sending confirmation email if the order exists and is COMPLETED
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderId: id }] },
      select: { id: true, paymentStatus: true, userId: true, orderId: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus !== 'COMPLETED') {
      return NextResponse.json({ error: 'Order is not paid' }, { status: 400 });
    }

    let targetEmail = email;
    let targetName = name;

    if (!targetEmail) {
      const user = await prisma.user.findUnique({ where: { id: order.userId } });
      targetEmail = user?.email;
      targetName = user?.name || 'Customer';
    }

    if (!targetEmail || targetEmail.endsWith('@no-email.com')) {
      return NextResponse.json({ success: true, message: 'Skipped: User has no email' });
    }

    console.log(`Sending background confirmation email for Order ${order.orderId} to ${targetEmail}...`);
    const success = await sendOrderConfirmationEmail(order.id, targetEmail, targetName);

    return NextResponse.json({ success, message: success ? 'Email sent successfully' : 'Email transmission failed' });
  } catch (err: any) {
    console.error('Background order email sending error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
