'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Bell, Send, Tag, Info, Package, Trash2, Users, User, Sparkles, Clock } from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  userId: string | null;
  createdAt: string;
}

const TYPE_OPTS = [
  { value: 'INFO',  label: 'ℹ️ Info / Announcement', color: 'text-gray-600',  bg: 'bg-gray-50' },
  { value: 'OFFER', label: '🏷️ Offer / Discount',   color: 'text-amber-600', bg: 'bg-amber-50' },
  { value: 'ORDER', label: '📦 Order Update',         color: 'text-blue-600',  bg: 'bg-blue-50' },
];

function parseUTCDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.endsWith('Z') || dateStr.includes('+') || /-\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  const normalized = dateStr.trim().replace(' ', 'T');
  if (!normalized.includes('T')) {
    return new Date(dateStr);
  }
  return new Date(normalized + 'Z');
}

function timeAgo(date: string) {
  const diff = Date.now() - parseUTCDate(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminNotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  interface UserOption {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
  }

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'INFO',
    userId: '',   // empty = broadcast
  });

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [status, session, router]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {}
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and message are required.');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          type: form.type,
          userId: form.userId.trim() || null,
        }),
      });

      if (res.ok) {
        setSuccess('Notification sent successfully!');
        setForm({ title: '', body: '', type: 'INFO', userId: '' });
        fetchNotifications();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to send notification.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (status === 'loading') return <PremiumLoader />;

  return (
    <>
            <main className="max-w-7xl mx-auto sm:px-5 lg:px-8 py-2 sm:py-8 flex-1 overflow-x-hidden">
        <div className="flex flex-col lg:flex-row gap-0 sm:gap-8 items-start">
          <AdminSidebar />

          <section className="flex-1 w-full min-w-0 px-2 sm:px-0 pt-2 sm:pt-0 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                <Bell size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-amber-950 font-heading">Notification Center</h1>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">Broadcast announcements & offers to users</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Compose Form */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-3xl border border-amber-100 shadow-sm relative">
                  <div className="bg-gradient-to-r from-amber-800 to-amber-900 px-5 py-4 flex items-center gap-2 rounded-t-3xl">
                    <Sparkles size={16} className="text-amber-300" />
                    <h2 className="font-black text-white text-sm">Create Notification</h2>
                  </div>

                  <form onSubmit={handleSend} className="p-5 space-y-4">

                    {/* Type Selector */}
                    <div>
                      <label className="text-[10px] font-black text-amber-900 uppercase tracking-wider block mb-2">Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {TYPE_OPTS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                            className={`p-2.5 rounded-xl border text-center transition-all text-[10px] font-bold ${
                              form.type === opt.value
                                ? 'border-amber-500 bg-amber-50 text-amber-900'
                                : 'border-gray-100 hover:border-amber-200 text-gray-500'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="text-[10px] font-black text-amber-900 uppercase tracking-wider block mb-1.5">Title</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="e.g. 🎉 Diwali Sale — 20% off all oils!"
                        className="w-full bg-amber-50/30 border border-amber-100 rounded-xl px-3 py-2.5 text-sm font-semibold text-amber-950 focus:outline-none focus:border-amber-500 transition-colors"
                        maxLength={100}
                      />
                    </div>

                    {/* Body */}
                    <div>
                      <label className="text-[10px] font-black text-amber-900 uppercase tracking-wider block mb-1.5">Message</label>
                      <textarea
                        value={form.body}
                        onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                        placeholder="Write your notification message here..."
                        rows={4}
                        className="w-full bg-amber-50/30 border border-amber-100 rounded-xl px-3 py-2.5 text-sm font-medium text-amber-950 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                        maxLength={500}
                      />
                      <p className="text-[10px] text-gray-300 text-right mt-0.5">{form.body.length}/500</p>
                    </div>

                    {/* Target User ID (Searchable Dropdown) */}
                    <div>
                      <label className="text-[10px] font-black text-amber-900 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                        <Users size={11} /> Target User
                        <span className="font-normal text-gray-400 normal-case">(select a user or search by name/email/phone)</span>
                      </label>
                      
                      {form.userId ? (
                        (() => {
                          const selectedUser = users.find(u => u.id === form.userId);
                          return (
                            <div className="flex items-center justify-between w-full bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-950">
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold truncate">{selectedUser ? selectedUser.name : 'Unknown User'}</span>
                                <span className="text-[10px] text-amber-800/70 truncate">{selectedUser?.email}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, userId: '' }))}
                                className="p-1.5 hover:bg-amber-100/85 rounded-lg text-amber-900 transition-colors shrink-0"
                                title="Clear selection"
                              >
                                <Trash2 size={13} className="text-red-600" />
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            value={userSearch}
                            onFocus={() => setDropdownOpen(true)}
                            onChange={e => {
                              setUserSearch(e.target.value);
                              setDropdownOpen(true);
                            }}
                            placeholder="Type to search and select user... (Broadcast to all if empty)"
                            className="w-full bg-amber-50/30 border border-amber-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-amber-950 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                          {dropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-amber-100 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-50 no-scrollbar">
                                {(() => {
                                  const filtered = users.filter(u =>
                                    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                                    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                                    (u.phone && u.phone.includes(userSearch))
                                  );
                                  if (filtered.length === 0) {
                                    return <div className="p-3 text-center text-xs text-gray-400">No users found</div>;
                                  }
                                  return filtered.map(u => (
                                    <button
                                      type="button"
                                      key={u.id}
                                      onClick={() => {
                                        setForm(f => ({ ...f, userId: u.id }));
                                        setUserSearch('');
                                        setDropdownOpen(false);
                                      }}
                                      className="w-full text-left p-2.5 hover:bg-amber-50/60 transition-colors text-xs flex flex-col gap-0.5"
                                    >
                                      <span className="font-bold text-amber-950">{u.name} {u.role === 'ADMIN' ? '★' : ''}</span>
                                      <span className="text-[10px] text-gray-500">{u.email} {u.phone ? `| ${u.phone}` : ''}</span>
                                    </button>
                                  ));
                                })()}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Target indicator */}
                    <div className={`flex items-center gap-2 p-2.5 rounded-xl text-[11px] font-semibold ${form.userId ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'}`}>
                      {form.userId ? <User size={13} /> : <Users size={13} />}
                      {form.userId ? 'Will be sent to specific user only' : 'Will be broadcast to ALL users'}
                    </div>

                    {error && <p className="text-xs text-red-600 font-bold bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                    {success && <p className="text-xs text-green-700 font-bold bg-green-50 rounded-xl px-3 py-2">✅ {success}</p>}

                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-700 to-amber-900 text-white font-black text-sm rounded-2xl shadow-md hover:shadow-amber-500/30 hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
                    >
                      {sending ? (
                        <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
                      ) : (
                        <><Send size={15} /> Send Notification</>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Notification History */}
              <div className="lg:col-span-7">
                <div className="bg-white rounded-3xl border border-amber-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-amber-50 flex items-center justify-between">
                    <h2 className="font-black text-amber-950 text-sm flex items-center gap-2">
                      <Clock size={15} className="text-amber-600" /> Recent Notifications
                    </h2>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{notifications.length} total</span>
                  </div>

                  {loading ? (
                    <div className="py-12 flex justify-center">
                      <div className="w-8 h-8 border-4 border-amber-100 border-t-amber-600 rounded-full animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-sm">No notifications yet. Create one above!</div>
                  ) : (
                    <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                      {notifications.map((notif) => {
                        const typeOpt = TYPE_OPTS.find(t => t.value === notif.type) || TYPE_OPTS[0];
                        return (
                          <div key={notif.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${typeOpt.bg} ${typeOpt.color}`}>
                                    {typeOpt.label}
                                  </span>
                                  {notif.userId ? (
                                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                      <User size={9} /> Targeted
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                      <Users size={9} /> Broadcast
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-black text-amber-950">{notif.title}</p>
                                <p className="text-xs text-gray-500 font-medium mt-0.5 line-clamp-2">{notif.body}</p>
                              </div>
                              <span className="text-[10px] text-gray-300 font-semibold shrink-0">{timeAgo(notif.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </section>
        </div>
      </main>
          </>
  );
}
