'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCartStore } from '@/store/cartStore';
import { useLanguage } from '@/context/LanguageContext';
import {
  MapPin, Plus, Check, ShieldCheck, CreditCard, RefreshCw,
  Truck, AlertCircle, Package2, ChevronRight, Navigation,
  Smartphone, Banknote
} from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';
import CustomSelect from '@/components/CustomSelect';

export default function CheckoutPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { data: session, status: authStatus } = useSession();

  const { items, coupon, getCartTotal, clearCart } = useCartStore();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: 'Telangana',
    pincode: '',
    latitude: null as number | null,
    longitude: null as number | null,
    isDefault: false,
  });
  const [formError, setFormError] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'PHONEPE' | 'COD'>('PHONEPE');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [codEnabled, setCodEnabled] = useState(true);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login?redirect=/checkout');
    }
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === 'authenticated' && items.length === 0) {
      router.push('/cart');
    }
  }, [items, authStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    fetch('/api/addresses')
      .then((r) => r.json())
      .then((data) => {
        setAddresses(data);
        const def = data.find((a: any) => a.isDefault);
        if (def) setSelectedAddressId(def.id);
        else if (data.length > 0) setSelectedAddressId(data[0].id);
        setLoadingAddresses(false);
      })
      .catch(() => setLoadingAddresses(false));

    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setCodEnabled(data.codEnabled))
      .catch(() => {});
  }, [authStatus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
    setFetchingLocation(true);
    setLocationStatus('📍 Fetching your location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData((prev) => ({ ...prev, latitude, longitude }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`
          );
          if (res.ok) {
            const d = await res.json();
            const addr = d.address || {};
            setFormData((prev) => ({
              ...prev,
              line1: prev.line1 || addr.road || addr.suburb || '',
              line2: prev.line2 || `${addr.suburb || addr.county || ''} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
              city: prev.city || addr.city || addr.town || addr.village || '',
              state: addr.state === 'Andhra Pradesh' ? 'Andhra Pradesh' : 'Telangana',
              pincode: prev.pincode || addr.postcode || '',
            }));
            setLocationStatus('✅ Location captured & address autofilled!');
          } else {
            setLocationStatus('📍 Coordinates captured!');
          }
        } catch {
          setLocationStatus('📍 Coordinates captured!');
        } finally {
          setFetchingLocation(false);
        }
      },
      () => {
        setLocationStatus('❌ Could not get location. Please fill manually.');
        setFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSavingAddress(true);
    const { name, phone, line1, city, state, pincode } = formData;
    if (!name || !phone || !line1 || !city || !state || !pincode) {
      setFormError('Please fill all required fields.');
      setSavingAddress(false);
      return;
    }
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const newAddr = await res.json();
      if (res.ok) {
        setAddresses([newAddr, ...addresses]);
        setSelectedAddressId(newAddr.id);
        setShowAddressForm(false);
        setFormData({ name: '', phone: '', line1: '', line2: '', city: '', state: 'Telangana', pincode: '', latitude: null, longitude: null, isDefault: false });
      } else {
        setFormError(newAddr.error || 'Failed to save address.');
      }
    } catch {
      setFormError('Server error. Please retry.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    setCheckoutError('');
    setPlacingOrder(true);
    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddress) {
      setCheckoutError('Please select a delivery address.');
      setPlacingOrder(false);
      return;
    }
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, name: i.name })),
          address: {
            name: selectedAddress.name,
            phone: selectedAddress.phone,
            line1: selectedAddress.line1,
            line2: selectedAddress.line2 || '',
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
          },
          couponCode: coupon?.code || null,
          paymentMethod,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        const orderId = result.order.id;
        if (result.triggerPayment) {
          const payRes = await fetch('/api/payment/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId }),
          });
          const payData = await payRes.json();
          if (payRes.ok && payData.url) {
            clearCart();
            router.push(payData.url);
          } else {
            setCheckoutError('Payment gateway error. Please try again.');
            setPlacingOrder(false);
          }
        } else {
          clearCart();
          router.push(`/order-confirmation?orderId=${orderId}&status=success&method=COD`);
        }
      } else {
        setCheckoutError(result.error || 'Failed to place order.');
        setPlacingOrder(false);
      }
    } catch {
      setCheckoutError('Connection error. Please try again.');
      setPlacingOrder(false);
    }
  };

  if (authStatus === 'loading') {
    return <PremiumLoader fullScreen={true} text="Preparing Checkout..." />;
  }

  const subtotal = getCartTotal();
  const discount = coupon ? coupon.discount : 0;
  const taxable = subtotal - discount;
  const tax = parseFloat(((taxable * 5) / 100).toFixed(2));
  const shipping = taxable >= 500 ? 0 : 30;
  const packingFee = 20;
  const total = parseFloat((taxable + tax + shipping + packingFee).toFixed(2));

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-amber-950 font-heading">
            Checkout (చెక్అవుట్)
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Complete your order securely</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT: Address + Payment ── */}
          <div className="lg:col-span-8 space-y-5">

            {/* Delivery Address Card */}
            <div className="bg-white rounded-2xl border border-amber-100 smooth-shadow overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-amber-50">
                <h3 className="font-black text-sm text-amber-950 flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <MapPin size={14} className="text-amber-700" />
                  </div>
                  Delivery Address (డెలివరీ చిరునామా)
                </h3>
                <button
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-all"
                >
                  <Plus size={12} />
                  New Address
                </button>
              </div>

              <div className="p-5 space-y-4">

                {/* New Address Form */}
                {showAddressForm && (
                  <form onSubmit={handleSaveAddress} className="bg-amber-50/40 p-4 sm:p-5 rounded-2xl border border-amber-100 space-y-4 animate-fade-in-up">
                    <h4 className="text-xs font-black text-amber-950">New Address Details:</h4>

                    {/* Live Location Button */}
                    <button
                      type="button"
                      onClick={handleGetLiveLocation}
                      disabled={fetchingLocation}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-60 active:scale-98"
                    >
                      <Navigation size={13} className={fetchingLocation ? 'animate-pulse' : ''} />
                      {fetchingLocation ? 'Fetching Location...' : '📍 Use My Live Location'}
                    </button>
                    {locationStatus && (
                      <p className="text-[11px] font-bold text-center text-amber-800 bg-amber-50 px-3 py-2 rounded-xl">{locationStatus}</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: 'Full Name *', name: 'name', placeholder: 'e.g. Suresh Kumar', col: 1 },
                        { label: 'Mobile Number *', name: 'phone', placeholder: 'e.g. 9876543210', col: 1 },
                        { label: 'House / Street (Line 1) *', name: 'line1', placeholder: 'Flat No., Street Name', col: 2 },
                        { label: 'Area / Landmark (Optional)', name: 'line2', placeholder: 'Landmark, Area', col: 2 },
                        { label: 'City / Town *', name: 'city', placeholder: 'e.g. Hyderabad', col: 1 },
                        { label: 'Pincode *', name: 'pincode', placeholder: 'e.g. 500072', col: 1 },
                      ].map(({ label, name, placeholder, col }) => (
                        <div key={name} className={col === 2 ? 'sm:col-span-2' : ''}>
                          <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">{label}</label>
                          <input
                            type="text"
                            name={name}
                            value={(formData as any)[name]}
                            onChange={handleInputChange}
                            placeholder={placeholder}
                            className="w-full bg-white border border-amber-100 rounded-xl py-2.5 px-3 text-xs font-medium text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition-all placeholder:text-gray-300"
                          />
                        </div>
                      ))}

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">State *</label>
                        <CustomSelect
                          value={formData.state}
                          onChange={(val) => setFormData({ ...formData, state: val })}
                          options={[
                            { value: 'Telangana', label: 'Telangana' },
                            { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
                          ]}
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="isDefault"
                        checked={formData.isDefault}
                        onChange={handleInputChange}
                        className="w-4 h-4 accent-amber-700 rounded"
                      />
                      <span className="text-[11px] font-bold text-amber-900 group-hover:text-amber-700 transition-colors">
                        Set as my default address
                      </span>
                    </label>

                    {formError && (
                      <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-xl">
                        <AlertCircle size={12} /> {formError}
                      </p>
                    )}

                    <div className="flex gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={savingAddress}
                        className="flex-1 bg-amber-800 hover:bg-amber-700 text-white py-2.5 font-black text-xs rounded-xl shadow-sm transition-colors disabled:opacity-60"
                      >
                        {savingAddress ? 'Saving...' : 'Save Address'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="flex-1 bg-white text-amber-800 border border-amber-200 py-2.5 font-bold text-xs rounded-xl hover:bg-amber-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Address List */}
                {loadingAddresses ? (
                  <div className="py-8 flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">Loading addresses...</span>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-amber-100 rounded-2xl space-y-3">
                    <MapPin size={28} className="text-amber-200 mx-auto" />
                    <p className="text-xs text-gray-400 font-medium">{t('checkout_no_address')}</p>
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="bg-amber-800 text-white px-6 py-2.5 font-bold rounded-xl text-xs shadow-sm hover:bg-amber-700 transition-colors"
                    >
                      + Add Delivery Address
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                          selectedAddressId === addr.id
                            ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                            : 'border-amber-100 hover:border-amber-200 hover:bg-amber-50/20'
                        }`}
                      >
                        {selectedAddressId === addr.id && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-amber-700 rounded-full flex items-center justify-center">
                            <Check size={11} className="text-white" />
                          </div>
                        )}
                        <div className="space-y-1 pr-6">
                          <p className="font-black text-amber-950 text-sm">{addr.name}</p>
                          <p className="text-[11px] font-bold text-gray-400">{addr.phone}</p>
                          <p className="text-[11px] text-gray-500 font-medium leading-relaxed mt-1.5">
                            {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                            {addr.city}, {addr.state} — {addr.pincode}
                          </p>
                        </div>
                        {addr.isDefault && (
                          <span className="inline-block mt-2.5 text-[9px] bg-amber-100 text-amber-800 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Default
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="bg-white rounded-2xl border border-amber-100 smooth-shadow overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-50">
                <h3 className="font-black text-sm text-amber-950 flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <CreditCard size={14} className="text-amber-700" />
                  </div>
                  Payment Method (చెల్లింపు విధానం)
                </h3>
              </div>
              <div className="p-5 space-y-3">

                {/* PhonePe */}
                <div
                  onClick={() => setPaymentMethod('PHONEPE')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                    paymentMethod === 'PHONEPE'
                      ? 'border-purple-400 bg-purple-50/30'
                      : 'border-amber-100 hover:border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Smartphone size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="font-black text-amber-950 text-sm">{t('checkout_phonepe')}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">{t('checkout_phonepe_sub')}</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    paymentMethod === 'PHONEPE' ? 'border-purple-500 bg-purple-500' : 'border-gray-200'
                  }`}>
                    {paymentMethod === 'PHONEPE' && <Check size={11} className="text-white" />}
                  </div>
                </div>

                {/* COD */}
                {codEnabled && (
                  <div
                    onClick={() => setPaymentMethod('COD')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                      paymentMethod === 'COD'
                        ? 'border-green-400 bg-green-50/30'
                        : 'border-amber-100 hover:border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Banknote size={20} className="text-green-600" />
                      </div>
                      <div>
                        <p className="font-black text-amber-950 text-sm">{t('checkout_cod')}</p>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">{t('checkout_cod_sub')}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      paymentMethod === 'COD' ? 'border-green-500 bg-green-500' : 'border-gray-200'
                    }`}>
                      {paymentMethod === 'COD' && <Check size={11} className="text-white" />}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── RIGHT: Order Summary + CTA ── */}
          <div className="lg:col-span-4 space-y-4">

            <div className="bg-white rounded-2xl border border-amber-100 smooth-shadow overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-50">
                <h3 className="font-black text-sm text-amber-950 flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <Package2 size={14} className="text-amber-700" />
                  </div>
                  {t('checkout_order_summary')}
                </h3>
              </div>
              <div className="p-5">

                {/* Item mini-list */}
                <div className="space-y-2.5 pb-4 border-b border-dashed border-amber-100 max-h-40 overflow-y-auto no-scrollbar">
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-100 flex-shrink-0 bg-amber-50">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=100&auto=format&fit=crop';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-amber-950 truncate">{item.nameTe}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{item.quantity} × ₹{item.price}</p>
                      </div>
                      <span className="text-xs font-black text-amber-900 flex-shrink-0">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Cost Breakdown */}
                <div className="pt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">{t('cart_subtotal')}</span>
                    <span className="font-black text-amber-950">₹{subtotal}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="font-medium">Coupon ({coupon?.code})</span>
                      <span className="font-black">−₹{discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">GST (5%)</span>
                    <span className="font-black text-amber-950">₹{tax}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium flex items-center gap-1">
                      <Truck size={10} /> Shipping
                    </span>
                    <span className="font-black">
                      {shipping === 0
                        ? <span className="text-green-600">FREE</span>
                        : `₹${shipping}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium flex items-center gap-1">
                      <Package2 size={10} /> Packing
                    </span>
                    <span className="font-black text-amber-950">₹{packingFee}</span>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="mt-4 pt-4 border-t border-dashed border-amber-100 flex justify-between items-center">
                  <span className="text-sm font-black text-amber-950">Grand Total</span>
                  <span className="text-2xl font-black text-amber-900">₹{total}</span>
                </div>

                {checkoutError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-600 font-semibold flex items-start gap-2">
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                {/* Place Order Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || addresses.length === 0}
                  className="mt-5 w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {placingOrder ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      {t('checkout_place_order')}
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-gray-300 font-semibold">
                  <ShieldCheck size={12} className="text-amber-300" />
                  {t('checkout_secure')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
