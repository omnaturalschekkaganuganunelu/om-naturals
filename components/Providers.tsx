'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { LanguageProvider } from '@/context/LanguageContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <LanguageProvider>{children}</LanguageProvider>
    </SessionProvider>
  );
}
