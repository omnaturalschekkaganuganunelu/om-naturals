'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function ContactPage() {
  const { language } = useLanguage();
  const isTe = language === 'te';

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 flex-1 w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-5xl font-black text-amber-950 font-heading mb-4">
            {isTe ? 'మమ్మల్ని సంప్రదించండి' : 'Contact Us'}
          </h1>
          <p className="text-sm sm:text-base text-gray-500 max-w-2xl mx-auto">
            {isTe 
              ? 'మీకు ఏవైనా సందేహాలు ఉన్నా లేదా మా ఉత్పత్తుల గురించి తెలుసుకోవాలన్నా మమ్మల్ని సంప్రదించవచ్చు.'
              : 'Have a question about our traditional wood-pressed oils? We are here to help and answer any questions you might have.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          
          {/* Contact Details Card */}
          <div className="bg-white border border-amber-100 p-6 sm:p-8 rounded-3xl smooth-shadow h-full flex flex-col justify-center space-y-8">
            <div>
              <h2 className="text-xl font-bold text-amber-950 mb-6 border-b border-amber-50 pb-2">
                {isTe ? 'అధికారిక వివరాలు' : 'Official Details'}
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-amber-50 p-3 rounded-full shrink-0">
                    <MapPin className="text-amber-800" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-950 text-sm mb-1">{isTe ? 'రిజిస్టర్డ్ ఆఫీస్ అడ్రస్' : 'Registered Office Address'}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      <strong className="text-amber-900 block mb-1">OM NATURAL CHEKKA GANUGA NUNELU</strong>
                      <span className="block mb-1 text-xs font-bold text-amber-955">
                        {isTe ? 'యజమాని & ప్రొప్రైటర్:' : 'Owner & Proprietor:'} Attipatla Nagarjuna
                      </span>
                      D.No. 126-137, Sri Lakshmi Narasimha Nagar,<br />
                      5th Line, Inner Ring Road, Gorantla,<br />
                      Guntur, Andhra Pradesh - 522034
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 p-3 rounded-full shrink-0">
                    <Phone className="text-emerald-700" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-950 text-sm mb-1">{isTe ? 'ఫోన్ నెంబర్' : 'Phone Number'}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      +91 86882 91288
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-blue-50 p-3 rounded-full shrink-0">
                    <Mail className="text-blue-700" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-950 text-sm mb-1">{isTe ? 'ఈమెయిల్ (24 గంటల సపోర్ట్)' : 'Email ID (24 Hrs Support)'}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      info@om-naturals.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-purple-50 p-3 rounded-full shrink-0">
                    <Clock className="text-purple-700" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-purple-950 text-sm mb-1">{isTe ? 'పనిచేయు వేళలు' : 'Operating Hours'}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {isTe ? 'సోమవారం నుండి ఆదివారం వరకు: ఉదయం 9:00 - రాత్రి 8:00' : 'Monday to Sunday: 9:00 AM - 8:00 PM'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Contact Form */}
          <div className="bg-gradient-to-br from-amber-800 to-amber-950 p-6 sm:p-8 rounded-3xl smooth-shadow text-amber-50 h-full flex flex-col justify-center">
            <h2 className="text-xl font-bold text-white mb-6">
              {isTe ? 'మాకు సందేశం పంపండి' : 'Send us a Message'}
            </h2>
            <form 
              className="space-y-4" 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const contact = formData.get('contact') as string;
                const message = formData.get('message') as string;
                
                const text = `Hello OM Naturals,\n\nName: ${name}\nContact: ${contact}\nMessage: ${message}`;
                const waUrl = `https://wa.me/918688291288?text=${encodeURIComponent(text)}`;
                window.open(waUrl, '_blank');
              }}
            >
              <div>
                <label htmlFor="contact-name" className="block text-xs font-bold text-amber-200/80 mb-1 ml-1">{isTe ? 'మీ పేరు' : 'Full Name'}</label>
                <input id="contact-name" name="name" type="text" required placeholder={isTe ? 'మీ పేరు...' : 'Your name...'} className="w-full bg-amber-900/50 border border-amber-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-amber-300/30 focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label htmlFor="contact-info" className="block text-xs font-bold text-amber-200/80 mb-1 ml-1">{isTe ? 'ఫోన్ నెంబర్ లేదా ఈమెయిల్' : 'Phone or Email'}</label>
                <input id="contact-info" name="contact" type="text" required placeholder={isTe ? 'ఫోన్ నెంబర్...' : 'Your contact info...'} className="w-full bg-amber-900/50 border border-amber-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-amber-300/30 focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-xs font-bold text-amber-200/80 mb-1 ml-1">{isTe ? 'సందేశం' : 'Message'}</label>
                <textarea id="contact-message" name="message" required rows={4} placeholder={isTe ? 'మీ సందేశం...' : 'How can we help you?'} className="w-full bg-amber-900/50 border border-amber-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-amber-300/30 focus:outline-none focus:border-amber-400 resize-none"></textarea>
              </div>
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-black py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 mt-2">
                <Send size={16} />
                {isTe ? 'పంపండి' : 'Send Message'}
              </button>
            </form>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
