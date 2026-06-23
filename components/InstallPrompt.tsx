'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor, Zap, Package, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'om-natural-pwa-dismissed';
const DISMISS_DAYS = 7;

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    // Register service worker to satisfy PWA installation requirements
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered successfully', reg.scope))
        .catch((err) => console.error('Service Worker registration failed', err));
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    // Check if already installed / running in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true;

    if (isStandalone) return;

    // Detect if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOSDevice(isIOS);

    if (isIOS) {
      // Show iOS install guidelines after 3s
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    } else {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        // Show after 3s so it doesn't interrupt initial page load
        setTimeout(() => setShow(true), 3000);
      };

      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
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
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-[300] animate-fade-in-up">
      <div className="bg-white rounded-3xl shadow-2xl border border-amber-100 overflow-hidden">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-amber-800 to-amber-900 px-5 pt-5 pb-4 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 hover:bg-amber-700/60 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={14} className="text-amber-200" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shadow-inner overflow-hidden">
              <img src="/images/logo.jpg" alt="OM Natural Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-tight">Install OM Natural</p>
              <p className="text-amber-300 text-[11px] font-semibold mt-0.5">Pure Oils · Fast Orders · Free</p>
            </div>
          </div>
        </div>

        {/* Features list */}
        <div className="px-5 py-4 space-y-3.5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Zap,       text: 'Faster\nOrdering',  color: 'text-amber-600',  bg: 'bg-amber-50'  },
              { icon: Package,   text: 'Order\nTracking',   color: 'text-blue-600',   bg: 'bg-blue-50'   },
              { icon: Smartphone, text: 'Works\nOffline',   color: 'text-green-600',  bg: 'bg-green-50'  },
            ].map(({ icon: Icon, text, color, bg }) => (
              <div key={text} className={`${bg} rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center`}>
                <Icon size={16} className={color} />
                <p className={`text-[10px] font-bold leading-tight ${color}`} style={{ whiteSpace: 'pre-line' }}>{text}</p>
              </div>
            ))}
          </div>

          {isIOSDevice ? (
            <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-3 flex items-start gap-2.5">
              <Share className="text-amber-700 shrink-0 mt-0.5" size={15} />
              <div className="text-[11px] text-amber-950 font-medium leading-relaxed">
                To install on iOS:
                <ol className="list-decimal ml-4 mt-1 space-y-1">
                  <li>Tap the <strong className="font-bold">Share</strong> button in Safari browser.</li>
                  <li>Scroll down and select <strong className="font-bold">Add to Home Screen</strong>.</li>
                </ol>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 font-medium text-center leading-snug">
              Add to your home screen for the fastest shopping experience. No app store needed!
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 border border-gray-200 text-gray-500 text-xs font-bold rounded-2xl hover:bg-gray-50 transition-colors"
            >
              Maybe Later
            </button>
            {!isIOSDevice && (
              <button
                onClick={handleInstall}
                disabled={installing || !deferredPrompt}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-amber-700 to-amber-900 text-white text-xs font-black rounded-2xl shadow-md hover:shadow-amber-500/30 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {installing ? (
                  <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Installing…</>
                ) : (
                  <><Download size={13} /> Install App</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
