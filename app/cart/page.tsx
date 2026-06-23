'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCartStore } from '@/store/cartStore';
import { useLanguage } from '@/context/LanguageContext';
import { Plus, Minus, Trash2, Tag, ArrowRight, ShoppingCart, Percent, AlertCircle } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { data: session } = useSession();
  
  // Zustand store properties
  const { items, updateQuantity, removeItem, coupon, setCoupon, getCartTotal, getCartCount } = useCartStore();

  // Coupon apply states
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Billing states
  const [subtotal, setSubtotal] = useState(0);
  const [shipping, setShipping] = useState(40);
  const [tax, setTax] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [total, setTotal] = useState(0);

  // Free shipping threshold & tax rate constants
  const FREE_SHIPPING_THRESHOLD = 500;
  const SHIPPING_FEE = 30;
  const PACKING_FEE = 20;
  const GST_RATE = 5;

  // Compute billing summary on cart items/coupon changes
  useEffect(() => {
    const cartSubtotal = getCartTotal();
    setSubtotal(cartSubtotal);

    let couponDiscount = 0;
    if (coupon) {
      // Re-verify if cart total still satisfies minimum value
      if (cartSubtotal >= 200) { // Standard min order value for coupon
        couponDiscount = coupon.discount;
        // recalculate discount in case subtotal changed
        if (coupon.type === 'PERCENT') {
          couponDiscount = (cartSubtotal * coupon.value) / 100;
          // Apply max cap if applicable
          if (coupon.code === 'DEEPAM10' && couponDiscount > 100) couponDiscount = 100;
          if (coupon.code === 'PUREGOLD' && couponDiscount > 200) couponDiscount = 200;
        } else {
          couponDiscount = coupon.value;
        }
        
        if (couponDiscount > cartSubtotal) couponDiscount = cartSubtotal;
        
        setDiscountAmount(couponDiscount);
      } else {
        // Remove coupon because cart no longer satisfies min order
        setCoupon(null);
        setDiscountAmount(0);
        setCouponSuccess('');
        setCouponError('ఉత్పత్తుల మొత్తం ₹200 కంటే తక్కువగా ఉన్నందున కూపన్ తొలగించబడింది.');
      }
    } else {
      setDiscountAmount(0);
    }

    const taxableAmount = cartSubtotal - couponDiscount;
    const computedTax = parseFloat(((taxableAmount * GST_RATE) / 100).toFixed(2));
    const computedShipping = taxableAmount >= FREE_SHIPPING_THRESHOLD || cartSubtotal === 0 ? 0 : SHIPPING_FEE;
    const computedTotal = parseFloat((taxableAmount + computedTax + computedShipping + (cartSubtotal > 0 ? PACKING_FEE : 0)).toFixed(2));

    setTax(computedTax);
    setShipping(computedShipping);
    setTotal(computedTotal);
  }, [items, coupon]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setValidatingCoupon(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        setCoupon({
          code: data.code,
          type: data.type,
          value: data.value,
          discount: data.discount,
        });
        setCouponSuccess(`కూపన్ '${data.code}' విజయవంతంగా వర్తించబడింది! ₹${data.discount} సేవ్ చేసారు.`);
        setCouponCode('');
      } else {
        setCouponError(data.error || 'కూపన్ వర్తించడంలో లోపం జరిగింది.');
      }
    } catch (err) {
      setCouponError('సర్వర్ కనెక్టివిటీ సమస్య. దయచేసి మళ్ళీ ప్రయత్నించండి.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    setCouponSuccess('');
    setCouponError('');
  };

  const handleCheckout = () => {
    if (!session) {
      // If not logged in, redirect to login with redirect parameters back to checkout
      router.push('/login?redirect=/checkout');
    } else {
      router.push('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <div className="max-w-xl mx-auto text-center py-24 px-4 sm:px-6 flex-1 flex flex-col justify-center items-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-700 shadow-sm border border-amber-100">
            <ShoppingCart size={28} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-amber-950 font-heading">
            {t('cart_empty_heading')}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm">
            {t('cart_empty_sub')}
          </p>
          <div className="pt-4">
            <Link
              href="/products"
              className="bg-amber-800 hover:bg-amber-700 text-white font-bold px-8 py-3 rounded-full text-xs sm:text-sm shadow transition-all duration-200"
            >
              {t('cart_start_shopping')}
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <h1 className="text-xl sm:text-3xl font-extrabold text-amber-950 font-heading mb-8">
          {t('cart_title')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Side: Cart Items Table/List */}
          <div className="lg:col-span-8 bg-white border border-amber-100 rounded-3xl p-4 sm:p-6 smooth-shadow space-y-4">
            
            <div className="hidden sm:grid grid-cols-12 gap-4 text-xs font-bold text-amber-900 border-b border-amber-50 pb-3">
              <span className="col-span-6">{t('cart_product_details')}</span>
              <span className="col-span-2 text-center">{t('cart_price')}</span>
              <span className="col-span-2 text-center">{t('cart_quantity')}</span>
              <span className="col-span-2 text-right">{t('cart_total')}</span>
            </div>

            <div className="divide-y divide-amber-50">
              {items.map((item) => (
                <div key={item.productId} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center py-4 text-sm font-medium">
                  {/* Image + Title */}
                  <div className="col-span-1 sm:col-span-6 flex items-center space-x-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover border border-amber-50 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=100&auto=format&fit=crop';
                      }}
                    />
                    <div className="space-y-0.5">
                      <Link href={`/products/${item.productId}`} className="font-bold text-amber-950 hover:text-amber-800 line-clamp-1">
                        {item.nameTe}
                      </Link>
                      <p className="text-[10px] text-gray-500 font-semibold">{item.name.split('(')[0]}</p>
                      <p className="text-[10px] text-amber-600 font-bold">{item.weight} {item.unit}</p>
                    </div>
                  </div>

                  {/* Price (Mobile vs Desktop helper) */}
                  <div className="col-span-1 sm:col-span-2 sm:text-center flex sm:block items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 sm:hidden">{t('cart_price')}:</span>
                    <span className="text-amber-950 font-bold">₹{item.price}</span>
                  </div>

                  {/* Quantity Actions */}
                  <div className="col-span-1 sm:col-span-2 flex sm:justify-center items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 sm:hidden">{t('cart_quantity')}:</span>
                    <div className="flex items-center border border-amber-100 rounded-full py-0.5 px-1 bg-amber-50/20">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-1 rounded-full text-amber-800 hover:bg-amber-100"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="px-3 text-xs font-bold text-amber-950">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="p-1 rounded-full text-amber-800 hover:bg-amber-100"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Item Total & Remove */}
                  <div className="col-span-1 sm:col-span-2 text-right flex sm:block items-center justify-between pt-2 sm:pt-0 border-t border-amber-50/20 sm:border-0">
                    <span className="text-[10px] font-bold text-gray-400 sm:hidden">{t('cart_total')}:</span>
                    <div className="flex items-center justify-end space-x-3">
                      <span className="text-amber-950 font-bold">₹{item.price * item.quantity}</span>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-full transition-colors"
                        title={t('cart_coupon_remove')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {/* Back to shopping CTA */}
            <div className="pt-4 border-t border-amber-50">
              <Link
                href="/products"
                className="text-xs font-bold text-amber-800 hover:text-amber-600 flex items-center space-x-1"
              >
                {t('cart_continue')}
              </Link>
            </div>
          </div>

          {/* Right Side: Coupon & Order Summary */}
          <div className="lg:col-span-4 space-y-6">
            {/* Coupon Code Card */}
            <div className="bg-white border border-amber-100 rounded-3xl p-5 sm:p-6 smooth-shadow">
              <h3 className="text-sm font-bold text-amber-950 mb-3 flex items-center space-x-1.5">
                <Tag size={16} className="text-amber-700" />
                <span>{t('cart_coupon_heading')}</span>
              </h3>

              {coupon ? (
                /* Coupon Applied State */
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="bg-amber-600 text-white p-1 rounded-lg">
                      <Percent size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-amber-950 uppercase">{coupon.code}</p>
                      <p className="text-[10px] text-amber-700 font-bold">{t('cart_coupon_applied')}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 underline"
                  >
                    {t('cart_coupon_remove')}
                  </button>
                </div>
              ) : (
                /* Coupon Input State */
                <form onSubmit={handleApplyCoupon} className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. DEEPAM10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 bg-amber-50/20 text-xs text-amber-900 border border-amber-100 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="bg-amber-800 hover:bg-amber-700 disabled:bg-gray-100 text-white disabled:text-gray-400 font-bold text-xs px-4 rounded-lg shadow-sm"
                    >
                      {validatingCoupon ? t('cart_coupon_checking') : t('cart_coupon_apply')}
                    </button>
                  </div>
                  
                  {couponError && (
                    <p className="text-[10px] text-red-600 font-semibold flex items-center space-x-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{couponError}</span>
                    </p>
                  )}
                  {couponSuccess && (
                    <p className="text-[10px] text-green-600 font-semibold">
                      {couponSuccess}
                    </p>
                  )}

                  {/* Suggest standard active coupons */}
                  <div className="bg-amber-50/30 p-2.5 rounded-xl border border-amber-50">
                    <p className="text-[10px] font-bold text-amber-900">{t('cart_recommended_coupons')}</p>
                    <div className="space-y-1 mt-1.5 text-[10px] text-gray-500 font-medium">
                      <p>• <span className="font-bold text-amber-950 cursor-pointer hover:underline" onClick={() => setCouponCode('DEEPAM10')}>DEEPAM10</span> - {language === 'te' ? '10% ఆఫ్ (గరిష్టంగా ₹100, కనీస కొనుగోలు ₹200)' : '10% Off (Max ₹100, Min purchase ₹200)'}</p>
                      <p>• <span className="font-bold text-amber-950 cursor-pointer hover:underline" onClick={() => setCouponCode('FESTIVE50')}>FESTIVE50</span> - {language === 'te' ? '₹50 ఫ్లాట్ తగ్గింపు (కనీస కొనుగోలు ₹500)' : '₹50 Flat Discount (Min purchase ₹500)'}</p>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Price breakdown Card */}
            <div className="bg-white border border-amber-100 rounded-3xl p-5 sm:p-6 smooth-shadow space-y-4">
              <h3 className="text-sm font-bold text-amber-950 border-b border-amber-50 pb-2">
                {t('cart_order_summary')}
              </h3>

              <div className="space-y-2.5 text-xs text-amber-950 font-medium">
                
                {/* Items Total */}
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('cart_subtotal')}</span>
                  <span className="font-bold">₹{subtotal}</span>
                </div>

                {/* Coupon discount */}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t('cart_discount')}</span>
                    <span className="font-bold">-₹{discountAmount}</span>
                  </div>
                )}

                {/* GST Tax */}
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('cart_gst')} (GST {GST_RATE}%)</span>
                  <span className="font-bold">₹{tax}</span>
                </div>

                {/* Shipping Fee */}
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('cart_shipping')}</span>
                  <span className="font-bold">
                    {shipping === 0 ? (
                      <span className="text-green-600 font-extrabold">{t('cart_free')}</span>
                    ) : (
                      `₹${shipping}`
                    )}
                  </span>
                </div>

                {/* Packing Fee */}
                {subtotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">📦 Packing Charges</span>
                    <span className="font-bold">₹{PACKING_FEE}</span>
                  </div>
                )}

                {/* Free Shipping Progress bar */}
                {subtotal - discountAmount < FREE_SHIPPING_THRESHOLD && (
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 text-[10px] text-amber-900 leading-snug">
                    {language === 'te' 
                      ? `మరొక్క ₹${FREE_SHIPPING_THRESHOLD - (subtotal - discountAmount)} విలువైన వస్తువులను కొనుగోలు చేస్తే డెలివరీ చార్జీలు ఉచితం!`
                      : `Add ₹${FREE_SHIPPING_THRESHOLD - (subtotal - discountAmount)} more to get free shipping!`
                    }
                  </div>
                )}

              </div>

              {/* Total Row */}
              <div className="flex justify-between items-baseline border-t border-amber-50 pt-4 text-amber-950">
                <span className="text-xs font-extrabold sm:text-sm">{t('cart_grand_total')}</span>
                <span className="text-lg sm:text-2xl font-black text-amber-900">₹{total}</span>
              </div>

              {/* Checkout CTA */}
              <div className="pt-2">
                <button
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center space-x-1.5 py-3.5 bg-amber-800 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-md hover:shadow-lg transition-all"
                >
                  <span>{t('cart_checkout_btn')}</span>
                  <ArrowRight size={16} />
                </button>
              </div>

            </div>

          </div>
        </div>

      </main>

      <Footer />
    </>
  );
}
