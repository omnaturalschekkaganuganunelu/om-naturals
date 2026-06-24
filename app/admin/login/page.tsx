'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { ShieldAlert, Mail, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PremiumLoader from '@/components/PremiumLoader';

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { language } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Redirect if already admin
  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user?.role === 'ADMIN') {
      router.push('/admin/dashboard');
    }
  }, [authStatus, session]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (!email || !password) {
      setErrorMsg(language === 'te' ? 'దయచేసి అడ్మిన్ ఈమెయిల్ మరియు పాస్‌వర్డ్ వివరాలు నింపండి.' : 'Please fill in admin email and password.');
      setLoading(false);
      return;
    }

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMsg(language === 'te' ? 'లాగిన్ విఫలమైంది. వివరాలు సరిగ్గా లేవు లేదా మీకు అడ్మిన్ అధికారాలు లేవు.' : 'Login failed. Invalid credentials or insufficient permissions.');
        setLoading(false);
      } else {
        router.push('/admin/dashboard');
        router.refresh();
      }
    } catch (err) {
      setErrorMsg(language === 'te' ? 'సర్వర్ కనెక్టివిటీ లోపం.' : 'Server connectivity error.');
      setLoading(false);
    }
  };

  if (authStatus === 'loading') {
    return (
      <PremiumLoader
        fullScreen={true}
        text={language === 'te' ? 'అడ్మిన్ గేట్ వెరిఫై అవుతోంది...' : 'Verifying admin gate...'}
      />
    );
  }

  return (
    <div className="min-h-screen bg-amber-50/20 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-amber-100 rounded-3xl smooth-shadow p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-amber-800 text-white rounded-full flex items-center justify-center shadow mx-auto">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-lg font-black text-amber-950 font-heading uppercase tracking-wider">
            {language === 'te' ? 'అడ్మిన్ పోర్టల్' : 'Admin Portal'}
          </h1>
          <p className="text-[10px] text-gray-400 font-bold">
            {language === 'te' ? 'సెక్యూరిటీ యాక్సెస్ లాగిన్' : 'Security Access Login'}
          </p>
        </div>



        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 block">
              {language === 'te' ? 'అడ్మిన్ ఈమెయిల్' : 'Admin Email'}
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="admin@nunebazaar.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-amber-50/10 text-xs border border-amber-100 rounded-xl py-3 pl-10 pr-3 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
              />
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 block">
              {language === 'te' ? 'అడ్మిన్ పాస్‌వర్డ్' : 'Admin Password'}
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-amber-50/10 text-xs border border-amber-100 rounded-xl py-3 pl-10 pr-3 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
              />
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-800 hover:bg-amber-700 text-white font-extrabold text-xs rounded-full shadow hover:shadow-md transition-all flex items-center justify-center space-x-1.5"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin text-amber-900" />
                <span>{language === 'te' ? 'ధృవీకరించబడుతోంది...' : 'Verifying...'}</span>
              </>
            ) : (
              <span>{language === 'te' ? 'లాగిన్' : 'Sign In'}</span>
            )}
          </button>
        </form>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-[10px] sm:text-xs text-red-600 font-semibold flex items-start space-x-1.5">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

      </div>
    </div>
  );
}
