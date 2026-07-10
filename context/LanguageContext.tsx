'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Language, TranslationKey } from '@/lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => translations.en[key] ?? key,
});

export function LanguageProvider({
  children,
  initialLanguage = 'en',
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    const saved = localStorage.getItem('nune-bazaar-lang') as Language | null;
    if (saved && saved !== language && (saved === 'en' || saved === 'te')) {
      setLanguageState(saved);
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('nune-bazaar-lang', lang);
    // Write cookie for server-side lookup
    document.cookie = `nune-lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] ?? translations.en[key] ?? key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
