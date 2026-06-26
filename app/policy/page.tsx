'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ShieldCheck, Truck, RotateCcw, Lock } from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';
import { useLanguage } from '@/context/LanguageContext';

function PolicyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const isTe = language === 'te';

  const tab = searchParams.get('tab') || 'shipping';
  const [activeTab, setActiveTab] = useState<string>(tab);

  useEffect(() => {
    const activeTabParam = searchParams.get('tab');
    if (activeTabParam) setActiveTab(activeTabParam);
  }, [searchParams]);

  const selectTab = (tabName: string) => {
    setActiveTab(tabName);
    router.push(`/policy?tab=${tabName}`);
  };

  const tabClass = (tabName: string) => {
    const base = 'pb-3.5 border-b-2 text-xs sm:text-sm font-bold transition-colors duration-250 whitespace-nowrap ';
    return activeTab === tabName
      ? base + 'border-amber-700 text-amber-950 font-extrabold'
      : base + 'border-transparent text-gray-400 hover:text-amber-800';
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
      
      {/* Tabs Header */}
      <div className="flex border-b border-amber-50 gap-5 sm:gap-8 mb-8 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => selectTab('shipping')} className={tabClass('shipping')}>
          {isTe ? 'షిప్పింగ్' : 'Shipping'}
        </button>
        <button onClick={() => selectTab('returns')} className={tabClass('returns')}>
          {isTe ? 'రిటర్న్స్ & క్యాన్సిలేషన్స్' : 'Returns & Cancellations'}
        </button>
        <button onClick={() => selectTab('privacy')} className={tabClass('privacy')}>
          {isTe ? 'ప్రైవసీ' : 'Privacy'}
        </button>
        <button onClick={() => selectTab('terms')} className={tabClass('terms')}>
          {isTe ? 'నిబంధనలు' : 'Terms & Conditions'}
        </button>
      </div>

      {/* Tab Content Cards */}
      <div className="bg-white border border-amber-100 rounded-3xl p-6 sm:p-8 smooth-shadow text-xs sm:text-sm leading-relaxed text-gray-650 font-medium overflow-hidden">
        
        {/* SHIPPING POLICY */}
        {activeTab === 'shipping' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center space-x-2 border-b border-amber-50 pb-3">
              <Truck size={22} className="text-amber-800 shrink-0" />
              <h2 className="text-sm sm:text-base font-extrabold text-amber-950 font-heading">
                {isTe ? 'షిప్పింగ్ మరియు డెలివరీ పాలసీ' : 'Shipping & Delivery Policy'}
              </h2>
            </div>
            
            <p>{isTe ? 'మా వెబ్‌సైట్‌లో ఆర్డర్ చేసిన ప్రతి పార్సెల్ ను ఎంతో భద్రంగా ప్యాకింగ్ చేసి పంపుతాము. వంట నూనెలు లీకేజీ కాకుండా ప్రత్యేకమైన సీల్డ్ కంటైనర్ల ద్వారా ప్యాక్ చేయబడతాయి.' : 'Every order placed on our website is packed securely. Our cooking oils are packed in special sealed containers to prevent any leakage during transit.'}</p>
            
            <div className="space-y-1 mt-4">
              <p className="font-extrabold text-amber-950">{isTe ? 'డెలివరీ సమయం:' : 'Delivery Timeline:'}</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                {isTe ? (
                  <>
                    <li>హైదరాబాద్, విజయవాడ, వైజాగ్ వంటి నగరాలకు: 24-48 గంటల్లో.</li>
                    <li>ఆంధ్రప్రదేశ్ & తెలంగాణలోని ఇతర జిల్లాలకు: 2-3 రోజుల్లో.</li>
                    <li>ఇతర రాష్ట్రాలకు: 5-7 పనిదినాల్లో.</li>
                  </>
                ) : (
                  <>
                    <li>Metro cities like Hyderabad, Vijayawada, Vizag: Within 24-48 hours.</li>
                    <li>Other districts in AP & Telangana: Within 2-3 days.</li>
                    <li>Other states: Within 5-7 working days.</li>
                  </>
                )}
              </ul>
            </div>

            <div className="space-y-1 mt-4">
              <p className="font-extrabold text-amber-950">{isTe ? 'డెలివరీ చార్జీలు:' : 'Shipping Charges:'}</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                {isTe ? (
                  <>
                    <li>₹500 మరియు అంతకంటే ఎక్కువ కొనుగోలుపై డెలివరీ చార్జీలు పూర్తిగా ఉచితం (FREE Shipping).</li>
                    <li>₹500 లోపు ఆర్డర్లకు ₹40 ఫ్లాట్ డెలివరీ చార్జీలు వర్తిస్తాయి.</li>
                  </>
                ) : (
                  <>
                    <li>FREE Shipping on all orders of ₹500 and above.</li>
                    <li>A flat delivery charge of ₹40 applies for orders below ₹500.</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* RETURNS & CANCELLATIONS POLICY */}
        {activeTab === 'returns' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center space-x-2 border-b border-amber-50 pb-3">
              <RotateCcw size={22} className="text-amber-800 shrink-0" />
              <h2 className="text-sm sm:text-base font-extrabold text-amber-950 font-heading">
                {isTe ? 'రిటర్న్స్, క్యాన్సిలేషన్స్ మరియు రీఫండ్ పాలసీ' : 'Returns, Cancellations & Refund Policy'}
              </h2>
            </div>

            <p>{isTe ? 'నూనెలు మరియు ఆహార పదార్థాల నాణ్యత, పరిశుభ్రత మరియు భద్రత కారణాల దృష్ట్యా, డెలివరీ అయిన తర్వాత ఉత్పత్తులపై ఎటువంటి రిటర్న్స్ లేదా ఎక్స్ఛేంజ్లను మేము అంగీకరించము. అన్ని అమ్మకాలు తుది నిర్ణయం.' : 'Due to hygiene, safety, and the perishable food nature of our wood-pressed cooking oils, we do not accept returns or exchanges once the products are delivered. All sales are final.'}</p>
            
            <div className="space-y-1 mt-4">
              <p className="font-extrabold text-amber-950">{isTe ? 'డ్యామేజ్ లేదా తప్పు వస్తువుల పాలసీ:' : 'Damaged or Incorrect Items:'}</p>
              <p>{isTe ? 'ఒకవేళ మీకు అందిన బాటిల్ డ్యామేజ్ అయినా, లీకేజీ ఉన్నా లేదా తప్పు ఉత్పత్తి వచ్చినా, డెలివరీ అయిన 24 గంటల్లోపు మా కస్టమర్ కేర్‌ను సంప్రదించాలి.' : 'If you receive a product that is leaking, physically damaged, or incorrect, please reach out to our customer care team within 24 hours of delivery.'}</p>
              <ul className="list-disc list-inside pl-2 space-y-1 mt-2">
                {isTe ? (
                  <>
                    <li>డ్యామేజ్ అయిన పార్సెల్ యొక్క స్పష్టమైన ఫోటో లేదా అన్‌బాక్సింగ్ వీడియోను మా వాట్సాప్ (+91 86882 91288) నెంబర్ కు పంపాలి.</li>
                    <li>సమస్య నిర్ధారణ అయిన తర్వాత, మేము ఉచితంగా మరొక ఉత్పత్తిని పంపుతాము లేదా రీఫండ్ అందిస్తాము. రీప్లేస్ చేయబడిన ఉత్పత్తి 2-5 రోజులలోపు డెలివరీ చేయబడుతుంది లేదా పూర్తి రీఫండ్ ఇవ్వబడుతుంది.</li>
                  </>
                ) : (
                  <>
                    <li>Please provide clear photo or unboxing video proof of the damage on WhatsApp (+91 86882 91288).</li>
                    <li>Upon validation, we will gladly arrange a free replacement delivery or initiate a full refund. Replaced product will be delivered within 2-5 days or a full refund will be given.</li>
                  </>
                )}
              </ul>
            </div>

            <div className="space-y-1 mt-4">
              <p className="font-extrabold text-amber-950">{isTe ? 'క్యాన్సిలేషన్స్:' : 'Cancellations:'}</p>
              <p>{isTe ? 'డెలివరీ ఏజెంట్ డెలివరీ కోసం బయలుదేరే వరకు (Out for Delivery అవ్వకముందు) మాత్రమే మీ ఆర్డర్‌ని మీరు రద్దు చేసుకోవచ్చు. ఆర్డర్ డెలివరీకి బయలుదేరిన తర్వాత ఎట్టి పరిస్థితుల్లోనూ రద్దులు అంగీకరించబడవు.' : 'You can cancel your order at any time before it goes Out for Delivery. Once the order status is Out for Delivery or beyond, cancellations are strictly not permitted.'}</p>
            </div>

            <div className="space-y-1 mt-4">
              <p className="font-extrabold text-amber-950">{isTe ? 'రీఫండ్ ప్రాసెస్:' : 'Refund Timeline:'}</p>
              <p>{isTe ? 'ఆమోదించబడిన రద్దులు లేదా రీఫండ్లకు, ఆన్‌లైన్ పేమెంట్లకు 3 నుండి 5 పనిదినాల్లో మీ ఒరిజినల్ పేమెంట్ అకౌంట్ కు డబ్బులు జమ చేయబడును. క్యాష్ ఆన్ డెలివరీ (COD) ఆర్డర్ల రీఫండ్లను మీ బ్యాంక్ లేదా UPI అకౌంట్ కు ట్రాన్స్ఫర్ ద్వారా పంపుతాము.' : 'Once a cancellation or refund request is approved, online payments will be refunded to the original payment method within 3-5 working days. For Cash on Delivery (COD) orders, refunds will be sent via bank transfer or UPI.'}</p>
            </div>
          </div>
        )}

        {/* PRIVACY POLICY */}
        {activeTab === 'privacy' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center space-x-2 border-b border-amber-50 pb-3">
              <Lock size={22} className="text-amber-800 shrink-0" />
              <h2 className="text-sm sm:text-base font-extrabold text-amber-950 font-heading">
                {isTe ? 'ప్రైవసీ మరియు భద్రతా పాలసీ' : 'Privacy & Security Policy'}
              </h2>
            </div>

            <p>{isTe ? 'మా వెబ్‌సైట్‌లో మీ వ్యక్తిగత సమాచారం (పేరు, ఫోన్ నెంబర్, అడ్రస్) పూర్తిగా భద్రంగా ఉంచబడుతుంది. దీనిని కేవలం మీ ఆర్డర్లను డెలివరీ చేయడానికి మాత్రమే ఉపయోగిస్తాము.' : 'Your personal information (name, phone number, address) is kept completely secure on our website. It is strictly used only to fulfill and deliver your orders.'}</p>
            
            <div className="space-y-1 mt-4">
              <p className="font-extrabold text-amber-950">{isTe ? 'మేము సేకరించే సమాచారం:' : 'Data Collection:'}</p>
              <p>{isTe ? 'మీరు ఆర్డర్ చేసినప్పుడు ఇచ్చే పేరు, ఈమెయిల్, డెలివరీ అడ్రస్ మరియు ఫోన్ నంబర్ మాత్రమే సేకరిస్తాము. మేము ఎటువంటి క్రెడిట్/డెబిట్ కార్డు పిన్ నంబర్లు లేదా పాస్‌వర్డ్స్ సేకరించము.' : 'We only collect your name, email, delivery address, and phone number when you place an order. We do not collect or store any credit/debit card PINs or passwords.'}</p>
            </div>

            <div className="space-y-1 mt-4">
              <p className="font-extrabold text-amber-950">{isTe ? 'మీ భద్రత:' : 'Security:'}</p>
              <p>{isTe ? 'ఆన్‌లైన్ పేమెంట్లకు సంబంధించిన లావాదేవీలన్నీ అత్యంత భద్రమైన ఎన్‌క్రిప్టెడ్ (Encrypted) గేట్‌వేస్ ద్వారా జరుగుతాయి. మీ కార్డు వివరాలు మా సర్వర్లలో సేవ్ చేయబడవు.' : 'All online payment transactions are securely processed through encrypted payment gateways. Your card details are never saved on our servers.'}</p>
            </div>
          </div>
        )}

        {/* TERMS & CONDITIONS POLICY */}
        {activeTab === 'terms' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center space-x-2 border-b border-amber-50 pb-3">
              <ShieldCheck size={22} className="text-amber-800 shrink-0" />
              <h2 className="text-sm sm:text-base font-extrabold text-amber-950 font-heading">
                {isTe ? 'నిబంధనలు మరియు షరతులు' : 'Terms & Conditions'}
              </h2>
            </div>

            <p>{isTe ? 'OM NATURAL CHEKKA GANUGA NUNELU వెబ్‌సైట్‌ను ఉపయోగించడం ద్వారా మీరు ఈ క్రింది నిబంధనలు మరియు షరతులకు అంగీకరిస్తున్నట్లు భావించబడుతుంది.' : 'By using the OM NATURAL CHEKKA GANUGA NUNELU website, you agree to the following terms and conditions.'}</p>
            
            <div className="space-y-1 mt-4">
              <p className="font-extrabold text-amber-950">{isTe ? 'ఉత్పత్తుల సమాచారం:' : 'Product Information:'}</p>
              <p>{isTe ? 'మా వెబ్‌సైట్‌లో చూపబడిన ఉత్పత్తులన్నీ సహజంగా తయారు చేయబడినవి. సీజన్‌ను బట్టి నూనె రంగు లేదా వాసనలో స్వల్ప మార్పులు ఉండవచ్చు. ఇవి సహజ ఉత్పత్తుల లక్షణం.' : 'All products displayed on our website are naturally produced. There might be slight variations in color or aroma depending on the season, which is characteristic of natural products.'}</p>
            </div>

            <div className="space-y-1 mt-4">
              <p className="font-extrabold text-amber-950">{isTe ? 'ధరలు మరియు చెల్లింపులు:' : 'Pricing & Payments:'}</p>
              <p>{isTe ? 'అన్ని ధరలు భారతీయ రూపాయలలో (INR) ఉంటాయి. ట్యాక్స్ మరియు డెలివరీ ఛార్జీలు వర్తించిన చోట చెక్అవుట్ వద్ద చూపబడతాయి. చెల్లింపులు PhonePe, UPI, మరియు నెట్ బ్యాంకింగ్ ద్వారా అంగీకరించబడతాయి.' : 'All prices are in Indian Rupees (INR). Taxes and delivery charges are shown at checkout where applicable. We accept payments via PhonePe, UPI, and Net Banking.'}</p>
            </div>
            
            <div className="space-y-1 mt-4">
              <p className="font-extrabold text-amber-950">{isTe ? 'సంప్రదించవలసిన చిరునామా:' : 'Contact Information:'}</p>
              <p className="font-bold text-gray-700">OM NATURAL CHEKKA GANUGA NUNELU</p>
              <p className="text-xs text-gray-650 font-bold">
                {isTe ? 'యజమాని & ప్రొప్రైటర్:' : 'Owner & Proprietor:'} Attipatla Nagarjuna
              </p>
              <p>D.No. 126-137, Sri Lakshmi Narasimha Nagar, 5th Line, Inner Ring Road, Gorantla, Guntur, Andhra Pradesh - 522034</p>
              <p>Email: info@om-naturals.com (24 Hrs Support)</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function PolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
      <Navbar />
      <Suspense fallback={<div className="flex-1 flex justify-center items-center"><PremiumLoader /></div>}>
        <PolicyContent />
      </Suspense>
      <Footer />
    </div>
  );
}
