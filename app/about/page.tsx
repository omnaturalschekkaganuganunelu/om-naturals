'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Image from 'next/image';
import { Leaf, Droplet, Heart, Award } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function AboutPage() {
  const { language } = useLanguage();
  const isTe = language === 'te';

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 flex-1 w-full">
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-5xl font-black text-amber-950 font-heading mb-4">
            {isTe ? 'మా గురించి' : 'About Us'}
          </h1>
          <p className="text-sm sm:text-base text-amber-800/80 font-bold max-w-2xl mx-auto">
            {isTe 
              ? 'స్వచ్ఛత, ఆరోగ్యం మరియు సాంప్రదాయం - ఇవే మా మూలస్తంభాలు.'
              : 'Purity, Health, and Tradition - The pillars of OM NATURAL CHEKKA GANUGA NUNELU.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
          <div className="relative h-[300px] sm:h-[400px] rounded-3xl overflow-hidden shadow-xl border border-amber-100/50 bg-[#fbf9f4] group">
            {/* Animated Slider */}
            <div className="w-full h-full relative">
              <div className="absolute inset-0 transition-opacity duration-1000 animate-fade-slide flex flex-col justify-between p-6">
                <div className="relative w-full h-[70%]">
                  <Image src="https://res.cloudinary.com/dftcaaum2/image/upload/v1783839130/izjekuxbtb3fe97inkc0.png" alt="Groundnut Oil" fill className="object-contain transform group-hover:scale-105 transition-transform duration-[10000ms]" />
                </div>
                <div className="mt-2 text-center">
                  <h2 className="text-xl font-extrabold text-amber-950 font-heading">
                    {isTe ? 'స్వచ్ఛమైన వేరుశెనగ నూనె' : 'Pure Groundnut Oil'}
                  </h2>
                </div>
              </div>

              <div className="absolute inset-0 opacity-0 transition-opacity duration-1000 animate-fade-slide-4 flex flex-col justify-between p-6">
                <div className="relative w-full h-[70%]">
                  <Image src="https://res.cloudinary.com/dftcaaum2/image/upload/v1783839130/izjekuxbtb3fe97inkc0.png" alt="Sesame Oil" fill className="object-contain transform group-hover:scale-105 transition-transform duration-[10000ms]" />
                </div>
                <div className="mt-2 text-center">
                  <h2 className="text-xl font-extrabold text-amber-950 font-heading">
                    {isTe ? 'స్వచ్ఛమైన నువ్వుల నూనె' : 'Pure Sesame Oil'}
                  </h2>
                </div>
              </div>

              <div className="absolute inset-0 opacity-0 transition-opacity duration-1000 animate-fade-slide-8 flex flex-col justify-between p-6">
                <div className="relative w-full h-[70%]">
                  <Image src="https://res.cloudinary.com/dftcaaum2/image/upload/v1783839130/izjekuxbtb3fe97inkc0.png" alt="Coconut Oil" fill className="object-contain transform group-hover:scale-105 transition-transform duration-[10000ms]" />
                </div>
                <div className="mt-2 text-center">
                  <h2 className="text-xl font-extrabold text-amber-950 font-heading">
                    {isTe ? 'స్వచ్ఛమైన కొబ్బరి నూనె' : 'Pure Coconut Oil'}
                  </h2>
                </div>
              </div>

              <div className="absolute inset-0 opacity-0 transition-opacity duration-1000 animate-fade-slide-12 flex flex-col justify-between p-6">
                <div className="relative w-full h-[70%]">
                  <Image src="https://res.cloudinary.com/dftcaaum2/image/upload/v1783839140/pulvlbyuoyk9gtgp0wn7.png" alt="Almond Oil" fill className="object-contain transform group-hover:scale-105 transition-transform duration-[10000ms]" />
                </div>
                <div className="mt-2 text-center">
                  <h2 className="text-xl font-extrabold text-amber-950 font-heading">
                    {isTe ? 'ప్రీమియం బాదం నూనె' : 'Premium Almond Oil'}
                  </h2>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black text-amber-950 font-heading">
              {isTe ? 'మా ప్రయాణం' : 'Our Story'}
            </h2>
            <div className="space-y-4 text-gray-600 text-sm sm:text-base leading-relaxed">
              {isTe ? (
                <>
                  <p><strong>ఓం సహజ చెక్క గానుగ నూనెలు</strong> వద్ద, నిజమైన ఆరోగ్యం వంటగది నుండే మొదలవుతుందని మేము నమ్ముతాము. ఆంధ్రప్రదేశ్ లోని గుంటూరు నడిబొడ్డున ఉన్న మా ప్రయాణం, సాంప్రదాయ వంట నూనెల స్వచ్ఛతను తిరిగి ఆధునిక గృహాలకు తీసుకురావాలనే ఒకే ఒక లక్ష్యంతో ప్రారంభమైంది.</p>
                  <p>నేటి రిఫైన్డ్ మరియు రసాయనిక నూనెల కాలంలో, మేము మన పురాతన భారతీయ వారసత్వాన్ని అనుసరిస్తున్నాము. మేము పురాతన &quot;చెక్క గానుగ&quot; పద్ధతిని ఉపయోగించి నూనెలను తీస్తాము. దీనివల్ల నూనె గింజలు వేడి కాకుండా ఉంటాయి, మరియు వాటిలోని సహజ పోషకాలు, సువాసన మరియు రుచి 100% అలాగే నిలిచి ఉంటాయి.</p>
                  <p>మేము ఉత్పత్తి చేసే ప్రతి చుక్క నూనె అన్‌రిఫైన్డ్ (unrefined) మరియు ఎలాంటి రసాయనాలు లేదా ప్రిజర్వేటివ్స్ లేనిది. వేరుశెనగ నుండి నువ్వుల వరకు, మరియు కొబ్బరి నుండి బాదం వరకు, మేము నమ్మకమైన రైతుల నుండి నేరుగా సేకరించిన అత్యుత్తమ నాణ్యత గల గింజలను మాత్రమే ఉపయోగిస్తాము.</p>
                </>
              ) : (
                <>
                  <p>At <strong>OM NATURAL CHEKKA GANUGA NUNELU</strong>, we believe that true health begins in the kitchen. Located in the heart of Guntur, Andhra Pradesh, our journey started with a simple vision: to bring back the forgotten purity of traditional cooking oils to modern households.</p>
                  <p>In today&apos;s world of highly refined and chemically processed oils, we take a step back into our rich Indian heritage. We extract oils using the ancient &quot;Chekka Ganuga&quot; (Wooden Cold Press) method. This ensures that the oil seeds are pressed at room temperature without generating heat, preserving 100% of the natural nutrients, aroma, and flavor.</p>
                  <p>Every drop of oil we produce is unrefined, unbleached, and completely free from preservatives or chemical solvents. From Groundnut to Sesame, and Coconut to Almond, we source only the finest, premium quality seeds directly from trusted farmers.</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-amber-100 p-6 rounded-3xl text-center smooth-shadow hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-600">
              <Leaf size={24} />
            </div>
            <h3 className="font-bold text-amber-950 mb-2">{isTe ? '100% సహజం' : '100% Natural'}</h3>
            <p className="text-xs text-gray-500">{isTe ? 'ఎలాంటి రసాయనాలు, ప్రిజర్వేటివ్స్ లేదా కృత్రిమ రంగులు లేవు.' : 'No chemicals, preservatives, or artificial colors.'}</p>
          </div>
          <div className="bg-white border border-emerald-100 p-6 rounded-3xl text-center smooth-shadow hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 text-emerald-600">
              <Droplet size={24} />
            </div>
            <h3 className="font-bold text-emerald-950 mb-2">{isTe ? 'కోల్డ్ ప్రెస్డ్ (గానుగ)' : 'Cold Pressed'}</h3>
            <p className="text-xs text-gray-500">{isTe ? 'సాంప్రదాయ చెక్క గానుగ ద్వారా తక్కువ ఉష్ణోగ్రత వద్ద తీయబడింది.' : 'Extracted at low temperatures using traditional wooden pestles.'}</p>
          </div>
          <div className="bg-white border border-blue-100 p-6 rounded-3xl text-center smooth-shadow hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
              <Heart size={24} />
            </div>
            <h3 className="font-bold text-blue-950 mb-2">{isTe ? 'ఆరోగ్యకరం' : 'Heart Healthy'}</h3>
            <p className="text-xs text-gray-500">{isTe ? 'అవసరమైన కొవ్వు ఆమ్లాలు, విటమిన్లు మరియు యాంటీఆక్సిడెంట్లను కలిగి ఉంటుంది.' : 'Retains all essential fatty acids, vitamins, and antioxidants.'}</p>
          </div>
          <div className="bg-white border border-purple-100 p-6 rounded-3xl text-center smooth-shadow hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 mx-auto bg-purple-50 rounded-2xl flex items-center justify-center mb-4 text-purple-600">
              <Award size={24} />
            </div>
            <h3 className="font-bold text-purple-950 mb-2">{isTe ? 'ప్రీమియం నాణ్యత' : 'Premium Quality'}</h3>
            <p className="text-xs text-gray-500">{isTe ? 'అత్యుత్తమ నాణ్యత గల గింజల నుండి మాత్రమే తయారు చేయబడింది.' : 'Made from handpicked, farm-fresh, A-grade seeds.'}</p>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
