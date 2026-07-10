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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Run all database count and fetch operations in parallel
    const [
      productsCount,
      customersCount,
      ordersCount,
      paidOrders,
      lowStockProducts,
      recentOrders,
      trendOrders
    ] = await Promise.all([
      prisma.product.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.count(),
      prisma.order.findMany({
        where: {
          NOT: { orderStatus: 'CANCELLED' },
        },
        select: { total: true },
      }),
      prisma.product.findMany({
        where: {
          stock: { lt: 5 },
        },
        include: { category: true },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
          NOT: { orderStatus: 'CANCELLED' },
        },
        select: { total: true, createdAt: true },
      })
    ]);

    const totalRevenue = parseFloat(paidOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2));
    const last7DaysData = [];

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

      const dayRevenue = parseFloat(dayOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2));
      const dayName = d.toLocaleDateString('te-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }); // Or standard short name
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
