'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import {
  Users, Search, X, MapPin, Calendar, Mail,
  Phone, KeyRound, ChevronRight, RefreshCw
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PremiumLoader from '@/components/PremiumLoader';

import { useToastStore } from '@/store/toastStore';

export default function AdminCustomersPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { t, language } = useLanguage();
  const showToast = useToastStore((s) => s.showToast);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/admin/login');
    else if (authStatus === 'authenticated' && session?.user?.role !== 'ADMIN') router.push('/');
  }, [authStatus, session, router]);

  const loadUsers = () => {
    setLoading(true);
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user?.role === 'ADMIN') {
      loadUsers();
    }
  }, [authStatus, session?.user?.role]);

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordError(language === 'te' ? 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.' : 'Password must be at least 6 characters.');
      return;
    }
    setPasswordError('');
    setUpdatingPassword(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(language === 'te' ? 'పాస్‌వర్డ్ విజయవంతంగా మార్చబడింది!' : 'Password updated successfully!', 'success');
        const newHash = data.newHash;
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === selectedUser.id ? { ...u, password: newHash } : u))
        );
        setSelectedUser((prev: any) => (prev ? { ...prev, password: newHash } : null));
        setNewPassword('');
        setShowResetForm(false);
      } else {
        setPasswordError(data.error || 'Failed to update password');
      }
    } catch (e) {
      setPasswordError('Server connection error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q))
    );
  });

  const totalCustomers = users.filter((u) => u.role === 'CUSTOMER').length;
  const totalAdmins = users.filter((u) => u.role === 'ADMIN').length;

  if (authStatus === 'loading' || loading) {
    return <PremiumLoader fullScreen={true} text={language === 'te' ? 'వినియోగదారుల డేటా లోడ్ అవుతోంది...' : 'Loading User Profiles...'} />;
  }

  return (
    <>
      <main className="max-w-7xl mx-auto sm:px-5 lg:px-8 py-2 sm:py-8 flex-1">
        <div className="flex flex-col lg:flex-row gap-0 sm:gap-8 items-start">
          <AdminSidebar />

          <section className="flex-1 w-full min-w-0 px-2 sm:px-0 pt-2 sm:pt-0 space-y-5">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-amber-950 flex items-center gap-2">
                  <Users size={22} className="text-amber-700" />
                  {language === 'te' ? 'వినియోగదారుల నిర్వహణ' : 'Customer Directory'}
                </h1>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  {language === 'te' ? 'వినియోగదారుల ప్రొఫైల్‌లు, భద్రత మరియు సేవ్ చేసిన చిరునామాలను పర్యవేక్షించండి' : 'Monitor customer profiles, accounts, and registered shipping addresses'}
                </p>
              </div>
              <button
                onClick={loadUsers}
                className="inline-flex items-center gap-2 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 border border-amber-100 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all shrink-0"
              >
                <RefreshCw size={14} />
                {language === 'te' ? 'తాజాకరించు' : 'Refresh'}
              </button>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: language === 'te' ? 'మొత్తం వినియోగదారులు' : 'Total Customers', value: totalCustomers, color: 'bg-amber-50 border-amber-100 text-amber-900' },
                { label: language === 'te' ? 'అడ్మిన్లు' : 'Administrators', value: totalAdmins, color: 'bg-emerald-50 border-emerald-100 text-emerald-800' },
                { label: language === 'te' ? 'మొత్తం ఖాతాలు' : 'Total Accounts', value: users.length, color: 'bg-stone-50 border-stone-100 text-stone-800' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`${color} border rounded-2xl p-3 sm:p-4 text-center`}>
                  <p className="text-lg sm:text-2xl font-black">{value}</p>
                  <p className="text-[9px] font-extrabold uppercase tracking-wider mt-1 opacity-70 leading-none">{label}</p>
                </div>
              ))}
            </div>

            {/* ── Search Bar ── */}
            <div className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={language === 'te' ? 'పేరు, ఇమెయిల్ లేదా ఫోన్ నంబర్ ద్వారా వెతకండి...' : 'Search by name, email, or phone number...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-amber-100 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all shadow-sm placeholder:font-normal"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* ── Desktop Customer Table ── */}
            <div className="hidden md:block bg-white border border-amber-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gradient-to-r from-amber-50 to-amber-100/40 border-b border-amber-100">
                    <tr>
                      <th className="py-4 px-5 text-[10px] font-black text-amber-800 uppercase tracking-wider">Customer Info</th>
                      <th className="py-4 px-4 text-[10px] font-black text-amber-800 uppercase tracking-wider">Contact Details</th>
                      <th className="py-4 px-4 text-[10px] font-black text-amber-800 uppercase tracking-wider text-center">Saved Addresses</th>
                      <th className="py-4 px-4 text-[10px] font-black text-amber-800 uppercase tracking-wider text-center">Account Role</th>
                      <th className="py-4 px-4 text-[10px] font-black text-amber-800 uppercase tracking-wider text-center">Joined Date</th>
                      <th className="py-4 px-5 text-[10px] font-black text-amber-800 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50/50">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 font-semibold">
                          {language === 'te' ? 'ఎటువంటి వినియోగదారులు కనుగొనబడలేదు.' : 'No users found matching your search.'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-amber-50/20 transition-all">
                          <td className="py-4 px-5 font-bold text-amber-950 text-xs">{u.name}</td>
                          <td className="py-4 px-4">
                            <p className="font-semibold text-gray-600">{u.email}</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">{u.phone || 'No phone number'}</p>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="inline-block bg-amber-50 border border-amber-100 text-amber-900 font-extrabold text-[10px] px-2.5 py-1 rounded-lg">
                              {u.addresses?.length || 0}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block font-black text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wider border ${
                              u.role === 'ADMIN' 
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                                : 'bg-amber-50 border-amber-100 text-amber-950'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center text-[10px] text-gray-500 font-semibold">
                            {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                              }}
                              className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 text-amber-900 font-extrabold text-[10px] px-3.5 py-1.5 rounded-xl transition-all"
                            >
                              <span>View Profile</span>
                              <ChevronRight size={10} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Mobile Layout ── */}
            <div className="md:hidden space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="bg-white border border-amber-100 rounded-2xl p-6 text-center text-gray-400 font-semibold">
                  {language === 'te' ? 'ఎటువంటి వినియోగదారులు కనుగొనబడలేదు.' : 'No users found matching your search.'}
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div key={u.id} className="bg-white border border-amber-100/70 rounded-2xl p-4 smooth-shadow flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-extrabold text-amber-950 text-sm">{u.name}</p>
                        <p className="text-xs font-semibold text-gray-500 mt-0.5">{u.email}</p>
                      </div>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                        u.role === 'ADMIN' 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                          : 'bg-amber-50 border-amber-100 text-amber-950'
                      }`}>
                        {u.role}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 pt-2 border-t border-amber-50">
                      <span>Addresses: {u.addresses?.length || 0}</span>
                      <span>Joined: {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedUser(u);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-100 font-extrabold text-xs py-2.5 rounded-xl transition-all"
                    >
                      <span>View Profile & Saved Addresses</span>
                      <ChevronRight size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ── Customer Details Modal ── */}
      {selectedUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pt-20 pb-10 sm:pt-4 sm:pb-4">
          <div 
            className="bg-white border border-amber-100 w-full max-w-2xl rounded-3xl smooth-shadow max-h-[90vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-amber-100 bg-amber-50/30 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-amber-800" />
                <h2 className="font-extrabold text-amber-950 text-base">Customer Account Profile</h2>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-1.5 hover:bg-amber-100 border border-amber-100 rounded-xl transition-all"
              >
                <X size={16} className="text-amber-800" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1">
              
              {/* Profile Overview Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-50/20 border border-amber-100/50 rounded-2xl p-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Full Name</span>
                  <p className="font-extrabold text-sm text-amber-950">{selectedUser.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Email Address</span>
                  <p className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                    <Mail size={12} className="text-gray-400" />
                    {selectedUser.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Phone Number</span>
                  <p className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                    <Phone size={12} className="text-gray-400" />
                    {selectedUser.phone || 'Not provided'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Date Registered</span>
                  <p className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-400" />
                    {new Date(selectedUser.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                  </p>
                </div>
              </div>

              {/* Password Settings Section */}
              <div className="bg-amber-50/50 border border-amber-100/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-800 flex items-center gap-1.5">
                    <KeyRound size={12} />
                    <span>Account Password Security</span>
                  </span>
                </div>

                {/* Password reset widget */}
                <div className="pt-1 flex flex-col gap-2">
                  {!showResetForm ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetForm(true);
                        setPasswordError('');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 bg-amber-800 hover:bg-amber-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      <KeyRound size={14} />
                      <span>Change Customer Password</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-amber-950">Set New Password:</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Enter new password in plain text"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="flex-1 bg-white border border-amber-200 rounded-xl py-2 px-3 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleUpdatePassword}
                            disabled={updatingPassword}
                            className="bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm disabled:opacity-50 shrink-0"
                          >
                            {updatingPassword ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowResetForm(false);
                              setNewPassword('');
                              setPasswordError('');
                            }}
                            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs px-4 py-2 rounded-xl shrink-0"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      {passwordError && (
                        <p className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                          ⚠️ {passwordError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Address Book Book Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                  <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                    <MapPin size={14} className="text-amber-800" />
                    <span>Registered Shipping Address Book</span>
                  </span>
                  <span className="text-[10px] font-black text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg">
                    {selectedUser.addresses?.length || 0} Total
                  </span>
                </div>

                {(!selectedUser.addresses || selectedUser.addresses.length === 0) ? (
                  <div className="text-center py-6 border border-dashed border-amber-100 bg-amber-50/10 rounded-2xl text-gray-400 font-semibold text-xs">
                    No shipping addresses registered for this customer.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedUser.addresses.map((addr: any) => (
                      <div 
                        key={addr.id} 
                        className={`border rounded-2xl p-4 bg-white space-y-1 relative overflow-hidden group shadow-sm ${
                          addr.isDefault ? 'border-amber-300 ring-2 ring-amber-100/50' : 'border-amber-100/60'
                        }`}
                      >
                        {addr.isDefault && (
                          <span className="absolute top-3.5 right-3.5 text-[8px] font-black bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
                            Default
                          </span>
                        )}
                        <p className="font-extrabold text-xs text-amber-950">{addr.name}</p>
                        <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <Phone size={10} />
                          <span>{addr.phone}</span>
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed pt-1">
                          {addr.line1}
                          {addr.line2 ? `, ${addr.line2}` : ''}
                          <br />
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>

                        {(addr.latitude !== null && addr.longitude !== null) && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${addr.latitude},${addr.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pt-2 mt-1 border-t border-amber-50 flex items-center gap-1.5 text-[9px] font-extrabold text-amber-800 hover:text-amber-600 hover:underline transition-all"
                          >
                            <MapPin size={10} className="shrink-0" />
                            <span>View on Google Maps</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-amber-100 bg-amber-50/10 text-right sticky bottom-0 bg-white">
              <button
                onClick={() => setSelectedUser(null)}
                className="bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm hover:shadow active:scale-95 transition-all"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
