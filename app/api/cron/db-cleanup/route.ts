import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // 1. Security Check (Secures cron endpoint using Vercel CRON_SECRET token or bypasses in local dev)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('=== RUNNING DATABASE MAINTENANCE CRON ===');

    const now = new Date();

    // Time boundary calculations
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(now.getDate() - 15);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    // 2. Clear Notifications older than 15 days
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: fifteenDaysAgo,
        },
      },
    });
    console.log(`- Deleted ${deletedNotifications.count} notifications older than 15 days.`);

    // 3. Clear Orders older than 1 year (Cascade deletes related OrderItems and Payments automatically)
    const deletedOrders = await prisma.order.deleteMany({
      where: {
        createdAt: {
          lt: oneYearAgo,
        },
      },
    });
    console.log(`- Deleted ${deletedOrders.count} orders older than 1 year (including all linked items & logs).`);

    // 4. Remove Inactive Users (Registered over a year ago who have NEVER placed any orders)
    // Safety: Never delete ADMIN users
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        createdAt: {
          lt: oneYearAgo,
        },
        role: {
          not: 'ADMIN',
        },
        orders: {
          none: {}, // Has no order history
        },
      },
    });
    console.log(`- Deleted ${deletedUsers.count} inactive guest accounts older than 1 year.`);

    // 5. Database Space Optimization: Strip heavy JSON response strings from payments older than 3 months
    // Reclaims substantial storage space in Postgres without losing sales metrics/history
    const optimizedPayments = await prisma.payment.updateMany({
      where: {
        createdAt: {
          lt: threeMonthsAgo,
        },
        providerResponse: {
          not: null,
        },
      },
      data: {
        providerResponse: null,
      },
    });
    console.log(`- Cleared transaction log JSON payloads from ${optimizedPayments.count} payments older than 3 months.`);

    return NextResponse.json({
      success: true,
      summary: {
        deletedNotifications: deletedNotifications.count,
        deletedOrders: deletedOrders.count,
        deletedUsers: deletedUsers.count,
        optimizedPayments: optimizedPayments.count,
      },
    });

  } catch (err: any) {
    console.error('Database maintenance cron failed:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
