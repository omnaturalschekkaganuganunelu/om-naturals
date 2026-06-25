import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PUT /api/coupons/[id] - Update coupon (Admin Only)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { code, type, value, minOrderValue, maxDiscount, expiresAt, isActive } = body;

    const couponExists = await prisma.coupon.findUnique({ where: { id } });
    if (!couponExists) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: code ? code.toUpperCase() : undefined,
        type,
        value: value !== undefined ? parseFloat(value.toString()) : undefined,
        minOrderValue: minOrderValue !== undefined ? parseFloat(minOrderValue.toString()) : undefined,
        maxDiscount: maxDiscount !== undefined ? (maxDiscount ? parseFloat(maxDiscount.toString()) : null) : undefined,
        expiresAt: expiresAt !== undefined ? (expiresAt ? (() => {
          const d = new Date(expiresAt);
          const y = d.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' });
          const m = d.toLocaleDateString('en-US', { month: '2-digit', timeZone: 'Asia/Kolkata' });
          const day = d.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Kolkata' });
          return new Date(`${y}-${m}-${day}T23:59:59.999+05:30`);
        })() : null) : undefined,
        isActive,
      },
    });

    return NextResponse.json(updatedCoupon);
  } catch (err: any) {
    console.error('Error updating coupon:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/coupons/[id] - Delete coupon (Admin Only)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 401 });
    }

    const { id } = params;

    const couponExists = await prisma.coupon.findUnique({ where: { id } });
    if (!couponExists) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    await prisma.coupon.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting coupon:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
