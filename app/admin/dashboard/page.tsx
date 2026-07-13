'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Landmark, ShoppingCart, ShoppingBag, Users, AlertTriangle, RefreshCw, Bell, Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PremiumLoader from '@/components/PremiumLoader';
import { useRealtime } from '@/hooks/useRealtime';

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
  }, [authStatus, session, router]);

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
  }, [authStatus, session?.user?.role]);

  // Realtime new order alerts
  useRealtime('Order', 'INSERT', (payload) => {
    setNewOrderAlert(payload.new);
    // Optional: play an audio alert
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  });

  if (authStatus === 'loading' || loading || !stats) {
    return <PremiumLoader fullScreen={true} text={t('admin_dashboard_loading')} />;
  }

  // Find maximum revenue to scale custom chart bars
  const maxTrendRevenue = Math.max(...stats.revenueTrend.map((t: any) => t.revenue), 100);

  return (
    <>
      
      <main className="max-w-7xl mx-auto sm:px-5 lg:px-8 py-2 sm:py-8 flex-1">
        
        {/* Real-time Order Alert Toast overlay */}
        {newOrderAlert && (
          <div className="fixed top-20 left-3 right-3 sm:left-auto sm:right-6 bg-gradient-to-r from-amber-600 to-amber-800 text-white p-4 rounded-2xl smooth-shadow z-50 flex items-center space-x-3.5 border border-amber-400 animate-bounce sm:max-w-sm">
            <div className="p-2 bg-white/20 rounded-xl shrink-0">
              <Bell className="animate-swing text-amber-100" size={20} />
            </div>
            <div className="text-xs flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <Sparkles size={12} className="text-amber-300 shrink-0" />
                <span className="font-black">
                  {language === 'te' ? 'కొత్త ఆర్డర్ వచ్చింది!' : 'New Order Received!'}
                </span>
              </div>
              <p className="font-semibold text-amber-100 mt-0.5 truncate">
                {language === 'te' ? 'ఆర్డర్ ID' : 'Order ID'}: {newOrderAlert.orderId}
              </p>
              <p className="text-amber-200 text-[10px] truncate">
                ₹{Number(newOrderAlert.total).toFixed(2)} • {newOrderAlert.name}
              </p>
            </div>
            <button onClick={() => setNewOrderAlert(null)} className="text-white/80 hover:text-white font-bold text-xs shrink-0 pl-1">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-0 sm:gap-8 items-start">
          
          {/* Admin Sidebar Navigation */}
          <AdminSidebar />

          {/* Main Dashboard Content */}
          <section className="flex-1 w-full min-w-0 px-2 sm:px-0 pt-2 sm:pt-0 space-y-4 sm:space-y-6">
            
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

            {/* Stats Cards grid — 2 cols on mobile, 4 on md+ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              
              <div className="bg-white border border-amber-100 p-3 sm:p-4 rounded-2xl sm:rounded-3xl smooth-shadow flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-amber-50 text-amber-800 rounded-xl sm:rounded-2xl border border-amber-100 shrink-0">
                  <Landmark size={18} />
                </div>
                <div className="text-xs min-w-0">
                  <span className="text-gray-400 font-bold text-[10px] sm:text-xs">{t('admin_dashboard_revenue')}</span>
                  <p className="text-sm sm:text-lg font-black text-amber-950 mt-0.5 truncate">₹{Number(stats.totalRevenue).toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-white border border-amber-100 p-3 sm:p-4 rounded-2xl sm:rounded-3xl smooth-shadow flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-amber-50 text-amber-800 rounded-xl sm:rounded-2xl border border-amber-100 shrink-0">
                  <ShoppingCart size={18} />
                </div>
                <div className="text-xs min-w-0">
                  <span className="text-gray-400 font-bold text-[10px] sm:text-xs">{t('admin_dashboard_orders')}</span>
                  <p className="text-sm sm:text-lg font-black text-amber-950 mt-0.5">{stats.ordersCount}</p>
                </div>
              </div>

              <div className="bg-white border border-amber-100 p-3 sm:p-4 rounded-2xl sm:rounded-3xl smooth-shadow flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-amber-50 text-amber-800 rounded-xl sm:rounded-2xl border border-amber-100 shrink-0">
                  <ShoppingBag size={18} />
                </div>
                <div className="text-xs min-w-0">
                  <span className="text-gray-400 font-bold text-[10px] sm:text-xs">{t('admin_dashboard_products')}</span>
                  <p className="text-sm sm:text-lg font-black text-amber-950 mt-0.5">{stats.productsCount}</p>
                </div>
              </div>

              <div className="bg-white border border-amber-100 p-3 sm:p-4 rounded-2xl sm:rounded-3xl smooth-shadow flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-amber-50 text-amber-800 rounded-xl sm:rounded-2xl border border-amber-100 shrink-0">
                  <Users size={18} />
                </div>
                <div className="text-xs min-w-0">
                  <span className="text-gray-400 font-bold text-[10px] sm:text-xs">{t('admin_dashboard_customers')}</span>
                  <p className="text-sm sm:text-lg font-black text-amber-950 mt-0.5">{stats.customersCount}</p>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Sales trend Chart Card */}
              <div className="lg:col-span-2 bg-white border border-amber-100 p-4 sm:p-6 rounded-3xl smooth-shadow space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-amber-950">{t('admin_dashboard_chart_title')}</h3>
                <div className="overflow-x-auto no-scrollbar pt-8 -mt-8">
                  {/* Bar Chart */}
                  <div className="h-44 min-w-[280px] flex items-end justify-between gap-1.5 border-b border-amber-100 pb-2 mt-8">
                  {stats.revenueTrend.map((day: any) => {
                    const heightPercent = Math.max(8, Math.round((day.revenue / maxTrendRevenue) * 100));
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        {/* Hover Tooltip — above bar, won't clip because of pt-10 */}
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-amber-900 text-white text-[9px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap pointer-events-none">
                          ₹{Number(day.revenue).toFixed(2)}<br/>{day.orders} {language === 'te' ? 'ఆర్డర్లు' : 'orders'}
                        </div>
                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-amber-800 hover:bg-amber-600 rounded-t-lg transition-all cursor-pointer duration-300"
                        ></div>
                        <span className="text-[9px] text-gray-500 font-bold mt-1.5 leading-none">
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
                        <span className="text-[8px] text-gray-400 font-semibold leading-none">{day.date}</span>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>

              {/* Low Stock Alerts Card - stacked below on mobile */}
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

            {/* Recent Orders - Mobile cards on small screens, table on larger */}
            <div className="bg-white border border-amber-100 rounded-3xl overflow-hidden smooth-shadow">
              <div className="p-4 sm:p-5 border-b border-amber-50">
                <h3 className="text-xs sm:text-sm font-bold text-amber-950">{t('admin_dashboard_recent_orders')}</h3>
              </div>

              {/* Mobile: Card view */}
              <div className="sm:hidden divide-y divide-amber-50">
                {stats.recentOrders.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-8">No recent orders</p>
                ) : stats.recentOrders.map((ord: any) => (
                  <div key={ord.id} className="p-4 hover:bg-amber-50/20 cursor-pointer" onClick={() => router.push('/admin/orders')}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-mono font-bold text-amber-800 text-xs">{ord.orderId}</span>
                      <span className="font-bold text-xs text-amber-950">₹{Number(ord.total).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-gray-700">{ord.name}</p>
                        <p className="text-[10px] text-gray-400">{ord.user?.email || 'Guest'}</p>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black border uppercase ${
                          ord.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {ord.paymentStatus === 'COMPLETED' ? 'Paid' : 'Pending'}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                          ord.orderStatus === 'DELIVERED' ? 'bg-green-100 text-green-800 border-green-200' :
                          ord.orderStatus === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}>
                          {ord.orderStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table view */}
              <div className="hidden sm:block overflow-x-auto no-scrollbar">
                <table className="w-full min-w-[600px] text-left text-xs font-medium text-amber-950">
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
                            ord.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            {ord.paymentStatus === 'COMPLETED' ? (language === 'te' ? 'పూర్తయింది' : 'Paid') : (language === 'te' ? 'పెండింగ్' : 'Pending')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                            ord.orderStatus === 'DELIVERED' ? 'bg-green-100 text-green-800 border-green-200' :
                            ord.orderStatus === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}>
                            {ord.orderStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold">₹{Number(ord.total).toFixed(2)}</td>
                      </tr>
                    ))}
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
