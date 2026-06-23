'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface PremiumLoaderProps {
  fullScreen?: boolean;
  text?: string;
}

export default function PremiumLoader({ fullScreen = true, text }: PremiumLoaderProps) {
  const { t, language } = useLanguage();

  const loadingText = text || (language === 'te' ? 'లోడ్ అవుతోంది...' : 'Loading...');

  const loaderContent = (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Premium Multi-Layer Spinner */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Outer Pulsing Golden Halo */}
        <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping duration-1000"></div>

        {/* Middle Glowing Ring */}
        <div className="absolute inset-1 rounded-full border border-amber-300/40"></div>

        {/* Main Spinning Gradient Border */}
        <div className="absolute inset-0 rounded-full border-4 border-amber-100 border-t-amber-600 animate-spin"></div>

        {/* Center Golden Flame / Oil Drop Pulse */}
        <div className="absolute w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-700 rounded-full shadow-inner animate-pulse">
          <svg
            className="w-4 h-4 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Elegant teardrop / oil drop path */}
            <path d="M12 2C12 2 6 10 6 14C6 17.3137 8.68629 20 12 20C15.3137 20 18 17.3137 18 14C18 10 12 2 12 2Z" />
          </svg>
        </div>
      </div>

      {/* Shimmering Text */}
      <div className="text-center space-y-1">
        <p className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 bg-clip-text text-transparent animate-pulse">
          {loadingText}
        </p>
        <p className="text-[9px] text-amber-500/80 font-bold tracking-[0.2em] uppercase">
          {language === 'te' ? 'ఓమ్ నాచురల్ చెక్క గానుగ నూనెలు' : 'OM Natural Chekka Ganuga Oils'}
        </p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#fdfbf7]/90 backdrop-blur-md animate-fade-in-up">
        {loaderContent}
      </div>
    );
  }

  return (
    <div className="w-full py-16 flex items-center justify-center animate-fade-in-up">
      {loaderContent}
    </div>
  );
}
