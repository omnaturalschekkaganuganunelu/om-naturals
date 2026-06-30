'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { ChevronDown, ChevronUp, RefreshCw, Filter, Eye, AlertCircle, Search, Check, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PremiumLoader from '@/components/PremiumLoader';
import CustomSelect from '@/components/CustomSelect';
import CustomCalendar from '@/components/admin/CustomCalendar';
import { useRealtime } from '@/hooks/useRealtime';

export default function AdminOrdersPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { t, language } = useLanguage();
  const hasFetchedRef = useRef(false);

  // Helper to extract coordinates from order or address lines
  const getCoordinates = (ord: any) => {
    if (ord.latitude && ord.longitude) {
      return { latitude: ord.latitude, longitude: ord.longitude };
    }
    // Try to parse from line1 or line2
    for (const line of [ord.line1, ord.line2]) {
      if (line) {
        const match = line.match(/Coords:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/i);
        if (match) {
          return { latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) };
        }
      }
    }
    return null;
  };

  // Data states
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  
  // UI states
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Auth Protection
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/admin/login');
    } else if (authStatus === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [authStatus, session, router]);

  // Load Orders
  const loadOrders = (showLoader = false) => {
    if (showLoader) setLoading(true);
    fetch('/api/orders')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setOrders(data);
        } else {
          console.error('Expected array of orders, got:', data);
          setOrders([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching admin orders:', err);
        setOrders([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user?.role === 'ADMIN') {
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        loadOrders(true);
      } else {
        loadOrders(false);
      }
    }
  }, [authStatus, session?.user?.role]);

  // Realtime updates for Orders
  useRealtime('Order', '*', (payload) => {
    if (payload.eventType === 'UPDATE') {
      const updated = payload.new;
      setOrders((prev) =>
        prev.map((ord) => (ord.id === updated.id ? { ...ord, ...updated } : ord))
      );
    } else if (payload.eventType === 'INSERT') {
      const newOrd = payload.new;
      // Fetch full order (with items) by reloading the list or just adding the shell
      // It's safer to just reload orders if an INSERT happens so we get joined items
      loadOrders();
    } else if (payload.eventType === 'DELETE') {
      setOrders((prev) => prev.filter((ord) => ord.id !== payload.old.id));
    }
  });

  // Client-side filtering
  const filteredOrders = React.useMemo(() => {
    return orders.filter((ord) => {
      // 1. Status Filter
      if (statusFilter && ord.orderStatus !== statusFilter) return false;
      
      // 2. Date Filter
      if (dateFilter) {
        const ordDate = new Date(ord.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        if (ordDate !== dateFilter) return false;
      }

      // 3. Search Filter
      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        const matchesId = ord.orderId?.toLowerCase().includes(searchLower);
        const matchesName = ord.name?.toLowerCase().includes(searchLower);
        if (!matchesId && !matchesName) return false;
      }

      // 4. Payment Status Filter
      if (paymentStatusFilter && ord.paymentStatus !== paymentStatusFilter) return false;

      // 5. Payment Method Filter
      if (paymentMethodFilter && ord.paymentMethod !== paymentMethodFilter) return false;

      return true;
    });
  }, [orders, statusFilter, dateFilter, searchFilter, paymentStatusFilter, paymentMethodFilter]);

  // Expand / collapse row
  const toggleOrderExpand = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  // Update Status Action
  const handleUpdateStatus = async (id: string, orderStatus: string, paymentStatus: string) => {
    setUpdatingOrderId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus, paymentStatus }),
      });

      if (res.ok) {
        // Reload list
        loadOrders();
      } else {
        const err = await res.json();
        alert(err.error || 'స్థితి అప్‌డేట్ చేయడంలో లోపం జరిగింది.');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (authStatus === 'loading' || loading) {
    return <PremiumLoader fullScreen={true} text={t('admin_orders_loading')} />;
  }

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto sm:px-5 lg:px-8 py-2 sm:py-8 flex-1">
        <div className="flex flex-col lg:flex-row gap-0 sm:gap-8 items-start">
          
          <AdminSidebar />

          <section className="flex-1 w-full min-w-0 px-2 sm:px-0 pt-2 sm:pt-0 space-y-4">
            
            {/* Header + Filters */}
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                <div>
                  <h1 className="text-xl sm:text-3xl font-extrabold text-amber-950 font-heading">
                    {t('admin_order_management')}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('admin_order_sub')}</p>
                </div>
              </div>

              {/* Filters — search and dropdown selectors */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 w-full">
                {/* Search — full width on mobile, custom-width on desktop */}
                <div className="relative w-full md:w-72 shrink-0">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-900/50 pointer-events-none" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder={language === 'te' ? 'పేరు లేదా ID తో వెతకండి...' : 'Search by Name or ID...'}
                    className="w-full bg-white border border-amber-100 pl-9 pr-4 py-2.5 rounded-2xl shadow-sm text-xs font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                  />
                </div>

                {/* Filters Row */}
                <div className="flex gap-2 flex-wrap md:flex-nowrap w-full md:w-auto items-center justify-start md:justify-end flex-1">
                  <div className="flex-1 min-w-[120px] md:flex-none">
                    <CustomCalendar
                      value={dateFilter}
                      onChange={setDateFilter}
                      placeholder={language === 'te' ? 'తేదీ ఎంచుకోండి' : 'Select Date'}
                    />
                  </div>
                  <div className="flex-1 min-w-[140px] md:flex-none md:w-36 shrink-0">
                    <CustomSelect
                      value={statusFilter}
                      onChange={(val) => setStatusFilter(val)}
                      options={[
                        { value: '', label: language === 'te' ? 'అన్ని స్థితులు' : 'All Status' },
                        { value: 'CANCEL_REQUESTED', label: language === 'te' ? 'రద్దు అభ్యర్థన' : '🚨 Cancellation Requests' },
                        { value: 'PENDING', label: language === 'te' ? 'పెండింగ్' : 'Pending' },
                        { value: 'CONFIRMED', label: language === 'te' ? 'నిర్ధారించబడింది' : 'Confirmed' },
                        { value: 'PROCESSING', label: language === 'te' ? 'ప్రాసెసింగ్' : 'Processing' },
                        { value: 'PACKED', label: language === 'te' ? 'ప్యాక్ చేయబడింది' : 'Packed' },
                        { value: 'OUT_FOR_DELIVERY', label: language === 'te' ? 'డెలివరీలో ఉంది' : 'Out for Delivery' },
                        { value: 'SHIPPED', label: language === 'te' ? 'రవాణా లో ఉంది' : 'Shipped' },
                        { value: 'DELIVERED', label: language === 'te' ? 'డెలివరీ పూర్తయింది' : 'Delivered' },
                        { value: 'CANCELLED', label: language === 'te' ? 'రద్దు చేయబడింది' : 'Cancelled' },
                      ]}
                      className="z-50"
                    />
                  </div>
                  <div className="flex-1 min-w-[140px] md:flex-none md:w-36 shrink-0">
                    <CustomSelect
                      value={paymentStatusFilter}
                      onChange={setPaymentStatusFilter}
                      options={[
                        { value: '', label: language === 'te' ? 'చెల్లింపు స్థితి' : 'Payment Status' },
                        { value: 'COMPLETED', label: language === 'te' ? 'పూర్తయింది' : 'Completed' },
                        { value: 'PENDING', label: language === 'te' ? 'పెండింగ్' : 'Pending' },
                        { value: 'FAILED', label: language === 'te' ? 'విఫలమైంది' : 'Failed' },
                      ]}
                      className="z-40"
                    />
                  </div>
                  <div className="flex-1 min-w-[140px] md:flex-none md:w-36 shrink-0">
                    <CustomSelect
                      value={paymentMethodFilter}
                      onChange={setPaymentMethodFilter}
                      options={[
                        { value: '', label: language === 'te' ? 'చెల్లింపు విధానం' : 'Payment Method' },
                        { value: 'PHONEPE', label: 'PhonePe' },
                        { value: 'COD', label: 'Cash on Delivery' },
                      ]}
                      className="z-30"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Day-Wise Stats (Only visible if Date Filter is active) */}
            {dateFilter && (
              <div className="bg-gradient-to-br from-amber-800 to-amber-950 p-6 rounded-3xl text-white flex items-center justify-around smooth-shadow">
                <div className="text-center">
                  <p className="text-xs text-amber-200/80 font-bold uppercase tracking-wider mb-1">Orders</p>
                  <p className="text-3xl font-black">{filteredOrders.length}</p>
                </div>
                <div className="w-px h-12 bg-amber-700/50"></div>
                <div className="text-center">
                  <p className="text-xs text-amber-200/80 font-bold uppercase tracking-wider mb-1">Revenue</p>
                  <p className="text-3xl font-black">₹{filteredOrders.reduce((acc, ord) => ord.orderStatus !== 'CANCELLED' ? acc + ord.total : acc, 0)}</p>
                </div>
              </div>
            )}

            {/* Orders list */}
            <div className="bg-white border border-amber-100 rounded-3xl overflow-visible smooth-shadow">

              {/* Mobile: Card view */}
              <div className="sm:hidden divide-y divide-amber-50">
                {filteredOrders.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-12">{language === 'te' ? 'ఆర్డర్లు లేవు' : 'No orders found'}</p>
                ) : filteredOrders.map((ord) => {
                  const isExpanded = expandedOrderId === ord.id;
                  const date = new Date(ord.createdAt).toLocaleDateString(language === 'te' ? 'te-IN' : 'en-IN', { day:'numeric', month:'short', year:'numeric', timeZone: 'Asia/Kolkata'});
                  return (
                    <div key={ord.id}>
                      <div
                        className={`p-4 cursor-pointer hover:bg-amber-50/20 transition-colors ${isExpanded ? 'bg-amber-50/20' : ''}`}
                        onClick={() => toggleOrderExpand(ord.id)}
                      >
                        {/* Row 1: Order ID + Total */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-mono font-bold text-amber-800 text-xs">{ord.orderId}</span>
                          <span className="font-black text-amber-950 text-sm">₹{ord.total}</span>
                        </div>
                        {/* Row 2: Customer + Date */}
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-gray-700">{ord.name}</p>
                          <p className="text-[10px] text-gray-400">{date}</p>
                        </div>
                        {/* Row 3: Badges + Expand arrow */}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1.5 flex-wrap">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black border uppercase ${
                              ord.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {ord.paymentStatus === 'COMPLETED' ? 'Paid' : ord.paymentStatus}
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                              ord.orderStatus === 'DELIVERED' ? 'bg-green-100 text-green-800 border-green-200' :
                              ord.orderStatus === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                              ord.orderStatus === 'CANCEL_REQUESTED' ? 'bg-orange-100 text-orange-800 border-orange-300 animate-pulse' :
                              ord.orderStatus === 'CONFIRMED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              ord.orderStatus === 'PACKED' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                              ord.orderStatus === 'PROCESSING' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                              'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }`}>
                              {ord.orderStatus === 'CANCEL_REQUESTED' ? '🚨 Cancel Req.' : ord.orderStatus}
                            </span>
                          </div>
                          <button className="p-1.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-100">
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* Mobile Expanded Detail */}
                      {isExpanded && (
                        <div className="bg-amber-50/30 border-t border-amber-100 p-4 space-y-4">
                          {/* Items */}
                          <div>
                            <p className="text-[10px] font-black text-amber-950 uppercase tracking-wide mb-2">{t('admin_items_list')}</p>
                            <div className="space-y-1.5">
                              {ord.items.map((it: any) => (
                                <div key={it.id} className="flex justify-between text-xs font-semibold border-b border-amber-50 pb-1">
                                  <span className="text-gray-700">{language === 'te' ? it.nameTe : it.name} &times;{it.quantity}</span>
                                  <span className="font-bold text-amber-950">₹{it.price * it.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Address */}
                          <div>
                            <p className="text-[10px] font-black text-amber-950 uppercase tracking-wide mb-1">{t('admin_delivery_address')}</p>
                            <p className="text-xs font-bold text-gray-700">{ord.name}</p>
                            <p className="text-xs text-gray-500">{ord.line1}{ord.line2 ? `, ${ord.line2}` : ''}</p>
                            <p className="text-xs text-gray-500">{ord.city}, {ord.state} – {ord.pincode}</p>
                            <p className="text-xs text-gray-500">{language === 'te' ? 'ఫోన్' : 'Phone'}: {ord.phone}</p>
                            
                            {/* Payment Info */}
                            <div className="mt-2.5 pt-2 border-t border-amber-100/50 text-xs">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Payment Info</p>
                              <p className="font-semibold text-amber-950">
                                Method: <span className="font-black">{ord.paymentMethod}</span>
                              </p>
                              <p className="font-semibold text-amber-950">
                                Status: <span className="font-black uppercase">{ord.paymentStatus}</span>
                              </p>
                              {ord.transactionRef && (
                                <p className="font-semibold text-amber-950 mt-1">
                                  Ref: <span className="font-mono bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[11px] font-black">{ord.transactionRef}</span>
                                </p>
                              )}
                            </div>

                            {(() => {
                              const coords = getCoordinates(ord);
                              return coords ? (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-1 mt-2.5 text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 px-2.5 py-1 rounded-xl shadow-xs transition-all"
                                >
                                  <span>{t('admin_view_map') || 'View on Map'}</span>
                                </a>
                              ) : null;
                            })()}
                          </div>

                          {/* Update Controls */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-amber-950 uppercase tracking-wide">{t('admin_update_controls')}</p>

                            {/* Approve/Reject buttons for CANCEL_REQUESTED */}
                            {ord.orderStatus === 'CANCEL_REQUESTED' && (
                              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 space-y-2">
                                <p className="text-[10px] font-black text-orange-900">🚨 Customer requested cancellation</p>
                                {ord.cancelReason && (
                                  <p className="text-[10px] text-orange-700 font-semibold">Reason: {ord.cancelReason}</p>
                                )}
                                <div className="flex gap-2.5">
                                  <button
                                    disabled={updatingOrderId === ord.id}
                                    onClick={() => handleUpdateStatus(ord.id, 'CANCELLED', ord.paymentStatus)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-[10px] font-black px-3 py-2.5 rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.97] disabled:opacity-50"
                                  >
                                    <Check size={12} className="stroke-[3]" />
                                    <span>Approve Cancel</span>
                                  </button>
                                  <button
                                    disabled={updatingOrderId === ord.id}
                                    onClick={() => handleUpdateStatus(ord.id, 'CONFIRMED', ord.paymentStatus)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-[10px] font-black px-3 py-2.5 rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.97] disabled:opacity-50"
                                  >
                                    <X size={12} className="stroke-[3]" />
                                    <span>Reject Cancel</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            <div>
                              <span className="text-[10px] font-bold text-gray-500 block mb-1">{t('admin_order_status')}</span>
                              <CustomSelect
                                value={ord.orderStatus}
                                disabled={updatingOrderId === ord.id}
                                onChange={(val) => handleUpdateStatus(ord.id, val, ord.paymentStatus)}
                                openUpward={true}
                                options={[
                                  { value: 'PENDING', label: 'Pending' },
                                  { value: 'CONFIRMED', label: 'Confirmed' },
                                  { value: 'PROCESSING', label: 'Processing' },
                                  { value: 'PACKED', label: 'Packed' },
                                  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
                                  { value: 'SHIPPED', label: 'Shipped' },
                                  { value: 'DELIVERED', label: 'Delivered' },
                                  { value: 'CANCELLED', label: 'Cancelled' },
                                ]}
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-500 block mb-1">{t('admin_pay_status')}</span>
                              <CustomSelect
                                value={ord.paymentStatus}
                                disabled={updatingOrderId === ord.id}
                                onChange={(val) => handleUpdateStatus(ord.id, ord.orderStatus, val)}
                                openUpward={true}
                                options={[
                                  { value: 'PENDING', label: 'Payment Pending' },
                                  { value: 'COMPLETED', label: 'Payment Completed' },
                                  { value: 'FAILED', label: 'Payment Failed' },
                                  { value: 'REFUNDED', label: 'Payment Refunded' },
                                ]}
                              />
                            </div>
                            {updatingOrderId === ord.id && (
                              <p className="text-[10px] text-amber-800 font-bold flex items-center gap-1 animate-pulse">
                                <RefreshCw size={11} className="animate-spin" />
                                {t('admin_updating')}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop: Table view */}
              <div className="hidden sm:block overflow-visible">
                <table className="w-full min-w-[800px] text-left text-xs font-medium text-amber-950">
                  <thead className="bg-amber-50 text-[10px] uppercase font-bold text-amber-900 border-b border-amber-100">
                    <tr>
                      <th className="py-3 px-4">{t('admin_order_id')}</th>
                      <th className="py-3 px-4">{t('admin_date')}</th>
                      <th className="py-3 px-4">{t('admin_customer')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_payment_method')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_payment_status')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_delivery_status')}</th>
                      <th className="py-3 px-4 text-right">{t('admin_total')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {filteredOrders.map((ord) => {
                      const isExpanded = expandedOrderId === ord.id;
                      const date = new Date(ord.createdAt).toLocaleDateString(language === 'te' ? 'te-IN' : 'en-US', { timeZone: 'Asia/Kolkata' });

                      return (
                        <React.Fragment key={ord.id}>
                          <tr className={`hover:bg-amber-50/10 ${isExpanded ? 'bg-amber-50/20' : ''}`}>
                            <td className="py-3.5 px-4 font-mono font-bold text-amber-800">{ord.orderId}</td>
                            <td className="py-3.5 px-4 text-gray-500 font-bold">{date}</td>
                            <td className="py-3.5 px-4 font-extrabold">{ord.name}</td>
                            <td className="py-3.5 px-4 text-center font-bold">{ord.paymentMethod}</td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                                ord.paymentStatus === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}>
                                {ord.paymentStatus === 'COMPLETED' 
                                  ? (language === 'te' ? 'చెల్లింపు పూర్తయింది' : 'COMPLETED') 
                                  : ord.paymentStatus === 'FAILED'
                                  ? (language === 'te' ? 'చెల్లింపు వైఫల్యం' : 'FAILED')
                                  : (language === 'te' ? 'చెల్లింపు పెండింగ్' : 'PENDING')}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                                ord.orderStatus === 'DELIVERED'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : ord.orderStatus === 'CANCELLED'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : ord.orderStatus === 'CANCEL_REQUESTED'
                                  ? 'bg-orange-100 text-orange-800 border-orange-300 animate-pulse'
                                  : ord.orderStatus === 'CONFIRMED'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : ord.orderStatus === 'PROCESSING'
                                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                                  : ord.orderStatus === 'PACKED'
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : ord.orderStatus === 'OUT_FOR_DELIVERY' || ord.orderStatus === 'SHIPPED'
                                  ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                  : 'bg-yellow-100 text-yellow-800 border-yellow-250'
                              }`}>
                                {ord.orderStatus === 'DELIVERED'
                                  ? (language === 'te' ? 'డెలివరీ అయింది' : 'DELIVERED')
                                  : ord.orderStatus === 'CANCELLED'
                                  ? (language === 'te' ? 'రద్దు చేయబడింది' : 'CANCELLED')
                                  : ord.orderStatus === 'CANCEL_REQUESTED'
                                  ? '🚨 CANCEL REQ.'
                                  : ord.orderStatus === 'PACKED'
                                  ? (language === 'te' ? 'ప్యాక్ చేయబడింది' : 'PACKED')
                                  : ord.orderStatus === 'SHIPPED' || ord.orderStatus === 'OUT_FOR_DELIVERY'
                                  ? (language === 'te' ? 'డెలివరీలో ఉంది' : 'OUT FOR DELIVERY')
                                  : ord.orderStatus === 'CONFIRMED'
                                  ? (language === 'te' ? 'స్థిరపరచబడింది' : 'CONFIRMED')
                                  : ord.orderStatus === 'PROCESSING'
                                  ? (language === 'te' ? 'ప్రాసెసింగ్' : 'PROCESSING')
                                  : (language === 'te' ? 'పెండింగ్' : 'PENDING')}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black">₹{ord.total}</td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => toggleOrderExpand(ord.id)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-100 flex items-center justify-center space-x-1"
                              >
                                <Eye size={12} />
                                <span>{t('admin_view')}</span>
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            </td>
                          </tr>

                          {/* Row Expansion */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="bg-amber-50/20 border-b border-amber-100 p-5">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-semibold leading-relaxed">
                                  {/* Ordered items listing */}
                                  <div className="space-y-2">
                                    <p className="text-amber-950 font-black">{t('admin_items_list')}</p>
                                    <div className="space-y-1.5">
                                      {ord.items.map((it: any) => (
                                        <div key={it.id} className="flex justify-between border-b border-amber-50 pb-1 font-bold">
                                          <span>
                                            {language === 'te' ? it.nameTe : it.name} ({it.quantity} x ₹{it.price})
                                          </span>
                                          <span>₹{it.price * it.quantity}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Address info */}
                                  <div>
                                    <p className="text-amber-950 font-black">{t('admin_delivery_address')}</p>
                                    <div className="pl-1 font-semibold text-gray-700 mt-1">
                                      <p className="font-extrabold text-amber-950">{ord.name}</p>
                                      <p>{ord.line1}</p>
                                      {ord.line2 && <p>{ord.line2}</p>}
                                      <p>{ord.city}, {ord.state} - {ord.pincode}</p>
                                      <p>{language === 'te' ? 'ఫోన్' : 'Phone'}: {ord.phone}</p>

                                      {/* Payment Info */}
                                      <div className="mt-3 pt-2.5 border-t border-amber-100/60 text-xs">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Payment Info</p>
                                        <p>Method: <span className="font-black">{ord.paymentMethod}</span></p>
                                        <p>Status: <span className="font-black uppercase">{ord.paymentStatus}</span></p>
                                        {ord.transactionRef && (
                                          <p className="mt-1">
                                            Ref: <span className="font-mono bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[11px] font-black">{ord.transactionRef}</span>
                                          </p>
                                        )}
                                      </div>

                                      {(() => {
                                        const coords = getCoordinates(ord);
                                        return coords ? (
                                          <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center space-x-1 mt-2.5 text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 px-2.5 py-1 rounded-xl shadow-xs transition-all"
                                          >
                                            <span>{t('admin_view_map')}</span>
                                          </a>
                                        ) : null;
                                      })()}
                                    </div>
                                  </div>

                                  {/* Update Controls */}
                                  <div className="space-y-3">
                                    <p className="text-amber-950 font-black">{t('admin_update_controls')}</p>

                                    {/* Approve/Reject Cancellation Request */}
                                    {ord.orderStatus === 'CANCEL_REQUESTED' && (
                                      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-base">🚨</span>
                                          <p className="text-xs font-black text-orange-900">Cancellation Requested</p>
                                        </div>
                                        {ord.cancelReason && (
                                          <div className="bg-white rounded-xl p-2.5 border border-orange-100">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Customer Reason</p>
                                            <p className="text-xs font-semibold text-gray-700">{ord.cancelReason}</p>
                                          </div>
                                        )}
                                        <div className="flex gap-2.5">
                                          <button
                                            disabled={updatingOrderId === ord.id}
                                            onClick={() => handleUpdateStatus(ord.id, 'CANCELLED', ord.paymentStatus)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-[11px] font-black px-3 py-2.5 rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.97] disabled:opacity-50"
                                          >
                                            <Check size={13} className="stroke-[3]" />
                                            <span>Approve Cancel</span>
                                          </button>
                                          <button
                                            disabled={updatingOrderId === ord.id}
                                            onClick={() => handleUpdateStatus(ord.id, 'CONFIRMED', ord.paymentStatus)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-[11px] font-black px-3 py-2.5 rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.97] disabled:opacity-50"
                                          >
                                            <X size={13} className="stroke-[3]" />
                                            <span>Reject Cancel</span>
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    <div className="space-y-2">
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-gray-500 block">{t('admin_order_status')}</span>
                                        <CustomSelect
                                          value={ord.orderStatus}
                                          disabled={updatingOrderId === ord.id}
                                          onChange={(val) => handleUpdateStatus(ord.id, val, ord.paymentStatus)}
                                          openUpward={true}
                                          options={[
                                            { value: 'PENDING', label: language === 'te' ? 'పెండింగ్' : 'Pending' },
                                            { value: 'CONFIRMED', label: language === 'te' ? 'నిర్ధారించబడింది' : 'Confirmed' },
                                            { value: 'PROCESSING', label: language === 'te' ? 'ప్రాసెసింగ్' : 'Processing' },
                                            { value: 'PACKED', label: language === 'te' ? 'ప్యాక్ చేయబడింది' : 'Packed' },
                                            { value: 'OUT_FOR_DELIVERY', label: language === 'te' ? 'డెలివరీలో ఉంది' : 'Out for Delivery' },
                                            { value: 'SHIPPED', label: language === 'te' ? 'రవాణా లో ఉంది' : 'Shipped' },
                                            { value: 'DELIVERED', label: language === 'te' ? 'డెలివరీ పూర్తయింది' : 'Delivered' },
                                            { value: 'CANCELLED', label: language === 'te' ? 'రద్దు చేయబడింది' : 'Cancelled' },
                                          ]}
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-gray-500 block">{t('admin_pay_status')}</span>
                                        <CustomSelect
                                          value={ord.paymentStatus}
                                          disabled={updatingOrderId === ord.id}
                                          onChange={(val) => handleUpdateStatus(ord.id, ord.orderStatus, val)}
                                          openUpward={true}
                                          options={[
                                            { value: 'PENDING', label: language === 'te' ? 'చెల్లింపు పెండింగ్' : 'Payment Pending' },
                                            { value: 'COMPLETED', label: language === 'te' ? 'చెల్లింపు పూర్తయింది' : 'Payment Completed' },
                                            { value: 'FAILED', label: language === 'te' ? 'చెల్లింపు వైఫల్యం' : 'Payment Failed' },
                                            { value: 'REFUNDED', label: language === 'te' ? 'రీఫండ్ చేయబడింది' : 'Payment Refunded' },
                                          ]}
                                        />
                                      </div>
                                    </div>

                                    {updatingOrderId === ord.id && (
                                      <p className="text-[10px] text-amber-800 font-bold flex items-center space-x-1 animate-pulse">
                                        <RefreshCw size={12} className="animate-spin" />
                                        <span>{t('admin_updating')}</span>
                                      </p>
                                    )}

                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>

          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}
