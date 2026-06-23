'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ShoppingCart, User, Menu, X, Search, MapPin, Phone, MessageCircle, Globe, Loader2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useLanguage } from '@/context/LanguageContext';

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [animateCart, setAnimateCart] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cartItemsCount = useCartStore((state) => state.getCartCount());

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (cartItemsCount > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 500);
      return () => clearTimeout(timer);
    }
  }, [cartItemsCount]);

  // Reset loader when path changes
  useEffect(() => {
    setIsSearching(false);
  }, [pathname, searchParams]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearching(true);
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
      setShowMobileSearch(false);
    }
  };

  const isActive = (path: string) => pathname === path;

  const navLinkClass = (path: string) =>
    `relative px-3 py-2 text-sm font-bold transition-all duration-300 after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:rounded-full after:transition-transform after:duration-300 ${
      isActive(path)
        ? 'text-amber-800 after:bg-amber-600 after:scale-x-100 font-extrabold'
        : 'text-amber-950/80 after:bg-amber-400 after:scale-x-0 hover:text-amber-800 hover:after:scale-x-100'
    }`;

  return (
    <header className="sticky top-0 z-50 w-full transition-all duration-300">
      {/* Main Header */}
      <div className={`w-full bg-white/95 backdrop-blur-md border-b smooth-shadow transition-all duration-300 ${
        scrolled 
          ? 'h-14 border-amber-100/40 shadow-md' 
          : 'h-16 border-amber-100/80'
      }`}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 h-full flex items-center gap-3 sm:gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group py-1">
              {/* Circular Logo with a premium gradient border and glow effect */}
              <div className={`relative rounded-full p-[2px] bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-700 shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(217,119,6,0.3)] ${
                scrolled ? 'w-9 h-9' : 'w-11 h-11 sm:w-12 sm:h-12'
              }`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-white relative">
                  <Image
                    src="/images/logo.jpg"
                    alt="OM Natural Logo"
                    fill
                    sizes="(max-width: 640px) 40px, 48px"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    priority
                  />
                </div>
              </div>
              
              {/* Brand Name styled in harmony with the logo colors */}
              <div className="flex flex-col">
                <span className={`font-black tracking-tight text-amber-900 leading-none font-heading transition-all duration-300 group-hover:text-amber-700 ${
                  scrolled ? 'text-xs sm:text-sm' : 'text-sm sm:text-base lg:text-lg'
                }`}>
                  {language === 'te' ? 'ఓం సహజ' : 'OM Natural'}
                </span>
                <span className={`font-extrabold tracking-[0.12em] text-amber-700 leading-none uppercase transition-all duration-300 group-hover:text-amber-600 ${
                  scrolled ? 'text-[7px] sm:text-[8px] mt-0.5' : 'text-[8px] sm:text-[9px] mt-1'
                }`}>
                  {language === 'te' ? 'చెక్క గానుగ' : 'Chekka Ganuga'}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Search — takes all available middle space */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-sm lg:max-w-md mx-auto relative group">
            <input
              type="text"
              placeholder={t('nav_search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-amber-50/40 text-amber-950 border border-amber-200/80 rounded-full py-2 pl-4 pr-11 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/10 focus:border-amber-600 transition-all duration-300 placeholder:text-amber-700/45"
            />
            <button
              type="submit"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-700 hover:text-amber-800 transition-colors duration-200"
              disabled={isSearching}
            >
              {isSearching ? <Loader2 size={17} className="animate-spin text-amber-700" /> : <Search size={17} />}
            </button>
          </form>

          {/* Spacer for mobile — pushes actions to the right */}
          <div className="flex-1 md:hidden" />

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-2 lg:gap-3.5 flex-shrink-0">
            <Link href="/" className={navLinkClass('/')}>{t('nav_home')}</Link>
            <Link href="/products" className={navLinkClass('/products')}>{t('nav_oils')}</Link>
            <Link href="/account?tab=orders" className={navLinkClass('/account?tab=orders')}>{t('nav_track')}</Link>
          </nav>

          {/* Actions — flex-shrink-0 so they never get squeezed */}
          <div className="flex items-center gap-2.5 lg:gap-3.5 flex-shrink-0">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => {
                setShowMobileSearch(!showMobileSearch);
                setMobileMenuOpen(false);
              }}
              className="p-2 text-amber-800 hover:text-amber-600 md:hidden rounded-full hover:bg-amber-50/50 transition-colors focus:outline-none"
              aria-label="Toggle Search"
            >
              <Search size={20} />
            </button>

            {/* Language Switcher */}
            <div className="hidden md:flex items-center bg-amber-50/80 border border-amber-200 rounded-full overflow-hidden p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full transition-all duration-200 ${
                  language === 'en' ? 'bg-amber-800 text-white shadow-sm' : 'text-amber-800 hover:bg-amber-100/50'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('te')}
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full transition-all duration-200 ${
                  language === 'te' ? 'bg-amber-800 text-white shadow-sm' : 'text-amber-800 hover:bg-amber-100/50'
                }`}
              >
                తె
              </button>
            </div>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 text-amber-800 hover:text-amber-600 transition-all rounded-full hover:bg-amber-50/50"
            >
              <ShoppingCart size={22} />
              {mounted && cartItemsCount > 0 && (
                <span
                  className={`absolute -top-1 -right-1 bg-gradient-to-br from-amber-600 to-amber-700 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm transition-transform duration-200 ${
                    animateCart ? 'scale-125' : 'scale-100'
                  }`}
                >
                  {cartItemsCount}
                </span>
              )}
            </Link>

            {/* User Profile */}
            <div className="relative" ref={dropdownRef}>
              {session ? (
                <>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-1.5 text-sm font-semibold text-amber-950 hover:text-amber-800 focus:outline-none py-1 px-2 rounded-full hover:bg-amber-50/30 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-black uppercase text-sm shadow-sm">
                      {(session.user?.name || 'U').charAt(0)}
                    </div>
                    <span className="hidden sm:inline text-xs font-bold text-amber-950">
                      {(session.user?.name || 'User').split(' ')[0]}
                    </span>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl smooth-shadow-lg border border-amber-100/40 py-2 z-50 animate-fade-in-up">
                      <div className="px-4 py-2.5 border-b border-amber-50">
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">{t('nav_hello')}</p>
                        <p className="text-sm font-black text-amber-950 truncate">{session.user?.name}</p>
                      </div>
                      {session.user.role === 'ADMIN' ? (
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-50 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          <span>{t('nav_admin_panel')}</span>
                        </Link>
                      ) : (
                        <>
                          <Link
                            href="/account?tab=profile"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                            <span>{t('nav_my_account')}</span>
                          </Link>
                          <Link
                            href="/account?tab=orders"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                            <span>{t('nav_my_orders')}</span>
                          </Link>
                        </>
                      )}
                      <div className="border-t border-amber-50 mt-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            signOut({ callbackUrl: '/' });
                          }}
                          className="w-full text-left flex items-center space-x-2 px-4 py-2.5 text-xs font-bold text-red-650 hover:bg-red-50 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span>{t('nav_logout')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center space-x-1.5 bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-300 hover:scale-102 hover:-translate-y-0.5"
                >
                  <User size={14} />
                  <span className="hidden sm:inline">{t('nav_login')}</span>
                </Link>
              )}
            </div>

            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-amber-800 hover:text-amber-700 lg:hidden focus:outline-none rounded-full hover:bg-amber-50/30 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Sliding Mobile Search Panel */}
      <div className={`md:hidden w-full bg-amber-50/50 backdrop-blur-md px-4 transition-all duration-300 ease-in-out ${
        showMobileSearch 
          ? 'max-h-[70px] opacity-100 py-3 border-b border-amber-100/50' 
          : 'max-h-0 opacity-0 py-0 overflow-hidden pointer-events-none'
      }`}>
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <input
            type="text"
            placeholder={t('nav_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-amber-950 border border-amber-200 rounded-full py-2.5 pl-4 pr-11 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
          />
          <button
            type="submit"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-800"
            disabled={isSearching}
          >
            {isSearching ? <Loader2 size={16} className="animate-spin text-amber-850" /> : <Search size={16} />}
          </button>
        </form>
      </div>

      {/* Mobile Drawer */}
      <div className={`lg:hidden w-full bg-white border-t border-amber-100 px-4 space-y-4 smooth-shadow transition-all duration-300 ease-in-out ${
        mobileMenuOpen 
          ? 'max-h-[450px] opacity-100 py-4 border-b pointer-events-auto' 
          : 'max-h-0 opacity-0 py-0 overflow-hidden pointer-events-none'
      }`}>
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <input
            type="text"
            placeholder={t('nav_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-amber-50 text-amber-950 border border-amber-200 rounded-full py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-850" disabled={isSearching}>
            {isSearching ? <Loader2 size={18} className="animate-spin text-amber-850" /> : <Search size={18} />}
          </button>
        </form>

        <div className="flex flex-col space-y-1 pt-1">
          {[
            { href: '/', label: t('nav_home_mobile') },
            { href: '/products', label: t('nav_oils_mobile') },
            { href: '/account?tab=orders', label: t('nav_track_mobile') },
          ].map(({ href, label }, idx) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              style={{ transitionDelay: `${idx * 45}ms` }}
              className={`px-4 py-3 rounded-xl text-sm font-semibold block transform transition-all duration-300 ${
                mobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
              } ${
                pathname === href ? 'bg-amber-50 text-amber-900 font-bold' : 'text-amber-950/80 hover:bg-amber-50 hover:translate-x-1'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile Language switcher */}
        <div className="flex items-center space-x-2 pt-2 border-t border-amber-50">
          <Globe size={14} className="text-amber-700" />
          <span className="text-xs font-bold text-amber-900">Language:</span>
          <div className="flex bg-amber-50 border border-amber-200 rounded-full overflow-hidden">
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-1 text-xs font-bold transition-all ${language === 'en' ? 'bg-amber-800 text-white' : 'text-amber-700'}`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('te')}
              className={`px-4 py-1 text-xs font-bold transition-all ${language === 'te' ? 'bg-amber-800 text-white' : 'text-amber-700'}`}
            >
              తెలుగు
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
