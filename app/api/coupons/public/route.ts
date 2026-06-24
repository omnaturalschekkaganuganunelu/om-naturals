import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coupons/public
 * Returns all active, non-expired coupons for public display (e.g. cart page suggestions).
 * No auth required — we only expose code, type, value, minOrderValue, maxDiscount.
 */
export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      select: {
        code: true,
        type: true,
        value: true,
        minOrderValue: true,
        maxDiscount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(coupons);
  } catch (err: any) {
    console.error('Error fetching public coupons:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
