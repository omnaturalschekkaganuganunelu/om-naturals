import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone } = body;

    if (!name || !password || (!email && !phone)) {
      return NextResponse.json({ 
        error: 'పేరు, పాస్‌వర్డ్ మరియు ఈమెయిల్ లేదా ఫోన్ నెంబర్ అవసరం. (Name, password, and either email or phone number are required)' 
      }, { status: 400 });
    }

    const finalEmail = email || `${phone}@no-email.com`;

    // Email check
    const existingUser = await prisma.user.findUnique({
      where: { email: finalEmail },
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: email 
          ? 'ఈ ఈమెయిల్ ఇప్పటికే నమోదు చేయబడింది. (This email is already registered)' 
          : 'ఈ ఫోన్ నెంబర్ ఇప్పటికే నమోదు చేయబడింది. (This phone number is already registered)' 
      }, { status: 400 });
    }

    // Phone unique check
    if (phone) {
      const existingPhoneUser = await prisma.user.findFirst({
        where: { phone },
      });
      if (existingPhoneUser) {
        return NextResponse.json({ 
          error: 'ఈ ఫోన్ నెంబర్ ఇప్పటికే నమోదు చేయబడింది. (This phone number is already registered)' 
        }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: finalEmail,
        password: hashedPassword,
        phone: phone || null,
        role: 'CUSTOMER',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'నమోదు విజయవంతమైంది! (Registration successful!)',
      user: {
        id: user.id,
        name: user.name,
        email: user.email.endsWith('@no-email.com') ? null : user.email,
        phone: user.phone,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
