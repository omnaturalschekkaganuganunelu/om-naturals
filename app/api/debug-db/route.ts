import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // 1. Security Check: Completely disabled in production, and only accessible to ADMIN users in development
    const session = await getServerSession(authOptions);
    
    if (process.env.NODE_ENV === 'production' || !session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const targetOrderId = searchParams.get('orderId');

    const debugInfo: any = {
      databaseUrlHost: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : 'none',
      databaseUser: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).username : 'none',
      env: process.env.NODE_ENV,
      nodeVersion: process.version
    };

    if (targetOrderId) {
      debugInfo.order = await prisma.order.findUnique({
        where: { id: targetOrderId },
        include: { items: true }
      });
      debugInfo.payments = await prisma.payment.findMany({
        where: { orderId: targetOrderId }
      });
      debugInfo.notifications = await prisma.notification.findMany({
        where: { orderId: targetOrderId }
      });
    } else {
      debugInfo.latestOrders = await prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, orderId: true, paymentStatus: true, orderStatus: true, createdAt: true }
      });
      debugInfo.latestPayments = await prisma.payment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json(debugInfo, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

