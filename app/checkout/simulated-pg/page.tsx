'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldCheck, CreditCard, XCircle, CheckCircle } from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';
import { useLanguage } from '@/context/LanguageContext';
import { useToastStore } from '@/store/toastStore';

function SimulatedPGContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const showToast = useToastStore((s) => s.showToast);

  const txnId = searchParams.get('txnId') || '';
  const orderId = searchParams.get('orderId') || '';
  const amount = searchParams.get('amount') || '0';
  const fallback = searchParams.get('fallback') === 'true';

  const [processing, setProcessing] = useState(false);
  const [outcome, setOutcome] = useState<'success' | 'failure' | null>(null);

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.replace('/');
    }
  }, [router]);

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleSimulate = async (status: 'success' | 'failure') => {
    setProcessing(true);

    try {
      const res = await fetch('/api/payment/simulate-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      });

      if (res.ok) {
        setOutcome(status);
        setTimeout(() => {
          if (status === 'success') {
            router.push(`/account?tab=orders`);
          } else {
            router.push(`/order-confirmation?orderId=${orderId}&status=${status}`);
          }
        }, 1500);
      } else {
        showToast(
          language === 'te'
            ? 'సిమ్యులేషన్ రన్ చేయడంలో లోపం జరిగింది.'
            : 'Error running simulation.',
          'error'
        );
        setProcessing(false);
      }
    } catch (err) {
      showToast(language === 'te' ? 'కనెక్షన్ లోపం.' : 'Connection error.', 'error');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50/20 flex flex-col items-center justify-center p-4">
      
      {/* Simulation Banner */}
      <div className="bg-amber-600 text-white text-xs font-bold px-6 py-2.5 rounded-full shadow-md mb-6 uppercase tracking-wider animate-pulse flex items-center space-x-2 text-center">
        <span>
          {language === 'te'
            ? '⚠️ డెమో మోడ్: పేమెంట్ గేట్‌వే సిమ్యులేటర్'
            : '⚠️ Demo Mode: Payment Gateway Simulator'}
        </span>
      </div>

      <div className="w-full max-w-md bg-white border border-amber-100 rounded-3xl smooth-shadow p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-700 mx-auto border border-amber-100">
            <CreditCard size={24} />
          </div>
          <h1 className="text-lg font-black text-amber-950 font-heading uppercase">PhonePe Test Checkout</h1>
          <p className="text-[10px] text-gray-500 font-bold">
            {fallback
              ? (language === 'te'
                  ? 'UAT కీలు లేవు - ఆటోమేటిక్ ఫాల్‌బ్యాక్ యాక్టివేట్ చేయబడింది'
                  : 'UAT Keys missing - Seamless fallback activated')
              : (language === 'te'
                  ? 'ఫోన్ పే పి.జి శాండ్‌బాక్స్ ఎమ్యులేటర్'
                  : 'PhonePe PG Sandbox Emulator')}
          </p>
        </div>

        {/* Transaction Summary Panel */}
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-xs font-medium text-amber-950 space-y-2.5">
          <div className="flex justify-between">
            <span className="text-gray-500">{language === 'te' ? 'మర్చంట్ పేరు:' : 'Merchant Name:'}</span>
            <span className="font-extrabold text-amber-900">OM Natural Chekka Ganuga Oils</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{language === 'te' ? 'లావాదేవీ ID:' : 'Transaction ID:'}</span>
            <span className="font-bold font-mono">{txnId || 'TXN-SIM-12345'}</span>
          </div>
          <div className="flex justify-between border-t border-amber-100 pt-2.5 items-baseline">
            <span className="text-gray-500 font-bold">{language === 'te' ? 'మొత్తం ధర:' : 'Amount:'}</span>
            <span className="text-lg font-black text-amber-800">₹{amount}</span>
          </div>
        </div>

        {/* Outcome Notification */}
        {processing && !outcome && (
          <PremiumLoader
            fullScreen={false}
            text={
              language === 'te'
                ? 'చెల్లింపు ప్రాసెస్ చేయబడుతోంది...'
                : 'Processing Payment...'
            }
          />
        )}

        {outcome === 'success' && (
          <div className="flex flex-col items-center justify-center py-4 space-y-1 text-center bg-green-50 rounded-2xl border border-green-200 animate-fade-in-up">
            <CheckCircle size={32} className="text-green-600 animate-bounce" />
            <p className="text-xs font-black text-green-900">
              {language === 'te' ? 'చెల్లింపు విజయవంతమైంది!' : 'Payment Successful!'}
            </p>
            <p className="text-[10px] text-green-600 font-bold">
              {language === 'te' ? 'ఆర్డర్ నిర్ధారణకు రీడైరెక్ట్ అవుతోంది...' : 'Redirecting to order confirmation...'}
            </p>
          </div>
        )}

        {outcome === 'failure' && (
          <div className="flex flex-col items-center justify-center py-4 space-y-1 text-center bg-red-50 rounded-2xl border border-red-200 animate-fade-in-up">
            <XCircle size={32} className="text-red-600 animate-bounce" />
            <p className="text-xs font-black text-red-900">
              {language === 'te' ? 'చెల్లింపు విఫలమైంది!' : 'Payment Failed!'}
            </p>
            <p className="text-[10px] text-red-600 font-bold">
              {language === 'te' ? 'మరలా ప్రయత్నించడానికి తిరిగి వెళ్తోంది...' : 'Returning to try again...'}
            </p>
          </div>
        )}

        {/* Simulation Actions */}
        {!processing && !outcome && (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => handleSimulate('success')}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-sm hover:shadow transition-all"
            >
              {language === 'te' ? 'విజయవంతమైన చెల్లింపును సిమ్యులేట్ చేయి' : 'Simulate Success Payment'}
            </button>
            <button
              onClick={() => handleSimulate('failure')}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-sm hover:shadow transition-all"
            >
              {language === 'te' ? 'వైఫల్యాన్ని సిమ్యులేట్ చేయి' : 'Simulate Failure Payment'}
            </button>
            
            <button
              onClick={() => router.push('/checkout')}
              className="w-full py-2.5 text-gray-500 hover:text-gray-700 font-bold text-xs hover:underline text-center block"
            >
              {language === 'te' ? 'రద్దు చేసి వెనుకకు వెళ్ళు' : 'Cancel & Go Back'}
            </button>
          </div>
        )}

        {/* Security Seals */}
        <div className="flex items-center justify-center space-x-1 text-[10px] text-gray-400 font-semibold border-t border-amber-50 pt-4">
          <ShieldCheck size={14} className="text-amber-700" />
          <span>PCI-DSS Secured • 256-bit Encryption</span>
        </div>

      </div>
    </div>
  );
}

export default function SimulatedPGPage() {
  return (
    <Suspense fallback={<PremiumLoader fullScreen={true} />}>
      <SimulatedPGContent />
    </Suspense>
  );
}
