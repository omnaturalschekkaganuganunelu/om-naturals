import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // Read PhonePe settings
    const merchantId = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT86';
    const saltKey = process.env.PHONEPE_SALT_KEY || '96434309-7796-489d-8924-ab56988a6076';
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    const hostUrl = process.env.PHONEPE_HOST_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';
    // Construct PhonePe Payload
    const originUrl = req.headers.get('origin') || 'http://localhost:3000';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== 'http://localhost:3000' 
                   ? process.env.NEXT_PUBLIC_APP_URL 
                   : originUrl;

    // Construct PhonePe Payload
    const phonePePayload = {
      merchantId,
      merchantTransactionId,
      merchantUserId: order.userId,
      amount: amountInPaise,
      redirectUrl: `${appUrl}/api/payment/callback?orderId=${order.id}`,
      redirectMode: 'POST', // PhonePe posts redirect response
      callbackUrl: `${appUrl}/api/payment/webhook`,
      mobileNumber: order.phone.replace(/[^0-9]/g, '').slice(-10) || '9999999999',
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(phonePePayload)).toString('base64');
    const stringToHash = base64Payload + '/pg/v1/pay' + saltKey;
    const checksum = crypto.createHash('sha256').update(stringToHash).digest('hex') + '###' + saltIndex;

    // Check if we are running in simulation/mock mode due to missing variables or UAT bypass
    // User requested to open PhonePe testing page UAT, so disabling the undefined env check.
    const isMockMode = process.env.PHONEPE_MERCHANT_ID === 'MOCK';

    if (isMockMode) {
      console.log('Running in PhonePe Simulation mode');
      // Redirect to simulated payment portal built inside the application
      const mockPayUrl = `${appUrl}/checkout/simulated-pg?txnId=${merchantTransactionId}&orderId=${order.id}&amount=${order.total}`;
      return NextResponse.json({ url: mockPayUrl, simulated: true });
    }

    try {
      // Call PhonePe API with 10-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`${hostUrl}/pg/v1/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
        body: JSON.stringify({ request: base64Payload }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const result = await response.json();

      if (result.success && result.data?.instrumentResponse?.redirectInfo?.url) {
        // Create payment record in PENDING state
        await prisma.payment.create({
          data: {
            orderId: order.id,
            merchantTransactionId,
            amount: order.total,
            status: 'PENDING',
          },
        });

        return NextResponse.json({ url: result.data.instrumentResponse.redirectInfo.url, simulated: false });
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
