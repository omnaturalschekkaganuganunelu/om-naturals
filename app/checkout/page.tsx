'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BackButton from '@/components/BackButton';
import { useCartStore } from '@/store/cartStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLanguage } from '@/context/LanguageContext';
import { useToastStore } from '@/store/toastStore';
import { MapPin, Plus, Check, ShieldCheck, CreditCard, RefreshCw, Truck, Tag, AlertCircle } from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';
import CustomSelect from '@/components/CustomSelect';
import Link from 'next/link';
import Image from 'next/image';

export default function CheckoutPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { data: session, status: authStatus } = useSession();
  const showToast = useToastStore((s) => s.showToast);

  // Zustand cart values
  const { items, coupon, getCartTotal, clearCart, updateQuantity, removeItem } = useCartStore();

  // Address selection states
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // New address form modal states
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

  // Checkout states
  const paymentMethod = 'PHONEPE' as const;
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');

  // Settings values — loaded instantly from persisted cache, refreshed in background
  const { gstRate, freeShippingAbove, shippingFee, packingFee, fetchSettings } = useSettingsStore();

  // Redirect if not authenticated or cart is empty
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login?redirect=/checkout');
    }
  }, [authStatus, router]);

  // Handle bfcache (user hits back button from PhonePe page)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setPlacingOrder(false);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      if (items.length === 0 || items.some(item => item.isActive === false)) {
        router.push('/cart');
      }
    }
  }, [items, authStatus, router]);

  // Pending order warning modal states
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Load Saved Addresses and refresh settings in parallel
  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    // Refresh settings from cache (no-op if fetched within 5 min)
    fetchSettings();

    fetch('/api/addresses')
      .then((r) => r.json())
      .then((addressData) => {
        setAddresses(addressData);
        const defaultAddr = addressData.find((a: any) => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        } else if (addressData.length > 0) {
          setSelectedAddressId(addressData[0].id);
        }
        setLoadingAddresses(false);
      })
      .catch((err) => {
        console.error('Error loading addresses:', err);
        setLoadingAddresses(false);
      });
  }, [authStatus, fetchSettings]);

  // Check for recent pending or paid orders to handle back gesture / tab close issues
  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    const checkRecentOrders = async () => {
      try {
        const res = await fetch('/api/orders?includePending=true');
        if (!res.ok) return;
        const orders = await res.json();
        if (orders.length === 0) return;

        const latestOrder = orders[0];
        const createdAt = new Date(latestOrder.createdAt);
        const diffMinutes = (new Date().getTime() - createdAt.getTime()) / (1000 * 60);

        // If the order was created in the last 15 minutes
        if (diffMinutes < 15) {
          if (latestOrder.paymentStatus === 'COMPLETED') {
            // Already paid successfully! Clear cart and redirect to confirmation
            clearCart();
            router.push(`/order-confirmation?orderId=${latestOrder.id}&status=success`);
          } else if (latestOrder.paymentStatus === 'PENDING' && latestOrder.paymentMethod === 'PHONEPE') {
            // Pending payment. Show warning modal in case they completed it offline/app
            setPendingOrder(latestOrder);
            setShowPendingModal(true);
          }
        }
      } catch (err) {
        console.error('Error checking recent orders:', err);
      }
    };

    checkRecentOrders();
  }, [authStatus, router, clearCart]);

  // Poll pending order status in the background when the modal is open on the checkout page
  useEffect(() => {
    if (!showPendingModal || !pendingOrder?.id) return;

    let pollInterval: NodeJS.Timeout;

    const checkPendingStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${pendingOrder.id}?statusOnly=true`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.paymentStatus === 'COMPLETED') {
          clearCart();
          router.push(`/order-confirmation?orderId=${pendingOrder.id}&status=success`);
        }
      } catch (err) {
        console.error('Error polling pending order status:', err);
      }
    };

    pollInterval = setInterval(checkPendingStatus, 3000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [showPendingModal, pendingOrder, router, clearCart]);

  // Handle Form Change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Get User's Live Geolocation Coordinates
  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setFetchingLocation(true);
    setLocationStatus("📍 Fetching location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude
        }));
        
        try {
          // Attempt reverse geocoding with OpenStreetMap Nominatim
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            
            // Auto fill fields if found
            const line1Val = addr.road || addr.suburb || addr.neighbourhood || '';
            const line2Val = addr.suburb || addr.county || addr.state_district || '';
            const cityVal = addr.city || addr.town || addr.village || addr.city_district || '';
            const stateVal = addr.state === 'Andhra Pradesh' ? 'Andhra Pradesh' : 'Telangana';
            const pincodeVal = addr.postcode || '';

            setFormData(prev => ({
              ...prev,
              line1: prev.line1 || line1Val,
              line2: prev.line2 || `${line2Val} (Coords: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
              city: prev.city || cityVal,
              state: stateVal,
              pincode: prev.pincode || pincodeVal,
            }));
            setLocationStatus('📍 Live location captured and address autofilled!');
          } else {
            setFormData(prev => ({
              ...prev,
              line2: prev.line2 || `Coords: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            }));
            setLocationStatus('📍 Location coordinates captured!');
          }
        } catch (err) {
          setFormData(prev => ({
            ...prev,
            line2: prev.line2 || `Coords: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          }));
          setLocationStatus('📍 Location coordinates captured!');
        } finally {
          setFetchingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting geolocation:', error);
        setLocationStatus('❌ Could not retrieve location. Please fill manually.');
        setFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Submit new address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSavingAddress(true);

    const { name, phone, line1, city, state, pincode } = formData;
    if (!name || !phone || !line1 || !city || !state || !pincode) {
      setFormError(language === 'te' ? 'దయచేసి అన్ని వివరాలు నింపండి.' : 'Please fill in all details.');
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
        setFormData({
          name: '',
          phone: '',
          line1: '',
          line2: '',
          city: '',
          state: 'Telangana',
          pincode: '',
          latitude: null,
          longitude: null,
          isDefault: false,
        });
      } else {
        setFormError(newAddr.error || (language === 'te' ? 'చిరునామా సేవ్ చేయడంలో విఫలమైంది.' : 'Failed to save address.'));
      }
    } catch (err) {
      setFormError(language === 'te' ? 'సర్వర్ కనెక్షన్ లోపం.' : 'Server connection error.');
    } finally {
      setSavingAddress(false);
    }
  };

  // Place Order Action
  const handlePlaceOrder = async () => {
    setCheckoutError('');
    setPlacingOrder(true);

    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddress) {
      setCheckoutError(language === 'te' ? 'దయచేసి డెలివరీ చిరునామా ఎంచుకోండి.' : 'Please select a delivery address.');
      setPlacingOrder(false);
      return;
    }

    if (checkoutEmail && !/\S+@\S+\.\S+/.test(checkoutEmail)) {
      setCheckoutError(
        language === 'te'
          ? 'దయచేసి సరైన ఈమెయిల్ చిరునామా నమోదు చేయండి.'
          : 'Please enter a valid email address.'
      );
      setPlacingOrder(false);
      return;
    }

    // Prepare order details
    const orderPayload = {
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        name: language === 'te' ? i.nameTe : i.name, // Pass correct language name for error tracking
      })),
      address: {
        name: selectedAddress.name,
        phone: selectedAddress.phone,
        line1: selectedAddress.line1,
        line2: selectedAddress.line2 || '',
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        latitude: selectedAddress.latitude,
        longitude: selectedAddress.longitude,
      },
      couponCode: coupon?.code || null,
      paymentMethod,
      email: checkoutEmail || null,
      language: language,
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        const orderId = result.order.id;

        if (result.triggerPayment) {
          // ONLINE PHONEPE PAYMENT FLOW
          const payRes = await fetch('/api/payment/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId }),
          });

          const payData = await payRes.json();

          if (payRes.ok && payData.url) {
            // Redirect user to PhonePe PG page
            window.location.href = payData.url;
          } else {
            setCheckoutError(language === 'te' ? 'పేమెంట్ గేట్‌వే ప్రారంభించడంలో లోపం జరిగింది. దయచేసి మళ్ళీ ప్రయత్నించండి.' : 'Error initializing payment gateway. Please try again.');
            setPlacingOrder(false);
          }
        } else {
          // COD ORDER SUCCESS
          clearCart();
          showToast(
            language === 'te' ? 'ఆర్డర్ విజయవంతంగా ఉంచబడింది!' : 'Order placed successfully!',
            'success',
            language === 'te' ? 'విజయం' : 'Success'
          );
          router.push(`/account?tab=orders`);
        }
      } else {
        setCheckoutError(result.error || (language === 'te' ? 'ఆర్డర్ ఉంచడంలో లోపం జరిగింది.' : 'Error placing order.'));
        setPlacingOrder(false);
      }
    } catch (err) {
      setCheckoutError(language === 'te' ? 'సర్వర్ కనెక్టివిటీ సమస్య. దయచేసి మళ్ళీ ప్రయత్నించండి.' : 'Server connectivity issue. Please try again.');
      setPlacingOrder(false);
    }
  };

  // Loader state during auth check
  if (authStatus === 'loading') {
    return <PremiumLoader fullScreen={true} text={language === 'te' ? "చెక్అవుట్ సిద్ధమవుతోంది..." : "Preparing Checkout..."} />;
  }

  // Calculate summary totals using dynamic site settings
  const subtotal = getCartTotal();
  const discount = coupon ? coupon.discount : 0;
  const taxable = subtotal - discount;
  const tax = parseFloat(((taxable * gstRate) / 100).toFixed(2));
  const shipping = taxable >= freeShippingAbove ? 0 : shippingFee;
  const total = parseFloat((taxable + tax + shipping + packingFee).toFixed(2));

  return (
    <>
      
      <main className="max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
        <div className="mb-6">
          <BackButton />
        </div>
        <h1 className="text-xl sm:text-3xl font-extrabold text-amber-950 font-heading mb-8">
          {t('checkout_title')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Address Selector & Payment selection */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Delivery Address Card */}
            <div className="bg-white border border-amber-100 rounded-3xl p-5 sm:p-6 smooth-shadow space-y-4">
              <div className="flex justify-between items-center border-b border-amber-50 pb-3">
                <h3 className="font-bold text-sm sm:text-base text-amber-950 flex items-center space-x-1.5">
                  <MapPin size={18} className="text-amber-700" />
                  <span>{t('checkout_delivery_address')}</span>
                </h3>
                <button
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="text-xs font-bold text-amber-800 hover:text-amber-600 flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>{t('checkout_add_address')}</span>
                </button>
              </div>

              {/* Add New Address Form Modal/Drawer */}
              {showAddressForm && (
                <form onSubmit={handleSaveAddress} className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in-up">
                  <h4 className="col-span-1 sm:col-span-2 text-xs font-bold text-amber-950">{t('checkout_new_address')}</h4>
                  
                  <div className="col-span-1 sm:col-span-2 pb-2">
                    <button
                      type="button"
                      onClick={handleGetLiveLocation}
                      disabled={fetchingLocation}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-950 font-bold text-xs rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50"
                    >
                      <span>{fetchingLocation ? t('checkout_fetching_location') : t('checkout_live_location')}</span>
                    </button>
                    {locationStatus && (
                      <p className="text-[10px] font-bold text-center mt-1.5 text-amber-900">
                        {locationStatus}
                      </p>
                    )}
                    {formData.latitude && formData.longitude && (
                      <div className="mt-3 w-full h-40 rounded-xl overflow-hidden border border-amber-200">
                        <iframe
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          marginHeight={0}
                          marginWidth={0}
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${formData.longitude - 0.005},${formData.latitude - 0.005},${formData.longitude + 0.005},${formData.latitude + 0.005}&layer=mapnik&marker=${formData.latitude},${formData.longitude}`}
                          style={{ border: 0 }}
                        ></iframe>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_name')}</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Suresh Kumar"
                      className="w-full bg-white text-xs border border-amber-100 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_phone')}</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-white text-xs border border-amber-100 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_line1')}</label>
                    <input
                      type="text"
                      name="line1"
                      value={formData.line1}
                      onChange={handleInputChange}
                      placeholder="e.g. Flat No, House No, Street Name"
                      className="w-full bg-white text-xs border border-amber-100 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_line2')}</label>
                    <input
                      type="text"
                      name="line2"
                      value={formData.line2}
                      onChange={handleInputChange}
                      placeholder="e.g. Landmark, Area (Optional)"
                      className="w-full bg-white text-xs border border-amber-100 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_city')}</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g. Hyderabad"
                      className="w-full bg-white text-xs border border-amber-100 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_state')}</label>
                    <CustomSelect
                      value={formData.state}
                      onChange={(val) => setFormData({ ...formData, state: val })}
                      options={[
                        { value: 'Telangana', label: t('checkout_state_telangana') },
                        { value: 'Andhra Pradesh', label: t('checkout_state_ap') },
                      ]}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_pincode')}</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="e.g. 500072"
                      className="w-full bg-white text-xs border border-amber-100 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-4 col-span-1 sm:col-span-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      name="isDefault"
                      checked={formData.isDefault}
                      onChange={handleInputChange}
                      className="rounded accent-amber-800"
                    />
                    <label htmlFor="isDefault" className="text-[10px] font-bold text-amber-900 cursor-pointer">
                      {t('checkout_default')}
                    </label>
                  </div>

                  {formError && (
                    <p className="col-span-1 sm:col-span-2 text-[10px] text-red-600 font-bold flex items-center space-x-1 mt-1">
                      <AlertCircle size={12} />
                      <span>{formError}</span>
                    </p>
                  )}

                  <div className="col-span-1 sm:col-span-2 flex space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="flex-1 bg-amber-800 text-white py-2 font-bold text-xs rounded-xl shadow-sm hover:shadow"
                    >
                      {savingAddress ? t('checkout_saving') : t('checkout_save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="flex-1 bg-white text-amber-900 border border-amber-200 py-2 font-bold text-xs rounded-xl"
                    >
                      {t('checkout_cancel')}
                    </button>
                  </div>

                </form>
              )}

              {/* Address List View */}
              {loadingAddresses ? (
                <div className="py-6 flex items-center justify-center space-x-2">
                  <RefreshCw size={18} className="animate-spin text-amber-700" />
                  <span className="text-xs font-semibold text-amber-800">{t('checkout_loading_addresses')}</span>
                </div>
              ) : addresses.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500 border-2 border-dashed border-amber-100 rounded-2xl space-y-3">
                  <p>{t('checkout_no_address')}</p>
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="bg-amber-800 text-white px-5 py-2 font-bold rounded-full text-xs shadow-sm"
                  >
                    {t('checkout_add_btn')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between relative ${
                        selectedAddressId === addr.id
                          ? 'border-amber-600 bg-amber-50/20'
                          : 'border-amber-100 hover:border-amber-300'
                      }`}
                    >
                      {selectedAddressId === addr.id && (
                        <div className="absolute top-3 right-3 bg-amber-800 text-white p-0.5 rounded-full">
                          <Check size={12} />
                        </div>
                      )}
                      
                      <div className="space-y-1 text-xs">
                        <p className="font-extrabold text-amber-950">{addr.name}</p>
                        <p className="font-bold text-gray-500">{addr.phone}</p>
                        <p className="text-gray-600 mt-2 font-medium leading-relaxed">
                          {addr.line1}, {addr.line2 && addr.line2 + ', '} <br />
                          {addr.city}, {addr.state} - <span className="font-bold">{addr.pincode}</span>
                        </p>
                      </div>

                      {addr.isDefault && (
                        <span className="inline-block mt-3 text-[9px] bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-md self-start uppercase">
                          {t('checkout_default_badge')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email Field for Confirmation (Only if user has no real email) */}
            {session?.user?.email?.endsWith('@no-email.com') && (
              <div className="bg-white border border-amber-100 rounded-3xl p-5 sm:p-6 smooth-shadow space-y-3">
                <h3 className="font-bold text-sm sm:text-base text-amber-950 flex items-center space-x-1.5">
                  <span className="text-amber-700">📧</span>
                  <span>{language === 'te' ? 'ఈమెయిల్ చిరునామా (ఆర్డర్ రసీదు కొరకు)' : 'Email Address (For Order Confirmation)'}</span>
                </h3>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  {language === 'te' 
                    ? 'మీకు ఆర్డర్ వివరాలు మరియు నిర్ధారణ ఈమెయిల్ పంపడానికి దయచేసి మీ ఈమెయిల్ ఐడీని నమోదు చేయండి.' 
                    : 'Please enter your email to receive order confirmation updates and receipts.'}
                </p>
                <div className="relative group max-w-md">
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={checkoutEmail}
                    onChange={(e) => setCheckoutEmail(e.target.value)}
                    className="w-full bg-amber-50/40 text-sm border-2 border-amber-100 rounded-xl py-2.5 px-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-semibold text-amber-950 placeholder-gray-400"
                  />
                </div>
              </div>
            )}

            {/* Payment Method Selection Card */}
            <div className="bg-white border border-amber-100 rounded-3xl p-5 sm:p-6 smooth-shadow space-y-4">
              <h3 className="font-bold text-sm sm:text-base text-amber-950 border-b border-amber-50 pb-3 flex items-center space-x-1.5">
                <CreditCard size={18} className="text-amber-700" />
                <span>{t('checkout_payment_method')}</span>
              </h3>

              <div className="space-y-3">
                {/* PhonePe PG integration */}
                <div
                  className="p-4 rounded-2xl border border-amber-600 bg-amber-50/20 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-16 h-10 flex items-center justify-center bg-white border border-amber-100 rounded-xl overflow-hidden px-1.5 py-0.5">
                      <Image
                        src="/images/phonepe-pg.png"
                        alt="PhonePe PG Logo"
                        width={64}
                        height={40}
                        className="object-contain w-full h-full"
                      />
                    </div>
                    <div className="text-xs">
                      <p className="font-black text-amber-950">{t('checkout_phonepe')}</p>
                      <p className="text-gray-400 font-semibold mt-0.5">{t('checkout_phonepe_sub')}</p>
                    </div>
                  </div>
                  {paymentMethod === 'PHONEPE' && (
                    <div className="bg-amber-800 text-white p-0.5 rounded-full">
                      <Check size={12} />
                    </div>
                  )}
                </div>

                {/* COD disabled — PhonePe only */}
              </div>
            </div>

          </div>

          {/* Right Side: Order Items Summary & Total Summary */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white border border-amber-100 rounded-3xl p-5 sm:p-6 smooth-shadow space-y-4">
              <h3 className="font-bold text-sm text-amber-950 border-b border-amber-50 pb-2">
                {t('checkout_order_summary')}
              </h3>

              {/* Items List mini */}
              <div className="divide-y divide-amber-50 max-h-72 overflow-y-auto no-scrollbar">
                {items.map((item) => {
                  return (
                    <div key={item.productId} className="flex justify-between items-center py-2.5 text-xs px-2 -mx-2 rounded-lg hover:bg-amber-50/20 transition-colors group">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <Link href={`/products/${item.slug}`} className="shrink-0">
                          <Image
                            src={item.image}
                            alt=""
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-xl object-cover border border-amber-100 hover:border-amber-300 transition-colors"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).srcset = '/images/logo-512.png';
                            }}
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/products/${item.slug}`} className="hover:text-amber-700 transition-colors">
                            <p className="truncate font-bold text-xs text-amber-955">{language === 'te' ? item.nameTe : item.name}</p>
                          </Link>
                          {/* Inline Quantity Controls */}
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.quantity === 1) {
                                    removeItem(item.productId);
                                  } else {
                                    updateQuantity(item.productId, item.quantity - 1);
                                  }
                                }}
                                className="w-5 h-5 flex items-center justify-center text-amber-805 hover:bg-amber-100/50 active:bg-gray-200 transition-colors"
                              >
                                <span className="font-extrabold text-[10px]">-</span>
                              </button>
                              <span className="px-1.5 font-bold text-[10px] text-gray-900 min-w-[12px] text-center select-none">{item.quantity}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.quantity < item.stock) {
                                    updateQuantity(item.productId, item.quantity + 1);
                                  }
                                }}
                                disabled={item.quantity >= item.stock}
                                className="w-5 h-5 flex items-center justify-center text-amber-805 hover:bg-amber-100/50 active:bg-gray-200 disabled:text-gray-300 transition-colors"
                              >
                                <span className="font-extrabold text-[10px]">+</span>
                              </button>
                            </div>
                            <span className="text-[10px] text-gray-400 font-semibold">x ₹{item.price}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        <span className="font-bold text-amber-955">₹{item.price * item.quantity}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.productId);
                          }}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cost Breakdown */}
              <div className="border-t border-amber-50 pt-3 space-y-2 text-xs text-amber-950 font-medium">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('cart_subtotal')}:</span>
                  <span className="font-bold">₹{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t('cart_discount')} ({coupon?.code}):</span>
                    <span className="font-bold">-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('cart_gst')} (GST {gstRate}%):</span>
                  <span className="font-bold">₹{tax}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('cart_shipping')}:</span>
                  <span className="font-bold">
                    {shipping === 0 ? <span className="text-green-600 font-extrabold">{t('cart_free')}</span> : `₹${shipping}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">📦 {language === 'te' ? 'ప్యాకింగ్ చార్జీలు' : 'Packing Charges'}:</span>
                  <span className="font-bold">₹{packingFee}</span>
                </div>
              </div>

              {/* Total display */}
              <div className="flex justify-between items-baseline border-t border-amber-50 pt-3 text-amber-950">
                <span className="text-xs font-extrabold">{t('cart_total')}</span>
                <span className="text-lg sm:text-xl font-black text-amber-900">₹{total}</span>
              </div>

              {checkoutError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[10px] sm:text-xs text-red-600 font-semibold flex items-start space-x-1.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Place Order CTA */}
              <div className="pt-2">
                <button
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || addresses.length === 0}
                  className="w-full flex items-center justify-center space-x-2 py-3.5 bg-amber-800 hover:bg-amber-700 disabled:bg-gray-200 text-white disabled:text-gray-400 font-extrabold text-xs sm:text-sm rounded-full shadow hover:shadow-lg transition-all"
                >
                  {placingOrder ? (
                    <>
                      <RefreshCw size={16} className="animate-spin text-white" />
                      <span>{t('checkout_placing')}</span>
                    </>
                  ) : (
                    <span>{t('checkout_place_order')}</span>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center space-x-1 text-[10px] text-gray-400 font-semibold pt-1">
                <ShieldCheck size={14} className="text-amber-700" />
                <span>{t('checkout_secure')}</span>
              </div>

            </div>

          </div>

        </div>

      </main>

      {showPendingModal && pendingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-amber-100 rounded-3xl p-6 sm:p-8 max-w-md w-full smooth-shadow space-y-5 animate-scale-up">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto">
              <RefreshCw size={24} className="text-amber-800 animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base sm:text-lg font-black text-amber-950">
                {language === 'te' ? '⚠️ పెండింగ్ చెల్లింపు కనుగొనబడింది' : '⚠️ Pending Payment Detected'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 font-semibold leading-relaxed">
                {language === 'te'
                  ? `మీరు ఇటీవల పెట్టిన ఆర్డర్ #${pendingOrder.orderId} (₹${pendingOrder.total}) కోసం చెల్లింపు పెండింగ్‌లో ఉంది. మీరు ఇప్పటికే చెల్లించారా?`
                  : `We detected a pending payment of ₹${pendingOrder.total} for your recent order #${pendingOrder.orderId}. If you completed the payment on your PhonePe app, please verify it now.`}
              </p>
            </div>
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  router.push(`/order-confirmation?orderId=${pendingOrder.id}&status=verifying`);
                }}
                className="w-full py-3 bg-amber-800 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm rounded-full shadow hover:shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>{language === 'te' ? 'చెల్లింపును ధృవీకరించు' : '✅ Verify / Complete Payment'}</span>
              </button>
              <button
                onClick={() => {
                  setShowPendingModal(false);
                }}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm rounded-full transition-all"
              >
                {language === 'te' ? 'కొత్త ఆర్డర్ పెట్టు' : 'Place a New Order Instead'}
              </button>
            </div>
          </div>
        </div>
      )}

          </>
  );
}
