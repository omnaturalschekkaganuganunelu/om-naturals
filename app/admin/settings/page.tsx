'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminSidebar from '@/components/admin/AdminSidebar';
import {
  Settings, Truck, Package, Percent, CreditCard, Phone,
  Mail, Building2, Save, RefreshCw, CheckCircle, AlertCircle,
  BadgeIndianRupee, ShieldCheck, Wallet,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PremiumLoader from '@/components/PremiumLoader';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    codEnabled: true,
    freeShippingAbove: '500',
    shippingFee: '30',
    packingFee: '20',
    gstRate: '5',
    contactPhone: '',
    whatsappNumber: '',
    businessName: '',
    businessEmail: '',
  });

  // Auth guard
  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/admin/login');
    else if (authStatus === 'authenticated' && session?.user?.role !== 'ADMIN') router.push('/');
  }, [authStatus, session, router]);

  // Load current settings
  useEffect(() => {
    if (authStatus !== 'authenticated' || session?.user?.role !== 'ADMIN') return;
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setForm({
          codEnabled: data.codEnabled ?? true,
          freeShippingAbove: String(data.freeShippingAbove ?? 500),
          shippingFee: String(data.shippingFee ?? 30),
          packingFee: String(data.packingFee ?? 20),
          gstRate: String(data.gstRate ?? 5),
          contactPhone: data.contactPhone ?? '',
          whatsappNumber: data.whatsappNumber ?? '',
          businessName: data.businessName ?? '',
          businessEmail: data.businessEmail ?? '',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authStatus, session?.user?.role]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codEnabled: form.codEnabled,
          freeShippingAbove: parseFloat(form.freeShippingAbove),
          shippingFee: parseFloat(form.shippingFee),
          packingFee: parseFloat(form.packingFee),
          gstRate: parseFloat(form.gstRate),
          contactPhone: form.contactPhone,
          whatsappNumber: form.whatsappNumber,
          businessName: form.businessName,
          businessEmail: form.businessEmail,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(language === 'te' ? 'సెట్టింగ్‌లు విజయవంతంగా సేవ్ చేయబడ్డాయి!' : 'Settings saved successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || (language === 'te' ? 'సేవ్ చేయడంలో లోపం జరిగింది.' : 'Failed to save settings.'));
      }
    } catch {
      setErrorMsg(language === 'te' ? 'సర్వర్ కనెక్షన్ లోపం.' : 'Server connection error.');
    } finally {
      setSaving(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return <PremiumLoader fullScreen text={language === 'te' ? 'సెట్టింగ్‌లు లోడ్ అవుతున్నాయి...' : 'Loading settings...'} />;
  }

  const FieldGroup = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="bg-white border border-amber-100 rounded-3xl p-6 smooth-shadow space-y-5">
      <div className="flex items-center gap-2.5 pb-3 border-b border-amber-50">
        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
          <Icon size={15} className="text-amber-800" />
        </div>
        <h3 className="font-extrabold text-sm text-amber-950">{title}</h3>
      </div>
      {children}
    </div>
  );

  const InputField = ({
    label, name, value, type = 'text', prefix, suffix, hint,
  }: {
    label: string; name: string; value: string; type?: string;
    prefix?: React.ReactNode; suffix?: string; hint?: string;
  }) => (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-gray-500 block uppercase tracking-wide">{label}</label>
      <div className="flex items-center border border-amber-100 rounded-xl overflow-hidden bg-amber-50/20 focus-within:ring-2 focus-within:ring-amber-400 transition-all">
        {prefix && (
          <span className="px-3 py-2.5 bg-amber-50 text-amber-800 text-xs font-bold border-r border-amber-100 shrink-0">{prefix}</span>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={handleChange}
          className="flex-1 px-3 py-2.5 text-sm font-semibold text-gray-900 bg-transparent focus:outline-none"
          step={type === 'number' ? '0.01' : undefined}
          min={type === 'number' ? '0' : undefined}
        />
        {suffix && (
          <span className="px-3 py-2.5 bg-amber-50 text-amber-700 text-xs font-bold border-l border-amber-100 shrink-0">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-[10px] text-gray-400 font-medium">{hint}</p>}
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto sm:px-5 lg:px-8 py-2 sm:py-8 flex-1">
        <div className="flex flex-col lg:flex-row gap-0 sm:gap-8 items-start">
          <AdminSidebar />

          <div className="flex-1 min-w-0 px-2 sm:px-0 pt-2 sm:pt-0 space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-amber-950 flex items-center gap-2">
                  <Settings size={22} className="text-amber-700" />
                  {language === 'te' ? 'సైట్ సెట్టింగ్‌లు' : 'Site Settings'}
                </h1>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  {language === 'te'
                    ? 'షిప్పింగ్ రేట్లు, GST, COD మరియు వ్యాపార వివరాలను ఇక్కడ నిర్వహించండి.'
                    : 'Manage shipping rates, GST, COD availability, and business details here.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">

              {/* ── Pricing & Fees ── */}
              <FieldGroup title={language === 'te' ? 'ధరలు & రుసుములు' : 'Pricing & Fees'} icon={BadgeIndianRupee}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InputField
                    label={language === 'te' ? 'ఉచిత షిప్పింగ్ పై' : 'Free Shipping Above'}
                    name="freeShippingAbove"
                    value={form.freeShippingAbove}
                    type="number"
                    prefix="₹"
                    hint={language === 'te' ? 'ఈ మొత్తం కంటే ఎక్కువ ఆర్డర్‌లకు షిప్పింగ్ ఉచితం' : 'Orders above this amount get free shipping'}
                  />
                  <InputField
                    label={language === 'te' ? 'షిప్పింగ్ రుసుము' : 'Shipping Fee'}
                    name="shippingFee"
                    value={form.shippingFee}
                    type="number"
                    prefix="₹"
                    hint={language === 'te' ? 'ఉచిత షిప్పింగ్ థ్రెషోల్డ్ కంటే తక్కువ ఆర్డర్‌లకు' : 'Applied to orders below the free shipping threshold'}
                  />
                  <InputField
                    label={language === 'te' ? 'ప్యాకింగ్ చార్జీలు' : 'Packing Fee'}
                    name="packingFee"
                    value={form.packingFee}
                    type="number"
                    prefix="₹"
                    hint={language === 'te' ? 'అన్ని ఆర్డర్‌లకు వర్తిస్తుంది' : 'Applied to all orders'}
                  />
                  <InputField
                    label={language === 'te' ? 'GST రేటు' : 'GST Rate'}
                    name="gstRate"
                    value={form.gstRate}
                    type="number"
                    suffix="%"
                    hint={language === 'te' ? 'వస్తువులు & సేవల పన్ను శాతం' : 'Goods & Services Tax percentage'}
                  />
                </div>
              </FieldGroup>

              {/* ── Payment Settings ── */}
              <FieldGroup title={language === 'te' ? 'చెల్లింపు సెట్టింగ్‌లు' : 'Payment Settings'} icon={Wallet}>
                <div className="flex items-center justify-between p-4 bg-amber-50/40 border border-amber-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                      <Truck size={16} className="text-green-700" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">
                        {language === 'te' ? 'క్యాష్ ఆన్ డెలివరీ (COD)' : 'Cash on Delivery (COD)'}
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                        {language === 'te' ? 'COD చెల్లింపు పద్ధతిని ప్రారంభించండి లేదా నిలిపివేయండి' : 'Enable or disable COD payment method for customers'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      name="codEnabled"
                      checked={form.codEnabled}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-amber-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
              </FieldGroup>

              {/* ── Business Info ── */}
              <FieldGroup title={language === 'te' ? 'వ్యాపార వివరాలు' : 'Business Info'} icon={Building2}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <InputField
                      label={language === 'te' ? 'వ్యాపార పేరు' : 'Business Name'}
                      name="businessName"
                      value={form.businessName}
                    />
                  </div>
                  <InputField
                    label={language === 'te' ? 'సంప్రదింపు ఫోన్' : 'Contact Phone'}
                    name="contactPhone"
                    value={form.contactPhone}
                    prefix={<Phone size={12} />}
                  />
                  <InputField
                    label={language === 'te' ? 'వాట్సాప్ నంబర్' : 'WhatsApp Number'}
                    name="whatsappNumber"
                    value={form.whatsappNumber}
                    hint={language === 'te' ? 'సపోర్ట్ వాట్సాప్ నంబర్' : 'Support WhatsApp number shown to customers'}
                  />
                  <div className="sm:col-span-2">
                    <InputField
                      label={language === 'te' ? 'వ్యాపార ఇమెయిల్' : 'Business Email'}
                      name="businessEmail"
                      value={form.businessEmail}
                      type="email"
                    />
                  </div>
                </div>
              </FieldGroup>

              {/* ── Success / Error Feedback ── */}
              {successMsg && (
                <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm font-bold text-emerald-700">
                  <CheckCircle size={16} className="shrink-0" />
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm font-bold text-red-600">
                  <AlertCircle size={16} className="shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* ── Save Button ── */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2.5 bg-amber-800 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-extrabold px-8 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all text-sm"
                >
                  {saving
                    ? <><RefreshCw size={15} className="animate-spin" /> {language === 'te' ? 'సేవ్ అవుతోంది...' : 'Saving...'}</>
                    : <><Save size={15} /> {language === 'te' ? 'సెట్టింగ్‌లు సేవ్ చేయి' : 'Save Settings'}</>
                  }
                </button>
              </div>

            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
