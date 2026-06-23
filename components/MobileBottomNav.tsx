'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Droplet, ShoppingCart, User } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useLanguage } from '@/context/LanguageContext';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const cartItemsCount = useCartStore((state) => state.getCartCount());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isHome    = pathname === '/';
  const isOils    = pathname === '/products';
  const isCart    = pathname === '/cart';
  const isAccount = pathname === '/account' || pathname === '/login';

  const items = [
    {
      label: 'Home',
      href: '/',
      active: isHome,
      icon: <Home size={22} strokeWidth={isHome ? 2.5 : 1.8} />,
    },
    {
      label: 'Oils',
      href: '/products',
      active: isOils,
      icon: <Droplet size={22} strokeWidth={isOils ? 2.5 : 1.8} />,
    },
    {
      label: 'Cart',
      href: '/cart',
      active: isCart,
      icon: (
        <div className="relative">
          <ShoppingCart size={22} strokeWidth={isCart ? 2.5 : 1.8} />
          {mounted && cartItemsCount > 0 && (
            <span className="absolute -top-2.5 -right-2.5 bg-gradient-to-br from-amber-500 to-amber-700 text-white text-[9px] font-black w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {cartItemsCount > 9 ? '9+' : cartItemsCount}
            </span>
          )}
        </div>
      ),
    },
    {
      label: 'Account',
      href: '/account',
      active: isAccount,
      icon: <User size={22} strokeWidth={isAccount ? 2.5 : 1.8} />,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="bg-white/98 backdrop-blur-xl border-t border-amber-100/80 shadow-[0_-4px_24px_rgba(161,98,7,0.08)]">
        <div className="flex items-center justify-around px-1 py-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 py-1.5 min-w-0 group"
            >
              <div className={`relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 ${
                item.active
                  ? 'bg-amber-800 text-white shadow-md shadow-amber-500/30 scale-105'
                  : 'text-gray-400 group-hover:text-amber-700 group-hover:bg-amber-50'
              }`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-bold mt-0.5 truncate tracking-tight transition-colors ${
                item.active ? 'text-amber-800' : 'text-gray-400 group-hover:text-amber-700'
              }`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
