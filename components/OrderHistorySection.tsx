'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import {
  Package, Truck, Clock, CheckCircle, MapPin, Copy, Check, X,
  AlertTriangle, ShoppingBag, Printer, ChevronDown, ChevronUp,
  Search, Info, RotateCcw, Navigation2
} from 'lucide-react';
import Image from 'next/image';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getTrackingId(orderId: string): string {
  if (orderId && typeof orderId === 'string' && orderId.includes('-')) {
    const parts = orderId.split('-');
    if (parts.length >= 3) {
      return `TRK-GNT-${parts[2]}`;
    }
  }
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = orderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let trk = 'TRK-';
  let tempHash = Math.abs(hash);
  for (let i = 0; i < 8; i++) {
    trk += chars[tempHash % chars.length];
    tempHash = Math.floor(tempHash / chars.length);
  }
  return trk;
}

function getProgressPct(status: string) {
  const map: Record<string, number> = {
    PENDING: 10, CONFIRMED: 30, PROCESSING: 50,
    PACKED: 68, SHIPPED: 85, OUT_FOR_DELIVERY: 85, DELIVERED: 100,
  };
  return map[status] ?? 0;
}

function getStepIndex(status: string, steps: { key: string }[]) {
  if (status === 'SHIPPED') return steps.findIndex(s => s.key === 'OUT_FOR_DELIVERY');
  return steps.findIndex(s => s.key === status);
}

const STATUS_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
  PENDING:          { badge: 'bg-yellow-50  text-yellow-700  border-yellow-200',  dot: 'bg-yellow-400',  label: 'Pending' },
  CONFIRMED:        { badge: 'bg-blue-50    text-blue-700    border-blue-200',    dot: 'bg-blue-500',    label: 'Confirmed' },
  PROCESSING:       { badge: 'bg-orange-50  text-orange-700  border-orange-200',  dot: 'bg-orange-500',  label: 'Processing' },
  PACKED:           { badge: 'bg-purple-50  text-purple-700  border-purple-200',  dot: 'bg-purple-500',  label: 'Packed' },
  OUT_FOR_DELIVERY: { badge: 'bg-indigo-50  text-indigo-700  border-indigo-200',  dot: 'bg-indigo-500',  label: 'Out for Delivery' },
  SHIPPED:          { badge: 'bg-indigo-50  text-indigo-700  border-indigo-200',  dot: 'bg-indigo-500',  label: 'Out for Delivery' },
  DELIVERED:        { badge: 'bg-green-50   text-green-700   border-green-200',   dot: 'bg-green-500',   label: 'Delivered' },
  CANCELLED:        { badge: 'bg-red-50     text-red-700     border-red-200',     dot: 'bg-red-500',     label: 'Cancelled' },
  CANCEL_REQUESTED: { badge: 'bg-amber-50   text-amber-700   border-amber-300',   dot: 'bg-amber-500',   label: 'Cancellation Pending' },
};

function statusLabel(s: string, language: string) { 
  if (language === 'te') {
    switch (s) {
      case 'PENDING': return 'పెండింగ్';
      case 'CONFIRMED': return 'నిర్ధారించబడింది';
      case 'PROCESSING': return 'ప్రాసెసింగ్';
      case 'PACKED': return 'ప్యాక్ చేయబడింది';
      case 'OUT_FOR_DELIVERY':
      case 'SHIPPED': return 'డెలివరీలో ఉంది';
      case 'DELIVERED': return 'డెలివరీ పూర్తయింది';
      case 'CANCELLED': return 'రద్దు చేయబడింది';
      case 'CANCEL_REQUESTED': return 'రద్దు అభ్యర్థన పెండింగ్';
      default: return s;
    }
  }
  return STATUS_STYLES[s]?.label ?? s; 
}
function statusBadge(s: string) { return STATUS_STYLES[s]?.badge ?? 'bg-amber-50 text-amber-800 border-amber-200'; }

function fmt(dateStr: string, opts: Intl.DateTimeFormatOptions, locale = 'en-IN') {
  return new Date(dateStr).toLocaleString(locale, { ...opts, timeZone: 'Asia/Kolkata' });
}

