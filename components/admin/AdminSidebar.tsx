'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard, ShoppingCart, FolderHeart, ShieldAlert,
  Award, LogOut, ArrowLeft, Bell, Menu, X, Settings,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import ConfirmModal from '@/components/ConfirmModal';

const NAV_LINKS = (t: Function, language: string) => [
  { href: '/admin/dashboard',     icon: LayoutDashboard, label: t('admin_sidebar_dashboard') },
  { href: '/admin/products',      icon: ShoppingCart,    label: t('admin_sidebar_products') },
  { href: '/admin/categories',    icon: FolderHeart,     label: t('admin_sidebar_categories') },
  { href: '/admin/orders',        icon: ShieldAlert,     label: t('admin_sidebar_orders') },
  { href: '/admin/coupons',       icon: Award,           label: t('admin_sidebar_coupons') },
  { href: '/admin/notifications', icon: Bell,            label: language === 'te' ? 'నోటిఫికేషన్లు' : 'Notifications' },
  { href: '/admin/settings',      icon: Settings,        label: language === 'te' ? 'సెట్టింగ్‌లు' : 'Settings' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t, language } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Lock body scroll when drawer open on mobile
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const linkClass = (path: string) => {
    const base = 'flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-bold transition-all ';
    return pathname === path
      ? base + 'bg-amber-800 text-white shadow-sm'
      : base + 'text-amber-900 hover:bg-amber-100/60';
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* User Header */}
      <div className="flex items-center gap-3 p-5 border-b border-amber-100">
        <div className="w-10 h-10 rounded-xl bg-amber-800 flex items-center justify-center text-white font-black text-sm shrink-0">
          AD
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-amber-950 text-xs truncate">{session?.user?.name || 'Admin'}</p>
          <span className="inline-block px-2 py-0.5 bg-amber-100 border border-amber-200 text-amber-900 text-[9px] font-black rounded-md uppercase mt-0.5">
            {t('admin_sidebar_mode')}
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_LINKS(t, language).map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={linkClass(href)} onClick={() => setDrawerOpen(false)}>
            <Icon size={16} className="shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-amber-100 space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs text-amber-950 font-bold hover:bg-amber-50"
          onClick={() => setDrawerOpen(false)}
        >
          <ArrowLeft size={16} className="shrink-0" />
          <span>{t('admin_sidebar_exit')}</span>
        </Link>
        <button
          onClick={() => {
            setDrawerOpen(false);
            setLogoutModalOpen(true);
          }}
          className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs text-red-600 font-bold hover:bg-red-50 text-left"
        >
          <LogOut size={16} className="shrink-0" />
          <span>{t('admin_sidebar_logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── MOBILE: Hamburger trigger bar — full-width edge-to-edge ── */}
      <div className="lg:hidden w-full bg-white border-b border-amber-100 px-4 py-3 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-800 flex items-center justify-center text-white font-black text-xs shrink-0">
            AD
          </div>
          <div>
            <p className="font-extrabold text-amber-950 text-xs">{session?.user?.name || 'Admin'}</p>
            <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-900 text-[8px] font-black rounded uppercase">
              {t('admin_sidebar_mode')}
            </span>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-xl transition-all"
          aria-label="Open Admin Menu"
        >
          <Menu size={18} className="text-amber-800" />
        </button>
      </div>

      {/* ── MOBILE: Drawer Overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          {/* Drawer panel */}
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-xl z-10"
            >
              <X size={16} className="text-amber-800" />
            </button>
            <NavContent />
          </div>
        </div>
      )}

      {/* ── DESKTOP: Static sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border border-amber-100 rounded-3xl smooth-shadow sticky top-24 max-h-[calc(100vh-7rem)] overflow-hidden">
        <NavContent />
      </aside>

      <ConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={() => signOut({ callbackUrl: '/' })}
        title={language === 'te' ? 'లాగ్ అవుట్ చేయాలా?' : 'Logout?'}
        message={language === 'te' ? 'మీరు లాగ్ అవుట్ అవుతున్నారు. మీరు ఖచ్చితంగా కొనసాగించాలనుకుంటున్నారా?' : 'You are about to sign out of your account. Are you sure you want to continue?'}
        confirmText={language === 'te' ? 'లాగ్ అవుట్' : 'Logout'}
        cancelText={language === 'te' ? 'రద్దు చేయి' : 'Cancel'}
        isDestructive
      />
    </>
  );
}
