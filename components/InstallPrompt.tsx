'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Zap, Package, Share2, Star } from 'lucide-react';

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
  const [installed, setInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const daysSince = (Date.now() - parseInt(dismissed, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    // Already installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const android = /android/.test(ua);
    setIsIOSDevice(ios);
    setIsAndroid(android);

    if (ios) {
      // Show iOS prompt after 4s
      const t = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 4000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstalled(true); setShow(false); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { setInstalled(true); setShow(false); }
    } catch {}
    setInstalling(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setShow(false);
  };

  if (!show || installed) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[290]"
        onClick={handleDismiss}
      />

      {/* Install Card */}
      <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 md:max-w-[400px] z-[300]">
        <div className="bg-white md:rounded-3xl rounded-t-3xl shadow-2xl border border-amber-100 overflow-hidden animate-slide-up">

          {/* Amber Gradient Header */}
          <div className="relative bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 px-6 pt-6 pb-5 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-600/20 rounded-full" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-amber-500/20 rounded-full" />

            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 hover:bg-amber-700/60 rounded-full transition-colors z-10"
              aria-label="Close"
            >
              <X size={16} className="text-amber-200" />
            </button>

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur border-2 border-white/30 flex items-center justify-center shadow-xl overflow-hidden flex-shrink-0">
                <img src="/images/logo.jpg" alt="OM Natural" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-black text-base leading-tight">Install OM Natural</p>
                  <span className="bg-amber-400 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-full">FREE</span>
                </div>
                <p className="text-amber-300 text-xs font-semibold">100% Pure Wood Pressed Oils</p>
                <div className="flex items-center gap-0.5 mt-1.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-amber-300/80 text-[9px] font-bold ml-1">4.9 · 500+ orders</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Pills */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { icon: Zap,       label: 'Faster\nOrdering',  bg: 'bg-amber-50',  color: 'text-amber-600' },
                { icon: Package,   label: 'Order\nTracking',   bg: 'bg-blue-50',   color: 'text-blue-600'  },
                { icon: Smartphone, label: 'Works\nOffline',   bg: 'bg-green-50',  color: 'text-green-600' },
              ].map(({ icon: Icon, label, bg, color }) => (
                <div key={label} className={`${bg} rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center`}>
                  <Icon size={18} className={color} />
                  <p className={`text-[10px] font-bold leading-tight ${color}`} style={{ whiteSpace: 'pre-line' }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {isIOSDevice ? (
              /* iOS Instructions */
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
                <p className="text-xs font-black text-amber-900 mb-2.5 flex items-center gap-1.5">
                  <Share2 size={13} className="text-amber-700" />
                  Install on iPhone / iPad
                </p>
                <div className="space-y-2">
                  {[
                    'Open this site in Safari browser',
                    'Tap the Share button (□↑) in the toolbar',
                    'Scroll down and tap "Add to Home Screen"',
                    'Tap "Add" in the top right corner',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 bg-amber-700 text-white rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-[11px] text-gray-600 font-medium leading-snug">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 font-medium text-center leading-snug mb-4">
                Add to your home screen — no app store needed. Works on Android & Desktop!
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 py-3 border-2 border-gray-100 text-gray-500 text-xs font-bold rounded-2xl hover:bg-gray-50 transition-colors"
              >
                Maybe Later
              </button>
              {!isIOSDevice && (
                <button
                  onClick={handleInstall}
                  disabled={installing || !deferredPrompt}
                  className="flex-[2] flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-700 to-amber-900 text-white text-sm font-black rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {installing ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Installing…</>
                  ) : (
                    <><Download size={15} /> INSTALL NOW</>
                  )}
                </button>
              )}
            </div>

            <p className="text-center text-[10px] text-gray-300 font-semibold mt-3">
              Free · No app store · Works instantly
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
