'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { LanguageProvider } from '@/context/LanguageContext';
import { Language } from '@/lib/translations';

export default function Providers({ 
  children,
  initialLanguage = 'en'
}: { 
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <LanguageProvider initialLanguage={initialLanguage}>{children}</LanguageProvider>
    </SessionProvider>
  );
}
