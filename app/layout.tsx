import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import { Suspense } from 'react';
import MobileBottomNav from '@/components/MobileBottomNav';
import InstallPrompt from '@/components/InstallPrompt';

export const metadata: Metadata = {
  title: 'OM Natural Chekka Ganuga Oils | 100% Pure Traditional Wood Pressed Cooking Oils',
  description: 'Buy 100% pure cold pressed groundnut, coconut, sesame, almond (badam), and mustard oils online. Authentic wood-pressed edible oils delivered across AP & TS.',
  keywords: 'Chekka Ganuga Oils, Wood Pressed Oils, Groundnut Oil, Sesame Oil, Coconut Oil, Almond Oil, Badam Nune, Mustard Oil, Hyderabad edible oils, pure cooking oil AP TS',
  authors: [{ name: 'OM Natural Chekka Ganuga Oils Team' }],
  icons: {
    icon: '/favicon.ico',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#92400e',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-[#fdfbf7] pb-16 md:pb-0">
        <Providers>
          {children}
          <Suspense fallback={null}>
            <MobileBottomNav />
          </Suspense>
          <Suspense fallback={null}>
            <InstallPrompt />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
