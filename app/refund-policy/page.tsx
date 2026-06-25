'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { RotateCcw } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function RefundPolicyPage() {
  const { language } = useLanguage();
  const isTe = language === 'te';

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex-1 w-full">
        <div className="bg-white border border-amber-100 rounded-3xl p-6 sm:p-8 smooth-shadow text-xs sm:text-sm leading-relaxed text-gray-700 font-medium overflow-hidden">
          <div className="flex items-center space-x-2 border-b border-amber-50 pb-3 mb-6">
            <RotateCcw size={24} className="text-amber-800 shrink-0" />
            <h1 className="text-lg sm:text-xl font-extrabold text-amber-950 font-heading">
              {isTe ? 'రిటర్న్స్, క్యాన్సిలేషన్స్ మరియు రీఫండ్ పాలసీ' : 'Returns, Cancellations & Refund Policy'}
            </h1>
          </div>

          <div className="space-y-6">
            <p>
              {isTe 
                ? 'నూనెలు మరియు ఆహార పదార్థాల నాణ్యత, పరిశుభ్రత మరియు భద్రత కారణాల దృష్ట్యా, డెలివరీ అయిన తర్వాత ఉత్పత్తులపై ఎటువంటి రిటర్న్స్ లేదా ఎక్స్ఛేంజ్లను మేము అంగీకరించము. అన్ని అమ్మకాలు తుది నిర్ణయం.' 
                : 'At OM NATURAL CHEKKA GANUGA NUNELU, we are committed to providing you with premium, traditional wood-pressed oils. Due to the hygiene, health, and perishable nature of agricultural food products, we follow a strict return and refund policy.'}
            </p>
            
            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'రిటర్న్స్ & మార్పిడి విధానం:' : '1. Returns & Exchange:'}
              </h2>
              <p>
                {isTe 
                  ? 'ఒకసారి వస్తువులు డెలివరీ అయిన తర్వాత వాటిని తిరిగి తీసుకోవడం లేదా మార్చడం జరగదు.' 
                  : 'We do not accept returns or product exchanges once the order is successfully delivered to you. All sales are final.'}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'డ్యామేజ్ లేదా లీకేజీ సమస్యలు:' : '2. Damaged, Leaking, or Incorrect Items:'}
              </h2>
              <p>
                {isTe
                  ? 'ఒకవేళ మీకు అందిన బాటిల్ డ్యామేజ్ అయినా, లీకేజీ ఉన్నా లేదా తప్పు ఉత్పత్తి వచ్చినా, డెలివరీ అయిన 24 గంటల్లోపు మా కస్టమర్ కేర్‌ను సంప్రదించాలి. డ్యామేజ్ అయిన పార్సెల్ యొక్క స్పష్టమైన ఫోటో లేదా అన్‌బాక్సింగ్ వీడియోను మా వాట్సాప్ (+91 86882 91288) నెంబర్ కు పంపాలి. సమస్య నిర్ధారణ అయిన తర్వాత, మేము ఉచితంగా మరొక ఉత్పత్తిని పంపుతాము లేదా రీఫండ్ అందిస్తాము.'
                  : 'If you receive a package that is physically damaged, leaking, or contains incorrect items, please contact us within 24 hours of delivery. You must provide photographic proof or an unboxing video showing the damage/leakage to our WhatsApp support (+91 86882 91288) or email. Once reviewed and validated, we will process a free product replacement or issue a full refund.'}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'ఆర్డర్ క్యాన్సిలేషన్ విధానం:' : '3. Cancellation Policy:'}
              </h2>
              <p>
                {isTe 
                  ? 'డెలివరీ ఏజెంట్ డెలివరీ కోసం బయలుదేరే వరకు (Out for Delivery అవ్వకముందు) మాత్రమే మీ ఆర్డర్‌ని మీరు రద్దు చేసుకోవచ్చు. ఆర్డర్ డెలివరీకి బయలుదేరిన తర్వాత ఎట్టి పరిస్థితుల్లోనూ రద్దులు అంగీకరించబడవు.' 
                  : 'You can cancel your order at any time before it transitions to "Out for Delivery" status. Once our delivery associate has left for delivery or the package is dispatched via long-distance courier, cancellations are not permitted.'}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'రీఫండ్ చేరే సమయం:' : '4. Refund Timelines:'}
              </h2>
              <p>
                {isTe
                  ? 'ఆమోదించబడిన రద్దులు లేదా రీఫండ్లకు, ఆన్‌లైన్ పేమెంట్లకు 3 నుండి 5 పనిదినాల్లో మీ ఒరిజినల్ పేమెంట్ అకౌంట్ కు డబ్బులు జమ చేయబడును. క్యాష్ ఆన్ డెలివరీ (COD) ఆర్డర్ల రీఫండ్లను మీ బ్యాంక్ లేదా UPI అకౌంట్ కు ట్రాన్స్ఫర్ ద్వారా పంపుతాము.'
                  : 'Approved refunds will be processed and returned to your original payment method (bank account, card, or UPI wallet) within 3-5 working days. For Cash on Delivery (COD) orders, refunds will be processed through bank transfer or UPI once you share details with our support team.'}
              </p>
            </div>

            <div className="space-y-2 border-t border-amber-50 pt-4">
              <h2 className="font-extrabold text-amber-950 text-sm">
                {isTe ? 'రీఫండ్స్ కి సంప్రదించండి:' : 'Contact Us for Refunds:'}
              </h2>
              <p className="font-bold text-gray-700">OM NATURAL CHEKKA GANUGA NUNELU</p>
              <p className="text-xs text-gray-500">
                D.No. 126-137, Sri Lakshmi Narasimha Nagar, 5th Line, Inner Ring Road, Gorantla, Guntur, Andhra Pradesh - 522034<br />
                Phone: +91 86882 91288<br />
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
