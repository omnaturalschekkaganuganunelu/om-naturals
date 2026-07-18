'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import {
  Plus, Edit3, Trash2, Search, X, AlertCircle,
  Tag, Percent, BadgeIndianRupee, Calendar, CheckCircle2,
  XCircle, RefreshCw, Ticket,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PremiumLoader from '@/components/PremiumLoader';
import CustomSelect from '@/components/CustomSelect';
import CustomCalendar from '@/components/admin/CustomCalendar';
import { useToastStore } from '@/store/toastStore';

export default function AdminCouponsPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { t, language } = useLanguage();
  const showToast = useToastStore((s) => s.showToast);

  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENT',
    value: '',
    minOrderValue: '0',
    maxDiscount: '',
    expiresAt: '',
    isActive: true,
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/admin/login');
    else if (authStatus === 'authenticated' && session?.user?.role !== 'ADMIN') router.push('/');
  }, [authStatus, session, router]);

  const loadCoupons = () => {
    setLoading(true);
    fetch('/api/coupons')
      .then((r) => r.json())
      .then((data) => { setCoupons(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user?.role === 'ADMIN') loadCoupons();
  }, [authStatus, session?.user?.role]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const openAdd = () => {
    setEditingCoupon(null);
    setFormData({ code: '', type: 'PERCENT', value: '', minOrderValue: '0', maxDiscount: '', expiresAt: '', isActive: true });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditingCoupon(c);
    setFormData({
      code: c.code,
      type: c.type,
      value: c.value.toString(),
      minOrderValue: c.minOrderValue.toString(),
      maxDiscount: c.maxDiscount ? c.maxDiscount.toString() : '',
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '',
      isActive: c.isActive,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const { code, type, value, minOrderValue } = formData;
    if (!code || !type || !value) {
      setFormError(language === 'te' ? 'దయచేసి అన్ని తప్పనిసరి వివరాలు నింపండి.' : 'Please fill in all required fields.');
      setSaving(false);
      return;
    }
    try {
      const url = editingCoupon ? `/api/coupons/${editingCoupon.id}` : '/api/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          code: formData.code.toUpperCase(),
          value: parseFloat(value),
          minOrderValue: parseFloat(minOrderValue),
          maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
          expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
        }),
      });
      if (res.ok) { loadCoupons(); setShowModal(false); }
      else {
        const err = await res.json();
        setFormError(err.error || (language === 'te' ? 'కూపన్ సేవ్ చేయడంలో విఫలమైంది.' : 'Failed to save coupon.'));
      }
    } catch {
      setFormError(language === 'te' ? 'సర్వర్ కనెక్షన్ లోపం.' : 'Server connection error.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'te' ? 'ఈ కూపన్‌ను తొలగించాలా?' : 'Delete this coupon?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      if (res.ok) loadCoupons();
      else { const err = await res.json(); showToast(err.error || 'Deletion failed.', 'error'); }
    } catch { console.error('Delete error'); }
    finally { setDeletingId(null); }
  };

  const filtered = coupons.filter((c) => c.code.toLowerCase().includes(search.toLowerCase()));

  if (authStatus === 'loading' || loading) {
    return <PremiumLoader fullScreen text={language === 'te' ? 'కూపన్లు లోడ్ అవుతున్నాయి...' : 'Loading coupons...'} />;
  }

  /* ─── Stat cards ─── */
  const totalActive = coupons.filter((c) => c.isActive).length;
  const totalInactive = coupons.filter((c) => !c.isActive).length;
  const totalExpired = coupons.filter((c) => c.expiresAt && new Date(c.expiresAt) < new Date()).length;

  return (
    <>
      
      <main className="max-w-7xl mx-auto sm:px-5 lg:px-8 py-2 sm:py-8 flex-1">
        <div className="flex flex-col lg:flex-row gap-0 sm:gap-8 items-start">
          <AdminSidebar />

          <section className="flex-1 min-w-0 px-2 sm:px-0 pt-2 sm:pt-0 space-y-5">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-amber-950 flex items-center gap-2">
                  <Ticket size={22} className="text-amber-700" />
                  {language === 'te' ? 'కూపన్ నిర్వహణ' : 'Coupon Management'}
                </h1>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  {language === 'te' ? 'తగ్గింపులు మరియు ప్రమోషనల్ ఆఫర్‌లను నిర్వహించండి' : 'Manage discounts and promotional offers'}
                </p>
              </div>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 bg-amber-800 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all shrink-0"
              >
                <Plus size={15} strokeWidth={3} />
                {language === 'te' ? 'కూపన్ జోడించు' : 'Add Coupon'}
              </button>
            </div>

            {/* ── Stat pills ── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: language === 'te' ? 'మొత్తం' : 'Total', value: coupons.length, color: 'bg-amber-50 border-amber-100 text-amber-900' },
                { label: language === 'te' ? 'యాక్టివ్' : 'Active', value: totalActive, color: 'bg-emerald-50 border-emerald-100 text-emerald-800' },
                { label: language === 'te' ? 'ఇన్‌యాక్టివ్' : 'Inactive', value: totalInactive + totalExpired, color: 'bg-red-50 border-red-100 text-red-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`${color} border rounded-2xl p-3 sm:p-4 text-center`}>
                  <p className="text-lg sm:text-2xl font-black">{value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5 opacity-70">{label}</p>
                </div>
              ))}
            </div>

            {/* ── Search ── */}
            <div className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={language === 'te' ? 'కూపన్ కోడ్ వెతకండి...' : 'Search by coupon code...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-amber-100 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all shadow-sm uppercase placeholder:normal-case placeholder:font-normal"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* ── DESKTOP Table ── */}
            <div className="hidden md:block bg-white border border-amber-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gradient-to-r from-amber-50 to-amber-100/40 border-b border-amber-100">
                    <tr>
                      <th className="py-4 px-5 text-[10px] font-black text-amber-800 uppercase tracking-wider">Code</th>
                      <th className="py-4 px-4 text-[10px] font-black text-amber-800 uppercase tracking-wider text-center">Type</th>
                      <th className="py-4 px-4 text-[10px] font-black text-amber-800 uppercase tracking-wider text-center">Value</th>
                      <th className="py-4 px-4 text-[10px] font-black text-amber-800 uppercase tracking-wider text-center">Min Order</th>
                      <th className="py-4 px-4 text-[10px] font-black text-amber-800 uppercase tracking-wider text-center">Max Cap</th>
                      <th className="py-4 px-4 text-[10px] font-black text-amber-800 uppercase tracking-wider text-center">Expires</th>
                      <th className="py-4 px-4 text-[10px] font-black text-amber-800 uppercase tracking-wider text-center">Status</th>
                      <th className="py-4 px-4 text-[10px] font-black text-amber-800 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-sm text-gray-400 font-medium">
                          <Tag size={28} className="mx-auto mb-2 text-gray-300" />
                          {language === 'te' ? 'కూపన్లు కనుగొనబడలేదు' : 'No coupons found'}
                        </td>
                      </tr>
                    ) : filtered.map((c) => {
                      const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                      return (
                        <tr key={c.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-4 px-5">
                            <span className="font-mono font-black text-sm text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg tracking-widest">
                              {c.code}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                              c.type === 'PERCENT'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}>
                              {c.type === 'PERCENT' ? <Percent size={9} /> : <BadgeIndianRupee size={9} />}
                              {c.type === 'PERCENT' ? 'Percent' : 'Fixed'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center font-black text-gray-900">
                            {c.type === 'PERCENT' ? `${c.value}%` : `₹${Number(c.value).toFixed(2)}`}
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-gray-600">₹{Number(c.minOrderValue).toFixed(2)}</td>
                          <td className="py-4 px-4 text-center font-bold text-gray-600">
                            {c.maxDiscount ? `₹${Number(c.maxDiscount).toFixed(2)}` : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {c.expiresAt ? (
                              <span className={`text-[10px] font-bold ${expired ? 'text-red-500' : 'text-gray-500'}`}>
                                {new Date(c.expiresAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                {expired && <span className="ml-1 text-[9px] bg-red-100 text-red-600 px-1 rounded">Expired</span>}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-[10px]">No expiry</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border uppercase ${
                              c.isActive && !expired
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {c.isActive && !expired
                                ? <><CheckCircle2 size={9} /> {language === 'te' ? 'యాక్టివ్' : 'Active'}</>
                                : <><XCircle size={9} /> {language === 'te' ? 'ఇన్‌యాక్టివ్' : 'Inactive'}</>
                              }
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEdit(c)}
                                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-200 transition-colors"
                                title="Edit"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                disabled={deletingId === c.id}
                                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                {deletingId === c.id
                                  ? <RefreshCw size={13} className="animate-spin" />
                                  : <Trash2 size={13} />
                                }
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── MOBILE Cards ── */}
            <div className="md:hidden space-y-3">
              {filtered.length === 0 ? (
                <div className="bg-white border border-amber-100 rounded-3xl py-16 text-center shadow-sm">
                  <Tag size={32} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-bold text-gray-400">{language === 'te' ? 'కూపన్లు కనుగొనబడలేదు' : 'No coupons found'}</p>
                </div>
              ) : filtered.map((c) => {
                const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                const isValid = c.isActive && !expired;
                return (
                  <div key={c.id} className="bg-white border border-amber-100 rounded-3xl p-4 shadow-sm space-y-3">
                    {/* Top row: code + status badge */}
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-mono font-black text-base text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl tracking-widest">
                        {c.code}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border uppercase shrink-0 ${
                        isValid ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {isValid ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                        {isValid ? (language === 'te' ? 'యాక్టివ్' : 'Active') : (language === 'te' ? 'ఇన్‌యాక్టివ్' : 'Inactive')}
                      </span>
                    </div>

                    {/* Detail grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Type</p>
                        <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          c.type === 'PERCENT' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
                          {c.type === 'PERCENT' ? <Percent size={8} /> : <BadgeIndianRupee size={8} />}
                          {c.type === 'PERCENT' ? 'Percentage' : 'Fixed'}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Value</p>
                        <p className="font-black text-gray-900 mt-0.5">{c.type === 'PERCENT' ? `${c.value}%` : `₹${Number(c.value).toFixed(2)}`}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Min Order</p>
                        <p className="font-bold text-gray-700 mt-0.5">₹{Number(c.minOrderValue).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Max Cap</p>
                        <p className="font-bold text-gray-700 mt-0.5">{c.maxDiscount ? `₹${Number(c.maxDiscount).toFixed(2)}` : '—'}</p>
                      </div>
                      {c.expiresAt && (
                        <div className="col-span-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide flex items-center gap-1">
                            <Calendar size={9} /> Expires
                          </p>
                          <p className={`font-bold mt-0.5 ${expired ? 'text-red-500' : 'text-gray-700'}`}>
                            {new Date(c.expiresAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            {expired && <span className="ml-1.5 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Expired</span>}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1 border-t border-amber-50">
                      <button
                        onClick={() => openEdit(c)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition-colors"
                      >
                        <Edit3 size={13} /> {language === 'te' ? 'సవరించు' : 'Edit'}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl border border-red-200 transition-colors disabled:opacity-50"
                      >
                        {deletingId === c.id
                          ? <RefreshCw size={13} className="animate-spin" />
                          : <Trash2 size={13} />
                        }
                        {language === 'te' ? 'తొలగించు' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </section>
        </div>
      </main>

      
      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Ticket size={15} className="text-amber-800" />
                </div>
                <h3 className="font-extrabold text-base text-gray-900">
                  {editingCoupon
                    ? (language === 'te' ? 'కూపన్ సవరించు' : 'Edit Coupon')
                    : (language === 'te' ? 'కొత్త కూపన్ జోడించు' : 'Add New Coupon')}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">

              {/* Coupon Code */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide block">
                  {language === 'te' ? 'కూపన్ కోడ్ *' : 'Coupon Code *'}
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  disabled={!!editingCoupon}
                  placeholder="e.g. SAVE20"
                  className="w-full bg-amber-50/30 border border-amber-100 rounded-2xl px-4 py-3 text-sm font-black text-amber-900 uppercase focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed tracking-widest placeholder:normal-case placeholder:font-normal placeholder:text-gray-400 placeholder:tracking-normal"
                />
                {editingCoupon && (
                  <p className="text-[10px] text-gray-400 font-medium">Code cannot be changed after creation.</p>
                )}
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide block">
                    {language === 'te' ? 'తగ్గింపు రకం *' : 'Discount Type *'}
                  </label>
                  <CustomSelect
                    value={formData.type}
                    onChange={(val) => setFormData({ ...formData, type: val })}
                    options={[
                      { value: 'PERCENT', label: language === 'te' ? 'శాతం (%)' : 'Percentage (%)' },
                      { value: 'FIXED', label: language === 'te' ? 'స్థిర తగ్గింపు (₹)' : 'Fixed Amount (₹)' },
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide block">
                    {formData.type === 'PERCENT'
                      ? (language === 'te' ? 'శాతం *' : 'Percentage *')
                      : (language === 'te' ? 'తగ్గింపు మొత్తం *' : 'Discount Amount *')
                    }
                  </label>
                  <div className="flex items-center border border-amber-100 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
                    <span className="px-3 py-3 bg-amber-50 text-amber-800 text-xs font-bold border-r border-amber-100 shrink-0">
                      {formData.type === 'PERCENT' ? '%' : '₹'}
                    </span>
                    <input
                      type="number"
                      name="value"
                      value={formData.value}
                      onChange={handleInputChange}
                      placeholder={formData.type === 'PERCENT' ? '10' : '50'}
                      className="flex-1 px-3 py-3 text-sm font-bold bg-transparent focus:outline-none"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Min Order + Max Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide block">
                    {language === 'te' ? 'కనీస కొనుగోలు' : 'Min Order (₹)'}
                  </label>
                  <div className="flex items-center border border-amber-100 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
                    <span className="px-3 py-3 bg-amber-50 text-amber-800 text-xs font-bold border-r border-amber-100">₹</span>
                    <input
                      type="number"
                      name="minOrderValue"
                      value={formData.minOrderValue}
                      onChange={handleInputChange}
                      placeholder="200"
                      className="flex-1 px-3 py-3 text-sm font-bold bg-transparent focus:outline-none"
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide block">
                    {language === 'te' ? 'గరిష్ట తగ్గింపు' : 'Max Discount (₹)'}
                  </label>
                  <div className="flex items-center border border-amber-100 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
                    <span className="px-3 py-3 bg-amber-50 text-amber-800 text-xs font-bold border-r border-amber-100">₹</span>
                    <input
                      type="number"
                      name="maxDiscount"
                      value={formData.maxDiscount}
                      onChange={handleInputChange}
                      placeholder={language === 'te' ? 'ఐచ్ఛికం' : 'Optional'}
                      className="flex-1 px-3 py-3 text-sm font-bold bg-transparent focus:outline-none"
                      min="0"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">{language === 'te' ? 'శాతం కూపన్‌లకు మాత్రమే వర్తిస్తుంది' : 'Only for percentage coupons'}</p>
                </div>
              </div>

              {/* Expiry + Active toggle */}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide block flex items-center gap-1">
                    <Calendar size={10} /> {language === 'te' ? 'గడువు తేదీ' : 'Expiry Date'}
                  </label>
                  <div className="w-full">
                    <CustomCalendar
                      value={formData.expiresAt}
                      onChange={(date) => setFormData(prev => ({ ...prev, expiresAt: date }))}
                      placeholder={language === 'te' ? 'తేదీ ఎంచుకోండి' : 'Select Date'}
                    />
                  </div>
                </div>
                <div className="space-y-1.5 pb-0.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide block">
                    {language === 'te' ? 'స్థితి' : 'Status'}
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-amber-50/30 border border-amber-100 rounded-2xl cursor-pointer hover:bg-amber-50 transition-colors">
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-checked:bg-amber-700 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-800">
                      {formData.isActive
                        ? (language === 'te' ? 'యాక్టివ్' : 'Active')
                        : (language === 'te' ? 'ఇన్‌యాక్టివ్' : 'Inactive')}
                    </span>
                  </label>
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-600">
                  <AlertCircle size={14} className="shrink-0" />
                  {formError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-800 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-extrabold py-3.5 rounded-2xl shadow-md transition-all text-sm"
                >
                  {saving ? <><RefreshCw size={14} className="animate-spin" /> {language === 'te' ? 'సేవ్ అవుతోంది...' : 'Saving...'}</> : (language === 'te' ? '✓ సేవ్ చేయి' : '✓ Save Coupon')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold py-3.5 rounded-2xl transition-all text-sm"
                >
                  {language === 'te' ? 'రద్దు చేయి' : 'Cancel'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
