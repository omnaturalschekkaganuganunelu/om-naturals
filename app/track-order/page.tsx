'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { 
  Search, 
  MapPin, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Copy, 
  Check, 
  ChevronRight, 
  Info,
  Calendar,
  X
} from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';

// Deterministic Tracking ID Generator
const getTrackingId = (orderId: string) => {
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
};

// Progress percentage mapping
const getProgressPercentage = (status: string) => {
  switch (status) {
    case 'PENDING': return 15;
    case 'CONFIRMED': return 35;
    case 'PROCESSING': return 50;
    case 'PACKED': return 70;
    case 'OUT_FOR_DELIVERY':
    case 'SHIPPED': return 85;
    case 'DELIVERED': return 100;
    default: return 0;
  }
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function TrackOrderContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlOrderId = searchParams.get('orderId') || '';

  const [orderIdQuery, setOrderIdQuery] = useState(urlOrderId);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sseConnected, setSseConnected] = useState(false);
  
  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const steps = [
    { key: 'PENDING', label: language === 'te' ? 'ఆర్డర్ నమోదు' : 'Order Placed', icon: Clock },
    { key: 'CONFIRMED', label: language === 'te' ? 'స్థిరపరచబడింది' : 'Confirmed', icon: CheckCircle },
    { key: 'PROCESSING', label: language === 'te' ? 'ప్రాసెసింగ్' : 'Processing', icon: Info },
    { key: 'PACKED', label: language === 'te' ? 'ప్యాక్ అయింది' : 'Packed', icon: Package },
    { key: 'OUT_FOR_DELIVERY', label: language === 'te' ? 'డెలివరీ' : 'Out for Delivery', icon: Truck },
    { key: 'DELIVERED', label: language === 'te' ? 'డెలివరీ అయింది' : 'Delivered', icon: MapPin }
  ];

  // Helper to map DB statuses for index tracking
  const getStepIndex = (status: string) => {
    if (status === 'SHIPPED') return 4; // Treat SHIPPED equivalent to OUT_FOR_DELIVERY
    return steps.findIndex(s => s.key === status);
  };

  const getStatusLabel = useCallback((status: string) => {
    switch (status) {
      case 'PENDING': return language === 'te' ? 'పెండింగ్' : 'Pending';
      case 'CONFIRMED': return language === 'te' ? 'నిర్ధారించబడింది' : 'Confirmed';
      case 'PROCESSING': return language === 'te' ? 'ప్రాసెసింగ్' : 'Processing';
      case 'PACKED': return language === 'te' ? 'ప్యాక్ చేయబడింది' : 'Packed';
      case 'OUT_FOR_DELIVERY':
      case 'SHIPPED': return language === 'te' ? 'డెలివరీలో ఉంది' : 'Out for Delivery';
      case 'DELIVERED': return language === 'te' ? 'డెలివరీ పూర్తయింది' : 'Delivered';
      case 'CANCELLED': return language === 'te' ? 'రద్దు చేయబడింది' : 'Cancelled';
      default: return status;
    }
  }, [language]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'CONFIRMED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PROCESSING': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'PACKED': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'OUT_FOR_DELIVERY':
      case 'SHIPPED': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DELIVERED': return 'bg-green-50 text-green-700 border-green-200';
      case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-amber-50 text-amber-900 border-amber-200';
    }
  };

  const getStatusUpdateMsg = (status: string) => {
    switch (status) {
      case 'PENDING':
        return language === 'te' 
          ? 'ఆర్డర్ విజయవంతంగా నమోదైంది. మేము వివరాలను ధృవీకరిస్తున్నాము.' 
          : 'We have received your order and are validating details.';
      case 'CONFIRMED':
        return language === 'te' 
          ? 'మీ ఆర్డర్ నిర్ధారించబడింది.' 
          : 'Your order has been confirmed by our warehouse.';
      case 'PROCESSING':
        return language === 'te' 
          ? 'నూనె ప్రాసెసింగ్ లో ఉంది మరియు ప్యాక్ చేయబడుతోంది.' 
          : 'Your wood-pressed oil is being packaged.';
      case 'PACKED':
        return language === 'te' 
          ? 'మీ ప్యాకేజీ సిద్ధంగా ఉంది.' 
          : 'Your package is ready for delivery.';
      case 'OUT_FOR_DELIVERY':
      case 'SHIPPED':
        return language === 'te' 
          ? 'డెలివరీ ఏజెంట్ మీ ఆర్డర్‌తో బయలుదేరారు.' 
          : 'The courier has picked up your package and is on the way.';
      case 'DELIVERED':
        return language === 'te' 
          ? 'ఆర్డర్ విజయవంతంగా చేరింది! నూనెను ఆస్వాదించండి.' 
          : 'Delivered successfully! Enjoy your organic wood-pressed oil.';
      case 'CANCELLED':
        return language === 'te' 
          ? 'ఈ ఆర్డర్ రద్దు చేయబడింది.' 
          : 'This order has been cancelled.';
      default:
        return '';
    }
  };

  const getFormattedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'te' ? 'te-IN' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getEstimatedArrival = (createdAtStr: string) => {
    const d = new Date(createdAtStr);
    d.setDate(d.getDate() + 3); // 3 days expected delivery
    return d.toLocaleDateString(language === 'te' ? 'te-IN' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Copy tracking ID handler
  const handleCopyTrackingId = (trkId: string) => {
    navigator.clipboard.writeText(trkId);
    setCopiedId(trkId);
    showToast(
      language === 'te' 
        ? 'ట్రాకింగ్ ఐడీ క్లిప్‌బోర్డ్‌కు కాపీ చేయబడింది!' 
        : 'Tracking ID copied to clipboard!',
      'success'
    );
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchOrder = useCallback(async (idOrTrk: string) => {
    if (!idOrTrk.trim()) return;

    setLoading(true);
    setError('');
    
    let resolvedId = idOrTrk.trim();
    
    // Resolve tracking ID to Database order ID if possible by loading history
    if (resolvedId.startsWith('TRK-')) {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const userOrders = await res.json();
          const match = userOrders.find((o: any) => getTrackingId(o.orderId) === resolvedId);
          if (match) {
            resolvedId = match.id;
          }
        }
      } catch (err) {
        console.error('Error resolving tracking ID:', err);
      }
    }

    // Fetch order details by ID or Custom Order ID
    fetch(`/api/orders/${resolvedId}`)
      .then((res) => {
        if (res.status === 401) {
          throw new Error(language === 'te' ? 'ఆర్డర్ ట్రాక్ చేయడానికి దయచేసి లాగిన్ చేయండి.' : 'Please log in to track your order details.');
        }
        if (!res.ok) {
          throw new Error(language === 'te' ? 'ఆర్డర్ కనుగొనబడలేదు. సరైన ఐడీని నమోదు చేయండి.' : 'Order not found. Please enter a valid ID.');
        }
        return res.json();
      })
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching tracking order:', err);
        setError(err.message || (language === 'te' ? 'ఆర్డర్ ట్రాక్ చేయడంలో విఫలమైంది.' : 'Failed to track order.'));
        setOrder(null);
        setLoading(false);
      });
  }, [language]);

  // Trigger search if query is in URL on load
  useEffect(() => {
    if (urlOrderId) {
      fetchOrder(urlOrderId);
    }
  }, [urlOrderId, fetchOrder]);

  // Server Sent Events (SSE) listener for real-time status updates
  const trackingOrderId = order?.id;
  const isFinalStatus = order?.orderStatus === 'DELIVERED' || order?.orderStatus === 'CANCELLED';

  useEffect(() => {
    if (!trackingOrderId || isFinalStatus) {
      setSseConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      eventSource = new EventSource(`/api/orders/sse?orderId=${trackingOrderId}`);

      eventSource.onopen = () => {
        setSseConnected(true);
        console.log('SSE Tracking connection opened');
      };

      eventSource.addEventListener('order-update', (event: any) => {
        const data = JSON.parse(event.data);
        console.log('SSE Tracking Event Received:', data);
        
        // Update order status in view
        setOrder((prev: any) => {
          if (prev && prev.id === data.orderId) {
            showToast(
              language === 'te'
                ? `స్థితి అప్‌డేట్: ${getStatusLabel(data.status)}`
                : `Order Status Updated: ${getStatusLabel(data.status)}`,
              'info'
            );
            return {
              ...prev,
              orderStatus: data.status,
              updatedAt: data.updatedAt || new Date().toISOString()
            };
          }
          return prev;
        });
      });

      eventSource.onerror = (err) => {
        console.error('SSE Tracking Connection Error. Falling back to active status interval polling:', err);
        setSseConnected(false);
        if (eventSource) {
          eventSource.close();
        }
        
        // Start polling fallback if not active
        if (!pollInterval) {
          console.log('Starting order tracking polling fallback...');
          pollInterval = setInterval(fetchOrderStatusSilent, 20000); // poll status every 20s
        }
      };
    };

    const fetchOrderStatusSilent = () => {
      if (document.hidden) return;
      fetch(`/api/orders/${trackingOrderId}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch');
        })
        .then((data) => {
          setOrder((prev: any) => {
            if (prev && prev.orderStatus !== data.orderStatus) {
              showToast(
                language === 'te'
                  ? `స్థితి అప్‌డేట్: ${getStatusLabel(data.orderStatus)}`
                  : `Order Status Updated: ${getStatusLabel(data.orderStatus)}`,
                'info'
              );
            }
            return data;
          });
        })
        .catch((err) => console.error('Silent order status poll failed:', err));
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && pollInterval) {
        fetchOrderStatusSilent();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    connectSSE();

    return () => {
      console.log('Cleaning up SSE tracking and polling triggers...');
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setSseConnected(false);
    };
  }, [trackingOrderId, isFinalStatus, language, getStatusLabel, showToast]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderIdQuery.trim()) {
      router.push(`/track-order?orderId=${orderIdQuery.trim()}`);
      fetchOrder(orderIdQuery.trim());
    }
  };

  const isCancelled = order ? order.orderStatus === 'CANCELLED' : false;
  const progressVal = order ? getProgressPercentage(order.orderStatus) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 relative">
      
      <div className="text-center space-y-3 mb-10">
        <h1 className="text-2xl sm:text-4xl font-black text-amber-950 font-heading">
          {language === 'te' ? 'ఆర్డర్ ట్రాకింగ్' : 'Track Your Order'}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto font-medium">
          {language === 'te' 
            ? 'మీ ఆర్డర్ ఐడీ లేదా ట్రాకింగ్ ఐడీని నమోదు చేసి లైవ్ అప్‌డేట్స్ తెలుసుకోండి.' 
            : 'Enter your Order ID or Tracking ID below to view expected delivery and status updates.'}
        </p>
      </div>

      {/* Tracker search bar */}
      <form onSubmit={handleSearchSubmit} className="bg-white border border-amber-100 p-4 rounded-3xl smooth-shadow flex gap-3 max-w-lg mx-auto">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={language === 'te' ? 'ఆర్డర్ లేదా ట్రాకింగ్ ఐడీని నమోదు చేయండి' : 'Enter Order ID / Tracking ID'}
            value={orderIdQuery}
            onChange={(e) => setOrderIdQuery(e.target.value)}
            className="w-full bg-[#fdfbf7] text-xs border border-amber-100 rounded-2xl py-3 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/10 font-bold"
          />
          <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          type="submit"
          disabled={loading || !orderIdQuery.trim()}
          className="bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs px-6 rounded-2xl shadow-sm transition-all"
        >
          {loading ? (language === 'te' ? 'వెతుకుతోంది...' : 'Searching...') : t('track_btn')}
        </button>
      </form>

      {error && (
        <div className="mt-8 max-w-lg mx-auto p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold text-center flex items-center justify-center space-x-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Tracking results */}
      {order && (
        <div className="mt-10 bg-[#fdfbf7] border border-amber-100 rounded-3xl p-6 sm:p-8 smooth-shadow space-y-8 animate-fade-in-up">
          
          {/* Header Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-amber-100/60 pb-5 text-xs font-bold text-amber-955">
            <div>
              <p className="text-gray-400">{language === 'te' ? 'ఆర్డర్ ఐడీ:' : 'Order ID'}</p>
              <p className="font-mono text-base text-amber-900 font-black mt-0.5">{order.orderId}</p>
            </div>

            <div>
              <p className="text-gray-455">{language === 'te' ? 'ట్రాకింగ్ ఐడీ:' : 'Tracking ID'}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="font-mono text-sm font-extrabold text-amber-950">{getTrackingId(order.orderId)}</span>
                <button
                  onClick={() => handleCopyTrackingId(getTrackingId(order.orderId))}
                  className="p-1 bg-white hover:bg-amber-50 border border-amber-100 rounded-lg text-amber-900 transition-colors"
                >
                  <Copy size={11} />
                </button>
              </div>
            </div>

            <div className="sm:text-right">
              <p className="text-gray-400">{language === 'te' ? 'లైవ్ అప్‌డేట్స్:' : 'Live Updates'}</p>
              <span className={`inline-flex items-center space-x-1.5 mt-1 px-3 py-1 rounded-full text-[10px] font-black border ${
                sseConnected
                  ? 'bg-green-50 text-green-700 border-green-200 animate-pulse'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-green-600' : 'bg-amber-600'}`}></span>
                <span>{sseConnected ? (language === 'te' ? 'కనెక్ట్ అయింది (LIVE)' : 'Connected (LIVE)') : (language === 'te' ? 'కనెక్ట్ అవుతోంది...' : 'Connecting...')}</span>
              </span>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-amber-100 rounded-2xl p-4 flex items-center space-x-3 text-xs text-amber-950 font-bold">
              <Calendar size={18} className="text-amber-800 shrink-0" />
              <div>
                <p className="text-gray-400 text-[10px]">{language === 'te' ? 'అంచనా డెలివరీ తేదీ' : 'Expected Delivery Date'}</p>
                <p className="text-amber-900 text-sm font-black mt-0.5">
                  {isCancelled ? 'N/A' : getEstimatedArrival(order.createdAt)}
                </p>
              </div>
            </div>

            <div className="bg-white border border-amber-100 rounded-2xl p-4 flex items-center space-x-3 text-xs text-amber-950 font-bold">
              <Info size={18} className="text-amber-800 shrink-0" />
              <div>
                <p className="text-gray-455 text-[10px]">{language === 'te' ? 'ప్రస్తుత ఆర్డర్ స్థితి' : 'Current Status Badge'}</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadgeClass(order.orderStatus)}`}>
                  {getStatusLabel(order.orderStatus)}
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation alert if status is CANCELLED */}
          {isCancelled ? (
            <div className="p-5 bg-red-50/50 border border-red-200 rounded-2xl flex items-start space-x-3.5 text-red-700 text-xs font-bold">
              <AlertTriangle size={24} className="shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-black text-red-800 text-sm">{language === 'te' ? 'ఆర్డర్ రద్దు చేయబడింది' : 'Order Cancelled'}</p>
                <p className="text-red-600 font-medium text-[11px] mt-1">
                  {order.notes || (language === 'te' ? 'ఈ ఆర్డర్ రద్దు చేయబడింది. సందేహాల కొరకు మమ్మల్ని సంప్రదించండి.' : 'This order has been cancelled. Reach out to support for clarification.')}
                </p>
                <p className="text-[10px] text-gray-400 mt-2">
                  {language === 'te' ? 'రద్దు చేసిన తేదీ:' : 'Cancelled at:'} {getFormattedDate(order.updatedAt)}
                </p>
              </div>
            </div>
          ) : (
            /* Timeline tracking visualization */
            <div className="space-y-6">
              
              {/* Progress text update bar */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <Info size={16} className="text-amber-800 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 font-bold">
                  <p className="text-amber-900 font-black">{language === 'te' ? 'తాజా అప్‌డేట్:' : 'Latest Status Update'}</p>
                  <p className="text-amber-900 font-medium text-[11px] mt-0.5">
                    {getStatusUpdateMsg(order.orderStatus)}
                  </p>
                </div>
              </div>

              {/* Progress Completion Line */}
              <div className="bg-white border border-amber-100 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1 bg-amber-100/50 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-amber-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${progressVal}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-black text-amber-900 shrink-0">
                  {progressVal}% {language === 'te' ? 'పూర్తయింది' : 'Completed'}
                </span>
              </div>

              {/* Desktop Horizontal Timeline */}
              <div className="hidden md:block bg-white border border-amber-100 rounded-2xl p-6 relative py-10">
                {/* Connecting progress line */}
                <div className="absolute top-[49px] left-14 right-14 h-1 bg-gray-200 -translate-y-1/2 z-0">
                  <div 
                    className="bg-amber-600 h-full transition-all duration-500" 
                    style={{ width: `${(Math.max(0, getStepIndex(order.orderStatus)) / 5) * 100}%` }}
                  ></div>
                </div>

                <div className="relative flex justify-between z-10">
                  {steps.map((step, idx) => {
                    const currentIdx = getStepIndex(order.orderStatus);
                    const isCompleted = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;
                    const IconComp = step.icon;

                    return (
                      <div key={step.key} className="flex flex-col items-center text-center max-w-[90px]">
                        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                          isCompleted 
                            ? 'bg-amber-600 border-amber-600 text-white shadow-sm' 
                            : 'bg-white border-gray-200 text-gray-300'
                        } ${isCurrent ? 'ring-4 ring-amber-100 scale-110' : ''}`}>
                          {isCompleted ? <Check size={16} strokeWidth={3.5} /> : <IconComp size={14} />}
                        </div>
                        <p className={`mt-2.5 text-[10px] font-black leading-tight ${isCompleted ? 'text-amber-950' : 'text-gray-400'}`}>
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Vertical Timeline */}
              <div className="md:hidden bg-white border border-amber-100 rounded-2xl p-6 relative pl-8 border-l-2 border-amber-200 space-y-6 py-4 ml-2">
                {steps.map((step, idx) => {
                  const currentIdx = getStepIndex(order.orderStatus);
                  const isCompleted = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  const IconComp = step.icon;

                  return (
                    <div key={step.key} className="relative flex items-start space-x-3.5">
                      {/* Circle dot Identifier */}
                      <div className={`absolute -left-[33px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        isCompleted 
                          ? 'bg-amber-600 border-amber-600 text-white' 
                          : 'bg-white border-amber-200 text-gray-300'
                      }`}>
                        {isCompleted && <Check size={8} strokeWidth={4} />}
                      </div>

                      <div className={`p-1.5 rounded-lg border ${
                        isCompleted 
                          ? isCurrent 
                            ? 'bg-amber-100 border-amber-300 text-amber-950 animate-pulse' 
                            : 'bg-amber-50 border-amber-100 text-amber-800'
                          : 'bg-gray-50 border-gray-100 text-gray-400'
                      }`}>
                        <IconComp size={12} />
                      </div>

                      <div className="space-y-0.5">
                        <p className={`text-[11px] font-black ${isCompleted ? 'text-amber-950' : 'text-gray-400'}`}>
                          {step.label}
                        </p>
                        <p className="text-[10px] text-gray-400 font-semibold">
                          {isCompleted ? getStatusUpdateMsg(step.key) : (language === 'te' ? 'త్వరలో...' : 'Pending execution...')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* Delivery Note */}
          <div className="border-t border-amber-100/50 pt-5 text-[10px] text-gray-400 font-bold text-center leading-relaxed max-w-md mx-auto">
            {language === 'te'
              ? 'డెలివరీ స్థితిగతులు సమయానుకూలంగా అప్‌డేట్ చేయబడును. సహాయం కొరకు ఫోన్/వాట్సాప్ ద్వారా మమ్మల్ని సంప్రదించండి.'
              : 'Delivery updates are made periodically. Contact us via Phone/WhatsApp for support.'
            }
          </div>

        </div>
      )}

      {/* ─── CUSTOM TOAST SYSTEM OVERLAY ─── */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`p-4 rounded-2xl shadow-lg border text-xs font-bold pointer-events-auto animate-fade-in-up flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500 animate-ping' : toast.type === 'error' ? 'bg-red-500' : 'bg-amber-500'
            }`} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<PremiumLoader fullScreen={false} />}>
        <TrackOrderContent />
      </Suspense>
      <Footer />
    </>
  );
}
