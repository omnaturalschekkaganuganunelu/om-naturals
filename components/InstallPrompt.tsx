'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Share, PlusSquare } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'om-natural-pwa-dismissed';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const { language } = useLanguage();
  const isTe = language === 'te';

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .catch((err) => console.error('Service Worker registration failed', err));
    }

    // Use sessionStorage instead of localStorage so it shows again on a new session
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true;

    if (isStandalone) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOSDevice(isIOS);

    if (isIOS) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    } else {
      // Show the banner anyway after 3 seconds, even if beforeinstallprompt is missed
      const timer = setTimeout(() => setShow(true), 3000);
      
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShow(true); // Ensure it shows if event fires
      };

      // In case it was caught globally earlier (if added to window)
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }

      window.addEventListener('beforeinstallprompt', handler);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIOSDevice || !deferredPrompt) {
      setShowIOSInstructions(true);
      return;
    }

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
      }
    } catch (err) {
      console.error('Error during PWA installation:', err);
    }
    setInstalling(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-[320px] z-[300] animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-2xl shadow-amber-900/10 border border-amber-100 overflow-hidden flex flex-col">
        {/* Main Banner Area */}
        <div className="p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center overflow-hidden">
            <Image src="/images/logo.png" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-black text-amber-950 leading-none mb-1 truncate">
              {isTe ? 'యాప్ ఇన్‌స్టాల్ చేయండి' : 'Install OM Natural'}
            </h4>
            <p className="text-[10px] text-gray-500 font-semibold truncate">
              {isTe ? 'వేగవంతమైన ఆర్డర్లు & ఆఫ్‌లైన్ సేవలు' : 'Fast orders & offline access'}
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Action Button */}
        <div className="px-3.5 pb-3.5">
          {showIOSInstructions ? (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2.5 animate-fade-in">
              <Share className="text-amber-700 shrink-0 mt-0.5" size={14} />
              <div className="text-[10px] text-amber-950 font-medium leading-relaxed">
                {isTe ? (isIOSDevice ? 'iOS లో ఇన్‌స్టాల్ చేయడానికి:' : 'ఇన్‌స్టాల్ చేయడానికి:') : (isIOSDevice ? 'To install on iOS:' : 'To install:')}
                <ol className="list-decimal ml-4 mt-0.5 space-y-0.5">
                  <li>{isTe ? 'బ్రౌజర్ మెను లేదా' : 'Tap the browser menu or'} <strong className="font-bold">{isTe ? 'Share' : 'Share'}</strong> {isTe ? 'బటన్‌ నొక్కండి.' : 'button.'}</li>
                  <li><strong className="font-bold">{isTe ? 'Add to Home Screen' : 'Install / Add to Home Screen'}</strong> {isTe ? 'ఎంచుకోండి.' : 'Select it.'}</li>
                </ol>
              </div>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              disabled={installing || (!isIOSDevice && !deferredPrompt)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-amber-800 hover:bg-amber-700 text-white text-[11px] font-black tracking-wide uppercase rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {installing ? (
                <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {isTe ? 'ఇన్‌స్టాల్ అవుతోంది...' : 'INSTALLING…'}</>
              ) : (
                <><Download size={13} /> {isTe ? 'యాప్ ఇన్‌స్టాల్ చేయండి' : 'INSTALL APP NOW'}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
