'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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

  // Auto-expand if 'open' param is in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const openId = params.get('open');
      if (openId) {
        setExpandedOrderId(openId);
      }
    }
  }, []);

  // Auto-scroll to expanded order when loaded
  useEffect(() => {
    if (expandedOrderId && orders.length > 0) {
      setTimeout(() => {
        const elDesktop = document.getElementById(`order-desktop-${expandedOrderId}`);
        const elMobile = document.getElementById(`order-mobile-${expandedOrderId}`);
        if (elDesktop && elDesktop.offsetParent) {
          elDesktop.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (elMobile && elMobile.offsetParent) {
          elMobile.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [expandedOrderId, orders]);

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

  // Printable Invoice Generation
  const handlePrintInvoice = async (order: any) => {
    try {
      const res = await fetch('/api/products');
      let dbProducts = [];
      if (res.ok) {
        dbProducts = await res.json();
      }

      const isCancelled = order.orderStatus === 'CANCELLED';
      const isCOD = order.paymentMethod === 'COD';
      const txnRef = order.transactionRef || null;
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert(language === 'te' ? 'దయచేసి పాపప్స్ అనుమతించండి.' : 'Please allow popups to view invoice.');
        return;
      }

      const getTrackingId = (oid: string) => {
        const parts = oid.split('-');
        if (parts.length >= 3) {
          return `TRK-GNT-${parts[2]}`;
        }
        return `TRK-${oid.substring(0, 8)}`;
      };
      
      const trkId = getTrackingId(order.orderId);

      const itemsHtml = order.items.map((it: any) => {
        const prod = dbProducts.find((p: any) => p.id === it.productId);
        let sizeLabel = '';
        if (prod) {
          const w = prod.weight, u = prod.unit;
          if (u === 'Litre' || u === 'Liter') sizeLabel = w >= 1 ? `${w} Litre` : `${Math.round(w * 1000)} ml`;
          else if (u === 'Gram' || u === 'g') sizeLabel = w >= 1000 ? `${w / 1000} Kg` : `${w} g`;
          else if (u === 'Kg' || u === 'kg') sizeLabel = `${w} Kg`;
          else if (u === 'ml') sizeLabel = w >= 1000 ? `${w / 1000} L` : `${w} ml`;
        }

        const nameEn = sizeLabel ? `${it.name} (${sizeLabel})` : it.name;
        const nameTe = it.nameTe ? (sizeLabel ? `${it.nameTe} (${sizeLabel})` : it.nameTe) : '';
        const nameDisplay = nameTe ? `${nameEn} (${nameTe})` : nameEn;

        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 13px;">${nameDisplay}</td>
            <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 13px;">${it.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 13px;">₹${it.price.toFixed(2)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 13px; font-weight: bold;">₹${(it.price * it.quantity).toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      const invoiceHtml = `
        <html>
          <head>
            <title>Invoice - ${order.orderId}</title>
            <style>
              body { font-family: 'Segoe UI', sans-serif; color: #1c1009; padding: 40px; margin: 0; background: #fff; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #b45309; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: 850; color: #78350f; }
              .invoice-title { font-size: 28px; font-weight: 900; color: #78350f; text-align: right; }
              .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 45px; }
              .details-box h3 { margin-top: 0; color: #78350f; border-bottom: 1px solid #fcd34d; padding-bottom: 8px; font-size: 13px; text-transform: uppercase; }
              .details-box p { margin: 6px 0; font-size: 13px; line-height: 1.5; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { background: #fdfbf7; padding: 12px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left; border-bottom: 2px solid #fcd34d; color: #78350f; }
              .totals { width: 300px; margin-left: auto; margin-top: 20px; font-size: 14px; }
              .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fef3c7; }
              .totals-row.grand { font-size: 18px; font-weight: 900; color: #78350f; border-top: 2px solid #b45309; padding-top: 12px; margin-top: 8px; }
              .store-section {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-top: 50px;
                padding-top: 25px;
                border-top: 2px dashed #fed7aa;
              }
              .store-box {
                flex: 1;
                margin-right: 40px;
              }
              .store-box h3 {
                margin-top: 0;
                font-size: 12px;
                text-transform: uppercase;
                color: #78350f;
                letter-spacing: 0.5px;
              }
              .store-box p {
                margin: 4px 0;
                font-size: 11.5px;
                line-height: 1.4;
                color: #451a03;
              }
              .map-box {
                width: 360px;
                height: 180px;
                border: 1px solid #fed7aa;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(120, 53, 15, 0.08);
                flex-shrink: 0;
              }
              .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #fed7aa; padding-top: 20px; margin-top: 50px; }
              .txn-badge { display: inline-block; background: #fefce8; border: 1px solid #fcd34d; color: #78350f; font-weight: 700; font-family: monospace; padding: 3px 10px; border-radius: 6px; font-size: 13px; letter-spacing: 0.5px; }
              @media print { body { padding: 20px; } }
            </style>
          </head>
          <body>
            <div class="header" style="align-items: center;">
              <div style="display:flex;align-items:center;gap:12px">
                <img src="/images/logo.png" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #b45309" />
                <div>
                  <div class="logo">Om Natural</div>
                  <div style="font-size:11px;color:#b45309">Chekka Ganuga Nune</div>
                  <div style="font-size:10px;color:#475569;margin-top:2px">📞 +91 86882 91288 | ✉️ info@om-naturals.com</div>
                </div>
              </div>
              <div>
                <div class="invoice-title">${isCancelled ? '<span style="color:#dc2626">CANCELLED</span>' : 'INVOICE'}</div>
                <div style="font-size: 12px; color: #b45309; margin-top: 4px; text-align: right;">ID: ${order.orderId}</div>
              </div>
            </div>
            
            ${isCancelled ? `
            <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; color: #991b1b; font-size: 14px; font-weight: bold; text-align: center; font-family: sans-serif;">
              ❌ THIS ORDER HAS BEEN CANCELLED
              ${order.cancelReason ? `<br/><span style="font-size: 11px; font-weight: normal; color: #7f1d1d;">Reason: ${order.cancelReason}</span>` : ''}
            </div>
            ` : ''}
            
            <div class="details-grid">
              <div class="details-box">
                <h3>Billed To</h3>
                <p><strong>${order.name}</strong></p>
                <p>${order.line1}</p>
                ${order.line2 ? `<p>${order.line2}</p>` : ''}
                <p>${order.city}, ${order.state} - ${order.pincode}</p>
                <p>Phone: ${order.phone}</p>
              </div>
              <div class="details-box" style="text-align: right;">
                <h3>Order Info</h3>
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Tracking ID:</strong> ${trkId}</p>
                <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                <p><strong>Payment:</strong> ${isCOD ? 'Cash on Delivery (COD)' : 'PhonePe Online'}</p>
                ${txnRef ? `<p><strong>${isCOD ? 'COD Reference:' : 'Transaction ID:'}</strong><br/><span class="txn-badge">${txnRef}</span></p>` : ''}
                <p><strong>Payment Status:</strong> <span style="color:${order.paymentStatus === 'COMPLETED' ? '#16a34a' : order.paymentStatus === 'REFUNDED' ? '#9333ea' : '#b45309'}">${order.paymentStatus}</span></p>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Product Details</th>
                  <th style="text-align: center; width: 80px;">Qty</th>
                  <th style="text-align: right; width: 120px;">Price</th>
                  <th style="text-align: right; width: 120px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div class="totals">
              <div class="totals-row">
                <span>Subtotal</span>
                <span>₹${order.subtotal.toFixed(2)}</span>
              </div>
              <div class="totals-row">
                <span>Shipping</span>
                <span>₹${order.shipping.toFixed(2)}</span>
              </div>
              <div class="totals-row">
                <span>Packing Charges</span>
                <span>₹20.00</span>
              </div>
              <div class="totals-row">
                <span>Tax (GST)</span>
                <span>₹${order.tax.toFixed(2)}</span>
              </div>
              ${order.discount > 0 ? `<div class="totals-row" style="color:#16a34a"><span>Discount ${order.couponCode ? `(${order.couponCode})` : ''}</span><span>-₹${order.discount.toFixed(2)}</span></div>` : ''}
              <div class="totals-row grand">
                <span>Grand Total</span>
                <span>₹${order.total.toFixed(2)}</span>
              </div>
            </div>

            <div class="store-section">
              <div class="store-box">
                <h3>Our Registered Office & Store</h3>
                <p><strong>OM NATURAL CHEKKA GANUGA NUNELU</strong></p>
                <p>D.No. 126-137, Sri Lakshmi Narasimha Nagar,</p>
                <p>5th Line, Inner Ring Road, Gorantla,</p>
                <p>Guntur, Andhra Pradesh - 522034</p>
                <p style="margin-top:8px">📞 <strong>Phone:</strong> +91 86882 91288</p>
                <p>✉️ <strong>Email:</strong> info@om-naturals.com</p>
              </div>
              <div class="map-box">
                <iframe 
                  src="https://maps.google.com/maps?q=OM%20NATURAL%20CHEKKA%20GANUGA%20NUNE%20Gorantla%20Guntur&t=&z=16&ie=UTF8&iwloc=&output=embed" 
                  width="360" 
                  height="180" 
                  style="border:0;" 
                  allowfullscreen="" 
                  loading="lazy">
                </iframe>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for choosing Om Natural wood-pressed oils!</p>
              <p>Computer-generated invoice. No physical signature required.</p>
            </div>
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `;
      
      printWindow.document.open();
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
    } catch (err) {
      console.error('Error generating invoice:', err);
    }
  };

  if (authStatus === 'loading' || loading) {
    return <PremiumLoader fullScreen={true} text={t('admin_orders_loading')} />;
  }

  return (
    <>
      
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
                  <p className="text-3xl font-black">₹{filteredOrders.reduce((acc, ord) => ord.orderStatus !== 'CANCELLED' ? acc + ord.total : acc, 0).toFixed(2)}</p>
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
                    <div key={ord.id} id={`order-mobile-${ord.id}`}>
                      <div
                        className={`p-4 cursor-pointer hover:bg-amber-50/20 transition-colors ${isExpanded ? 'bg-amber-50/20' : ''}`}
                        onClick={() => toggleOrderExpand(ord.id)}
                      >
                        {/* Row 1: Order ID + Total */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-mono font-bold text-amber-800 text-xs">{ord.orderId}</span>
                          <span className="font-black text-amber-950 text-sm">₹{Number(ord.total).toFixed(2)}</span>
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
                                  <span className="font-bold text-amber-950">₹{Number(it.price * it.quantity).toFixed(2)}</span>
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

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                onClick={() => handlePrintInvoice(ord)}
                                className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 px-2.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                              >
                                <span className="text-[11px]">📄</span>
                                <span>{language === 'te' ? 'ఇన్వాయిస్ చూడండి' : 'View Invoice'}</span>
                              </button>

                              {(() => {
                                const coords = getCoordinates(ord);
                                return coords ? (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 px-2.5 py-1.5 rounded-xl shadow-xs transition-all"
                                  >
                                    <span>{t('admin_view_map') || 'View on Map'}</span>
                                  </a>
                                ) : null;
                              })()}
                            </div>
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
                            <td className="py-3.5 px-4 text-right font-black">₹{Number(ord.total).toFixed(2)}</td>
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
                                            {language === 'te' ? it.nameTe : it.name} ({it.quantity} x ₹{Number(it.price).toFixed(2)})
                                          </span>
                                          <span>₹{Number(it.price * it.quantity).toFixed(2)}</span>
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

                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                          onClick={() => handlePrintInvoice(ord)}
                                          className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 px-2.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                                        >
                                          <span className="text-[11px]">📄</span>
                                          <span>{language === 'te' ? 'ఇన్వాయిస్ చూడండి' : 'View Invoice'}</span>
                                        </button>

                                        {(() => {
                                          const coords = getCoordinates(ord);
                                          return coords ? (
                                            <a
                                              href={`https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 px-2.5 py-1.5 rounded-xl shadow-xs transition-all"
                                            >
                                              <span>{t('admin_view_map')}</span>
                                            </a>
                                          ) : null;
                                        })()}
                                      </div>
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

          </>
  );
}
