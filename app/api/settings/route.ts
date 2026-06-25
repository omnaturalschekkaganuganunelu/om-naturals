import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/settings - Fetch singleton site settings
export async function GET(req: NextRequest) {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
    });

    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          id: 'singleton',
          codEnabled: true,
          freeShippingAbove: 500,
          shippingFee: 30,
          packingFee: 20,
          gstRate: 5,
          contactPhone: '+91 99999 99999',
          whatsappNumber: '+91 99999 99999',
          businessName: 'ఓమ్ నాచురల్ చెక్క గానుగ నూనెలు / OM Natural Chekka Ganuga Oils',
          businessEmail: 'info@om-naturals.com',
        },
      });
    }

    return NextResponse.json(settings);
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/settings - Update site settings (Admin Only)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      codEnabled,
      freeShippingAbove,
      shippingFee,
      packingFee,
      gstRate,
      contactPhone,
      whatsappNumber,
      businessName,
      businessEmail,
    } = body;

    const settings = await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: {
        codEnabled,
        freeShippingAbove: freeShippingAbove !== undefined ? parseFloat(freeShippingAbove.toString()) : undefined,
        shippingFee: shippingFee !== undefined ? parseFloat(shippingFee.toString()) : undefined,
        packingFee: packingFee !== undefined ? parseFloat(packingFee.toString()) : undefined,
        gstRate: gstRate !== undefined ? parseFloat(gstRate.toString()) : undefined,
        contactPhone,
        whatsappNumber,
        businessName,
        businessEmail,
      },
    });

    return NextResponse.json(settings);
  } catch (err: any) {
    console.error('Error updating settings:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
