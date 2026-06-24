import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/profile - Fetch current user's profile details
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err: any) {
    console.error('Error fetching profile:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/profile - Update current user's profile details
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let finalEmail = email?.trim();
    if (!finalEmail) {
      const finalPhone = (phone || currentUser.phone)?.trim();
      if (finalPhone) {
        finalEmail = `${finalPhone}@no-email.com`;
      } else {
        finalEmail = currentUser.email;
      }
    }

    // Check if email is already in use by someone else
    if (finalEmail !== currentUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: finalEmail },
      });

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json({ error: 'Email already in use by another account' }, { status: 400 });
      }
    }

    // Check if phone is already in use by someone else
    if (phone && phone.trim() !== '' && phone !== currentUser.phone) {
      const existingPhoneUser = await prisma.user.findFirst({
        where: { phone: phone.trim() },
      });
      if (existingPhoneUser && existingPhoneUser.id !== session.user.id) {
        return NextResponse.json({ error: 'Phone number already in use by another account' }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        email: finalEmail,
        phone: phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
