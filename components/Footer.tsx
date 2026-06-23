'use client';

import React from 'react';
import Link from 'next/link';
import { Phone, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const { t, language } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-b from-[#180e05] to-[#0c0602] text-amber-100/90 mt-auto border-t border-amber-950/90 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-amber-500/40 before:to-transparent">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center text-center space-y-8">
        
        {/* Brand Header */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-heading gold-text-gradient drop-shadow-sm">
            {language === 'te' ? 'ఓం సహజ చెక్క గానుగ నూనెలు' : 'OM Natural Chekka Ganuga Oils'}
          </h2>
          <p className="text-[10px] font-black tracking-[0.25em] text-amber-500 uppercase">
            OM NATURAL CHEKKA GANUGA OILS
          </p>
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mt-2" />
          <p className="max-w-md text-xs text-amber-200/50 leading-relaxed font-semibold pt-1.5">
            {language === 'te' 
              ? 'సాంప్రదాయ పద్ధతిలో తయారుచేసిన స్వచ్ఛమైన మరియు రసాయన రహిత చెక్క గానుగ వంట నూనెలు.' 
              : 'Your trusted destination for traditionally crafted pure, chemical-free cold pressed cooking oils.'}
          </p>
        </div>

        {/* Quick Compact Contacts */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href="tel:+918688291288"
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#25150a] border border-amber-900/30 rounded-full hover:border-amber-500/60 hover:bg-amber-950/70 hover:shadow-[0_0_12px_rgba(245,158,11,0.1)] text-amber-300 font-bold transition-all duration-300 text-xs"
          >
            <Phone size={13} className="text-amber-400" />
            <span>+91 86882 91288</span>
          </a>
          <a
            href="https://wa.me/918688291288"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#092216] border border-emerald-950 rounded-full hover:border-emerald-500/60 hover:bg-emerald-950/70 hover:shadow-[0_0_12px_rgba(16,185,129,0.1)] text-emerald-300 font-bold transition-all duration-300 text-xs"
          >
            <MessageCircle size={13} className="text-emerald-400" />
            <span>WhatsApp Support</span>
          </a>
          <a
            href="mailto:support@nunebazaar.com"
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#25150a] border border-amber-900/30 rounded-full hover:border-amber-500/60 hover:bg-amber-950/70 hover:shadow-[0_0_12px_rgba(245,158,11,0.1)] text-amber-300 font-bold transition-all duration-300 text-xs"
          >
            <Mail size={13} className="text-amber-400" />
            <span>support@omnatural.com</span>
          </a>
        </div>

        {/* Inline Navigation Links */}
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-xs font-bold text-amber-200/60 border-y border-amber-950/40 py-5 w-full">
          <Link href="/" className="hover:text-amber-400 transition-colors relative py-1">{t('nav_home')}</Link>
          <Link href="/products" className="hover:text-amber-400 transition-colors relative py-1">{t('nav_oils')}</Link>
          <Link href="/account?tab=orders" className="hover:text-amber-400 transition-colors relative py-1">{t('nav_track')}</Link>
          <Link href="/policy?tab=shipping" className="hover:text-amber-400 transition-colors relative py-1">{language === 'te' ? 'షిప్పింగ్ పాలసీ' : 'Shipping'}</Link>
          <Link href="/policy?tab=returns" className="hover:text-amber-400 transition-colors relative py-1">{language === 'te' ? 'రిటర్న్స్ & రీఫండ్' : 'Returns & Refund'}</Link>
          <Link href="/policy?tab=privacy" className="hover:text-amber-400 transition-colors relative py-1">{language === 'te' ? 'గోప్యతా విధానం' : 'Privacy'}</Link>
        </div>

        {/* Secure & Copyright Bottom */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-amber-600/80 pt-2">
          <p className="font-semibold order-2 sm:order-1">
            © {year} {language === 'te' ? 'ఓం సహజ చెక్క గానుగ నూనెలు' : 'OM Natural Chekka Ganuga Oils'}. {language === 'te' ? 'అన్ని హక్కులు రక్షించబడ్డాయి.' : 'All Rights Reserved.'}
          </p>
          
          <div className="flex items-center space-x-2 bg-amber-950/70 px-4 py-2 rounded-full border border-amber-900/30 order-1 sm:order-2 shadow-inner">
            <ShieldCheck size={13} className="text-amber-400" />
            <span className="font-bold text-amber-400/80">{t('footer_secure')}:</span>
            <span className="font-black text-amber-300 tracking-wide">PhonePe / UPI / COD</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
