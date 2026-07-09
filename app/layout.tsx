import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import { Suspense } from 'react';
import MobileBottomNav from '@/components/MobileBottomNav';
import InstallPrompt from '@/components/InstallPrompt';
import GlobalToast from '@/components/GlobalToast';
import { Inter, Outfit } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
});


export const metadata: Metadata = {
  metadataBase: new URL('https://www.om-naturals.com'),
  title: 'OM Natural Chekka Ganuga Oils | 100% Pure Traditional Wood Pressed Cooking Oils',
  description: 'Buy 100% pure cold pressed groundnut, coconut, sesame, almond (badam), and mustard oils online. Authentic wood-pressed edible oils delivered across AP & TS.',
  keywords: 'Chekka Ganuga Oils Guntur, Wood Pressed Oils near me, Groundnut Oil Guntur, Sesame Oil Guntur, Coconut Oil Guntur, cold pressed oil online Guntur, Gorantla wood pressed oils, edible oils online Guntur, pure cooking oil AP TS',
  authors: [{ name: 'OM Natural Chekka Ganuga Oils Team' }],
  icons: {
    icon: [
      { url: '/images/logo-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/logo-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/images/logo-192.png', sizes: '192x192', type: 'image/png' }
    ]
  },
  openGraph: {
    title: 'OM Natural Chekka Ganuga Oils | 100% Pure Wood Pressed Oils',
    description: 'Buy 100% pure cold pressed groundnut, coconut, sesame, almond (badam), and mustard oils online.',
    url: 'https://www.om-naturals.com',
    siteName: 'OM Natural Chekka Ganuga Oils',
    images: [
      {
        url: '/images/hero_cooking_oils.png',
        width: 1200,
        height: 630,
        alt: 'OM Natural Chekka Ganuga Oils',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OM Natural',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#92400e',
  viewportFit: 'cover',
};

import NextTopLoader from 'nextjs-toploader';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`overflow-x-clip max-w-full ${inter.variable} ${outfit.variable}`}>
      <body className="antialiased min-h-screen flex flex-col bg-[#fdfbf7] overflow-x-clip">
        <Providers>
          <NextTopLoader
            color="#b45309"
            initialPosition={0.08}
            crawlSpeed={200}
            height={3}
            crawl={true}
            showSpinner={false}
            easing="ease"
            speed={200}
            shadow="0 0 10px #b45309,0 0 5px #b45309"
            zIndex={1600}
          />
          {children}
          <Suspense fallback={null}>
            <MobileBottomNav />
          </Suspense>
          <Suspense fallback={null}>
            <InstallPrompt />
          </Suspense>
          <GlobalToast />
        </Providers>
      </body>
    </html>
  );
}
