'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Lock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function PrivacyPolicyPage() {
  const { language } = useLanguage();
  const isTe = language === 'te';

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex-1 w-full">
        <div className="bg-white border border-amber-100 rounded-3xl p-6 sm:p-8 smooth-shadow text-xs sm:text-sm leading-relaxed text-gray-700 font-medium overflow-hidden">
          <div className="flex items-center space-x-2 border-b border-amber-50 pb-3 mb-6">
            <Lock size={24} className="text-amber-800 shrink-0" />
            <h1 className="text-lg sm:text-xl font-extrabold text-amber-950 font-heading">
              {isTe ? 'ప్రైవసీ మరియు భద్రతా పాలసీ' : 'Privacy & Security Policy'}
            </h1>
          </div>

          <div className="space-y-6">
            <p>
              {isTe 
                ? 'మా వెబ్‌సైట్‌లో మీ వ్యక్తిగత సమాచారం (పేరు, ఫోన్ నెంబర్, అడ్రస్) పూర్తిగా భద్రంగా ఉంచబడుతుంది. దీనిని కేవలం మీ ఆర్డర్లను డెలివరీ చేయడానికి మాత్రమే ఉపయోగిస్తాము.' 
                : 'Your personal privacy is of utmost importance to us. This Privacy & Security Policy explains how OM NATURAL CHEKKA GANUGA NUNELU collects, uses, and safeguards your personal data when you visit and place orders on our website.'}
            </p>
            
            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'మేము సేకరించే సమాచారం:' : '1. Data We Collect:'}
              </h2>
              <p>
                {isTe 
                  ? 'మీరు ఆర్డర్ చేసినప్పుడు ఇచ్చే పేరు, ఈమెయిల్, డెలివరీ అడ్రస్ మరియు ఫోన్ నంబర్ మాత్రమే సేకరిస్తాము. మేము ఎటువంటి క్రెడిట్/డెబిట్ కార్డు పిన్ నంబర్లు లేదా పాస్‌వర్డ్స్ సేకరించము.' 
                  : 'When you place an order or create an account, we collect necessary personal details such as your name, email address, delivery shipping address, billing address, and phone number. We do not store or collect any payment instrument details, credit/debit card numbers, PINs, or net banking passwords.'}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'సмаచార వినియోగం:' : '2. How We Use Your Information:'}
              </h2>
              <p>
                {isTe
                  ? 'మేము సేకరించిన సమాచారాన్ని కేవలం మీ ఆర్డర్‌లను సరిగ్గా డెలివరీ చేయడానికి, షిప్పింగ్ వివరాలను తెలియజేయడానికి మరియు కస్టమర్ సపోర్ట్ అందించడానికి మాత్రమే ఉపయోగిస్తాము.'
                  : 'The information we collect is strictly used to process and deliver your orders, send tracking updates, provide customer support, and communicate essential business alerts regarding your transactions.'}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'ఆన్‌లైన్ లావాదేవీల భద్రత:' : '3. Payment & Transaction Security:'}
              </h2>
              <p>
                {isTe 
                  ? 'ఆన్‌లైన్ పేమెంట్లకు సంబంధించిన లావాదేవీలన్నీ అత్యంత భద్రమైన ఎన్‌క్రిప్టెడ్ (Encrypted) గేట్‌వేస్ ద్వారా జరుగుతాయి. మీ కార్డు వివరాలు మా సర్వర్లలో సేవ్ చేయబడవు.' 
                  : 'All online payment transactions are processed securely through certified, industry-standard encrypted payment gateways (such as PhonePe). Your financial card details, UPI IDs, or net banking credentials never pass through or get saved on our servers, ensuring absolute transaction safety.'}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'కుకీస్ పాలసీ:' : '4. Cookie Policy:'}
              </h2>
              <p>
                {isTe
                  ? 'మా వెబ్‌సైట్‌లో సున్నితమైన బ్రౌజింగ్ అనుభవం కోసం కుకీలను ఉపయోగిస్తాము. ఇవి కేవలం మీ కార్ట్ వస్తువులు మరియు ప్రాధాన్యతలను గుర్తించడానికి మాత్రమే ఉపయోగపడతాయి.'
                  : 'We use session cookies to enhance your browsing experience, remember your language preferences, and keep items saved in your shopping cart. You can disable cookies in your browser settings if preferred.'}
              </p>
            </div>

            <div className="space-y-2 border-t border-amber-50 pt-4">
              <h2 className="font-extrabold text-amber-950 text-sm">
                {isTe ? 'ప్రైవసీ ప్రశ్నలకు సంప్రదించండి:' : 'Contact Us for Privacy Queries:'}
              </h2>
              <p className="font-bold text-gray-800">OM NATURAL CHEKKA GANUGA NUNELU</p>
              <p className="text-xs text-gray-500">
                D.No. 126-137, Sri Lakshmi Narasimha Nagar, 5th Line, Inner Ring Road, Gorantla, Guntur, Andhra Pradesh - 522034<br />
                Email: info@om-naturals.com
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
