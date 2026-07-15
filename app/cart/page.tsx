'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BackButton from '@/components/BackButton';
import { useCartStore } from '@/store/cartStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLanguage } from '@/context/LanguageContext';
import { Plus, Minus, Trash2, Tag, ArrowRight, ShoppingCart, Percent, AlertCircle } from 'lucide-react';
import Image from 'next/image';

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
  const [shipping, setShipping] = useState(0);
  const [tax, setTax] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [total, setTotal] = useState(0);

  // Site settings — loaded instantly from persisted cache, refreshed in background
  const { shippingFee: SHIPPING_FEE, packingFee: PACKING_FEE, gstRate: GST_RATE, freeShippingAbove: FREE_SHIPPING_THRESHOLD, fetchSettings } = useSettingsStore();

  // Active coupons — fetched dynamically from /api/coupons/public
  const [activeCoupons, setActiveCoupons] = useState<{
    code: string;
    type: string;
    value: number;
    minOrderValue: number;
    maxDiscount: number | null;
  }[]>([]);

  // Refresh stale cart images, active status, and stock from API on mount
  useEffect(() => {
    const cartItems = useCartStore.getState().items;
    if (cartItems.length === 0) return;
    const productIds = cartItems.map((i) => i.productId);
    fetch(`/api/products?ids=${productIds.join(',')}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { id: string; images?: string[]; isActive: boolean; stock: number }[] | null) => {
        if (!Array.isArray(data)) return;
        const store = useCartStore.getState();
        const updatedItems = store.items.map((cartItem) => {
          const freshProduct = data.find((p) => p.id === cartItem.productId);
          if (freshProduct) {
            return { 
              ...cartItem, 
              image: freshProduct.images?.[0] || cartItem.image,
              isActive: freshProduct.isActive,
              stock: freshProduct.stock
            };
          }
          // If the product is completely missing from the API results, mark as inactive
          return { ...cartItem, isActive: false };
        });
        // Check if anything changed to update the store
        const anyChanged = updatedItems.some((u, i) => 
          u.image !== store.items[i].image || 
          u.isActive !== store.items[i].isActive || 
          u.stock !== store.items[i].stock
        );
        if (anyChanged) {
          useCartStore.setState({ items: updatedItems });
        }
      })
      .catch(() => {/* silently fail */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch settings (uses cache — won't re-fetch if updated within last 5 min) & active coupons
  useEffect(() => {
    fetchSettings();

    fetch('/api/coupons/public')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setActiveCoupons(data); })
      .catch(() => {});
  }, [fetchSettings]);

  // Recompute billing summary whenever cart items, coupon, or site-settings change
  useEffect(() => {
    const cartSubtotal = getCartTotal();
    setSubtotal(cartSubtotal);

    let couponDiscount = 0;
    if (coupon) {
      // Re-verify if cart total still satisfies the coupon's minimum order value
      const minRequired = coupon.minOrderValue ?? 0;
      if (cartSubtotal >= minRequired) {
        // Recalculate discount based on current subtotal (handles cart quantity changes)
        if (coupon.type === 'PERCENT') {
          couponDiscount = (cartSubtotal * coupon.value) / 100;
          // Respect server-defined maxDiscount cap stored in the coupon state
          if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
            couponDiscount = coupon.maxDiscount;
          }
        } else {
          couponDiscount = coupon.value;
        }
        if (couponDiscount > cartSubtotal) couponDiscount = cartSubtotal;
        setDiscountAmount(couponDiscount);
      } else {
        // Coupon no longer valid for current cart total — remove it
        setCoupon(null);
        setDiscountAmount(0);
        setCouponSuccess('');
        setCouponError(
          language === 'te'
            ? `కూపన్ కు కనీస కొనుగోలు ₹${minRequired} అవసరం. కూపన్ తొలగించబడింది.`
            : `Coupon requires a minimum order of ₹${minRequired}. Coupon removed.`
        );
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
  }, [items, coupon, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, PACKING_FEE, GST_RATE, getCartTotal, language, setCoupon]);

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
        body: JSON.stringify({ code: couponCode, subtotal, language }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        setCoupon({
          code: data.code,
          type: data.type,
          value: data.value,
          discount: data.discount,
          minOrderValue: data.minOrderValue,
          maxDiscount: data.maxDiscount,
        });
        setCouponSuccess(language === 'te' ? `కూపన్ '${data.code}' విజయవంతంగా వర్తించబడింది! ₹${data.discount} సేవ్ చేసారు.` : `Coupon '${data.code}' applied successfully! You saved ₹${data.discount}.`);
        setCouponCode('');
      } else {
        setCouponError(data.error || (language === 'te' ? 'కూపన్ వర్తించడంలో లోపం జరిగింది.' : 'Error applying coupon.'));
      }
    } catch (err) {
      setCouponError(language === 'te' ? 'సర్వర్ కనెక్టివిటీ సమస్య. దయచేసి మళ్ళీ ప్రయత్నించండి.' : 'Server connectivity issue. Please try again.');
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
      <div className="min-h-screen bg-[#fcf9f4] flex flex-col">
                <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 mb-4 pt-4">
          <BackButton />
        </div>
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
              </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcf9f4] flex flex-col">
      
      <main className="max-w-screen-2xl mx-auto px-3 sm:px-8 lg:px-12 py-6 sm:py-8 flex-1 w-full">
        <div className="mb-6">
          <BackButton />
        </div>
        <h1 className="text-xl sm:text-3xl font-extrabold text-amber-950 font-heading mb-8">
          {t('cart_title')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Side: Cart Items Table/List */}
          <div className="lg:col-span-8 bg-white border border-amber-100 rounded-3xl p-4 sm:p-6 smooth-shadow space-y-4">
            
            <div className="divide-y divide-amber-50 border-t border-amber-50">
              {items.map((item) => (
                <div key={item.productId} className="flex flex-col sm:flex-row gap-4 py-5 first:pt-2">
                  {/* Left: Image */}
                  <div className="flex gap-4 w-full">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 96px, 112px"
                        className="rounded-2xl object-contain p-1.5 bg-amber-50/20 shadow-sm border border-amber-100"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).srcset = '/images/logo-512.png';
                        }}
                      />
                    </div>
                    
                    {/* Right: Details */}
                    <div className="flex flex-col flex-1 min-w-0 py-1">
                      
                      {/* Title & Delete Row */}
                      <div className="flex justify-between items-start">
                        <div className="pr-2">
                          <Link href={item.slug ? `/products/${item.slug}` : '#'} className="text-sm font-bold text-amber-950 hover:text-amber-700 line-clamp-2 leading-tight">
                            {language === 'te' ? item.nameTe : item.name.split('(')[0]}
                          </Link>
                          <p className="text-[11px] font-bold text-amber-600 mt-1.5 bg-amber-50 inline-block px-2 py-0.5 rounded-md border border-amber-100">{item.weight} {item.unit}</p>
                          {item.isActive === false && (
                            <p className="text-xs font-bold text-red-650 mt-1 flex items-center gap-1 animate-pulse">
                              ⚠️ {language === 'te' ? 'ప్రస్తుతం అందుబాటులో లేదు' : 'Currently Unavailable'}
                            </p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-red-400 hover:text-red-600 p-2 -mr-2 -mt-2 rounded-full hover:bg-red-50 transition-colors shrink-0"
                          title={t('cart_coupon_remove')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Price & Quantity Row */}
                      <div className="mt-auto pt-4 flex items-end justify-between">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block mb-0.5 sm:hidden">{t('cart_price')}</span>
                          <span className="text-lg font-black text-amber-950">₹{item.price}</span>
                        </div>

                        {/* Quantity Control */}
                        <div className="flex items-center border border-amber-100 rounded-full bg-white shadow-sm overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            disabled={item.isActive === false}
                            className="px-3 py-1.5 text-amber-800 hover:bg-amber-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="px-1 text-xs font-bold text-amber-950 min-w-[20px] text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.isActive === false || item.quantity >= item.stock}
                            className="px-3 py-1.5 text-amber-800 hover:bg-amber-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                  
                  {/* Total line item display for desktop */}
                  <div className="hidden sm:flex flex-col items-end justify-center min-w-[80px] pl-4 border-l border-amber-50">
                     <span className="text-[10px] text-gray-400 font-bold mb-1">{t('cart_total')}</span>
                     <span className="text-lg font-black text-amber-950">₹{item.price * item.quantity}</span>
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
                      placeholder="e.g. NUNE10"
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

                  {/* Dynamic active coupons from database */}
                  {activeCoupons.length > 0 && (
                    <div className="bg-amber-50/30 p-2.5 rounded-xl border border-amber-50">
                      <p className="text-[10px] font-bold text-amber-900">{t('cart_recommended_coupons')}</p>
                      <div className="space-y-1 mt-1.5 text-[10px] text-gray-500 font-medium">
                        {activeCoupons.map((c) => {
                          let desc = '';
                          if (c.type === 'PERCENT') {
                            desc = language === 'te'
                              ? `${c.value}% ఆఫ్${c.maxDiscount ? ` (గరిష్టంగా ₹${c.maxDiscount})` : ''}${c.minOrderValue > 0 ? `, కనీస కొనుగోలు ₹${c.minOrderValue}` : ''}`
                              : `${c.value}% Off${c.maxDiscount ? ` (Max ₹${c.maxDiscount})` : ''}${c.minOrderValue > 0 ? `, Min ₹${c.minOrderValue}` : ''}`;
                          } else {
                            desc = language === 'te'
                              ? `₹${c.value} ఫ్లాట్ తగ్గింపు${c.minOrderValue > 0 ? ` (కనీస కొనుగోలు ₹${c.minOrderValue})` : ''}`
                              : `₹${c.value} Flat Discount${c.minOrderValue > 0 ? ` (Min ₹${c.minOrderValue})` : ''}`;
                          }
                          return (
                            <p key={c.code}>
                              •{' '}
                              <span
                                className="font-bold text-amber-950 cursor-pointer hover:underline"
                                onClick={() => setCouponCode(c.code)}
                              >
                                {c.code}
                              </span>
                              {' '}- {desc}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                    <span className="text-gray-500">📦 {language === 'te' ? 'ప్యాకింగ్ చార్జీలు' : 'Packing Charges'}</span>
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
                  disabled={items.some(item => item.isActive === false)}
                  className="w-full flex items-center justify-center space-x-1.5 py-3.5 bg-amber-800 hover:bg-amber-700 disabled:bg-gray-100 text-white disabled:text-gray-400 font-extrabold text-xs sm:text-sm rounded-full shadow-md hover:shadow-lg transition-all"
                >
                  <span>
                    {items.some(item => item.isActive === false)
                      ? (language === 'te' ? 'అందుబాటులో లేని వస్తువులను తొలగించండి' : 'Remove Unavailable Items')
                      : t('cart_checkout_btn')}
                  </span>
                  {!items.some(item => item.isActive === false) && <ArrowRight size={16} />}
                </button>
              </div>

            </div>

          </div>
        </div>

      </main>

          </div>
  );
}
