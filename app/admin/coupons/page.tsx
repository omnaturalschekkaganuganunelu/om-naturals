'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Plus, Edit3, Trash2, Search, X, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PremiumLoader from '@/components/PremiumLoader';
import CustomSelect from '@/components/CustomSelect';

export default function AdminCouponsPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { t, language } = useLanguage();

  // Data states
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form states
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

  // Auth Protection
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/admin/login');
    } else if (authStatus === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [authStatus, session]);

  // Load Coupons
  const loadCoupons = () => {
    setLoading(true);
    fetch('/api/coupons')
      .then((res) => res.json())
      .then((data) => {
        setCoupons(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching admin coupons:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user?.role === 'ADMIN') {
      loadCoupons();
    }
  }, [authStatus]);

  // Handle Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      type: 'PERCENT',
      value: '',
      minOrderValue: '0',
      maxDiscount: '',
      expiresAt: '',
      isActive: true,
    });
    setFormError('');
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (c: any) => {
    setEditingCoupon(c);
    setFormData({
      code: c.code,
      type: c.type,
      value: c.value.toString(),
      minOrderValue: c.minOrderValue.toString(),
      maxDiscount: c.maxDiscount ? c.maxDiscount.toString() : '',
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().split('T')[0] : '',
      isActive: c.isActive,
    });
    setFormError('');
    setShowModal(true);
  };

  // Submit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    const { code, type, value, minOrderValue } = formData;
    if (!code || !type || value === undefined) {
      setFormError(language === 'te' ? 'దయచేసి కోడ్, తగ్గింపు రకం మరియు కనీస విలువ నింపండి.' : 'Please fill in code, discount type, and minimum value.');
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
          value: parseFloat(value),
          minOrderValue: parseFloat(minOrderValue),
          maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
          expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
        }),
      });

      if (res.ok) {
        loadCoupons();
        setShowModal(false);
      } else {
        const err = await res.json();
        setFormError(err.error || (language === 'te' ? 'కూపన్ సేవ్ చేయడంలో విఫలమైంది.' : 'Failed to save coupon.'));
      }
    } catch (err) {
      setFormError(language === 'te' ? 'సర్వర్ కనెక్షన్ లోపం.' : 'Server connection error.');
    } finally {
      setSaving(false);
    }
  };

  // Delete coupon
  const handleDeleteCoupon = async (id: string) => {
    if (!confirm(language === 'te' ? 'ఈ కూపన్‌ను ఖచ్చితంగా తొలగించాలనుకుంటున్నారా?' : 'Are you sure you want to delete this coupon?')) return;

    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadCoupons();
      } else {
        const err = await res.json();
        alert(err.error || (language === 'te' ? 'తొలగించడం విఫలమైంది.' : 'Deletion failed.'));
      }
    } catch (err) {
      console.error('Error deleting coupon:', err);
    }
  };

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  if (authStatus === 'loading' || loading) {
    return <PremiumLoader fullScreen={true} text={t('admin_coupons_loading')} />;
  }

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 overflow-x-hidden">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 items-start">
          
          <AdminSidebar />

          <section className="flex-1 w-full min-w-0 space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl sm:text-3xl font-extrabold text-amber-950 font-heading">
                  {t('admin_coupons_title')}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('admin_coupons_sub')}</p>
              </div>

              <button
                onClick={handleOpenAdd}
                className="bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs px-5 py-3 rounded-full flex items-center justify-center space-x-1.5 shadow-sm hover:shadow"
              >
                <Plus size={16} />
                <span>{t('admin_coupons_add')}</span>
              </button>
            </div>

            {/* Search */}
            <div className="bg-white border border-amber-100 p-4 rounded-3xl smooth-shadow flex items-center relative">
              <input
                type="text"
                placeholder={t('admin_coupons_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-amber-50/10 text-xs border border-amber-100 rounded-2xl py-2.5 pl-3 pr-10 focus:outline-none uppercase font-semibold"
              />
              <Search size={18} className="absolute right-7 text-gray-400" />
            </div>

            {/* Table */}
            <div className="bg-white border border-amber-100 rounded-3xl overflow-hidden smooth-shadow">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs font-medium text-amber-950 min-w-[700px]">
                  <thead className="bg-amber-50 text-[10px] uppercase font-bold text-amber-900 border-b border-amber-100">
                    <tr>
                      <th className="py-3 px-4">{t('admin_coupons_th_code')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_coupons_th_type')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_coupons_th_value')}</th>
                      <th className="py-3 px-4 text-right">{t('admin_coupons_th_min_order')}</th>
                      <th className="py-3 px-4 text-right">{t('admin_coupons_th_max_discount')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_coupons_th_expires')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_coupons_th_status')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_coupons_th_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50 font-semibold text-xs text-amber-950">
                    {filteredCoupons.map((c) => (
                      <tr key={c.id} className="hover:bg-amber-50/10">
                        <td className="py-3.5 px-4 font-mono font-black text-sm uppercase text-amber-800">{c.code}</td>
                        <td className="py-3.5 px-4 text-center">
                          {c.type === 'PERCENT' 
                            ? (language === 'te' ? 'శాతం (%)' : 'Percentage (%)') 
                            : (language === 'te' ? 'స్థిర తగ్గింపు (₹)' : 'Fixed Flat (₹)')}
                        </td>
                        <td className="py-3.5 px-4 text-center font-black">{c.type === 'PERCENT' ? `${c.value}%` : `₹${c.value}`}</td>
                        <td className="py-3.5 px-4 text-right">₹{c.minOrderValue}</td>
                        <td className="py-3.5 px-4 text-right">{c.maxDiscount ? `₹${c.maxDiscount}` : (language === 'te' ? 'పరిమితి లేదు' : 'No Limit')}</td>
                        <td className="py-3.5 px-4 text-center text-gray-500">
                          {c.expiresAt 
                            ? new Date(c.expiresAt).toLocaleDateString(language === 'te' ? 'te-IN' : 'en-US') 
                            : (language === 'te' ? 'గడువు లేదు' : 'No Expiry')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                            c.isActive ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
                          }`}>
                            {c.isActive ? (language === 'te' ? 'యాక్టివ్' : 'Active') : (language === 'te' ? 'ఇన్‌యాక్టివ్' : 'Inactive')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-100"
                              title={language === 'te' ? 'సవరించు' : 'Edit'}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(c.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg border border-red-100"
                              title={language === 'te' ? 'తొలగించు' : 'Delete'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal */}
            {showModal && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="w-full max-w-md bg-white border border-amber-100 rounded-3xl p-6 space-y-4 smooth-shadow animate-fade-in-up">
                  <div className="flex justify-between items-center border-b border-amber-50 pb-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-amber-950 font-heading">
                      {editingCoupon ? t('admin_coupons_edit') : t('admin_coupons_add')}
                    </h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 block">{t('admin_coupons_form_code')}</label>
                      <input
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleInputChange}
                        placeholder="e.g. DEEPAM10"
                        className="w-full bg-amber-50/15 border border-amber-100 rounded-lg p-2.5 focus:outline-none uppercase font-black"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 block">{t('admin_coupons_form_type')}</label>
                        <CustomSelect
                          value={formData.type}
                          onChange={(val) => setFormData({ ...formData, type: val })}
                          options={[
                            { value: 'PERCENT', label: language === 'te' ? 'శాతం' : 'Percentage' },
                            { value: 'FIXED', label: language === 'te' ? 'స్థిర తగ్గింపు' : 'Fixed Amount' },
                          ]}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 block">{t('admin_coupons_form_value')}</label>
                        <input
                          type="number"
                          name="value"
                          value={formData.value}
                          onChange={handleInputChange}
                          placeholder="e.g. 10 or 50"
                          className="w-full bg-amber-50/15 border border-amber-100 rounded-lg p-2.5 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 block">{t('admin_coupons_form_min_order')}</label>
                        <input
                          type="number"
                          name="minOrderValue"
                          value={formData.minOrderValue}
                          onChange={handleInputChange}
                          placeholder="200"
                          className="w-full bg-amber-50/15 border border-amber-100 rounded-lg p-2.5 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 block">{t('admin_coupons_form_max_discount')}</label>
                        <input
                          type="number"
                          name="maxDiscount"
                          value={formData.maxDiscount}
                          onChange={handleInputChange}
                          placeholder="e.g. 100"
                          className="w-full bg-amber-50/15 border border-amber-100 rounded-lg p-2.5 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 block">{t('admin_coupons_form_expires')}</label>
                        <input
                          type="date"
                          name="expiresAt"
                          value={formData.expiresAt}
                          onChange={handleInputChange}
                          className="w-full bg-amber-50/15 border border-amber-100 rounded-lg p-2.5 focus:outline-none font-bold"
                        />
                      </div>

                      <div className="flex items-center space-x-2 pt-6">
                        <input
                          type="checkbox"
                          id="isActive"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleInputChange}
                          className="accent-amber-800"
                        />
                        <label htmlFor="isActive" className="text-[10px] font-bold text-amber-900 cursor-pointer select-none">
                          {t('admin_coupons_form_active')}
                        </label>
                      </div>
                    </div>

                    {formError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-650 font-bold flex items-center space-x-1">
                        <AlertCircle size={14} />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="flex space-x-3 pt-3">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-amber-800 text-white py-3 rounded-full font-bold shadow-sm cursor-pointer"
                      >
                        {saving ? t('admin_updating') : t('admin_coupons_form_save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 bg-white border border-amber-200 text-amber-950 py-3 rounded-full font-bold cursor-pointer"
                      >
                        {language === 'te' ? 'రద్దు చేయి' : 'Cancel'}
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}
