'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function TermsConditionsPage() {
  const { language } = useLanguage();
  const isTe = language === 'te';

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex-1 w-full">
        <div className="bg-white border border-amber-100 rounded-3xl p-6 sm:p-8 smooth-shadow text-xs sm:text-sm leading-relaxed text-gray-700 font-medium overflow-hidden">
          <div className="flex items-center space-x-2 border-b border-amber-50 pb-3 mb-6">
            <ShieldCheck size={24} className="text-amber-800 shrink-0" />
            <h1 className="text-lg sm:text-xl font-extrabold text-amber-950 font-heading">
              {isTe ? 'నిబంధనలు మరియు షరతులు' : 'Terms & Conditions'}
            </h1>
          </div>

          <div className="space-y-6">
            <p>
              {isTe 
                ? 'OM NATURAL CHEKKA GANUGA NUNELU వెబ్‌సైట్‌ను ఉపయోగించడం ద్వారా మీరు ఈ క్రింది నిబంధనలు మరియు షరతులకు అంగీకరిస్తున్నట్లు భావించబడుతుంది.' 
                : 'Welcome to OM NATURAL CHEKKA GANUGA NUNELU. By accessing or using our website, you agree to comply with and be bound by the following Terms & Conditions. Please read them carefully before purchasing products.'}
            </p>
            
            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'ఖాతా రిజిస్ట్రేషన్ మరియు భద్రత:' : '1. Account Registration & Security:'}
              </h2>
              <p>
                {isTe 
                  ? 'మా వెబ్‌సైట్‌లో ఆర్డర్ చేయడానికి మీరు సరైన సమాచారం ఇవ్వాలి. మీ ఖాతా వివరాల భద్రతకు మీరే బాధ్యులు.' 
                  : 'To place orders, you may need to register an account or provide checkout information. You are responsible for ensuring the accuracy of your details and for maintaining the confidentiality of your account.'}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'ఉత్పత్తుల సమాచారం మరియు నాణ్యత:' : '2. Product Information & Disclaimers:'}
              </h2>
              <p>
                {isTe
                  ? 'మా వెబ్‌సైట్‌లో చూపబడిన ఉత్పత్తులన్నీ సహజంగా తయారు చేయబడినవి. సీజన్‌ను బట్టి నూనె రంగు లేదా వాసనలో స్వల్ప మార్పులు ఉండవచ్చు. ఇవి సహజ ఉత్పత్తుల లక్షణం.'
                  : 'All wood-pressed oils are crafted using traditional techniques. Since these are natural products without chemical processing, minor variations in color, density, or aroma may occur across batches. These variations are standard and do not indicate a product defect.'}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'ధరలు మరియు చెల్లింపులు:' : '3. Pricing & Payments:'}
              </h2>
              <p>
                {isTe 
                  ? 'అన్ని ధరలు భారతీయ రూపాయలలో (INR) ఉంటాయి. ట్యాక్స్ మరియు డెలివరీ ఛార్జీలు వర్తించిన చోట చెక్అవుట్ వద్ద చూపబడతాయి. చెల్లింపులు PhonePe, UPI, మరియు నెట్ బ్యాంకింగ్ ద్వారా అంగీకరించబడతాయి.' 
                  : 'All prices listed on the website are in Indian Rupees (INR) and include GST, unless specified otherwise. We accept payments online via secure payment gateways (PhonePe, UPI, credit/debit cards, net banking) and Cash on Delivery (COD). Orders are confirmed only upon successful payment authorization.'}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'మేధో సంపత్తి హక్కులు:' : '4. Intellectual Property:'}
              </h2>
              <p>
                {isTe
                  ? 'ఈ వెబ్‌సైట్‌లోని లోగోలు, కంటెంట్, ఇమేజ్‌లు అన్నీ OM NATURAL CHEKKA GANUGA NUNELU యొక్క మేధో సంపత్తి. అనుమతి లేకుండా వీటిని ఉపయోగించడం చట్టవిరుద్ధం.'
                  : 'All trademarks, logos, texts, and product images displayed on this website are the intellectual property of OM NATURAL CHEKKA GANUGA NUNELU. Any unauthorized duplication, commercial utilization, or distribution is strictly prohibited.'}
              </p>
            </div>

            <div className="space-y-2 border-t border-amber-50 pt-4">
              <h2 className="font-extrabold text-amber-950 text-sm">
                {isTe ? 'సంప్రదించవలసిన చిరునామా:' : 'Official Contact Information:'}
              </h2>
              <p className="font-bold text-gray-700">OM NATURAL CHEKKA GANUGA NUNELU</p>
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
