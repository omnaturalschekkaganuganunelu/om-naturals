import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      // Don't reveal that the user does not exist to prevent email enumeration
      return NextResponse.json({ message: 'If the email exists, an OTP will be sent.' });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await prisma.user.update({
      where: { email },
      data: { otp, otpExpiry }
    });

    await sendEmail(
      email,
      'Password Reset OTP - OM Naturals',
      `
      <div style="font-family: sans-serif; max-w: 500px; margin: 0 auto; padding: 20px; border: 1px solid #fcd34d; border-radius: 16px;">
        <h2 style="color: #d97706; text-align: center;">OM Naturals Password Reset</h2>
        <p style="color: #4b5563; font-size: 16px;">You requested a password reset. Here is your One-Time Password (OTP) to proceed.</p>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #b45309;">${otp}</span>
        </div>
        <p style="color: #9ca3af; font-size: 14px; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
      `
    );

    return NextResponse.json({ message: 'OTP sent' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
