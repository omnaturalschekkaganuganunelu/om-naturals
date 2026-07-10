'use client';

import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Product details render error:', error);
  }, [error]);

  return (
    <>
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 py-16 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center text-red-600 mb-6 animate-pulse">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-black text-amber-955 mb-2">Something went wrong!</h2>
        <p className="text-sm text-amber-800/80 font-bold max-w-md mb-8">
          We encountered an error loading this product page. This could be due to a brief database connection glitch.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-800 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
          >
            <RotateCcw size={14} />
            Try Again
          </button>
          <button
            onClick={() => router.push('/products')}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-amber-100 hover:border-amber-300 text-amber-955 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Home size={14} />
            Back to Catalog
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
