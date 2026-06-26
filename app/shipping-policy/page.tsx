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
                    <li><strong>Metro Cities (Hyderabad, Vijayawada, Vizag)</strong>: Within 24-48 hours.</li>
                    <li><strong>Other Districts in AP & Telangana</strong>: Within 2-3 working days.</li>
                    <li><strong>Other States in India</strong>: Within 5-7 working days.</li>
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
                    <li><strong>FREE Shipping</strong> on all orders of ₹500 and above.</li>
                    <li>A flat shipping fee of <strong>₹40</strong> applies to orders below ₹500.</li>
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

            <div className="space-y-4 border-t border-amber-50 pt-6">
              <h2 className="font-extrabold text-amber-950 text-sm sm:text-base">
                {isTe ? 'షిప్పింగ్ వివరాలకు సంప్రదించండి:' : 'Contact Us for Shipping Support / Store Location:'}
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
