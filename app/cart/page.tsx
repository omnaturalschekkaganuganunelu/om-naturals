'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCartStore } from '@/store/cartStore';
import { useLanguage } from '@/context/LanguageContext';
import {
  Plus, Minus, Trash2, Tag, ArrowRight, ShoppingBag,
  Percent, AlertCircle, Truck, Package2, CheckCircle2,
  ChevronRight, Sparkles
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { data: session } = useSession();

  const { items, updateQuantity, removeItem, coupon, setCoupon, getCartTotal, getCartCount } = useCartStore();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [subtotal, setSubtotal] = useState(0);
  const [shipping, setShipping] = useState(30);
  const [tax, setTax] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [total, setTotal] = useState(0);

  const FREE_SHIPPING_THRESHOLD = 500;
  const SHIPPING_FEE = 30;
  const PACKING_FEE = 20;
  const GST_RATE = 5;

  useEffect(() => {
    const cartSubtotal = getCartTotal();
    setSubtotal(cartSubtotal);

    let couponDiscount = 0;
    if (coupon) {
      if (cartSubtotal >= 200) {
        couponDiscount = coupon.discount;
        if (coupon.type === 'PERCENT') {
          couponDiscount = (cartSubtotal * coupon.value) / 100;
          if (coupon.code === 'DEEPAM10' && couponDiscount > 100) couponDiscount = 100;
          if (coupon.code === 'PUREGOLD' && couponDiscount > 200) couponDiscount = 200;
        } else {
          couponDiscount = coupon.value;
        }
        if (couponDiscount > cartSubtotal) couponDiscount = cartSubtotal;
        setDiscountAmount(couponDiscount);
      } else {
        setCoupon(null);
        setDiscountAmount(0);
        setCouponSuccess('');
        setCouponError('Coupon removed — order total below minimum.');
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
        setCoupon({ code: data.code, type: data.type, value: data.value, discount: data.discount });
        setCouponSuccess(`'${data.code}' applied! You saved ₹${data.discount} 🎉`);
        setCouponCode('');
      } else {
        setCouponError(data.error || 'Invalid coupon code.');
      }
    } catch {
      setCouponError('Connection error. Please try again.');
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
      router.push('/login?redirect=/checkout');
    } else {
      router.push('/checkout');
    }
  };

  const freeShippingProgress = Math.min(((subtotal - discountAmount) / FREE_SHIPPING_THRESHOLD) * 100, 100);

  /* ── Empty State ── */
  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center space-y-5">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full flex items-center justify-center shadow-inner">
              <ShoppingBag size={36} className="text-amber-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 bg-amber-200 rounded-full flex items-center justify-center">
              <span className="text-amber-700 font-black text-sm">0</span>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-amber-950 font-heading">{t('cart_empty_heading')}</h2>
            <p className="text-sm text-gray-400 font-medium mt-2 max-w-xs mx-auto leading-relaxed">{t('cart_empty_sub')}</p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-700 to-amber-900 text-white font-bold px-8 py-3.5 rounded-full text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:shadow-xl transition-all active:scale-95"
          >
            <Sparkles size={16} />
            {t('cart_start_shopping')}
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">

        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-amber-950 font-heading">{t('cart_title')}</h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{items.length} {items.length === 1 ? 'item' : 'items'} in your cart</p>
          </div>
          <Link href="/products" className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors">
            {t('cart_continue')}
          </Link>
        </div>

        {/* Free Shipping Progress Banner */}
        {subtotal > 0 && subtotal - discountAmount < FREE_SHIPPING_THRESHOLD && (
          <div className="mb-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Truck size={15} className="text-amber-700" />
                <p className="text-xs font-bold text-amber-900">
                  Add <span className="text-amber-700 font-black">₹{FREE_SHIPPING_THRESHOLD - (subtotal - discountAmount)}</span> more for FREE delivery!
                </p>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {Math.round(freeShippingProgress)}%
              </span>
            </div>
            <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-700 rounded-full transition-all duration-500"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>
        )}

        {subtotal - discountAmount >= FREE_SHIPPING_THRESHOLD && subtotal > 0 && (
          <div className="mb-5 bg-green-50 border border-green-100 rounded-2xl p-3.5 flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
            <p className="text-xs font-bold text-green-700">🎉 You have FREE delivery on this order!</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── Cart Items ── */}
          <div className="lg:col-span-8 space-y-3">
            {items.map((item, index) => (
              <div
                key={item.productId}
                className="bg-white rounded-2xl border border-amber-100/80 p-4 sm:p-5 smooth-shadow hover:border-amber-200 transition-all duration-200"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex gap-4">
                  {/* Product Image */}
                  <Link href={`/products/${item.productId}`} className="flex-shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-amber-100 bg-amber-50">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=200&auto=format&fit=crop';
                        }}
                      />
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/products/${item.productId}`}>
                          <p className="font-black text-amber-950 text-sm sm:text-base leading-tight hover:text-amber-700 transition-colors line-clamp-1">
                            {item.nameTe}
                          </p>
                          <p className="text-[11px] text-gray-500 font-semibold mt-0.5 line-clamp-1">
                            {item.name.split('(')[0].trim()}
                          </p>
                        </Link>
                        <span className="inline-block mt-1.5 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                          {item.weight} {item.unit}
                        </span>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all duration-200"
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Price + Qty row */}
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-lg font-black text-amber-900">₹{item.price * item.quantity}</p>
                        {item.quantity > 1 && (
                          <p className="text-[10px] text-gray-400 font-semibold">₹{item.price} × {item.quantity}</p>
                        )}
                      </div>

                      {/* Quantity Control */}
                      <div className="flex items-center bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-9 h-9 flex items-center justify-center text-amber-700 hover:bg-amber-100 transition-colors font-bold"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="px-3 text-sm font-black text-amber-950 min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-9 h-9 flex items-center justify-center text-amber-700 hover:bg-amber-100 transition-colors font-bold"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Right Column: Coupon + Summary ── */}
          <div className="lg:col-span-4 space-y-4">

            {/* Coupon Card */}
            <div className="bg-white rounded-2xl border border-amber-100/80 p-5 smooth-shadow">
              <h3 className="text-sm font-black text-amber-950 mb-3.5 flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 rounded-lg">
                  <Tag size={14} className="text-amber-700" />
                </div>
                {t('cart_coupon_heading')}
              </h3>

              {coupon ? (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-amber-600 rounded-xl flex items-center justify-center">
                      <Percent size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-amber-950 uppercase tracking-wider">{coupon.code}</p>
                      <p className="text-[10px] text-green-600 font-bold">Saving ₹{discountAmount}!</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="E.G. DEEPAM10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-amber-50/40 text-amber-950 border border-amber-100 rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 uppercase placeholder:font-medium placeholder:text-gray-300 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="bg-amber-800 hover:bg-amber-700 disabled:bg-gray-100 text-white disabled:text-gray-400 font-black text-xs px-4 rounded-xl shadow-sm transition-colors"
                    >
                      {validatingCoupon ? '...' : t('cart_coupon_apply')}
                    </button>
                  </div>

                  {couponError && (
                    <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                      <AlertCircle size={11} /> {couponError}
                    </p>
                  )}
                  {couponSuccess && (
                    <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} /> {couponSuccess}
                    </p>
                  )}

                  {/* Quick apply coupons */}
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available Offers</p>
                    {[
                      { code: 'DEEPAM10', desc: '10% Off · Max ₹100 · Min ₹200' },
                      { code: 'FESTIVE50', desc: '₹50 Flat · Min ₹500' },
                    ].map(({ code, desc }) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCouponCode(code)}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50/60 hover:bg-amber-50 border border-amber-100 hover:border-amber-200 rounded-xl text-left transition-all group"
                      >
                        <div>
                          <p className="text-xs font-black text-amber-800">{code}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{desc}</p>
                        </div>
                        <ChevronRight size={13} className="text-amber-400 group-hover:text-amber-700 transition-colors" />
                      </button>
                    ))}
                  </div>
                </form>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl border border-amber-100/80 p-5 smooth-shadow">
              <h3 className="text-sm font-black text-amber-950 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 rounded-lg">
                  <Package2 size={14} className="text-amber-700" />
                </div>
                {t('cart_order_summary')}
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">{t('cart_subtotal')} ({items.length} items)</span>
                  <span className="font-black text-amber-950">₹{subtotal}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span className="font-medium flex items-center gap-1">
                      <Tag size={10} /> Coupon Discount
                    </span>
                    <span className="font-black">−₹{discountAmount}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">GST (5%)</span>
                  <span className="font-black text-amber-950">₹{tax}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium flex items-center gap-1">
                    <Truck size={11} /> Shipping
                  </span>
                  <span className="font-black">
                    {shipping === 0
                      ? <span className="text-green-600 font-black">FREE</span>
                      : `₹${shipping}`}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium flex items-center gap-1">
                    <Package2 size={11} /> Packing
                  </span>
                  <span className="font-black text-amber-950">₹{PACKING_FEE}</span>
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-amber-100 pt-3 mt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-amber-950">{t('cart_grand_total')}</span>
                    <span className="text-2xl font-black text-amber-900">₹{total}</span>
                  </div>
                  {discountAmount > 0 && (
                    <p className="text-[10px] text-green-600 font-bold mt-1 text-right">
                      You save ₹{discountAmount} with coupon!
                    </p>
                  )}
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={handleCheckout}
                className="mt-5 w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:shadow-xl transition-all active:scale-[0.98]"
              >
                {t('cart_checkout_btn')}
                <ArrowRight size={16} />
              </button>

              <p className="text-center text-[10px] text-gray-300 font-semibold mt-2.5">
                🔒 100% Secure Checkout
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
