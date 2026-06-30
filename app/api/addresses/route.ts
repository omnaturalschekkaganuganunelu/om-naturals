import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/addresses - Fetch all addresses of the logged-in user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const addresses = await prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(addresses);
  } catch (err: any) {
    console.error('Error fetching addresses:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/addresses - Create a new address
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, line1, line2, city, state, pincode, latitude, longitude, isDefault } = body;

    if (!name || !phone || !line1 || !city || !state || !pincode) {
      return NextResponse.json({ error: 'Missing required address fields' }, { status: 400 });
    }

    // Execute address creation in transaction to handle default status
    const address = await prisma.$transaction(async (tx) => {
      // Verify user exists to prevent foreign key violation if db was reset
      const userExists = await tx.user.findUnique({
        where: { id: session.user.id },
      });
      if (!userExists) {
        throw new Error('USER_NOT_FOUND');
      }

      if (isDefault) {
        // Clear previous defaults
        await tx.address.updateMany({
          where: { userId: session.user.id },
          data: { isDefault: false },
        });
      }

      // Check if user has no addresses, make this the default automatically
      const addressCount = await tx.address.count({
        where: { userId: session.user.id },
      });

      return tx.address.create({
        data: {
          userId: session.user.id,
          name,
          phone,
          line1,
          line2,
          city,
          state,
          pincode,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          isDefault: addressCount === 0 ? true : !!isDefault,
        },
      });
    });

    return NextResponse.json(address);
  } catch (err: any) {
    console.error('Error creating address:', err);
    if (err.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'User session invalid. Please log out and log in again.' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
