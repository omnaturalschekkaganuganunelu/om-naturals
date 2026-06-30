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
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const amountInPaise = Math.round(order.total * 100);
    const merchantTransactionId = `TXN-${order.orderId}-${Date.now()}`;

    const originUrl = req.headers.get('origin') || 'http://localhost:3000';
    let appUrl = process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== 'http://localhost:3000' 
                   ? process.env.NEXT_PUBLIC_APP_URL 
                   : originUrl;

    if (appUrl.endsWith('/')) {
      appUrl = appUrl.slice(0, -1);
    }

    // Check if we are running in simulation/mock mode due to missing variables or UAT bypass
    const isMockMode = process.env.PHONEPE_MERCHANT_ID === 'MOCK';

    if (isMockMode) {
      console.log('Running in PhonePe Simulation mode');
      // Redirect to simulated payment portal built inside the application
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
      const result = await client.pay(payRequest);

      if (result && result.redirectUrl) {
        // Create payment record in PENDING state
        await prisma.payment.create({
          data: {
            orderId: order.id,
            merchantTransactionId,
            amount: order.total,
            status: 'PENDING',
          },
        });

        return NextResponse.json({ url: result.redirectUrl, simulated: false });
      } else {
        console.error('PhonePe PG response failed, entering fallback simulation mode', result);
        const mockPayUrl = `${appUrl}/checkout/simulated-pg?txnId=${merchantTransactionId}&orderId=${order.id}&amount=${order.total}&fallback=true`;
        return NextResponse.json({ url: mockPayUrl, simulated: true });
      }
    } catch (apiErr) {
      console.error('PhonePe Connection error, entering fallback simulation mode', apiErr);
      const mockPayUrl = `${appUrl}/checkout/simulated-pg?txnId=${merchantTransactionId}&orderId=${order.id}&amount=${order.total}&fallback=true`;
      return NextResponse.json({ url: mockPayUrl, simulated: true });
    }
  } catch (err: any) {
    console.error('Payment initiation exception:', err);
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 });
  }
}
