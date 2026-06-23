import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/notifications — fetch current user's notifications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: session.user.id },   // user-specific
          { userId: null },               // broadcast to all
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = notifications.filter(
      (n) => !n.isRead && (n.userId === session.user.id || n.userId === null)
    ).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: any) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/notifications — admin creates a notification
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { title, body: notifBody, type = 'INFO', userId = null, orderId = null } = body;

    if (!title || !notifBody) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: { title, body: notifBody, type, userId: userId || null, orderId: orderId || null },
    });

    return NextResponse.json(notification);
  } catch (err: any) {
    console.error('POST /api/notifications error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
