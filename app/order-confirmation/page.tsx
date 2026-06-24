'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CheckCircle, XCircle, FileText, MapPin, Calendar, HelpCircle, ArrowRight } from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';
import confetti from 'canvas-confetti';
import { useLanguage } from '@/context/LanguageContext';

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const status = searchParams.get('status') || 'success';
  const { language, t } = useLanguage();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Trigger Confetti on Load for Successful Payments/Orders
  useEffect(() => {
    if (status === 'success') {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#b45309', '#f59e0b', '#10b981', '#3b82f6'],
      });
    }
  }, [status]);

  // Load Order Details
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    fetch(`/api/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading order confirmation:', err);
        setLoading(false);
      });
  }, [orderId]);

  if (loading) {
    return (
      <PremiumLoader
        fullScreen={false}
        text={
          language === 'te'
            ? 'ఆర్డర్ వివరాలు లోడ్ అవుతున్నాయి...'
            : 'Loading Order Details...'
        }
      />
    );
  }

  const isSuccess = status === 'success';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1">
      
      {/* Outcome Banner */}
      <div className="text-center space-y-3 mb-10">
        <div className="flex justify-center">
          {isSuccess ? (
            <CheckCircle size={56} className="text-green-600 animate-bounce" />
          ) : (
            <XCircle size={56} className="text-red-600 animate-bounce" />
          )}
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-950 font-heading">
          {isSuccess
            ? (language === 'te' ? 'ఆర్డర్ విజయవంతంగా సమర్పించబడింది!' : 'Order Placed Successfully!')
            : (language === 'te' ? 'చెల్లింపు విఫలమైంది' : 'Payment Failed')}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
          {isSuccess
            ? (language === 'te' ? 'మాతో కొనుగోలు చేసినందుకు ధన్యవాదాలు. మీ ఆర్డర్ కన్ఫర్మ్ చేయబడింది.' : 'Thank you for shopping with us. Your order has been confirmed.')
            : (language === 'te' ? 'క్షమించండి, మీ ఆన్‌లైన్ చెల్లింపు పూర్తి కాలేదు. దయచేసి ఆర్డర్ హిస్టరీకి వెళ్ళి మరలా ప్రయత్నించండి.' : 'Sorry, your online payment could not be completed. Please try again from your order history.')}
        </p>
      </div>

      {isSuccess && order && (
        <div className="space-y-6">
          
          {/* Quick Invoice Card */}
          <div className="bg-white border border-amber-100 rounded-3xl p-5 sm:p-6 smooth-shadow space-y-4">
            
            <div className="flex justify-between items-center border-b border-amber-50 pb-3 text-xs">
              <span className="text-gray-400 font-bold flex items-center space-x-1">
                <FileText size={14} />
                <span>
                  {language === 'te' ? 'ఆర్డర్ నెంబర్' : 'Order Number'}:{' '}
                  <span className="font-extrabold text-amber-950 font-mono">{order.orderId}</span>
                </span>
              </span>
              <span className="text-gray-400 font-bold flex items-center space-x-1">
                <Calendar size={14} />
                <span>
                  {language === 'te' ? 'తేదీ' : 'Date'}:{' '}
                  <span className="font-extrabold text-amber-950">
                    {new Date(order.createdAt).toLocaleDateString(language === 'te' ? 'te-IN' : 'en-IN')}
                  </span>
                </span>
              </span>
            </div>

            {/* Address & Method Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium border-b border-amber-50 pb-4">
              <div className="space-y-1">
                <p className="text-gray-400 font-bold flex items-center space-x-1">
                  <MapPin size={14} className="text-amber-700" />
                  <span>{language === 'te' ? 'డెలివరీ చిరునామా:' : 'Delivery Address:'}</span>
                </p>
                <div className="text-amber-950 font-semibold pl-5 leading-relaxed">
                  <p className="font-black">{order.name}</p>
                  <p>{order.line1}</p>
                  {order.line2 && <p>{order.line2}</p>}
                  <p>{order.city}, {order.state} - {order.pincode}</p>
                  <p>{language === 'te' ? 'ఫోన్' : 'Phone'}: {order.phone}</p>
                </div>
              </div>

              <div className="space-y-1.5 sm:pl-4">
                <p className="text-gray-400 font-bold">{language === 'te' ? 'చెల్లింపు విధానం:' : 'Payment Method:'}</p>
                <div className="pl-1">
                  <span className="inline-block bg-amber-50 text-amber-900 font-black px-3 py-1 rounded-full border border-amber-100">
                    {order.paymentMethod === 'COD'
                      ? (language === 'te' ? 'క్యాష్ ఆన్ డెలివరీ (COD)' : 'Cash on Delivery (COD)')
                      : (language === 'te' ? 'ఆన్‌లైన్ పేమెంట్ (PhonePe)' : 'Online Payment (PhonePe)')}
                  </span>
                </div>
                <p className="text-gray-400 font-bold mt-2">{language === 'te' ? 'చెల్లింపు స్థితి:' : 'Payment Status:'}</p>
                <div className="pl-1">
                  <span className={`inline-block font-black px-3 py-1 rounded-full border ${
                    order.paymentStatus === 'COMPLETED'
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {order.paymentStatus === 'COMPLETED'
                      ? (language === 'te' ? 'పూర్తయింది (Paid)' : 'Completed')
                      : (language === 'te' ? 'పెండింగ్ (Pending)' : 'Pending')}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Summary list */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-amber-950">{language === 'te' ? 'ఆర్డర్ చేసిన వస్తువులు:' : 'Ordered Items:'}</h4>
              <div className="space-y-2">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-xs font-bold text-amber-950">
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={item.image}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-amber-50"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=100&auto=format&fit=crop';
                        }}
                      />
                      <div>
                        <p>{language === 'te' ? item.nameTe : item.name.split('(')[0].trim()}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{item.quantity} x ₹{item.price}</p>
                      </div>
                    </div>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grand Total panel */}
            <div className="border-t border-amber-50 pt-4 flex justify-between items-baseline text-xs text-amber-950 font-medium">
              <span className="font-extrabold">{language === 'te' ? 'మొత్తం ధర:' : 'Grand Total:'}</span>
              <span className="text-xl font-black text-amber-900">₹{order.total}</span>
            </div>

          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href={`/track-order?orderId=${order.id}`}
              className="bg-amber-800 hover:bg-amber-700 text-white font-bold px-8 py-3 rounded-full shadow-md text-xs sm:text-sm text-center flex items-center justify-center space-x-1.5"
            >
              <span>{language === 'te' ? 'ఆర్డర్ ట్రాక్ చేయి' : 'Track Order'}</span>
              <ArrowRight size={16} />
            </Link>
            
            <Link
              href="/"
              className="bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 font-bold px-8 py-3 rounded-full text-xs sm:text-sm text-center"
            >
              {language === 'te' ? 'షాపింగ్ కొనసాగించు' : 'Continue Shopping'}
            </Link>
          </div>

        </div>
      )}

      {!isSuccess && (
        <div className="text-center pt-6 space-y-4">
          <Link
            href="/cart"
            className="inline-block bg-amber-800 hover:bg-amber-700 text-white font-bold px-8 py-3 rounded-full text-xs sm:text-sm shadow-sm"
          >
            {language === 'te' ? 'కార్ట్ కి తిరిగి వెళ్ళు' : 'Return to Cart'}
          </Link>
          
          <div className="pt-8 text-xs text-gray-500 font-semibold flex items-center justify-center space-x-1">
            <HelpCircle size={14} className="text-amber-700" />
            <span>
              {language === 'te'
                ? 'సహాయం కొరకు వాట్సాప్ (+91 99999 99999) సంప్రదించండి'
                : 'Contact WhatsApp (+91 99999 99999) for support'}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<PremiumLoader fullScreen={false} />}>
        <OrderConfirmationContent />
      </Suspense>
      <Footer />
    </>
  );
}
