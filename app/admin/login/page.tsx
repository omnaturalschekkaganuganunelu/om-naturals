'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { ShieldAlert, Mail, Lock, RefreshCw, AlertCircle, KeyRound, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PremiumLoader from '@/components/PremiumLoader';

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { language } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  // Redirect if already admin
  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user?.role === 'ADMIN') {
      router.push('/admin/dashboard');
    }
  }, [authStatus, session, router]);

  // Focus OTP input when step changes
  useEffect(() => {
    if (step === 'otp' && otpRef.current) {
      setTimeout(() => otpRef.current?.focus(), 100);
    }
  }, [step]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailVal = emailRef.current?.value || email;
    const passwordVal = passwordRef.current?.value || password;

    setErrorMsg('');
    setLoading(true);

    if (!emailVal || !passwordVal) {
      setErrorMsg(language === 'te' ? 'దయచేసి అడ్మిన్ ఈమెయిల్ మరియు పాస్‌వర్డ్ వివరాలు నింపండి.' : 'Please fill in admin email and password.');
      setLoading(false);
      return;
    }

    // Update state from refs (in case controlled input didn't fire properly)
    if (emailRef.current) setEmail(emailRef.current.value);
    if (passwordRef.current) setPassword(passwordRef.current.value);

    try {
      const res = await signIn('credentials', {
        email: emailVal,
        password: passwordVal,
        otp: '',
        redirect: false,
      });

      if (res?.error === 'OTP_REQUIRED') {
        // OTP has been sent to email
        setSuccessMsg(
          language === 'te'
            ? `OTP మీ ఈమెయిల్‌కి పంపబడింది: ${emailVal}. దయచేసి మీ ఇన్‌బాక్స్ చెక్ చేయండి.`
            : `OTP sent to your email: ${emailVal}. Please check your inbox.`
        );
        setStep('otp');
        setLoading(false);
      } else if (res?.error) {
        setErrorMsg(
          language === 'te'
            ? 'లాగిన్ విఫలమైంది. వివరాలు సరిగ్గా లేవు లేదా మీకు అడ్మిన్ అధికారాలు లేవు.'
            : 'Login failed. Invalid credentials or insufficient admin permissions.'
        );
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

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpVal = otpRef.current?.value || otp;

    setErrorMsg('');
    setLoading(true);

    if (!otpVal || otpVal.trim().length !== 6) {
      setErrorMsg(language === 'te' ? 'దయచేసి 6-అంకెల OTP నింపండి.' : 'Please enter the 6-digit OTP.');
      setLoading(false);
      return;
    }

    try {
      const res = await signIn('credentials', {
        email,
        password,
        otp: otpVal.trim(),
        redirect: false,
      });

      if (res?.error) {
        if (res.error === 'INVALID_OTP') {
          setErrorMsg(
            language === 'te'
              ? 'OTP తప్పు లేదా గడువు తీరింది. మళ్ళీ ప్రయత్నించండి.'
              : 'Invalid or expired OTP. Please try again.'
          );
        } else {
          setErrorMsg(
            language === 'te'
              ? 'లాగిన్ విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి.'
              : 'Login failed. Please try again.'
          );
        }
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

  const handleResendOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    setOtp('');
    setStep('credentials');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        otp: '',
        redirect: false,
      });

      if (res?.error === 'OTP_REQUIRED') {
        setSuccessMsg(
          language === 'te'
            ? `నూతన OTP మీ ఈమెయిల్‌కి పంపబడింది: ${email}`
            : `New OTP sent to: ${email}`
        );
        setStep('otp');
      }
    } catch (err) {
      setErrorMsg(language === 'te' ? 'OTP పంపడంలో లోపం.' : 'Error sending OTP.');
    }
    setLoading(false);
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
            {step === 'otp' ? <KeyRound size={24} /> : <ShieldAlert size={24} />}
          </div>
          <h1 className="text-lg font-black text-amber-950 font-heading uppercase tracking-wider">
            {step === 'otp'
              ? (language === 'te' ? 'OTP నిర్ధారణ' : 'OTP Verification')
              : (language === 'te' ? 'అడ్మిన్ పోర్టల్' : 'Admin Portal')}
          </h1>
          <p className="text-[10px] text-gray-400 font-bold">
            {step === 'otp'
              ? (language === 'te' ? 'ఈమెయిల్‌కి పంపిన OTP నమోదు చేయండి' : 'Enter the OTP sent to your email')
              : (language === 'te' ? 'సెక్యూరిటీ యాక్సెస్ లాగిన్' : 'Security Access Login')}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center space-x-2">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${step === 'credentials' ? 'bg-amber-800 text-white' : 'bg-green-500 text-white'}`}>
            {step === 'otp' ? <CheckCircle size={14} /> : '1'}
          </div>
          <div className={`h-0.5 w-8 ${step === 'otp' ? 'bg-green-500' : 'bg-amber-200'}`} />
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${step === 'otp' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-400'}`}>
            2
          </div>
        </div>

        {/* STEP 1: Credentials */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 block">
                {language === 'te' ? 'అడ్మిన్ ఈమెయిల్' : 'Admin Email'}
              </label>
              <div className="relative">
                <input
                  id="admin-email"
                  ref={emailRef}
                  type="email"
                  placeholder="admin@nunebazaar.com"
                  defaultValue={email}
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
                  id="admin-password"
                  ref={passwordRef}
                  type="password"
                  placeholder="••••••••"
                  defaultValue={password}
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
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{language === 'te' ? 'OTP పంపబడుతోంది...' : 'Sending OTP...'}</span>
                </>
              ) : (
                <span>{language === 'te' ? 'తదుపరి' : 'Continue'}</span>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: OTP */}
        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            {successMsg && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-2xl text-[10px] sm:text-xs text-green-700 font-semibold flex items-start space-x-1.5">
                <CheckCircle size={14} className="shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 block">
                {language === 'te' ? '6-అంకెల OTP' : '6-Digit OTP'}
              </label>
              <div className="relative">
                <input
                  id="admin-otp"
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  defaultValue={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-amber-50/10 text-center text-lg tracking-[0.5em] font-black border border-amber-100 rounded-xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-amber-800 hover:bg-amber-700 text-white font-extrabold text-xs rounded-full shadow hover:shadow-md transition-all flex items-center justify-center space-x-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{language === 'te' ? 'ధృవీకరించబడుతోంది...' : 'Verifying...'}</span>
                </>
              ) : (
                <span>{language === 'te' ? 'లాగిన్' : 'Sign In'}</span>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-[10px] text-amber-700 font-bold underline hover:text-amber-800"
              >
                {language === 'te' ? 'OTP మళ్ళీ పంపించు' : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

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