function getETA(createdAt: string, language: string) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 3);
  return d.toLocaleDateString(language === 'te' ? 'te-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function statusMsg(status: string, language: string) {
  if (language === 'te') {
    switch (status) {
      case 'PENDING': return 'ఆర్డర్ విజయవంతంగా నమోదైంది. మేము వివరాలను ధృవీకరిస్తున్నాము.';
      case 'CONFIRMED': return 'మీ ఆర్డర్ నిర్ధారించబడింది.';
      case 'PROCESSING': return 'నూనె ప్రాసెసింగ్ లో ఉంది మరియు ప్యాక్ చేయబడుతోంది.';
      case 'PACKED': return 'మీ ప్యాకేజీ సిద్ధంగా ఉంది.';
      case 'OUT_FOR_DELIVERY':
      case 'SHIPPED': return 'డెలివరీ ఏజెంట్ మీ ఆర్డర్‌తో బయలుదేరారు.';
      case 'DELIVERED': return 'ఆర్డర్ విజయవంతంగా చేరింది! నూనెను ఆస్వాదించండి.';
      case 'CANCELLED': return 'ఈ ఆర్డర్ రద్దు చేయబడింది.';
      default: return '';
    }
  }
  const msgs: Record<string, string> = {
    PENDING: 'Your order is placed and awaiting confirmation.',
    CONFIRMED: 'Your order has been confirmed by our warehouse.',
    PROCESSING: 'Your wood-pressed oil is currently being prepared.',
    PACKED: 'Your order is securely packed and ready to ship.',
    OUT_FOR_DELIVERY: 'Our delivery representative is out delivering your package.',
    SHIPPED: 'Our delivery representative is out delivering your package.',
    DELIVERED: 'Delivered successfully! Thank you for buying organic.',
    CANCELLED: 'This order has been cancelled.',
  };
  return msgs[status] ?? '';
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastItem { id: string; message: string; type: 'success' | 'error' | 'info' }
function useToastBus() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = (message: string, type: ToastItem['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };
  return { toasts, push };
}

// ── Invoice ────────────────────────────────────────────────────────────────────

function printInvoice(order: any) {
  const trkId = getTrackingId(order.orderId);
  const win = window.open('', '_blank');
  if (!win) return;
  const rows = order.items.map((it: any) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9">${it.name}${it.nameTe ? ` (${it.nameTe})` : ''}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:center">${it.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:right">&#x20B9;${it.price}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:right">&#x20B9;${it.price * it.quantity}</td>
    </tr>`).join('');
  const html = `
  <html><head><title>Invoice – ${order.orderId}</title>
  <style>
    body{font-family:'Segoe UI',sans-serif;color:#1c1009;padding:40px;margin:0;background:#fff}
    .hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #b45309;padding-bottom:20px;margin-bottom:28px}
    .logo{font-size:22px;font-weight:900;color:#78350f}.inv{font-size:26px;font-weight:900;color:#78350f;text-align:right}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px}
    .box h3{margin-top:0;font-size:11px;text-transform:uppercase;color:#78350f;border-bottom:1px solid #fcd34d;padding-bottom:6px}
    .box p{margin:4px 0;font-size:13px}
    table{width:100%;border-collapse:collapse}
    th{background:#fdfbf7;padding:10px 8px;font-size:11px;text-transform:uppercase;color:#78350f;border-bottom:2px solid #fcd34d;text-align:left}
    .tot{width:280px;margin:24px 0 0 auto;font-size:13px}
    .tot-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #fef3c7}
    .grand{font-size:17px;font-weight:900;color:#78350f;border-top:2px solid #b45309;padding-top:10px;margin-top:6px}
    .ftr{text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #fed7aa;padding-top:16px;margin-top:40px}
  </style></head><body>
  <div class="hdr">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="/images/logo.png" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #b45309" />
      <div>
        <div class="logo">Om Natural</div>
        <div style="font-size:11px;color:#b45309">Chekka Ganuga Nune</div>
        <div style="font-size:10px;color:#475569;margin-top:2px">📞 +91 99999 99999 | ✉️ info@om-naturals.com</div>
      </div>
    </div>
    <div><div class="inv">INVOICE</div><div style="font-size:11px;color:#b45309;text-align:right">${order.orderId}</div></div>
  </div>
  <div class="grid">
    <div class="box"><h3>Billed To</h3>
      <p><strong>${order.name}</strong></p><p>${order.line1}</p>${order.line2 ? `<p>${order.line2}</p>` : ''}
      <p>${order.city}, ${order.state} – ${order.pincode}</p><p>📞 ${order.phone}</p>
    </div>
    <div class="box" style="text-align:right"><h3>Order Info</h3>
      <p><strong>Order ID:</strong> ${order.orderId}</p>
      <p><strong>Tracking:</strong> ${trkId}</p>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
      <p><strong>Payment:</strong> ${order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'PhonePe Online'}</p>
    </div>
  </div>
  <table><thead><tr>
    <th>Product</th><th style="text-align:center;width:70px">Qty</th>
    <th style="text-align:right;width:100px">Unit Price</th><th style="text-align:right;width:100px">Total</th>
  </tr></thead><tbody>${rows}</tbody></table>
  <div class="tot">
    <div class="tot-row"><span>Subtotal</span><span>&#x20B9;${order.subtotal ?? 0}</span></div>
    <div class="tot-row"><span>Shipping</span><span>&#x20B9;${order.shipping ?? 0}</span></div>
    <div class="tot-row"><span>Packing Charges</span><span>&#x20B9;20</span></div>
    <div class="tot-row"><span>Tax (GST)</span><span>&#x20B9;${order.tax ?? 0}</span></div>
    ${order.discount > 0 ? `<div class="tot-row" style="color:#16a34a"><span>Discount ${order.couponCode ? `(${order.couponCode})` : ''}</span><span>-&#x20B9;${order.discount}</span></div>` : ''}
    <div class="tot-row grand"><span>Grand Total</span><span>&#x20B9;${order.total}</span></div>
  </div>
  <div class="ftr"><p>Thank you for choosing Om Natural wood-pressed oils!</p><p>Computer-generated invoice. No physical signature required.</p></div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;
  win.document.write(html); win.document.close();
}

// ── Tracking Steps Definition ─────────────────────────────────────────────────

const STEPS = [
  { key: 'PENDING',          label: 'Order Placed',      icon: Clock },
  { key: 'CONFIRMED',        label: 'Confirmed',          icon: CheckCircle },
  { key: 'PROCESSING',       label: 'Processing',         icon: Info },
  { key: 'PACKED',           label: 'Packed',             icon: Package },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery',   icon: Truck },
  { key: 'DELIVERED',        label: 'Delivered',          icon: MapPin },
];

// ── Skeleton ──────────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-amber-100 overflow-hidden animate-pulse">
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-4 bg-amber-50 rounded w-44"/>
            <div className="h-3 bg-amber-50 rounded w-32"/>
          </div>
          <div className="h-7 bg-amber-50 rounded-full w-24"/>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-3 bg-amber-50 rounded w-full"/>)}
        </div>
        <div className="h-2 bg-amber-50 rounded-full"/>
        <div className="flex gap-2">
          {[1,2,3].map(i => <div key={i} className="flex-1 h-9 bg-amber-50 rounded-xl"/>)}
        </div>
      </div>
    </div>
  );
}

// ── Cancel Modal ──────────────────────────────────────────────────────────────

interface CancelModalProps {
  order: any;
  onClose: () => void;
  onSuccess: (id: string, reason: string) => void;
  showToast: (msg: string, t?: ToastItem['type']) => void;
  language: string;
}

const CANCEL_REASONS_EN = [
  'Ordered by mistake',
  'Changed my mind',
  'Found a better price elsewhere',
  'Delivery takes too long',
  'Duplicate order',
  'Other',
];

const CANCEL_REASONS_TE = [
  'పొరపాటున ఆర్డర్ చేశాను',
  'నా ఆలోచన మార్చుకున్నాను',
  'మరొక చోట మంచి ధర దొరికింది',
  'డెలివరీకి ఎక్కువ సమయం పడుతుంది',
  'నకిలీ ఆర్డర్',
  'ఇతర కారణాలు',
];

function CancelModal({ order, onClose, onSuccess, showToast, language }: CancelModalProps) {
  const [reason, setReason] = useState(language === 'te' ? 'పొరపాటున ఆర్డర్ చేశాను' : 'Ordered by mistake');
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = (reason === 'Other' || reason === 'ఇతర కారణాలు') ? (custom.trim() || 'No reason specified') : reason;

    setLoading(true);
    try {
      // Step 1: Update order status to CANCEL_REQUESTED in DB
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderStatus: 'CANCEL_REQUESTED',
          cancelReason: finalReason,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Failed to submit cancellation request.', 'error');
        setLoading(false);
        return;
      }

      // Step 2: Update local state
      onSuccess(order.id, finalReason);
      setSubmitted(true);
      showToast(
        language === 'te'
          ? 'రద్దు అభ్యర్థన పంపబడింది! అడ్మిన్ సమీక్షిస్తారు.'
          : 'Cancellation request sent! Admin will review shortly.',
        'success'
      );

      // Step 3: Open WhatsApp with full real order details
      const itemsText = (order.items || [])
        .map((it: any) => `• ${it.name} × ${it.quantity} — ₹${it.price * it.quantity}`)
        .join('\n');
      const text = `Hello OM Naturals,\n\nI would like to request a cancellation for my order.\n\n*Order Details:*\n- *Order ID:* ${order.orderId}\n- *Customer Name:* ${order.name}\n- *Phone:* ${order.phone}\n- *Total Amount:* ₹${order.total}\n- *Payment Method:* ${order.paymentMethod}\n- *Reason for Cancellation:* ${finalReason}\n\n*Items:*\n${itemsText}\n\nPlease review and cancel the order.`;
      const waUrl = `https://wa.me/918688291288?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');

      setTimeout(() => onClose(), 1200);
    } catch (err) {
      console.error('Cancel request error:', err);
      showToast('Connection error. Please try again.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4" onClick={submitted ? undefined : onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-red-50 px-6 pt-6 pb-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-black text-red-800 text-base">{language === 'te' ? 'ఆర్డర్ రద్దు చేయాలా?' : 'Cancel Order?'}</h3>
            <p className="text-xs text-red-600 mt-0.5">{language === 'te' ? 'ఆర్డర్' : 'Order'} {order.orderId}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 hover:bg-red-100 rounded-full transition-colors">
            <X size={18} className="text-red-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 font-medium">
            {language === 'te' ? 'మీరు ఈ ఆర్డర్‌ని ఖచ్చితంగా రద్దు చేయాలనుకుంటున్నారా?' : 'Are you sure you want to request cancellation for this order?'} <span className="font-bold text-red-600">{language === 'te' ? 'అడ్మిన్ అనుమతి తర్వాత రద్దు పూర్తవుతుంది.' : 'Admin approval required to complete cancellation.'}</span>
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] text-amber-800 font-semibold flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⏳</span>
            <span>{language === 'te' ? 'మీ అభ్యర్థన అడ్మిన్‌కు పంపబడుతుంది. WhatsApp ద్వారా కూడా నోటిఫై చేయబడతారు.' : 'Your request will be sent to our team. WhatsApp will also open to notify admin.'}</span>
          </div>

          {/* Reason selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-amber-900 block">{language === 'te' ? 'రద్దుకు కారణం' : 'Reason for cancellation'}</label>
            <div className="grid grid-cols-1 gap-2">
              {(language === 'te' ? CANCEL_REASONS_TE : CANCEL_REASONS_EN).map(r => (
                <label key={r} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-semibold ${
                  reason === r ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-gray-100 hover:border-amber-200 text-gray-600'
                }`}>
                  <input type="radio" name="reason" value={r} checked={reason === r}
                    onChange={() => setReason(r)} className="accent-amber-600 w-3.5 h-3.5" />
                  {r}
                </label>
              ))}
            </div>
            {(reason === 'Other' || reason === 'ఇతర కారణాలు') && (
              <textarea
                value={custom}
                onChange={e => setCustom(e.target.value)}
                placeholder={language === 'te' ? "మరింత వివరంగా చెప్పండి…" : "Tell us more…"}
                rows={2}
                className="w-full text-xs border border-amber-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none font-medium"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 py-3 font-bold text-xs rounded-2xl transition-colors">
              {language === 'te' ? 'ఆర్డర్ ఉంచు' : 'Keep Order'}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 font-bold text-xs rounded-2xl transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
              {loading
                ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/> {language === 'te' ? 'పంపుతున్నాం…' : 'Sending…'}</>
                : (language === 'te' ? 'అవును, రద్దు అభ్యర్థన పంపు' : 'Send Cancellation Request')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tracking Drawer ────────────────────────────────────────────────────────────

interface TrackingDrawerProps {
  order: any;
  onClose: () => void;
  copiedId: string | null;
  onCopy: (id: string) => void;
  language: string;
}

function TrackingDrawer({ order, onClose, copiedId, onCopy, language }: TrackingDrawerProps) {
  const trkId = getTrackingId(order.orderId);
  const isCancelled = order.orderStatus === 'CANCELLED';
  const isCancelRequested = order.orderStatus === 'CANCEL_REQUESTED';
  const currentIdx = getStepIndex(order.orderStatus, STEPS);
  const progressPct = getProgressPct(order.orderStatus);
  const eta = getETA(order.createdAt, language);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-1 bg-gray-200 rounded-full"/>
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-amber-800 rounded-2xl flex items-center justify-center">
              <Truck size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-amber-950 text-sm">{language === 'te' ? 'ఆర్డర్ ట్రాకింగ్' : 'Track Order'}</h3>
              <p className="text-[11px] text-gray-400 font-semibold">{order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-amber-50 rounded-xl transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Body scroll */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Tracking ID */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{language === 'te' ? 'ట్రాకింగ్ ఐడీ' : 'Tracking ID'}</p>
              <p className="font-mono font-black text-amber-900 text-sm">{trkId}</p>
            </div>
            <button
              onClick={() => onCopy(trkId)}
              className="flex items-center gap-1.5 text-xs font-bold bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              {copiedId === trkId ? <><Check size={12} className="text-green-600"/> {language === 'te' ? 'కాపీ అయింది' : 'Copied!'}</> : <><Copy size={12}/> {language === 'te' ? 'కాపీ' : 'Copy'}</>}
            </button>
          </div>

          {/* Status + ETA row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border border-amber-100 rounded-2xl p-3.5 flex flex-col justify-between">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">{language === 'te' ? 'ప్రస్తుత స్థితి' : 'Current Status'}</p>
              <div className="flex">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border whitespace-nowrap ${statusBadge(order.orderStatus)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[order.orderStatus]?.dot || 'bg-amber-500 animate-pulse'}`}/>
                  {statusLabel(order.orderStatus, language)}
                </span>
              </div>
            </div>
            <div className="bg-white border border-amber-100 rounded-2xl p-3.5 flex flex-col justify-between">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">{language === 'te' ? 'అంచనా డెలివరీ' : 'Expected Delivery'}</p>
              <p className="text-xs font-black text-amber-900">{isCancelled ? 'N/A' : eta}</p>
            </div>
          </div>

          {/* Latest Update */}
          {!isCancelled && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-blue-800">{language === 'te' ? 'తాజా అప్‌డేట్' : 'Latest Update'}</p>
                <p className="text-[11px] text-blue-600 mt-0.5 font-medium">{statusMsg(order.orderStatus, language)}</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {!isCancelled && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-gray-400">
                <span>{language === 'te' ? 'ఆర్డర్ నమోదైంది' : 'Order Placed'}</span>
                <span className="text-amber-700 font-extrabold">{statusLabel(order.orderStatus, language)}</span>
                <span>{language === 'te' ? 'డెలివరీ అయింది' : 'Delivered'}</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-700 rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {/* Cancelled Banner */}
          {isCancelled && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-red-800">{language === 'te' ? 'ఆర్డర్ రద్దు చేయబడింది' : 'Order Cancelled'}</p>
                <p className="text-[11px] text-red-500 mt-0.5">{order.notes || (language === 'te' ? 'ఈ ఆర్డర్ రద్దు చేయబడింది.' : 'This order was cancelled.')}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {fmt(order.updatedAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }, language === 'te' ? 'te-IN' : 'en-IN')}
                </p>
              </div>
            </div>
          )}

          {/* Cancellation Requested Banner */}
          {isCancelRequested && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-900">{language === 'te' ? '⏳ రద్దు అభ్యర్థన సమీక్షలో ఉంది' : '⏳ Cancellation Under Review'}</p>
                {order.cancelReason && (
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    {language === 'te' ? 'కారణం' : 'Reason'}: {order.cancelReason}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">{language === 'te' ? 'మా జట్టు 24 గంటల్లో పరిష్కరిస్తుంది.' : 'Our team will process within 24 hours.'}</p>
              </div>
            </div>
          )}

          {/* Vertical Timeline */}
          {!isCancelled && !isCancelRequested && (
            <div className="space-y-0">
              {STEPS.map((step, idx) => {
                const isCompleted = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                const isLast = idx === STEPS.length - 1;
                const IconComp = step.icon;
                return (
                  <div key={step.key} className="flex gap-3">
                    {/* Spine */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isCompleted ? 'bg-amber-700 border-amber-700 text-white shadow-md' : 'bg-white border-gray-200 text-gray-300'
                      } ${isCurrent ? 'ring-4 ring-amber-100 scale-110' : ''}`}>
                        {isCompleted ? <Check size={13} strokeWidth={3} /> : <IconComp size={12} />}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 flex-1 min-h-[28px] my-1 rounded-full transition-colors ${isCompleted ? 'bg-amber-400' : 'bg-gray-100'}`} />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-5 pt-1 flex-1">
                      <p className={`text-xs font-black ${isCompleted ? 'text-amber-950' : 'text-gray-300'}`}>{step.label}</p>
                      {isCurrent && (
                        <span className="inline-block mt-1 text-[9px] bg-amber-700 text-white font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Current
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Single Order Card ─────────────────────────────────────────────────────────

interface OrderCardProps {
  order: any;
  expanded: boolean;
  onToggle: () => void;
  onCancelSuccess: (id: string, reason: string) => void;
  showToast: (msg: string, t?: ToastItem['type']) => void;
  onReorder: (order: any) => void;
  language: string;
}

function OrderCard({ order, expanded, onToggle, onCancelSuccess, showToast, onReorder, language }: OrderCardProps) {
  const router = useRouter();
  const [showTracking, setShowTracking] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [retryingPayment, setRetryingPayment] = useState(false);

  const trkId = getTrackingId(order.orderId);
  const progressPct = getProgressPct(order.orderStatus);
  const isCancelled = order.orderStatus === 'CANCELLED';
  const isCancelRequested = order.orderStatus === 'CANCEL_REQUESTED';
  const canCancel = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED'].includes(order.orderStatus) && !order.cancelReason;
  const canRetryPayment = order.paymentMethod === 'PHONEPE' && order.paymentStatus === 'PENDING' && !isCancelled;
  const statusInfo = STATUS_STYLES[order.orderStatus] ?? STATUS_STYLES['PENDING'];

  const handleRetryPayment = async () => {
    setRetryingPayment(true);
    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        router.push(data.url);
      } else {
        showToast(data.error || (language === 'te' ? 'చెల్లింపు ప్రారంభించడంలో లోపం' : 'Failed to initiate payment'), 'error');
        setRetryingPayment(false);
      }
    } catch (err) {
      showToast(language === 'te' ? 'నెట్‌వర్క్ లోపం. మళ్ళీ ప్రయత్నించండి.' : 'Network error. Please try again.', 'error');
      setRetryingPayment(false);
    }
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    showToast(language === 'te' ? 'ట్రాకింగ్ ఐడీ కాపీ అయింది!' : 'Tracking ID copied!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const orderDate = fmt(order.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }, language === 'te' ? 'te-IN' : 'en-IN');
  const updatedAt = fmt(order.updatedAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }, language === 'te' ? 'te-IN' : 'en-IN');
  const eta = getETA(order.createdAt, language);

  return (
    <>
      {showTracking && (
        <TrackingDrawer
          order={order}
          onClose={() => setShowTracking(false)}
          copiedId={copiedId}
          onCopy={handleCopy}
          language={language}
        />
      )}

      {showCancel && (
        <CancelModal
          order={order}
          onClose={() => setShowCancel(false)}
          onSuccess={onCancelSuccess}
          showToast={showToast}
          language={language}
        />
      )}

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">

        {/* ── Card Header ── */}
        <div
          className="p-4 sm:p-5 cursor-pointer select-none"
          onClick={onToggle}
        >
          {/* Top row: Order ID + Status badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono font-black text-amber-900 text-sm truncate">{order.orderId}</span>
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wide ${statusInfo.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}/>
                  {statusLabel(order.orderStatus, language)}
                </span>
              </div>
              {/* Meta chips row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400 font-semibold">
                <span>📅 {orderDate}</span>
                <span>🕐 {language === 'te' ? 'నవీకరించబడింది' : 'Updated'} {updatedAt}</span>
                {!isCancelled && <span>📦 {language === 'te' ? 'అంచనా' : 'ETA'}: {eta}</span>}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-lg font-black text-amber-900">₹{order.total}</p>
                <p className="text-[10px] text-gray-400">{order.paymentMethod === 'COD' ? (language === 'te' ? 'క్యాష్ ఆన్ డెలివరీ' : 'Cash on Delivery') : 'PhonePe'}</p>
              </div>
              <div className="p-1.5 bg-amber-50 rounded-xl text-amber-600">
                {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </div>
            </div>
          </div>

          {/* Mobile total */}
          <div className="flex items-center justify-between mt-2 sm:hidden">
            <span className="text-sm font-black text-amber-900">₹{order.total}</span>
            <span className="text-[10px] text-gray-400 font-medium">{order.paymentMethod === 'COD' ? (language === 'te' ? 'క్యాష్ ఆన్ డెలివరీ' : 'Cash on Delivery') : 'PhonePe'}</span>
          </div>

          {/* Stage Tracker */}
          {(() => {
            const stages = [
              { key: 'PENDING',          shortEn: 'Placed',    shortTe: 'నమోదు' },
              { key: 'CONFIRMED',        shortEn: 'Confirmed', shortTe: 'నిర్ధారణ' },
              { key: 'PROCESSING',       shortEn: 'Packing',   shortTe: 'ప్యాకింగ్' },
              { key: 'PACKED',           shortEn: 'Packed',    shortTe: 'ప్యాక్' },
              { key: 'OUT_FOR_DELIVERY', shortEn: 'On Way',    shortTe: 'డెలివరీ' },
              { key: 'DELIVERED',        shortEn: 'Delivered', shortTe: 'చేరింది' },
            ];

            if (isCancelled) {
              return (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl px-3 py-1.5 text-[10px] font-black">
                  <AlertTriangle size={11}/> {language === 'te' ? 'ఈ ఆర్డర్ రద్దు చేయబడింది' : 'This order was cancelled'}
                </div>
              );
            }

            if (isCancelRequested) {
              return (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl px-3 py-1.5 text-[10px] font-black">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  {language === 'te' ? '⏳ రద్దు అభ్యర్థన సమీక్షలో ఉంది' : '⏳ Cancellation Under Review — Pending Admin Approval'}
                </div>
              );
            }

            const currentStatus = order.orderStatus === 'SHIPPED' ? 'OUT_FOR_DELIVERY' : order.orderStatus;
            const currentIdx = stages.findIndex(s => s.key === currentStatus);

            return (
              <div className="mt-3">
                <div className="flex items-center w-full">
                  {stages.map((stage, idx) => {
                    const isCompleted = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    const isLast = idx === stages.length - 1;
                    return (
                      <React.Fragment key={stage.key}>
                        {/* Step node */}
                        <div className="flex flex-col items-center shrink-0" style={{ minWidth: 0 }}>
                          <div className={`w-2 h-2 rounded-full border transition-all duration-300 ${
                            isCurrent
                              ? 'bg-amber-600 border-amber-600 ring-2 ring-amber-200 scale-125'
                              : isCompleted
                              ? 'bg-amber-700 border-amber-700'
                              : 'bg-gray-200 border-gray-200'
                          }`} />
                          <span className={`mt-1 text-[9px] font-bold leading-tight text-center whitespace-nowrap ${
                            isCurrent ? 'text-amber-700' : isCompleted ? 'text-amber-500' : 'text-gray-300'
                          }`}>
                            {language === 'te' ? stage.shortTe : stage.shortEn}
                          </span>
                        </div>
                        {/* Connector line */}
                        {!isLast && (
                          <div className={`flex-1 h-0.5 mx-0.5 rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-amber-600' : 'bg-gray-100'
                          }`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })()}



          {/* Quick action row */}
          <div className="mt-4 flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowTracking(true)}
              className="flex items-center gap-1.5 bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Navigation2 size={12}/> {language === 'te' ? 'ట్రాక్ చేయి' : 'Track Order'}
            </button>
            {canCancel && (
              <>
                <button
                  onClick={() => setShowCancel(true)}
                  className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors"
                >
                  <X size={12}/> {language === 'te' ? 'రద్దు చేయి' : 'Cancel'}
                </button>
              </>
            )}
            {canRetryPayment && (
              <button
                onClick={handleRetryPayment}
                disabled={retryingPayment}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-sm"
              >
                {retryingPayment
                  ? <><RotateCcw size={12} className="animate-spin"/> {language === 'te' ? 'ప్రాసెస్...' : 'Processing...'}</>
                  : <><RotateCcw size={12}/> {language === 'te' ? 'చెల్లింపు మళ్ళీ ప్రయత్నించు' : 'Retry Payment'}</>
                }
              </button>
            )}
            {isCancelRequested && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black px-3 py-2 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {language === 'te' ? 'రద్దు అభ్యర్థన సమీక్షలో ఉంది' : 'Cancellation Under Review'}
              </div>
            )}
            {['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus) && (
              <span className="text-[10px] text-gray-400 font-semibold italic">
                ⚠️ {order.orderStatus === 'DELIVERED'
                  ? (language === 'te' ? 'రద్దు చేయలేము — డెలివరీ పూర్తయింది' : 'Cannot cancel — Already Delivered')
                  : (language === 'te' ? 'రద్దు చేయలేము — డెలివరీలో ఉంది' : 'Cannot cancel — Out for Delivery')}
              </span>
            )}
            <button
              onClick={() => printInvoice(order)}
              className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-100 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors"
            >
              <Printer size={12}/> {language === 'te' ? 'రసీదు' : 'Invoice'}
            </button>
          </div>
        </div>

        {/* ── Expanded Detail Panel ── */}
        {expanded && (
          <div className="border-t border-gray-50 animate-fade-in-up">

            {/* Tracking ID strip */}
            <div className="px-5 py-3 bg-amber-50/60 border-b border-amber-100/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 font-bold">{language === 'te' ? 'ట్రాకింగ్ ఐడీ:' : 'Tracking ID:'}</span>
                <span className="font-mono font-black text-amber-900">{trkId}</span>
              </div>
              <button
                onClick={() => handleCopy(trkId)}
                className="flex items-center gap-1 text-[10px] font-bold bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                {copiedId === trkId ? <><Check size={10} className="text-green-500"/> {language === 'te' ? 'కాపీ అయింది' : 'Copied'}</> : <><Copy size={10}/> {language === 'te' ? 'కాపీ' : 'Copy'}</>}
              </button>
            </div>

            {/* Horizontal desktop timeline */}
            {!isCancelled && (
              <div className="hidden sm:block px-6 py-6">
                <div className="relative flex justify-between">
                  {/* Track line */}
                  <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-100 z-0">
                    <div
                      className="h-full bg-amber-500 transition-all duration-700"
                      style={{ width: `${(Math.max(0, getStepIndex(order.orderStatus, STEPS)) / (STEPS.length - 1)) * 100}%` }}
                    />
                  </div>
                  {STEPS.map((step, idx) => {
                    const currentIdx = getStepIndex(order.orderStatus, STEPS);
                    const isCompleted = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;
                    const IconComp = step.icon;
                    return (
                      <div key={step.key} className="relative z-10 flex flex-col items-center text-center" style={{ width: '80px' }}>
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                          isCompleted ? 'bg-amber-700 border-amber-700 text-white shadow-md' : 'bg-white border-gray-200 text-gray-300'
                        } ${isCurrent ? 'ring-4 ring-amber-100 scale-110' : ''}`}>
                          {isCompleted ? <Check size={14} strokeWidth={3} /> : <IconComp size={13} />}
                        </div>
                        <p className={`mt-2 text-[10px] font-bold leading-tight ${isCompleted ? 'text-amber-950' : 'text-gray-300'}`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <span className="mt-1 text-[8px] bg-amber-700 text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                            Now
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mobile vertical timeline */}
            {!isCancelled && (
              <div className="sm:hidden px-5 py-4">
                {STEPS.map((step, idx) => {
                  const currentIdx = getStepIndex(order.orderStatus, STEPS);
                  const isCompleted = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  const isLast = idx === STEPS.length - 1;
                  const IconComp = step.icon;
                  return (
                    <div key={step.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isCompleted ? 'bg-amber-700 border-amber-700 text-white' : 'bg-white border-gray-200 text-gray-300'
                        } ${isCurrent ? 'ring-2 ring-amber-200' : ''}`}>
                          {isCompleted ? <Check size={12} strokeWidth={3} /> : <IconComp size={11} />}
                        </div>
                        {!isLast && <div className={`w-0.5 min-h-[24px] flex-1 my-1 ${isCompleted ? 'bg-amber-300' : 'bg-gray-100'}`} />}
                      </div>
                      <div className="pb-4 pt-0.5">
                        <p className={`text-xs font-black ${isCompleted ? 'text-amber-950' : 'text-gray-300'}`}>{step.label}</p>
                        {isCurrent && <span className="text-[9px] text-amber-700 font-bold">← Current</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cancelled Notice */}
            {isCancelled && (
              <div className="mx-5 mt-4 bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-red-800">Order Cancelled</p>
                  <p className="text-[11px] text-red-500 mt-0.5">{order.notes || 'This order was cancelled by customer.'}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Cancelled at: {updatedAt}</p>
                </div>
              </div>
            )}

            {/* Product Items */}
            <div className="px-5 py-4 border-t border-gray-50">
              <p className="text-xs font-black text-amber-950 mb-3 flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-amber-700" /> {language === 'te' ? 'ఆర్డర్ చేసిన వస్తువులు' : 'Ordered Items'}
              </p>
              <div className="space-y-3">
                {order.items.map((item: any, idx: number) => (
                  <div key={item.id ?? idx} className="flex items-center gap-3">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-2xl object-cover border border-amber-100 bg-amber-50 shrink-0"
                      onError={e => { (e.currentTarget as HTMLImageElement).srcset = '/images/logo-512.png'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-amber-950 truncate">{language === 'te' ? (item.nameTe || item.name) : item.name}</p>
                      {item.variantLabel && (
                        <p className="text-[10px] text-gray-400 font-medium">{language === 'te' ? 'పరిమాణం' : 'Variant'}: {item.variantLabel}</p>
                      )}
                      <p className="text-[10px] text-gray-400 font-semibold">{language === 'te' ? 'సంఖ్య' : 'Qty'} {item.quantity} × ₹{item.price}</p>
                    </div>
                    <span className="text-xs font-black text-amber-900 shrink-0">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Address + Payment */}
            <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-50">
              {/* Delivery Address */}
              <div className="bg-gray-50 rounded-2xl p-4 mt-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MapPin size={10}/> Delivery Address
                </p>
                <p className="text-xs font-black text-amber-950">{order.name}</p>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">{order.phone}</p>
                <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                  {order.line1}{order.line2 && `, ${order.line2}`},<br/>
                  {order.city}, {order.state} – {order.pincode}
                </p>
              </div>

              {/* Payment */}
              <div className="bg-gray-50 rounded-2xl p-4 mt-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Payment Summary</p>
                <div className="space-y-1 text-[11px] text-gray-600 font-medium">
                  <div className="flex justify-between">
                    <span>Method</span>
                    <span className="font-bold text-amber-900">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'PhonePe'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className={`font-bold ${order.paymentStatus === 'COMPLETED' ? 'text-green-700' : 'text-yellow-700'}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                  {(order.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span><span>-₹{order.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 mt-1 border-t border-gray-200 font-black text-amber-900 text-xs">
                    <span>Grand Total</span><span>₹{order.total}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Action Buttons */}
            <div className="px-5 pb-5 flex flex-wrap gap-2 border-t border-gray-50 pt-4">
              <button
                onClick={() => setShowTracking(true)}
                className="flex items-center gap-1.5 bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
              >
                <Navigation2 size={12}/> {language === 'te' ? 'ట్రాక్ చేయి' : 'Track Order'}
              </button>
              {canCancel && (
                <button
                  onClick={() => setShowCancel(true)}
                  className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <X size={12}/> {language === 'te' ? 'రద్దు చేయి' : 'Cancel Order'}
                </button>
              )}
              <button
                onClick={() => printInvoice(order)}
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-100 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
              >
                <Printer size={12}/> {language === 'te' ? 'ఇన్‌వాయిస్ డౌన్‌లోడ్' : 'Download Invoice'}
              </button>
              <button
                onClick={() => onReorder(order)}
                className="flex items-center gap-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
              >
                <RotateCcw size={12}/> {language === 'te' ? 'మళ్ళీ ఆర్డర్ చేయి' : 'Reorder'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Section ──────────────────────────────────────────────────────────────

interface OrderHistorySectionProps {
  orders: any[];
  loadingOrders: boolean;
  language: string;
  t: (...args: any[]) => string;
  onOrdersChange: (updater: (prev: any[]) => any[]) => void;
}

export default function OrderHistorySection({
  orders,
  loadingOrders,
  language,
  t,
  onOrdersChange,
}: OrderHistorySectionProps) {
  const router = useRouter();
  const { toasts, push: showToast } = useToastBus();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredOrders = orders.filter(ord => {
    const trkId = getTrackingId(ord.orderId);
    const q = searchQuery.toLowerCase();
    return (
      ord.orderId.toLowerCase().includes(q) ||
      trkId.toLowerCase().includes(q) ||
      (ord.name || '').toLowerCase().includes(q)
    );
  });

  const handleCancelSuccess = (id: string, reason: string) => {
    onOrdersChange(prev => prev.map(o => o.id === id ? {
      ...o,
      orderStatus: 'CANCEL_REQUESTED',
      cancelReason: reason,
      updatedAt: new Date().toISOString(),
    } : o));
  };

  const handleReorder = async (order: any) => {
    showToast('Adding products to cart...', 'info');
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error();
      const dbProducts = await res.json();
      const cartStore = useCartStore.getState();
      let count = 0;

      for (const item of order.items) {
        const p = dbProducts.find((prod: any) => prod.id === item.productId);
        if (p && p.isActive) {
          const w = p.weight, u = p.unit;
          let label = `${w} ${u}`;
          if (u === 'Litre' || u === 'Liter') label = w >= 1 ? `${w} Litre` : `${Math.round(w * 1000)} ml`;
          else if (u === 'Gram' || u === 'g') label = w >= 1000 ? `${w / 1000} Kg` : `${w} g`;
          else if (u === 'Kg' || u === 'kg') label = `${w} Kg`;
          else if (u === 'ml') label = w >= 1000 ? `${w / 1000} L` : `${w} ml`;
          cartStore.addItem({
            productId: p.id, name: p.name, nameTe: p.nameTe, price: p.price, mrp: p.mrp,
            quantity: item.quantity, image: p.images[0] || item.image, weight: p.weight,
            unit: p.unit, stock: p.stock, variantLabel: label,
          });
          count++;
        }
      }

      if (count > 0) {
        showToast(`${count} item${count > 1 ? 's' : ''} added to cart!`, 'success');
        router.push('/cart');
      } else {
        showToast('Sorry, products are not available currently.', 'error');
      }
    } catch {
      showToast('Error placing reorder.', 'error');
    }
  };

  return (
    <div className="space-y-5 relative">

      {/* Toast stack */}
      <div className="fixed top-5 right-4 z-[200] space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white border transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-600 border-green-500' :
              toast.type === 'error'   ? 'bg-red-600   border-red-500' :
              'bg-blue-600 border-blue-500'
            }`}
          >
            {toast.type === 'success' && <Check size={14} strokeWidth={3}/>}
            {toast.type === 'error'   && <AlertTriangle size={14}/>}
            {toast.type === 'info'    && <Info size={14}/>}
            {toast.message}
          </div>
        ))}
      </div>

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-amber-950 flex items-center gap-2">
            <Package size={18} className="text-amber-700"/> My Orders
          </h3>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5">
            {orders.length} order{orders.length !== 1 ? 's' : ''} placed
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID or Tracking ID…"
            className="w-full sm:w-72 bg-white border border-gray-200 text-xs rounded-2xl py-2.5 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-400/30 font-semibold placeholder-gray-300"
          />
        </div>
      </div>

      {/* Loading skeletons */}
      {loadingOrders && (
        <div className="space-y-4">
          <OrderSkeleton /><OrderSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!loadingOrders && filteredOrders.length === 0 && (
        <div className="bg-white rounded-3xl border-2 border-dashed border-amber-100 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto">
            <ShoppingBag size={28} className="text-amber-300" />
          </div>
          <div>
            <p className="font-black text-amber-900 text-sm">
              {searchQuery ? 'No orders found matching your search' : t('account_no_orders')}
            </p>
            {!searchQuery && (
              <p className="text-xs text-gray-400 mt-1">Your order history will appear here.</p>
            )}
          </div>
          {!searchQuery && (
            <button
              onClick={() => router.push('/products')}
              className="bg-amber-800 hover:bg-amber-700 text-white font-bold px-6 py-2.5 rounded-full text-xs shadow-sm"
            >
              {t('account_browse_products')}
            </button>
          )}
        </div>
      )}

      {/* Order list */}
      {!loadingOrders && filteredOrders.length > 0 && (
        <div className="space-y-4">
          {filteredOrders.map(ord => (
            <OrderCard
              key={ord.id}
              order={ord}
              expanded={expandedId === ord.id}
              onToggle={() => setExpandedId(p => p === ord.id ? null : ord.id)}
              onCancelSuccess={handleCancelSuccess}
              showToast={showToast}
              onReorder={handleReorder}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  );
}
