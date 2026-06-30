'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CheckCircle, XCircle, FileText, MapPin, Calendar, HelpCircle, ArrowRight, RefreshCw, Clock } from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';
import confetti from 'canvas-confetti';
import { useLanguage } from '@/context/LanguageContext';
import { useCartStore } from '@/store/cartStore';
import Image from 'next/image';

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId') || '';
  const status = searchParams.get('status') || 'success';
  const { language, t } = useLanguage();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  // Trigger Confetti on Load for Successful Payments/Orders
  const { clearCart } = useCartStore();

  useEffect(() => {
    if (status === 'success') {
      clearCart();
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#b45309', '#f59e0b', '#10b981', '#3b82f6'],
      });
    }
  }, [status, clearCart]);

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

  // Retry payment handler for failed online orders
  const handleRetryPayment = async () => {
    if (!orderId) return;
    setRetrying(true);
    setRetryError('');
    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        router.push(data.url);
      } else {
        setRetryError(data.error || (language === 'te' ? 'పేమెంట్ మళ్ళీ ప్రారంభించడంలో లోపం జరిగింది.' : 'Failed to re-initiate payment. Please try from your order history.'));
        setRetrying(false);
      }
    } catch (err) {
      setRetryError(language === 'te' ? 'నెట్‌వర్క్ లోపం. దయచేసి మళ్ళీ ప్రయత్నించండి.' : 'Network error. Please try again.');
      setRetrying(false);
    }
  };

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
  const isPending = status === 'pending';
  const isFailed = status === 'failed' || status === 'error';
  const isOnlineOrder = order?.paymentMethod === 'PHONEPE';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1">
      
      {/* Outcome Banner */}
      <div className="text-center space-y-3 mb-10">
        <div className="flex justify-center">
          {isSuccess ? (
            <CheckCircle size={56} className="text-green-600 animate-bounce" />
          ) : isPending ? (
            <Clock size={56} className="text-amber-500 animate-pulse" />
          ) : (
            <XCircle size={56} className="text-red-600 animate-bounce" />
          )}
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-950 font-heading">
          {isSuccess
            ? (language === 'te' ? 'ఆర్డర్ విజయవంతంగా సమర్పించబడింది!' : 'Order Placed Successfully!')
            : isPending
            ? (language === 'te' ? 'చెల్లింపు పెండింగ్లో ఉంది' : 'Payment Pending')
            : (language === 'te' ? 'చెల్లింపు విఫలమైంది' : 'Payment Failed')}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
          {isSuccess
            ? (language === 'te' ? 'మాతో కొనుగోలు చేసినందుకు ధన్యవాదాలు. మీ ఆర్డర్ కన్ఫర్మ్ చేయబడింది.' : 'Thank you for shopping with us. Your order has been confirmed.')
            : isPending
            ? (language === 'te' ? 'మీ చెల్లింపు ఇంకా ప్రాసెస్ అవుతోంది. దయచేసి కొంత సేపు వేచి ఉండండి.' : 'Your payment is still being processed. Please wait a moment or check your orders.')
            : (language === 'te' ? 'క్షమించండి, మీ ఆన్‌లైన్ చెల్లింపు పూర్తి కాలేదు. మీ ఆర్డర్ ఇంకా కన్ఫర్మ్ కాలేదు — దయచేసి మళ్ళీ పే చేయండి లేదా కొత్త ఆర్డర్ పెట్టండి.' : 'Your payment was not completed. Your order is NOT confirmed — please retry payment or place a new order.')}
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
                    {new Date(order.createdAt).toLocaleDateString(language === 'te' ? 'te-IN' : 'en-IN', { timeZone: 'Asia/Kolkata' })}
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
                      <Image
                        src={item.image}
                        alt=""
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-lg object-cover border border-amber-50"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).srcset = '/images/logo-512.png';
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

      {/* PENDING payment state */}
      {isPending && (
        <div className="text-center pt-6 space-y-5 max-w-sm mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 space-y-3">
            <Clock size={32} className="text-amber-600 mx-auto animate-pulse" />
            <p className="text-sm font-bold text-amber-900">
              {language === 'te' ? 'మీ చెల్లింపు ప్రాసెస్ చేయబడుతోంది' : 'Your payment is being processed'}
            </p>
            <p className="text-xs text-gray-500">
              {language === 'te'
                ? 'PhonePe చెల్లింపు ఇంకా పూర్తికాలేదు. మీ ఆర్డర్ హిస్టరీ చెక్ చేయండి.'
                : 'PhonePe payment not yet complete. Check your order history for the latest status.'}
            </p>
          </div>
          <Link
            href="/account?tab=orders"
            className="inline-block bg-amber-800 hover:bg-amber-700 text-white font-bold px-8 py-3 rounded-full text-xs sm:text-sm shadow-sm"
          >
            {language === 'te' ? 'నా ఆర్డర్లు చూడు' : 'View My Orders'}
          </Link>
        </div>
      )}

      {/* FAILED payment state */}
      {isFailed && (
        <div className="text-center pt-6 space-y-5 max-w-sm mx-auto">
          {/* Retry Payment for online orders with known orderId */}
          {orderId && order && isOnlineOrder && order.paymentStatus !== 'COMPLETED' && (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <XCircle size={24} className="text-red-600" />
              </div>
              <p className="text-sm font-extrabold text-red-800">
                {language === 'te'
                  ? '⚠️ మీ ఆర్డర్ కన్ఫర్మ్ కాలేదు!'
                  : '⚠️ Your Order is NOT Confirmed!'}
              </p>
              <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                {language === 'te'
                  ? `ఆర్డర్ #${order.orderId} కు చెల్లింపు పూర్తికాలేదు. చెల్లింపు విఫలమైంది కాబట్టి ఆర్డర్ ప్రాసెస్ కాలేదు.`
                  : `Payment for Order #${order?.orderId} failed. Since payment was not received, your order has NOT been processed or confirmed.`}
              </p>
              {retryError && (
                <p className="text-xs text-red-600 font-semibold">{retryError}</p>
              )}
              <button
                onClick={handleRetryPayment}
                disabled={retrying}
                className="w-full flex items-center justify-center space-x-2 bg-amber-800 hover:bg-amber-700 disabled:bg-gray-300 text-white font-bold px-8 py-3 rounded-full text-sm shadow-sm transition-all"
              >
                {retrying ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-white" />
                    <span>{language === 'te' ? 'ప్రాసెస్ చేస్తున్నాం...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    <span>{language === 'te' ? 'చెల్లింపు మళ్ళీ ప్రయత్నించు' : '🔄 Retry Payment'}</span>
                  </>
                )}
              </button>
              <Link
                href="/products"
                className="w-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-8 py-3 rounded-full text-sm transition-all"
              >
                {language === 'te' ? '🛒 నూతన ఆర్డర్ పెట్టు' : '🛒 Place a New Order'}
              </Link>
            </div>
          )}
          
          <Link
            href="/account?tab=orders"
            className="inline-block bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 font-bold px-8 py-3 rounded-full text-xs sm:text-sm"
          >
            {language === 'te' ? 'నా ఆర్డర్లు చూడు' : 'View My Orders'}
          </Link>
          
          <div className="pt-4 text-xs text-gray-500 font-semibold flex items-center justify-center space-x-1">
            <HelpCircle size={14} className="text-amber-700" />
            <span>
              {language === 'te'
                ? 'సహాయం కొరకు వాట్సాప్ (+91 86882 91288) సంప్రదించండి'
                : 'Contact WhatsApp (+91 86882 91288) for support'}
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
