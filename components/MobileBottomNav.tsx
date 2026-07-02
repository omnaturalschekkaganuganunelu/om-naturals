'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Droplet, ClipboardList, User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide bottom navigation on all admin routes to prevent layout overlap
  if (pathname.startsWith('/admin')) {
    return null;
  }

  // Determine active states
  const isHome = pathname === '/';
  const isOils = pathname === '/products';
  const isOrders = pathname === '/account' && searchParams.get('tab') === 'orders';
  const isAccount = (pathname === '/account' && searchParams.get('tab') !== 'orders') || pathname === '/login';

  const items = [
    {
      label: t('nav_home_mobile'),
      href: '/',
      active: isHome,
      icon: <Home size={20} className={isHome ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />,
    },
    {
      label: t('nav_oils_mobile'),
      href: '/products',
      active: isOils,
      icon: <Droplet size={20} className={isOils ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />,
    },
    {
      label: t('nav_track_mobile'),
      href: '/account?tab=orders',
      active: isOrders,
      icon: <ClipboardList size={20} className={isOrders ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />,
    },
    {
      label: t('nav_account_mobile'),
      href: '/account',
      active: isAccount,
      icon: <User size={20} className={isAccount ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-amber-100 flex items-center justify-around py-2.5 pb-safe smooth-shadow">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center justify-center flex-1 text-[10px] font-bold transition-all duration-200 ${
            item.active ? 'text-amber-800 scale-105' : 'text-amber-900/60 hover:text-amber-800'
          }`}
        >
          <div className={`mb-1 p-1 rounded-xl transition-all duration-200 ${item.active ? 'bg-amber-50 text-amber-800' : ''}`}>
            {item.icon}
          </div>
          <span className="truncate max-w-[70px] tracking-tight">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}
