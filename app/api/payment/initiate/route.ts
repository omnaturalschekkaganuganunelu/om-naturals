import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPhonePeClient } from '@/lib/phonepe';
import { StandardCheckoutPayRequest, PrefillUserLoginDetails } from '@phonepe-pg/pg-sdk-node';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // Fetch order details
    console.time('[Performance] Database Order Fetch');
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    console.timeEnd('[Performance] Database Order Fetch');

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const amountInPaise = Math.round(order.total * 100);
    const merchantTransactionId = `TXN-${order.orderId}-${Date.now()}`;

    const originUrl = req.headers.get('origin') || 'http://localhost:3000';
    let appUrl = originUrl;

    if (appUrl.endsWith('/')) {
      appUrl = appUrl.slice(0, -1);
    }

    // Check if we are running in simulation/mock mode (Only allowed in local development)
    const isMockMode = process.env.NODE_ENV === 'development' && process.env.PHONEPE_MERCHANT_ID === 'MOCK';

    if (isMockMode) {
      console.log('Running in PhonePe Simulation mode');
      const mockPayUrl = `${appUrl}/checkout/simulated-pg?txnId=${merchantTransactionId}&orderId=${order.id}&amount=${order.total}`;
      return NextResponse.json({ url: mockPayUrl, simulated: true });
    }

    try {
      const client = getPhonePeClient();
      let mobileNumber = order.phone.replace(/[^0-9]/g, '').slice(-10);
      if (mobileNumber.length < 10) {
        mobileNumber = '9999999999';
      }
      
      const prefillDetails = PrefillUserLoginDetails.builder()
        .phoneNumber(mobileNumber)
        .build();

      const payRequest = StandardCheckoutPayRequest.builder()
        .merchantOrderId(merchantTransactionId)
        .amount(amountInPaise)
        .redirectUrl(`${appUrl}/api/payment/callback?orderId=${order.id}`)
        .prefillUserLoginDetails(prefillDetails)
        .build();

      // Call PhonePe SDK pay
      console.time('[Performance] PhonePe SDK Pay API Request');
      const result = await client.pay(payRequest);
      console.timeEnd('[Performance] PhonePe SDK Pay API Request');

      if (result && result.redirectUrl) {
        // CRITICAL: Await the payment record creation — do NOT fire-and-forget.
        // If this record is missing when the PhonePe webhook fires, the entire
        // successful payment will be dropped with a 404 error and the order will
        // stay stuck in FAILED state permanently.
        try {
          await prisma.payment.create({
            data: {
              orderId: order.id,
              merchantTransactionId,
              amount: order.total,
              status: 'PENDING',
            },
          });
        } catch (e: any) {
          // If duplicate (retry scenario), update existing record back to PENDING
          if (e.code === 'P2002') {
            await prisma.payment.update({
              where: { merchantTransactionId },
              data: { status: 'PENDING' },
            });
          } else {
            console.error('Payment log creation failed:', e);
          }
        }

        // Reset order paymentStatus to PENDING if it was previously FAILED (retry scenario)
        if (order.paymentStatus === 'FAILED') {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'PENDING' },
          });
        }

        return NextResponse.json({ url: result.redirectUrl, simulated: false });
      } else {
        console.error('PhonePe PG response failed:', result);
        return NextResponse.json({ error: 'Payment gateway rejected request. Please try again.' }, { status: 502 });
      }
    } catch (apiErr) {
      console.error('PhonePe Connection error:', apiErr);
      return NextResponse.json({ error: 'Failed to communicate with payment gateway. Please check connectivity and try again.' }, { status: 502 });
    }
  } catch (err: any) {
    console.error('Payment initiation exception:', err);
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 });
  }
}
