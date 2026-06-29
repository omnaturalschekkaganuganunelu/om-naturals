'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: 'నూనె బజార్ గానుగ నూనెలు నిజంగా స్వచ్ఛమైనవేనా? (Are your oils 100% pure?)',
      a: 'అవును. మా వేరుశనగ, నువ్వుల మరియు కొబ్బరి నూనెలు సాంప్రదాయక పద్ధతిలో రసాయనాలు (Chemicals) మరియు ప్రిజర్వేటివ్స్ ఏవీ కలపకుండా ఎండబెట్టిన విత్తనాల నుండి కేవలం చెక్క గానుగ ద్వారా మాత్రమే తీయబడును. ఇవి 100% స్వచ్ఛమైనవి మరియు ఆరోగ్యకరమైనవి.'
    },
    {
      q: 'డెలివరీకి ఎంత సమయం పడుతుంది? (How long does delivery take?)',
      a: 'ఆంధ్రప్రదేశ్ మరియు తెలంగాణ అంతటా అన్ని నగరాలు మరియు పట్టణాలకు ఆర్డర్ చేసిన 24 నుండి 48 గంటల్లో డెలివరీ చేయబడుతుంది. గ్రామీణ ప్రాంతాలకు 3 నుండి 4 రోజులు పట్టవచ్చు.'
    },
    {
      q: 'దీపారాధన పంచ దీప నూనెను వంటకు వాడవచ్చా? (Can Pancha Deepam oil be used for cooking?)',
      a: 'తగదు. పంచ దీప నూనె కేవలం పూజా గదిలో దీపాలు వెలిగించడానికి మాత్రమే తయారుచేయబడింది. దీనిలో నువ్వుల నూనెతో పాటు ఆముదము, వేప, ఇప్ప నూనెలు మరియు సుగంధ ద్రవ్యాలు కలపబడ్డాయి. ఇది వంటకు ఉపయోగించడానికి సిఫార్సు చేయబడదు.'
    },
    {
      q: 'ఆన్‌లైన్ పేమెంట్ ఎలా చేయాలి? ఫోన్‌పే పనిచేస్తుందా? (How to pay online? Does PhonePe work?)',
      a: 'అవును. చెక్అవుట్ పేజీలో "PhonePe ఆన్‌లైన్ పేమెంట్" ఎంచుకుని ఆర్డర్ సమర్పించగానే ఫోన్‌పే పేమెంట్ పేజీకి రీడైరెక్ట్ అవుతారు. అక్కడ మీ UPI, డెబిట్/క్రెడిట్ కార్డ్ ద్వారా సురక్షితంగా పేమెంట్ పూర్తి చేయవచ్చు. ఒకవేళ అది కుదరకపోతే క్యాష్ ఆన్ డెలివరీ (COD) కూడా అందుబాటులో ఉంది.'
    },
    {
      q: 'గానుగ నూనెలను ఎలా నిల్వ ఉంచాలి? (How to store cold-pressed oils?)',
      a: 'గానుగ నూనెలను ఎల్లప్పుడూ తడి తగలని, పొడిగా ఉండే ప్రదేశంలో ఉంచాలి. గాలి తగలకుండా గట్టి మూత పెట్టాలి. ప్లాస్టిక్ సీసాల కంటే గాజు సీసాలు లేదా స్టీల్ డబ్బాలలో నిల్వ ఉంచితే నూనె ఎక్కువ కాలం తాజాగా ఉంటుంది.'
    },
    {
      q: 'ఆర్డర్ ని రద్దు చేసుకోవచ్చా? (Can I cancel my order?)',
      a: 'అవును. మీ ఆర్డర్ ఇంకా షిప్పింగ్ (Shipped) కానంతవరకు మీరు కస్టమర్ కేర్ కి ఫోన్ చేయడం లేదా వాట్సాప్ ద్వారా మెసేజ్ చేయడం ద్వారా సులభంగా రద్దు చేసుకోవచ్చు. ఆన్‌లైన్ లో పేమెంట్ చేసినట్లయితే 3-5 రోజుల్లో మీ డబ్బులు రీఫండ్ చేయబడును.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        
        <div className="text-center space-y-3 mb-10">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-700 mx-auto border border-amber-100">
            <HelpCircle size={24} />
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-amber-950 font-heading">
            తరచూ అడిగే ప్రశ్నలు (FAQ)
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
            మీకు కావలసిన సాధారణ ప్రశ్నలు మరియు సమాధానాలు ఇక్కడ కనుగొనవచ్చు
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white border border-amber-100 rounded-2xl overflow-hidden smooth-shadow transition-colors"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full text-left p-5 flex justify-between items-center gap-4 focus:outline-none"
                >
                  <span className="text-xs sm:text-sm font-extrabold text-amber-950 pr-4">
                    {faq.q}
                  </span>
                  <div className="text-amber-800 shrink-0">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="p-5 bg-amber-50/20 border-t border-amber-50 text-xs sm:text-sm text-gray-650 leading-relaxed font-semibold">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still Need Help banner */}
        <div className="mt-12 text-center bg-amber-100/40 p-6 rounded-3xl border border-amber-200 space-y-4 max-w-lg mx-auto">
          <h3 className="text-sm font-bold text-amber-950">ఇంకా ఏవైనా సందేహాలు ఉన్నాయా? (Still have questions?)</h3>
          <p className="text-xs text-gray-500">మా వాట్సాప్ కస్టమర్ కేర్ ఎల్లప్పుడూ మీకు సహాయం చేయడానికి సిద్ధంగా ఉంటుంది</p>
          <a
            href="https://wa.me/918688291288?text=Hi, I have a question about Nune Bazaar products."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-sm hover:shadow"
          >
            <MessageCircle size={16} className="fill-white/10" />
            <span>వాట్సాప్ లో అడగండి (Ask via WhatsApp)</span>
          </a>
        </div>

      </main>

      <Footer />
    </>
  );
}
