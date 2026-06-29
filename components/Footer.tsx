'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MessageCircle, ShieldCheck, MapPin } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const { t, language } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-b from-[#180e05] to-[#0c0602] text-amber-100/90 mt-auto border-t border-amber-955 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-amber-500/40 before:to-transparent pb-24 md:pb-0">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-stretch">
          
          {/* ══ LEFT COLUMN: Brand & Navigation ══ */}
          <div className="flex flex-col justify-between space-y-6 lg:space-y-4">
            
            {/* Brand Header */}
            <div className="space-y-3">
              <Link href="/" className="flex items-center gap-2.5 group inline-flex">
                {/* Circular Logo with a premium gradient border and glow effect */}
                <div className="relative rounded-full p-[1.5px] bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-700 w-10 h-10 sm:w-12 sm:h-12 shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white relative">
                    <Image
                      src="/images/logo.png"
                      alt="OM Natural Logo"
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col justify-center text-left">
                  <h2 className="text-base sm:text-2xl lg:text-2xl font-black tracking-tight font-heading gold-text-gradient drop-shadow-sm leading-tight">
                    {language === 'te' ? 'ఓం సహజ చెక్క గానుగ నూనెలు' : 'OM Natural Chekka Ganuga Oils'}
                  </h2>
                  <p className="text-[8px] sm:text-[10px] font-black tracking-[0.15em] text-amber-500 uppercase mt-0.5">
                    {language === 'te' ? 'సాంప్రదాయ నూనెలు' : '100% Pure & Chemical-Free'}
                  </p>
                </div>
              </Link>
              <p className="max-w-xl text-[10px] sm:text-xs text-amber-200/40 leading-relaxed font-medium text-left">
                {language === 'te' 
                  ? 'సాంప్రదాయ పద్ధతిలో తయారుచేసిన స్వచ్ఛమైన మరియు రసాయన రహిత చెక్క గానుగ వంట నూనెలు.' 
                  : 'Your trusted destination for traditionally crafted pure, cold-pressed cooking oils.'}
              </p>
            </div>

            {/* Quick Contact Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="tel:+918688291288"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#25150a]/90 border border-amber-900/30 rounded-full hover:border-amber-500/60 hover:bg-amber-950/70 text-amber-300 font-bold transition-all text-[9px] sm:text-xs shrink-0"
              >
                <Phone size={11} className="text-amber-400" />
                <span>+91 86882 91288</span>
              </a>
              <a
                href="https://wa.me/918688291288"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#092216]/90 border border-emerald-950 rounded-full hover:border-emerald-500/60 hover:bg-emerald-950/70 text-emerald-300 font-bold transition-all text-[9px] sm:text-xs shrink-0"
              >
                <MessageCircle size={11} className="text-emerald-400" />
                <span>WhatsApp</span>
              </a>
              <a
                href="mailto:info@om-naturals.com"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#25150a]/90 border border-amber-900/30 rounded-full hover:border-amber-500/60 hover:bg-amber-950/70 text-amber-300 font-bold transition-all text-[9px] sm:text-xs shrink-0"
              >
                <Mail size={11} className="text-amber-400" />
                <span>info@om-naturals.com</span>
              </a>
            </div>

            {/* Inline Navigation Links (Wrapped for more links) */}
            <div className="flex flex-col gap-3 w-full border-t border-amber-950/30 pt-6 pb-4 text-[10px] xs:text-xs sm:text-sm font-bold tracking-wide text-amber-200/80">
              <nav className="flex flex-wrap justify-center sm:justify-start items-center gap-x-3 sm:gap-x-4 gap-y-3 leading-relaxed">
                <Link href="/" className="hover:text-amber-400 transition-colors whitespace-nowrap">{t('nav_home')}</Link>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-800/60 hidden xs:block" />
                <Link href="/products" className="hover:text-amber-400 transition-colors whitespace-nowrap">{t('nav_oils')}</Link>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-800/60 hidden xs:block" />
                <Link href="/account?tab=orders" className="hover:text-amber-400 transition-colors whitespace-nowrap">{t('nav_track')}</Link>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-800/60 hidden sm:block" />
                <Link href="/about" className="hover:text-amber-400 transition-colors whitespace-nowrap">{language === 'te' ? 'మా గురించి' : 'About Us'}</Link>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-800/60 hidden xs:block" />
                <Link href="/contact" className="hover:text-amber-400 transition-colors whitespace-nowrap">{language === 'te' ? 'సంప్రదించండి' : 'Contact'}</Link>
              </nav>
              <nav className="flex flex-wrap justify-center sm:justify-start items-center gap-x-3 sm:gap-x-4 gap-y-3 opacity-90 leading-relaxed mt-1">
                <Link href="/shipping-policy" className="hover:text-amber-400 transition-colors whitespace-nowrap">{language === 'te' ? 'షిప్పింగ్' : 'Shipping'}</Link>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-800/60 hidden xs:block" />
                <Link href="/refund-policy" className="hover:text-amber-400 transition-colors whitespace-nowrap">{language === 'te' ? 'రీఫండ్స్ & క్యాన్సిలేషన్స్' : 'Refunds & Cancellations'}</Link>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-800/60 hidden lg:block" />
                <Link href="/privacy-policy" className="hover:text-amber-400 transition-colors whitespace-nowrap">{language === 'te' ? 'ప్రైవసీ' : 'Privacy'}</Link>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-800/60 hidden xs:block" />
                <Link href="/terms-conditions" className="hover:text-amber-400 transition-colors whitespace-nowrap">{language === 'te' ? 'నిబంధనలు' : 'Terms & Conditions'}</Link>
              </nav>
            </div>

          </div>

          {/* ══ RIGHT COLUMN: Google Maps Embed (shrunken height on mobile) ══ */}
          <div className="w-full h-32 lg:h-auto lg:min-h-[200px] rounded-2xl overflow-hidden shadow-xl relative group border border-amber-900/30 shrink-0">
            {/* Elegant overlay gradient that fades out on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10 group-hover:opacity-0 transition-opacity duration-500"></div>
            
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3828.7357141809703!2d80.4322966!3d16.3364427!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a358bcd27793cff%3A0x3730d16c23f9b485!2sOM%20NATURAL%20CHEKKA%20GANUGA%20NUNE!5e0!3m2!1sen!2sin!4v1782209958475!5m2!1sen!2sin" 
              className="absolute inset-0 w-full h-full grayscale-[15%] sepia-[15%] group-hover:grayscale-0 group-hover:sepia-0 transition-all duration-700"
              style={{ border: 0 }} 
              allowFullScreen={false} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="OM Natural Store Location on Google Maps"
            ></iframe>
            
            <div className="absolute bottom-2.5 left-2.5 z-20 bg-[#1c1009]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-amber-900/50 shadow-md flex items-center gap-1.5 group-hover:translate-y-10 group-hover:opacity-0 transition-all duration-300">
              <MapPin size={12} className="text-amber-500" />
              <div>
                <p className="text-[9px] font-black tracking-widest text-amber-400 uppercase leading-none mb-0.5">Visit Our Store</p>
                <p className="text-[9px] text-amber-100/70 font-semibold leading-none font-heading">Guntur, AP</p>
              </div>
            </div>
          </div>

        </div>

        {/* ══ BOTTOM BAR: Copyright & Secure Payments ══ */}
        <div className="mt-6 pt-4 border-t border-amber-955 w-full flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          
          <p className="text-[9px] sm:text-xs text-amber-600/70 font-bold order-2 md:order-1 flex-1">
            © {year} {language === 'te' ? 'ఓం సహజ చెక్క గానుగ నూనెలు' : 'OM NATURAL CHEKKA GANUGA NUNELU'}.<br className="sm:hidden" /> {language === 'te' ? 'అన్ని హక్కులు రక్షించబడ్డాయి.' : 'All Rights Reserved.'}
          </p>

          <a 
            href="https://wa.me/918886154275?text=Hi Satvik, I loved the Nune Bazaar website and want to discuss a project!" 
            target="_blank" 
            rel="noopener noreferrer"
            className="order-3 md:order-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-900/30 bg-[#1c1009]/50 hover:bg-[#2a170c] hover:border-amber-700/50 transition-all duration-300 group"
          >
            <span className="text-[10px] text-amber-500/80 font-medium tracking-wide group-hover:text-amber-400 transition-colors">Made with</span>
            <span className="text-red-500 animate-pulse text-[11px]">❤️</span>
            <span className="text-[10px] text-amber-500/80 font-medium tracking-wide group-hover:text-amber-400 transition-colors">by</span>
            <span className="text-[11px] font-bold text-amber-300 group-hover:text-amber-200 transition-colors">Satvik</span>
          </a>

          <div className="flex-1 flex justify-center md:justify-end order-1 md:order-3">
            <div className="flex items-center space-x-1.5 bg-[#140b05] px-3 py-1 rounded-full border border-amber-955 shadow-inner">
              <ShieldCheck size={12} className="text-amber-500" />
              <span className="text-[9px] font-bold text-amber-200/50 uppercase tracking-wide">{t('footer_secure')}:</span>
              <span className="text-[9px] font-black text-amber-400 tracking-wider">PhonePe / UPI / COD</span>
            </div>
          </div>

        </div>

      </div>
    </footer>
  );
}
