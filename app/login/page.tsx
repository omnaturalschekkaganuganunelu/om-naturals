'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { User, Mail, Lock, Phone, AlertCircle, RefreshCw, KeyRound, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';

const FALLBACK_PRODUCT_IMAGES = [
  'https://res.cloudinary.com/dftcaaum2/image/upload/v1783839130/izjekuxbtb3fe97inkc0.png',
  'https://res.cloudinary.com/dftcaaum2/image/upload/v1783839142/zyte7iympqrl6vxy7mac.png',
  'https://res.cloudinary.com/dftcaaum2/image/upload/v1783839140/pulvlbyuoyk9gtgp0wn7.png',
  'https://res.cloudinary.com/dftcaaum2/image/upload/v1783839144/sghw9ra92vsdgehp7zib.png',
  'https://res.cloudinary.com/dftcaaum2/image/upload/v1783839147/clrp6gzz7o54fzgyluzb.png',
  'https://res.cloudinary.com/dftcaaum2/image/upload/v1783839145/cscy5w87cgll6p8nvh4q.png',
];

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { language } = useLanguage();

  const redirectUrl = searchParams.get('redirect') || '/';

  // Tabs state
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Forgot Password state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'new_password'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Dynamic product images loading
  const [productImages, setProductImages] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const imgs = data.map((p: any) => p.images?.[0]).filter(Boolean);
          if (imgs.length > 0) {
            setProductImages(imgs);
          }
        }
      })
      .catch((err) => console.error('Failed to load product images:', err));
  }, []);

  // Deduplicate product images (since variants share the same image) and limit to a max of 12 unique images to avoid exceeding browser GPU height rendering limits
  const uniqueImages = Array.from(new Set(productImages.length > 0 ? productImages : FALLBACK_PRODUCT_IMAGES));
  const displayImages = uniqueImages.slice(0, 12);

  // Distribute all available product images evenly between the two scrolling columns
  const col1Images = displayImages.filter((_, i) => i % 2 === 0);
  const col2Images = displayImages.filter((_, i) => i % 2 !== 0);

  // Helper to ensure each column has enough items (at least 4) to fill the screen before duplicating for the seamless loop
  const prepareColumn = (imgs: string[]) => {
    let list = [...imgs];
    if (list.length === 0) {
      list = [...FALLBACK_PRODUCT_IMAGES.slice(0, 4)];
    }
    while (list.length < 4) {
      list = [...list, ...list];
    }
    // Duplicate the list once so the translateY(-50%) keyframe creates a seamless scroll wrap
    return [...list, ...list];
  };

  const fullCol1 = prepareColumn(col1Images);
  const fullCol2 = prepareColumn(col2Images);

  // Dynamically calculate speed based on item count so scrolling speed is constant and gentle
  const col1Duration = Math.round((fullCol1.length / 2) * 14);
  const col2Duration = Math.round((fullCol2.length / 2) * 15);

  // Redirect if already authenticated
  useEffect(() => {
    if (authStatus === 'authenticated') {
      router.push(redirectUrl);
    }
  }, [authStatus, router, redirectUrl]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!email || !password) {
      setErrorMsg(
        language === 'te'
          ? 'దయచేసి ఈమెయిల్/ఫోన్ మరియు పాస్‌వర్డ్ నమోదు చేయండి.'
          : 'Please enter both your email/phone and password.'
      );
      setLoading(false);
      return;
    }

    try {
      const res = await signIn('credentials', {
        email,
        password,
        otp: showOtp ? otp : undefined,
        redirect: false,
      });

      if (res?.error) {
        if (res.error === 'OTP_REQUIRED') {
          setShowOtp(true);
          setSuccessMsg(
            language === 'te'
              ? 'OTP మీ ఈమెయిల్ కి పంపబడింది.'
              : 'OTP sent to your email.'
          );
        } else if (res.error === 'INVALID_OTP') {
          setErrorMsg(
            language === 'te'
              ? 'చెల్లని OTP. దయచేసి మళ్ళీ ప్రయత్నించండి.'
              : 'Invalid OTP. Please try again.'
          );
        } else {
          setErrorMsg(
            language === 'te'
              ? 'లాగిన్ విఫలమైంది. తప్పు వివరాలు నమోదు చేసారు.'
              : 'Login failed. Incorrect email/phone or password.'
          );
        }
        setLoading(false);
      } else {
        setSuccessMsg(
          language === 'te'
            ? 'లాగిన్ విజయవంతమైంది! రీడైరెక్ట్ అవుతోంది...'
            : 'Login successful! Redirecting...'
        );
        setTimeout(() => {
          router.push(redirectUrl);
          router.refresh();
        }, 1000);
      }
    } catch (err) {
      setErrorMsg(
        language === 'te'
          ? 'ఏదో లోపం జరిగింది. దయచేసి మళ్ళీ ప్రయత్నించండి.'
          : 'Something went wrong. Please try again.'
      );
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!name || !password) {
      setErrorMsg(
        language === 'te'
          ? 'దయచేసి పేరు మరియు పాస్‌వర్డ్ నమోదు చేయండి.'
          : 'Please enter your name and password.'
      );
      setLoading(false);
      return;
    }

    if (!email && !phone) {
      setErrorMsg(
        language === 'te'
          ? 'దయచేసి ఈమెయిల్ లేదా ఫోన్ నెంబర్ ఏదైనా ఒకటి నమోదు చేయండి.'
          : 'Please provide either an Email address or a Mobile number.'
      );
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(
          language === 'te'
            ? 'నమోదు విజయవంతమైంది! స్వయంచాలకంగా లాగిన్ అవుతోంది...'
            : 'Registration successful! Logging in automatically...'
        );

        // Log in immediately with email or phone number
        const loginRes = await signIn('credentials', {
          email: email || phone,
          password,
          redirect: false,
        });

        if (loginRes?.ok) {
          setTimeout(() => {
            router.push(redirectUrl);
            router.refresh();
          }, 1500);
        } else {
          setActiveTab('login');
          setLoading(false);
        }
      } else {
        setErrorMsg(
          data.error ||
          (language === 'te' ? 'నమోదు చేయడంలో లోపం జరిగింది.' : 'Registration failed.')
        );
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg(
        language === 'te'
          ? 'సర్వర్ తో కనెక్ట్ కాలేకపోయాము.'
          : 'Unable to connect to the server.'
      );
      setLoading(false);
    }
  };

  const handleForgotSendOtp = async () => {
    setForgotError('');
    setForgotSuccess('');
    if (!forgotEmail) {
      setForgotError(language === 'te' ? 'దయచేసి ఈమెయిల్ నమోదు చేయండి.' : 'Please enter your email.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      setForgotSuccess(language === 'te' ? 'OTP మీ ఈమెయిల్ కి పంపబడింది.' : 'OTP sent to your email.');
      setForgotStep('otp');
    } catch (err: any) {
      setForgotError(err.message || 'Something went wrong');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async () => {
    setForgotError('');
    setForgotSuccess('');
    if (!forgotOtp || !forgotNewPassword) {
      setForgotError(language === 'te' ? 'దయచేసి OTP మరియు కొత్త పాస్‌వర్డ్ నమోదు చేయండి.' : 'Please enter OTP and new password.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, newPassword: forgotNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setForgotSuccess(language === 'te' ? 'పాస్‌వర్డ్ విజయవంతంగా మార్చబడింది!' : 'Password successfully reset!');
      setTimeout(() => {
        setForgotPasswordOpen(false);
        setForgotStep('email');
        setForgotEmail('');
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotSuccess('');
      }, 2000);
    } catch (err: any) {
      setForgotError(err.message || 'Something went wrong');
    } finally {
      setForgotLoading(false);
    }
  };

  if (authStatus === 'loading') {
    return (
      <PremiumLoader
        fullScreen={false}
        text={language === 'te' ? 'ధృవీకరించబడుతోంది...' : 'Verifying Session...'}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full animate-fade-in-up">
      <div className="flex w-full min-h-[calc(100vh-80px)]">

        {/* LEFT SIDE - Brand Visuals (Desktop Only) */}
        <div className="hidden lg:flex w-[45%] xl:w-1/2 relative bg-amber-950 overflow-hidden items-center justify-center">
          {/* Abstract Background Elements */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-amber-600/30 blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-800/40 blur-[100px]"></div>
            <div className="absolute inset-0 bg-repeat bg-center opacity-[0.02] mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.65\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noise)\"/%3E%3C/svg%3E')" }}></div>
          </div>

          {/* Custom Styles for Carousel */}
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes marqueescroll {
              0% { transform: translateY(0); }
              100% { transform: translateY(-50%); }
            }
            @keyframes marqueescrollreverse {
              0% { transform: translateY(-50%); }
              100% { transform: translateY(0); }
            }
            .animate-marquee-scroll {
              animation: marqueescroll ${col1Duration}s linear infinite;
            }
            .animate-marquee-scroll-reverse {
              animation: marqueescrollreverse ${col2Duration}s linear infinite;
            }
          `}} />

          {/* Glowing Logo */}
          <div className="absolute top-10 left-10 xl:top-16 xl:left-16 z-30 animate-fade-in-up">
            <div className="relative w-28 h-28 xl:w-36 xl:h-36 bg-white rounded-[2rem] p-3 shadow-[0_0_50px_rgba(245,158,11,0.4)] flex items-center justify-center overflow-hidden border-[3px] border-amber-400/30 hover:scale-105 transition-transform duration-500 hover:shadow-[0_0_60px_rgba(245,158,11,0.6)]">
              <div className="relative w-full h-full">
                <Image src="/images/logo-512.png" alt="OM Natural Logo" fill className="object-contain" />
              </div>
            </div>
          </div>

          {/* Premium Carousel Collage */}
          <div className="absolute inset-[-50%] z-10 flex gap-6 md:gap-8 justify-center items-center opacity-85 rotate-[-6deg] scale-[0.8] xl:scale-100 pointer-events-none">

            {/* Column 1 */}
            <div className="flex flex-col gap-6 md:gap-8 animate-marquee-scroll pt-[50%]">
              {fullCol1.map((img, idx) => (
                <div key={idx} className="relative w-48 h-64 md:w-56 md:h-72 rounded-3xl overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.5)] border border-amber-500/20 bg-gradient-to-br from-amber-800/40 to-amber-950/80 backdrop-blur-sm group">
                  <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
                  <Image src={img} alt="Product" fill className="object-contain p-6 group-hover:scale-110 transition-transform duration-700 ease-out z-0" />
                </div>
              ))}
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-6 md:gap-8 animate-marquee-scroll-reverse pb-[50%] mt-32">
              {fullCol2.map((img, idx) => (
                <div key={`col2-${idx}`} className="relative w-48 h-64 md:w-56 md:h-72 rounded-3xl overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.5)] border border-amber-500/20 bg-gradient-to-br from-amber-800/40 to-amber-950/80 backdrop-blur-sm group">
                  <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
                  <Image src={img} alt="Product" fill className="object-contain p-6 group-hover:scale-110 transition-transform duration-700 ease-out z-0" />
                </div>
              ))}
            </div>

          </div>

          {/* Overlay Gradient to fade out top/bottom edges of carousel */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-950 via-transparent to-amber-950 z-20 pointer-events-none opacity-90"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-amber-950/80 via-transparent to-amber-950/40 z-20 pointer-events-none"></div>

          {/* Brand Tagline Floating over carousel */}
          <div className="absolute bottom-10 left-10 xl:bottom-16 xl:left-16 z-30 max-w-md animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="w-12 h-1 bg-amber-500 rounded-full mb-6 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
            <h1 className="text-4xl xl:text-5xl font-black mb-3 leading-[1.1] font-heading tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
              {language === 'te' ? 'స్వచ్ఛత. సంప్రదాయం.' : 'Pure.'}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {language === 'te' ? 'గానుగ నూనెలు.' : 'Traditionally Crafted.'}
              </span>
            </h1>
            <p className="text-amber-100 font-semibold text-lg drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-xs">
              {language === 'te' ? 'మీ కుటుంబ ఆరోగ్యం కోసం.' : 'For your family\'s health and wellness.'}
            </p>
          </div>
        </div>

        {/* RIGHT SIDE - Auth Forms */}
        <div className="w-full lg:w-[55%] xl:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative bg-[#fdfbf7]">
          {/* Mobile decorative background */}
          <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-amber-100/60 to-transparent lg:hidden pointer-events-none"></div>

          <div className="w-full max-w-[460px] bg-white rounded-[2rem] shadow-[0_8px_40px_-12px_rgba(180,83,9,0.15)] p-6 sm:p-8 border border-amber-100/50 relative z-10">

            {/* Header Text */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-black text-amber-950 font-heading mb-3 tracking-tight">
                {language === 'te'
                  ? (activeTab === 'login' ? 'తిరిగి స్వాగతం!' : 'ఖాతా సృష్టించండి')
                  : (activeTab === 'login' ? 'Welcome Back!' : 'Create an Account')}
              </h2>
              <p className="text-gray-500 font-medium text-sm">
                {language === 'te'
                  ? (activeTab === 'login' ? 'దయచేసి మీ లాగిన్ వివరాలను నమోదు చేయండి.' : 'మాతో చేరడానికి మీ వివరాలను ఇవ్వండి.')
                  : (activeTab === 'login' ? 'Please enter your details to sign in to your account.' : 'Join us to get the best pure oils for your family.')}
              </p>
            </div>

            {/* Custom Premium Tabs */}
            <div className="flex p-1 bg-amber-50/80 rounded-2xl mb-6">
              <button
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'login'
                  ? 'bg-white text-amber-900 shadow-[0_2px_10px_-2px_rgba(180,83,9,0.15)]'
                  : 'text-amber-700/60 hover:text-amber-800 hover:bg-white/50'
                  }`}
              >
                {language === 'te' ? 'లాగిన్' : 'Sign In'}
              </button>
              <button
                onClick={() => {
                  setActiveTab('register');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'register'
                  ? 'bg-white text-amber-900 shadow-[0_2px_10px_-2px_rgba(180,83,9,0.15)]'
                  : 'text-amber-700/60 hover:text-amber-800 hover:bg-white/50'
                  }`}
              >
                {language === 'te' ? 'నమోదు' : 'Register'}
              </button>
            </div>

            {/* Form Body */}
            {activeTab === 'login' ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fade-in-up">

                <div className="space-y-2">
                  <label htmlFor="login-email" className="text-xs font-bold text-gray-600 block ml-1 uppercase tracking-wider">
                    {language === 'te' ? 'ఈమెయిల్ లేదా ఫోన్ నెంబర్' : 'Email or Mobile Number'}
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      id="login-email"
                      placeholder={language === 'te' ? 'ఉదా: name@example.com లేదా 9876543210' : 'e.g. name@example.com or 9876543210'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-amber-50/40 text-sm border-2 border-amber-100 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-semibold text-amber-950 placeholder-gray-400"
                    />
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600/50 group-focus-within:text-amber-600 transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label htmlFor="login-password" className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      {language === 'te' ? 'పాస్‌వర్డ్' : 'Password'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      {language === 'te' ? 'మరిచిపోయారా?' : 'Forgot?'}
                    </button>
                  </div>
                  <div className="relative group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="login-password"
                      placeholder="••••••••"
                      value={password}
                      disabled={showOtp}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-amber-50/40 text-sm border-2 border-amber-100 rounded-xl py-2.5 pl-11 pr-11 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-semibold text-amber-950 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-50"
                    />
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600/50 group-focus-within:text-amber-600 transition-colors" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-600/50 hover:text-amber-800 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {showOtp && (
                  <div className="space-y-2 animate-fade-in-up pt-2 border-t border-dashed border-amber-200">
                    <label htmlFor="login-otp" className="text-xs font-bold text-amber-800 block ml-1 uppercase tracking-wider">
                      {language === 'te' ? 'OTP నమోదు చేయండి' : 'Enter OTP Sent to Email'}
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        id="login-otp"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full bg-white text-base border-2 border-amber-300 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-amber-600 transition-all font-black tracking-[0.2em] text-amber-950"
                      />
                      <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600" />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-2 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-black text-sm rounded-xl shadow-[0_8px_20px_-6px_rgba(180,83,9,0.4)] hover:shadow-[0_12px_24px_-6px_rgba(180,83,9,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin text-amber-200" />
                      <span>{language === 'te' ? 'దయచేసి వేచి ఉండండి...' : 'Authenticating...'}</span>
                    </>
                  ) : showOtp ? (
                    <>
                      <span>{language === 'te' ? 'OTP తో లాగిన్ అవ్వండి' : 'Verify OTP & Login'}</span>
                      <ArrowRight size={18} />
                    </>
                  ) : (
                    <>
                      <span>{language === 'te' ? 'లాగిన్' : 'Sign In Securely'}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {/* Separator */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-amber-100"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    {language === 'te' ? 'లేదా' : 'or'}
                  </span>
                  <div className="flex-grow border-t border-amber-100"></div>
                </div>

                {/* Google Button */}
                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl: redirectUrl })}
                  className="w-full flex items-center justify-center gap-3 py-2.5 border-2 border-amber-100 hover:border-amber-500 rounded-xl bg-white hover:bg-amber-50/20 text-gray-700 hover:text-amber-950 font-bold text-sm transition-all duration-300 active:scale-98 shadow-sm hover:shadow"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.42 7.54l3.79 2.94C6.12 7.55 8.84 5.04 12 5.04z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.02 3.67-8.64z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.21 14.59c-.25-.75-.4-1.56-.4-2.59s.15-1.84.4-2.59L1.42 6.47C.51 8.28 0 10.28 0 12s.51 3.72 1.42 5.53l3.79-2.94z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.1.74-2.5 1.18-4.2 1.18-3.16 0-5.88-2.51-6.79-5.44L1.42 16.35C3.37 20.35 7.35 23 12 23z"
                    />
                  </svg>
                  <span>{language === 'te' ? 'గూగుల్ తో కొనసాగండి' : 'Continue with Google'}</span>
                </button>

              </form>
            ) : (
              /* REGISTRATION FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fade-in-up">

                <div className="space-y-2">
                  <label htmlFor="register-name" className="text-xs font-bold text-gray-600 block ml-1 uppercase tracking-wider">
                    {language === 'te' ? 'పూర్తి పేరు' : 'Full Name'}
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      id="register-name"
                      placeholder={language === 'te' ? 'ఉదా: వెంకట్ సుబ్బారావు' : 'e.g. Venkat Subbarao'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-amber-50/40 text-sm border-2 border-amber-100 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-semibold text-amber-950 placeholder-gray-400"
                    />
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600/50 group-focus-within:text-amber-600 transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-email" className="text-xs font-bold text-gray-600 block ml-1 uppercase tracking-wider">
                    {language === 'te' ? 'ఈమెయిల్ చిరునామా (ఐచ్ఛికం)' : 'Email Address (Optional)'}
                  </label>
                  <div className="relative group">
                    <input
                      type="email"
                      id="register-email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-amber-50/40 text-sm border-2 border-amber-100 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-semibold text-amber-950 placeholder-gray-400"
                    />
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600/50 group-focus-within:text-amber-600 transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-phone" className="text-xs font-bold text-gray-600 block ml-1 uppercase tracking-wider">
                    {language === 'te' ? 'ఫోన్ నెంబర్' : 'Mobile Number'}
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      id="register-phone"
                      placeholder={language === 'te' ? 'ఉదా: 9876543210' : 'e.g. 9876543210'}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-amber-50/40 text-sm border-2 border-amber-100 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-semibold text-amber-950 placeholder-gray-400"
                    />
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600/50 group-focus-within:text-amber-600 transition-colors" />
                  </div>
                  <p className="text-[10px] text-amber-800 font-semibold ml-1">
                    {language === 'te' ? '* ఈమెయిల్ లేకపోతే ఫోన్ నెంబర్ తప్పనిసరి.' : '* Mobile number is required if Email is not provided.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-password" className="text-xs font-bold text-gray-600 block ml-1 uppercase tracking-wider">
                    {language === 'te' ? 'పాస్‌వర్డ్' : 'Password'}
                  </label>
                  <div className="relative group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="register-password"
                      placeholder={language === 'te' ? 'కనీసం 6 అక్షరాలు...' : 'Min 6 characters...'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-amber-50/40 text-sm border-2 border-amber-100 rounded-xl py-2.5 pl-11 pr-11 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-semibold text-amber-950 placeholder-gray-400"
                    />
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600/50 group-focus-within:text-amber-600 transition-colors" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-600/50 hover:text-amber-800 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-4 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-black text-sm rounded-xl shadow-[0_8px_20px_-6px_rgba(180,83,9,0.4)] hover:shadow-[0_12px_24px_-6px_rgba(180,83,9,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin text-amber-200" />
                      <span>{language === 'te' ? 'నమోదు చేయబడుతోంది...' : 'Creating Account...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{language === 'te' ? 'ఖాతా సృష్టించు' : 'Create Account'}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {/* Separator */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-amber-100"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    {language === 'te' ? 'లేదా' : 'or'}
                  </span>
                  <div className="flex-grow border-t border-amber-100"></div>
                </div>

                {/* Google Button */}
                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl: redirectUrl })}
                  className="w-full flex items-center justify-center gap-3 py-2.5 border-2 border-amber-100 hover:border-amber-500 rounded-xl bg-white hover:bg-amber-50/20 text-gray-700 hover:text-amber-950 font-bold text-sm transition-all duration-300 active:scale-98 shadow-sm hover:shadow"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.42 7.54l3.79 2.94C6.12 7.55 8.84 5.04 12 5.04z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.02 3.67-8.64z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.21 14.59c-.25-.75-.4-1.56-.4-2.59s.15-1.84.4-2.59L1.42 6.47C.51 8.28 0 10.28 0 12s.51 3.72 1.42 5.53l3.79-2.94z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.1.74-2.5 1.18-4.2 1.18-3.16 0-5.88-2.51-6.79-5.44L1.42 16.35C3.37 20.35 7.35 23 12 23z"
                    />
                  </svg>
                  <span>{language === 'te' ? 'గూగుల్ తో కొనసాగండి' : 'Continue with Google'}</span>
                </button>

              </form>
            )}

            {/* Error Feedback */}
            {errorMsg && (
              <div className="mt-6 p-4 bg-red-50/80 border border-red-100 rounded-2xl text-xs sm:text-sm text-red-700 font-bold flex items-start space-x-2 animate-fade-in-up">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Success Feedback */}
            {successMsg && (
              <div className="mt-6 p-4 bg-green-50/80 border border-green-100 rounded-2xl text-xs sm:text-sm text-green-800 font-bold flex items-center justify-center space-x-2 animate-fade-in-up">
                <CheckCircle2 size={18} className="text-green-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Forgot Password Modal Overlay */}
            {forgotPasswordOpen && (
              <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in-up rounded-l-[2.5rem]">
                <div className="bg-white border border-amber-100 w-full max-w-sm rounded-3xl p-6 sm:p-8 shadow-2xl relative">
                  <button
                    onClick={() => {
                      setForgotPasswordOpen(false);
                      setForgotStep('email');
                      setForgotEmail('');
                      setForgotOtp('');
                      setForgotNewPassword('');
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2"
                  >
                    ✕
                  </button>
                  <h3 className="text-xl font-black text-amber-950 mb-2">
                    {language === 'te' ? 'పాస్‌వర్డ్ రీసెట్' : 'Reset Password'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {forgotStep === 'email'
                      ? (language === 'te' ? 'మీ ఈమెయిల్ నమోదు చేయండి.' : 'Enter your registered email address.')
                      : forgotStep === 'otp'
                        ? (language === 'te' ? 'మీ ఈమెయిల్ కి పంపిన OTP నమోదు చేయండి.' : 'Enter the OTP sent to your email.')
                        : (language === 'te' ? 'మీ కొత్త పాస్‌వర్డ్ నమోదు చేయండి.' : 'Enter your new password.')
                    }
                  </p>

                  <div className="space-y-4">
                    {forgotStep === 'email' && (
                      <input
                        type="email"
                        aria-label={language === 'te' ? 'పాస్‌వర్డ్ రీసెట్ కొరకు ఈమెయిల్' : 'Email address for password reset'}
                        placeholder="name@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full bg-amber-50/40 text-sm border-2 border-amber-100 rounded-xl py-3 px-4 focus:outline-none focus:border-amber-500 font-semibold"
                      />
                    )}
                    {forgotStep === 'otp' && (
                      <input
                        type="text"
                        aria-label={language === 'te' ? 'OTP నమోదు చేయండి' : 'Enter OTP'}
                        placeholder="123456"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        className="w-full bg-amber-50/40 text-lg tracking-widest text-center border-2 border-amber-100 rounded-xl py-3 px-4 focus:outline-none focus:border-amber-500 font-black"
                      />
                    )}
                    {forgotStep === 'new_password' && (
                      <div className="relative group">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          aria-label={language === 'te' ? 'కొత్త పాస్‌వర్డ్' : 'New password'}
                          placeholder={language === 'te' ? 'కొత్త పాస్‌వర్డ్...' : 'New password...'}
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          className="w-full bg-amber-50/40 text-sm border-2 border-amber-100 rounded-xl py-3 pl-4 pr-11 focus:outline-none focus:border-amber-500 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-600/50 hover:text-amber-800"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    )}

                    {forgotError && (
                      <p className="text-red-500 text-xs font-bold">{forgotError}</p>
                    )}
                    {forgotSuccess && (
                      <p className="text-green-600 text-xs font-bold">{forgotSuccess}</p>
                    )}

                    <button
                      onClick={
                        forgotStep === 'email' ? handleForgotSendOtp :
                          forgotStep === 'otp' ? () => {
                            if (forgotOtp.length > 3) setForgotStep('new_password');
                            else setForgotError('Invalid OTP length');
                          } : handleForgotReset
                      }
                      disabled={forgotLoading}
                      className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl flex justify-center items-center gap-2"
                    >
                      {forgotLoading && <RefreshCw size={16} className="animate-spin" />}
                      {forgotStep === 'email' ? (language === 'te' ? 'OTP పంపు' : 'Send OTP')
                        : forgotStep === 'otp' ? (language === 'te' ? 'ధృవీకరించు' : 'Verify')
                          : (language === 'te' ? 'పాస్‌వర్డ్ మార్చు' : 'Reset Password')
                      }
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
            <Suspense fallback={<PremiumLoader fullScreen={true} />}>
        <LoginContent />
      </Suspense>
          </div>
  );
}
