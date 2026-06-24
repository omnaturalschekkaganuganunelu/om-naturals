import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, subtotal, language = 'en' } = body;
    const isTe = language === 'te';

    if (!code || subtotal === undefined) {
      return NextResponse.json({ error: isTe ? 'కోడ్ లేదా సబ్‌టోటల్ వివరాలు లేవు' : 'Missing code or subtotal' }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ valid: false, error: isTe ? 'ఇది చెల్లని కూపన్ కోడ్.' : 'Invalid Coupon Code' }, { status: 400 });
    }

    // Check expiration
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: isTe ? 'ఈ కూపన్ గడువు ముగిసింది.' : 'Coupon Expired' }, { status: 400 });
    }

    // Check minimum order value
    if (subtotal < coupon.minOrderValue) {
      return NextResponse.json({
        valid: false,
        error: isTe
          ? `కనీసం ₹${coupon.minOrderValue} కొనుగోలుకు మాత్రమే ఇది వర్తిస్తుంది.`
          : `Min order value of ₹${coupon.minOrderValue} required`
      }, { status: 400 });
    }

    // Calculate coupon discount
    let discount = 0;
    if (coupon.type === 'PERCENT') {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    // Make sure discount doesn't exceed subtotal
    if (discount > subtotal) {
      discount = subtotal;
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
      minOrderValue: coupon.minOrderValue,
      maxDiscount: coupon.maxDiscount ?? null,
    });
  } catch (err: any) {
    console.error('Error validating coupon:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
