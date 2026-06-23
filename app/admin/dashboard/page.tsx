'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Landmark, ShoppingCart, ShoppingBag, Users, AlertTriangle, RefreshCw, Bell, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PremiumLoader from '@/components/PremiumLoader';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { t, language } = useLanguage();

  // Stats states
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<any>(null);

  // Audio ref for notification ring
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Redirect if not ADMIN
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/admin/login');
    } else if (authStatus === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [authStatus, session]);

  // Load Initial Dashboard Stats
  const loadStats = () => {
    setLoading(true);
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading dashboard stats:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user?.role === 'ADMIN') {
      loadStats();
    }
  }, [authStatus]);

  // SSE Live Notification Setup for Admin
  useEffect(() => {
    if (authStatus !== 'authenticated' || session?.user?.role !== 'ADMIN') return;

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      // Connect to global SSE stream as admin
      eventSource = new EventSource('/api/orders/sse?role=admin');

      eventSource.onopen = () => {
        console.log('SSE Admin connection opened');
      };

      // Listen for new orders
      eventSource.addEventListener('new-order', (event: any) => {
        const data = JSON.parse(event.data);
        console.log('SSE Admin Event - New Order Placed:', data);
        
        // 1. Highlight new order alert overlay
        setNewOrderAlert(data);

        // 2. Play a notification sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav'); // Premium chime sound
          audio.volume = 0.5;
          audio.play();
        } catch (err) {
          console.error('Failed to play sound', err);
        }

        // 3. Update stats counters dynamically in state
        setStats((prev: any) => {
          if (!prev) return prev;
          
          // Append to recent orders list
          const updatedRecent = [data, ...prev.recentOrders.slice(0, 4)];
          
          // Update trend if today matches
          const updatedTrend = [...prev.revenueTrend];
          const lastDay = updatedTrend[updatedTrend.length - 1];
          if (lastDay) {
            lastDay.revenue += data.total;
            lastDay.orders += 1;
          }

          return {
            ...prev,
            ordersCount: prev.ordersCount + 1,
            totalRevenue: prev.totalRevenue + data.total,
            recentOrders: updatedRecent,
            revenueTrend: updatedTrend,
          };
        });

        // Clear toast alert after 5 seconds
        setTimeout(() => {
          setNewOrderAlert(null);
        }, 5000);
      });

      eventSource.onerror = (err) => {
        console.error('SSE Admin Connection Error. Falling back to active interval polling:', err);
        if (eventSource) {
          eventSource.close();
        }
        
        // Start polling if not already active
        if (!pollInterval) {
          console.log('Starting dashboard polling fallback...');
          fetchStatsSilent();
          pollInterval = setInterval(fetchStatsSilent, 30000); // poll stats every 30s
        }
      };
    };

    const fetchStatsSilent = () => {
      if (document.hidden) return;
      fetch('/api/admin/stats')
        .then((res) => res.json())
        .then((data) => {
          setStats(data);
        })
        .catch((err) => console.error('Silent stats poll failed:', err));
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && pollInterval) {
        fetchStatsSilent();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    connectSSE();

    return () => {
      console.log('Cleaning up SSE connection and polling triggers...');
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authStatus]);

  if (authStatus === 'loading' || loading || !stats) {
    return <PremiumLoader fullScreen={true} text={t('admin_dashboard_loading')} />;
  }

  // Find maximum revenue to scale custom chart bars
  const maxTrendRevenue = Math.max(...stats.revenueTrend.map((t: any) => t.revenue), 100);

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        
        {/* Real-time Order Alert Toast overlay */}
        {newOrderAlert && (
          <div className="fixed top-20 right-6 bg-gradient-to-r from-amber-600 to-amber-800 text-white p-4 rounded-2xl smooth-shadow z-50 flex items-center space-x-3.5 border border-amber-400 animate-bounce max-w-sm">
            <div className="p-2 bg-white/20 rounded-xl shrink-0">
              <Bell className="animate-swing text-amber-100" size={20} />
            </div>
            <div className="text-xs">
              <div className="flex items-center space-x-1">
                <Sparkles size={12} className="text-amber-300" />
                <span className="font-black">
                  {language === 'te' ? 'కొత్త ఆర్డర్ వచ్చింది!' : 'New Order Received!'}
                </span>
              </div>
              <p className="font-semibold text-amber-100 mt-0.5">
                {language === 'te' ? 'ఆర్డర్ ID' : 'Order ID'}: {newOrderAlert.orderId}
              </p>
              <p className="text-amber-200 text-[10px]">
                {language === 'te' ? 'మొత్తం ధర' : 'Total Price'}: ₹{newOrderAlert.total} • {language === 'te' ? 'కస్టమర్' : 'Customer'}: {newOrderAlert.name}
              </p>
            </div>
            <button onClick={() => setNewOrderAlert(null)} className="text-white/80 hover:text-white font-bold text-xs pl-2">
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Admin Sidebar Navigation */}
          <AdminSidebar />

          {/* Main Dashboard Content */}
          <section className="flex-1 w-full space-y-6">
            
            <div className="flex justify-between items-baseline">
              <div>
                <h1 className="text-xl sm:text-3xl font-extrabold text-amber-950 font-heading">
                  {t('admin_dashboard_title')}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('admin_dashboard_sub')}</p>
              </div>
              
              <button
                onClick={loadStats}
                className="p-2 bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-800 rounded-xl transition-all"
                title={language === 'te' ? 'తాజాకరించు' : 'Refresh'}
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Stats Cards grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-white border border-amber-100 p-4 rounded-3xl smooth-shadow flex items-center space-x-3">
                <div className="p-3 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 shrink-0">
                  <Landmark size={20} />
                </div>
                <div className="text-xs">
                  <span className="text-gray-400 font-bold">{t('admin_dashboard_revenue')}</span>
                  <p className="text-sm sm:text-lg font-black text-amber-950 mt-0.5">₹{stats.totalRevenue}</p>
                </div>
              </div>

              <div className="bg-white border border-amber-100 p-4 rounded-3xl smooth-shadow flex items-center space-x-3">
                <div className="p-3 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 shrink-0">
                  <ShoppingCart size={20} />
                </div>
                <div className="text-xs">
                  <span className="text-gray-400 font-bold">{t('admin_dashboard_orders')}</span>
                  <p className="text-sm sm:text-lg font-black text-amber-950 mt-0.5">{stats.ordersCount}</p>
                </div>
              </div>

              <div className="bg-white border border-amber-100 p-4 rounded-3xl smooth-shadow flex items-center space-x-3">
                <div className="p-3 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 shrink-0">
                  <ShoppingBag size={20} />
                </div>
                <div className="text-xs">
                  <span className="text-gray-400 font-bold">{t('admin_dashboard_products')}</span>
                  <p className="text-sm sm:text-lg font-black text-amber-950 mt-0.5">{stats.productsCount}</p>
                </div>
              </div>

              <div className="bg-white border border-amber-100 p-4 rounded-3xl smooth-shadow flex items-center space-x-3">
                <div className="p-3 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 shrink-0">
                  <Users size={20} />
                </div>
                <div className="text-xs">
                  <span className="text-gray-400 font-bold">{t('admin_dashboard_customers')}</span>
                  <p className="text-sm sm:text-lg font-black text-amber-950 mt-0.5">{stats.customersCount}</p>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Sales trend Chart Card */}
              <div className="lg:col-span-2 bg-white border border-amber-100 p-5 sm:p-6 rounded-3xl smooth-shadow space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-amber-950">{t('admin_dashboard_chart_title')}</h3>
                
                {/* SVG/Tailwind Custom Bar Chart */}
                <div className="h-48 flex items-end justify-between space-x-3 pt-6 border-b border-amber-100 pb-2">
                  {stats.revenueTrend.map((day: any) => {
                    const heightPercent = Math.max(10, Math.round((day.revenue / maxTrendRevenue) * 100));
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                        {/* Hover Tooltip tooltip */}
                        <div className="absolute bottom-full mb-1 bg-amber-900 text-white text-[9px] font-bold py-1 px-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 shrink-0">
                          ₹{day.revenue} ({day.orders} {language === 'te' ? 'ఆర్డర్లు' : 'Orders'})
                        </div>
                        {/* Interactive Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-amber-800 hover:bg-amber-600 rounded-t-lg transition-all cursor-pointer duration-300"
                        ></div>
                        <span className="text-[9px] text-gray-500 font-bold mt-2">
                          {language === 'te' ? day.day : (() => {
                            const clean = day.day.trim();
                            if (clean.includes('ఆది')) return 'Sun';
                            if (clean.includes('సోమ')) return 'Mon';
                            if (clean.includes('మంగళ')) return 'Tue';
                            if (clean.includes('బుధ')) return 'Wed';
                            if (clean.includes('గురు')) return 'Thu';
                            if (clean.includes('శుక్ర')) return 'Fri';
                            if (clean.includes('శని')) return 'Sat';
                            return day.day;
                          })()}
                        </span>
                        <span className="text-[8px] text-gray-400 font-semibold">{day.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Low Stock Alerts Card */}
              <div className="bg-white border border-amber-100 p-5 sm:p-6 rounded-3xl smooth-shadow space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-amber-950 flex items-center space-x-1">
                  <AlertTriangle size={15} className="text-amber-700" />
                  <span>{t('admin_dashboard_low_stock')}</span>
                </h3>

                <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar">
                  {stats.lowStockProducts.length === 0 ? (
                    <p className="text-xs text-green-600 font-bold text-center py-10">{t('admin_dashboard_low_stock_empty')}</p>
                  ) : (
                    stats.lowStockProducts.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between border-b border-amber-50 pb-2 text-xs font-semibold">
                        <div className="max-w-[150px] truncate">
                          <p className="text-amber-950 truncate">
                            {language === 'te' ? p.nameTe : p.name}
                          </p>
                          <p className="text-[10px] text-gray-400">{p.sku}</p>
                        </div>
                        <span className="text-red-650 font-black bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-md text-[10px]">
                          {language === 'te' ? `మిగిలింది: ${p.stock}` : `Left: ${p.stock}`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Recent Orders table card */}
            <div className="bg-white border border-amber-100 rounded-3xl overflow-hidden smooth-shadow">
              <div className="p-5 border-b border-amber-50">
                <h3 className="text-xs sm:text-sm font-bold text-amber-950">{t('admin_dashboard_recent_orders')}</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-medium text-amber-950">
                  <thead className="bg-amber-50 text-[10px] uppercase font-bold text-amber-900">
                    <tr>
                      <th className="py-3 px-4">{t('admin_order_id')}</th>
                      <th className="py-3 px-4">{t('admin_customer')}</th>
                      <th className="py-3 px-4">{t('admin_payment_method')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_dashboard_recent_orders_status')}</th>
                      <th className="py-3 px-4 text-right">{t('admin_total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {stats.recentOrders.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-amber-50/10 cursor-pointer" onClick={() => router.push('/admin/orders')}>
                        <td className="py-3 px-4 font-mono font-bold text-amber-800">{ord.orderId}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold">{ord.name}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">{ord.user?.email || 'Guest'}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black border uppercase ${
                            ord.paymentStatus === 'COMPLETED'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            {ord.paymentStatus === 'COMPLETED' 
                              ? (language === 'te' ? 'పూర్తయింది' : 'Paid') 
                              : ord.paymentStatus === 'FAILED'
                              ? (language === 'te' ? 'వైఫల్యం' : 'Failed')
                              : (language === 'te' ? 'పెండింగ్' : 'Pending')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                            ord.orderStatus === 'DELIVERED'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : ord.orderStatus === 'CANCELLED'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}>
                            {ord.orderStatus === 'DELIVERED'
                              ? (language === 'te' ? 'డెలివరీ అయింది' : 'DELIVERED')
                              : ord.orderStatus === 'CANCELLED'
                              ? (language === 'te' ? 'రద్దు చేయబడింది' : 'CANCELLED')
                              : ord.orderStatus === 'PACKED'
                              ? (language === 'te' ? 'ప్యాక్ చేయబడింది' : 'PACKED')
                              : ord.orderStatus === 'SHIPPED'
                              ? (language === 'te' ? 'రవాణా లో ఉంది' : 'SHIPPED')
                              : ord.orderStatus === 'CONFIRMED'
                              ? (language === 'te' ? 'స్థిరపరచబడింది' : 'CONFIRMED')
                              : (language === 'te' ? 'పెండింగ్' : 'PENDING')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold">₹{ord.total}</td>
                      </tr>
                    ))}
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
