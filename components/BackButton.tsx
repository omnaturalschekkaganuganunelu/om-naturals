'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface BackButtonProps {
  label?: string;
  fallbackRoute?: string;
  className?: string;
}

export default function BackButton({ label, fallbackRoute = '/', className = '' }: BackButtonProps) {
  const router = useRouter();
  const { language } = useLanguage();

  const handleBack = () => {
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push(fallbackRoute);
    }
  };

  const btnLabel = label || (language === 'te' ? 'వెనక్కి' : 'Back');

  return (
    <button
      onClick={handleBack}
      className={`group flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-amber-100 hover:border-amber-300 text-amber-950 hover:text-amber-700 rounded-full shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 ${className}`}
    >
      <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
      <span className="text-[11px] font-bold uppercase tracking-wider">{btnLabel}</span>
    </button>
  );
}
