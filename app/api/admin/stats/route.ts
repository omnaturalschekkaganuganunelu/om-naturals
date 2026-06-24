import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Basic Counts
    const productsCount = await prisma.product.count();
    const customersCount = await prisma.user.count({ where: { role: 'CUSTOMER' } });
    const ordersCount = await prisma.order.count();

    // 2. Revenue (All non-cancelled orders)
    const paidOrders = await prisma.order.findMany({
      where: {
        NOT: { orderStatus: 'CANCELLED' },
      },
      select: { total: true },
    });
    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0);

    // 3. Low Stock Alerts (Stock < 5)
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: { lt: 5 },
      },
      include: { category: true },
    });

    // 4. Recent Orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    // 5. Last 7 Days Revenue Trend
    const last7DaysData = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trendOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        NOT: { orderStatus: 'CANCELLED' },
      },
      select: { total: true, createdAt: true },
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      // Filter trendOrders in-memory
      const dayOrders = trendOrders.filter((order) => {
        const orderTime = new Date(order.createdAt).getTime();
        return orderTime >= d.getTime() && orderTime < nextDay.getTime();
      });

      const dayRevenue = dayOrders.reduce((sum, order) => sum + order.total, 0);
      const dayName = d.toLocaleDateString('te-IN', { weekday: 'short' }); // Or standard short name
      const dayDate = `${d.getDate()}/${d.getMonth() + 1}`;

      last7DaysData.push({
        day: dayName,
        date: dayDate,
        revenue: dayRevenue,
        orders: dayOrders.length,
      });
    }

    return NextResponse.json({
      productsCount,
      customersCount,
      ordersCount,
      totalRevenue,
      lowStockProducts,
      recentOrders,
      revenueTrend: last7DaysData,
    });
  } catch (err: any) {
    console.error('Error fetching admin dashboard statistics:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
