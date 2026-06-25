'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Truck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function ShippingPolicyPage() {
  const { language } = useLanguage();
  const isTe = language === 'te';

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex-1 w-full">
        <div className="bg-white border border-amber-100 rounded-3xl p-6 sm:p-8 smooth-shadow text-xs sm:text-sm leading-relaxed text-gray-700 font-medium overflow-hidden">
          <div className="flex items-center space-x-2 border-b border-amber-50 pb-3 mb-6">
            <Truck size={24} className="text-amber-800 shrink-0" />
            <h1 className="text-lg sm:text-xl font-extrabold text-amber-950 font-heading">
              {isTe ? 'షిప్పింగ్ మరియు డెలివరీ పాలసీ' : 'Shipping & Delivery Policy'}
            </h1>
          </div>

          <div className="space-y-6">
            <p>
              {isTe 
                ? 'మా వెబ్‌సైట్‌లో ఆర్డర్ చేసిన ప్రతి పార్సెల్ ను ఎంతో భద్రంగా ప్యాకింగ్ చేసి పంపుతాము. వంట నూనెలు లీకేజీ కాకుండా ప్రత్యేకమైన సీల్డ్ కంటైనర్ల ద్వారా ప్యాక్ చేయబడతాయి.' 
                : 'Every order placed at OM NATURAL CHEKKA GANUGA NUNELU is packed with care. Our wood-pressed cooking oils are shipped in specialty leak-proof, food-grade containers to ensure they reach you safely without damage during transit.'}
            </p>
            
            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'డెలివరీ సమయం:' : '1. Delivery Timeline:'}
              </h2>
              <ul className="list-disc list-inside pl-2 space-y-1">
                {isTe ? (
                  <>
                    <li>హైదరాబాద్, విజయవాడ, వైజాగ్ వంటి నగరాలకు: 24-48 గంటల్లో.</li>
                    <li>ఆంధ్రప్రదేశ్ & తెలంగాణలోని ఇతర జిల్లాలకు: 2-3 రోజుల్లో.</li>
                    <li>ఇతర రాష్ట్రాలకు: 5-7 పనిదినాల్లో.</li>
                  </>
                ) : (
                  <>
                    <li>**Metro Cities (Hyderabad, Vijayawada, Vizag)**: Within 24-48 hours.</li>
                    <li>**Other Districts in AP & Telangana**: Within 2-3 working days.</li>
                    <li>**Other States in India**: Within 5-7 working days.</li>
                  </>
                )}
              </ul>
              <p className="text-xs text-gray-500 mt-1">
                {isTe
                  ? '* ఆదివారాలు మరియు పండుగ దినాలలో డెలివరీలు ఉండకపోవచ్చు.'
                  : '* Note: Dispatches are not initiated on Sundays and public holidays.'}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'డెలివరీ చార్జీలు:' : '2. Shipping & Delivery Charges:'}
              </h2>
              <ul className="list-disc list-inside pl-2 space-y-1">
                {isTe ? (
                  <>
                    <li>₹500 మరియు అంతకంటే ఎక్కువ కొనుగోలుపై డెలివరీ చార్జీలు పూర్తిగా ఉచితం (FREE Shipping).</li>
                    <li>₹500 లోపు ఆర్డర్లకు ₹40 ఫ్లాట్ డెలివరీ చార్జీలు వర్తిస్తాయి.</li>
                  </>
                ) : (
                  <>
                    <li>**FREE Shipping** on all orders of ₹500 and above.</li>
                    <li>A flat shipping fee of **₹40** applies to orders below ₹500.</li>
                  </>
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'ట్రాకింగ్ వివరాలు:' : '3. Package Tracking:'}
              </h2>
              <p>
                {isTe 
                  ? 'మీ ఆర్డర్ డిస్పాచ్ అయిన వెంటనే రిజిస్టర్డ్ ఫోన్ నంబర్‌కు మరియు ఈమెయిల్‌కు ట్రాకింగ్ ఐడి పంపబడుతుంది. మా "ట్రాక్ ఆర్డర్" పేజీలో కూడా మీ ఆర్డర్ లైవ్ స్టేటస్ చూడవచ్చు.' 
                  : 'Once your package is handed over to our shipping partners, you will receive an SMS and email notification with your tracking details. You can track your shipment status live on our "Track Order" page.'}
              </p>
            </div>

            <div className="space-y-2 border-t border-amber-50 pt-4">
              <h2 className="font-extrabold text-amber-950 text-sm">
                {isTe ? 'షిప్పింగ్ వివరాలకు సంప్రదించండి:' : 'Contact Us for Shipping Support:'}
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
