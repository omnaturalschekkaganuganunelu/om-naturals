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

            <div className="space-y-4 border-t border-amber-50 pt-6">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'ప్రైవసీ ప్రశ్నలకు సంప్రదించండి:' : 'Contact Us for Privacy Queries / Store Location:'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                <div className="space-y-3 flex flex-col justify-center">
                  <p className="font-black text-amber-950 text-sm">OM NATURAL CHEKKA GANUGA NUNELU</p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <strong>{isTe ? 'యజమాని & ప్రొప్రైటర్:' : 'Owner & Proprietor:'}</strong> Attipatla Nagarjuna<br />
                    D.No. 126-137, Sri Lakshmi Narasimha Nagar,<br />
                    5th Line, Inner Ring Road, Gorantla,<br />
                    Guntur, Andhra Pradesh - 522034
                  </p>
                  <div className="space-y-1 pt-1 font-bold text-xs text-gray-500">
                    <p className="flex items-center gap-1.5">
                      <span>📞</span> +91 86882 91288
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span>✉️</span> info@om-naturals.com
                    </p>
                  </div>
                </div>
                <div className="w-full h-44 rounded-2xl overflow-hidden shadow-inner border border-amber-100 relative group">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3828.7357141809703!2d80.4322966!3d16.3364427!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a358bcd27793cff%3A0x3730d16c23f9b485!2sOM%20NATURAL%20CHEKKA%20GANUGA%20NUNE!5e0!3m2!1sen!2sin!4v1782209958475!5m2!1sen!2sin"
                    className="absolute inset-0 w-full h-full border-0 rounded-2xl"
                    allowFullScreen={false}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="OM Natural Store Map Location"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
