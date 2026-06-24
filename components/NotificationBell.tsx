'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellRing, X, Package, Tag, Info, CheckCheck, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRealtime } from '@/hooks/useRealtime';
import { useNotificationStore, Notification } from '@/store/notificationStore';

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; dot: string }> = {
  ORDER: { icon: Package, color: 'text-blue-600',  bg: 'bg-blue-50',   dot: 'bg-blue-500' },
  OFFER: { icon: Tag,     color: 'text-amber-600', bg: 'bg-amber-50',  dot: 'bg-amber-500' },
  INFO:  { icon: Info,    color: 'text-gray-500',  bg: 'bg-gray-50',   dot: 'bg-gray-400' },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Synthesize a pleasant chime sound (No external assets required)
const playChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Tone 1
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);

    // Tone 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1); // C#6
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.1);
    gain2.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (err) {
    console.error('Audio play failed', err);
  }
};

export default function NotificationBell() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [animateBell, setAnimateBell] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevUnread = useRef(0);

  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAllRead,
    markRead,
    addRealtimeNotification,
  } = useNotificationStore();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotifications(status);
    }
  }, [status, fetchNotifications]);

  // Handle bell animation & chime when count increases
  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setAnimateBell(true);
      playChime();
      const timer = setTimeout(() => setAnimateBell(false), 2000);
      prevUnread.current = unreadCount;
      return () => clearTimeout(timer);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  // Listen for realtime notifications
  useRealtime('Notification', 'INSERT', (payload) => {
    if (payload.new) {
      addRealtimeNotification(payload.new as any);
    }
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    setOpen((prev) => !prev);
    if (!open && unreadCount > 0) {
      markAllRead();
    }
  };

  if (status !== 'authenticated') return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className={`relative p-2 rounded-full transition-all duration-200 ${
          open ? 'bg-amber-100 text-amber-800' : 'text-amber-800 hover:bg-amber-50/60'
        }`}
      >
        {animateBell ? (
          <BellRing size={20} className="animate-bounce text-amber-700" />
        ) : (
          <Bell size={20} />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-br from-red-500 to-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm px-1 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="fixed inset-x-4 top-16 md:absolute md:top-auto md:left-auto md:right-0 md:inset-x-auto md:mt-2 md:w-96 bg-white rounded-2xl shadow-2xl border border-amber-100/60 z-[200] overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-800 to-amber-900">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-300" />
              <span className="text-sm font-black text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-amber-400 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-amber-700/50 rounded-full transition-colors">
              <X size={14} className="text-amber-200" />
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center px-4">
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
                  <Bell size={20} className="text-amber-300" />
                </div>
                <p className="text-xs font-bold text-gray-400">No notifications yet</p>
                <p className="text-[10px] text-gray-300">Order updates and offers will appear here</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.INFO;
                const IconComp = cfg.icon;
                
                let linkHref = '#';
                if (notif.type === 'ORDER') {
                  linkHref = session?.user?.role === 'ADMIN' ? '/admin/orders' : '/account?tab=orders';
                } else if (notif.type === 'INFO') {
                  linkHref = session?.user?.role === 'ADMIN' ? '/admin/products' : '/products';
                } else if (notif.type === 'OFFER') {
                  linkHref = '/products';
                }

                return (
                  <Link
                    href={linkHref}
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) markRead(notif.id);
                      setOpen(false);
                    }}
                    className={`flex gap-3 px-4 py-3.5 border-b border-gray-50 cursor-pointer transition-all duration-200 ${
                      notif.isRead
                        ? 'bg-white hover:bg-gray-50/50'
                        : 'bg-amber-50/30 hover:bg-amber-50/60'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                      <IconComp size={14} className={cfg.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-black leading-tight ${notif.isRead ? 'text-gray-700' : 'text-amber-950'}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className={`shrink-0 w-2 h-2 rounded-full mt-1 ${cfg.dot}`} />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5 leading-snug line-clamp-2">
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-gray-300 font-semibold mt-1">
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[10px] text-gray-400 font-semibold">Last 30 notifications</p>
              <button
                onClick={async () => {
                  await markAllRead();
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 transition-colors"
              >
                <CheckCheck size={11} />
                Mark all read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
