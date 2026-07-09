import './env-sanitize';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendEmail } from '@/lib/email';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email or Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email/phone and password');
        }

        const systemAdminEmail = process.env.GMAIL_USER || 'omnaturalschekkaganuganunelu@gmail.com';
        const isSystemAdmin = credentials.email === systemAdminEmail;
        const isSecondAdmin = credentials.email === 'satvikramanujam@gmail.com';
        
        if (isSystemAdmin || isSecondAdmin) {
          if (credentials.password !== 'Om@2026') {
            throw new Error('Invalid admin credentials');
          }

          let user = await prisma.user.findUnique({ where: { email: credentials.email } });
          if (!user) {
            user = await prisma.user.create({
              data: {
                name: 'OM Naturals Admin',
                email: credentials.email,
                password: await bcrypt.hash('Om@2026', 10),
                role: 'ADMIN',
              }
            });
          }

          if (!credentials.otp || credentials.otp === 'undefined' || credentials.otp === '') {
            // Generate OTP
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            await prisma.user.update({
              where: { email: credentials.email },
              data: { otp: newOtp, otpExpiry: new Date(Date.now() + 10 * 60 * 1000) },
            });
            
            // Send OTP Email
            await sendEmail(
              credentials.email,
              'Your Admin Login OTP - OM Naturals',
              `
              <div style="font-family: sans-serif; max-w: 500px; margin: 0 auto; padding: 20px; border: 1px solid #fcd34d; border-radius: 16px;">
                <h2 style="color: #d97706; text-align: center;">OM Naturals Admin Login</h2>
                <p style="color: #4b5563; font-size: 16px;">Here is your One-Time Password (OTP) to securely log in to the admin dashboard.</p>
                <div style="background: #fef3c7; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
                  <span style="font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #b45309;">${newOtp}</span>
                </div>
                <p style="color: #9ca3af; font-size: 14px; text-align: center;">This code will expire in 10 minutes.</p>
              </div>
              `
            );
            
            throw new Error('OTP_REQUIRED');
          } else {
            // Verify OTP
            if (!user.otp || user.otp !== credentials.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
              throw new Error('INVALID_OTP');
            }
            // Clear OTP
            await prisma.user.update({
              where: { email: credentials.email },
              data: { otp: null, otpExpiry: null },
            });
            return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: 'ADMIN' };
          }
        }

        // Support both Email and Phone login lookup
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.email },
              { phone: credentials.email },
            ]
          },
        });

        if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
          throw new Error('Invalid email/phone or password');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email;
        if (!email) return false;

        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: user.name || 'Google User',
              email: email,
              password: '', // OAuth users have no password
              phone: null,
              role: 'CUSTOMER',
            },
          });
        }

        // Propagate DB values to Next-Auth user object
        user.id = dbUser.id;
        user.role = dbUser.role;
        user.phone = dbUser.phone;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone;
      }
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.email = session.email;
        token.phone = session.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.phone = token.phone as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days session
    updateAge: 24 * 60 * 60,  // Update session every 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
