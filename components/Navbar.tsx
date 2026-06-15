'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ShoppingCart, User, Menu, X, Search, MapPin, Phone, MessageCircle, Globe } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useLanguage } from '@/context/LanguageContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [animateCart, setAnimateCart] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cartItemsCount = useCartStore((state) => state.getCartCount());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (cartItemsCount > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 500);
      return () => clearTimeout(timer);
    }
  }, [cartItemsCount]);

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
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
      setShowMobileSearch(false);
    }
  };

  const isActive = (path: string) => pathname === path;

  const navLinkClass = (path: string) =>
    `relative px-3 py-2 text-sm font-semibold transition-all duration-200 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-200 ${
      isActive(path)
        ? 'text-amber-800 after:bg-amber-600 after:scale-x-100'
        : 'text-amber-900/80 after:bg-amber-400 after:scale-x-0 hover:text-amber-800 hover:after:scale-x-100'
    }`;

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Main Header */}
      <div className="w-full bg-white/96 backdrop-blur-md border-b border-amber-100/80 smooth-shadow">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center gap-3 sm:gap-4">
          
          {/* Brand Logo — fixed width so it never steals space from search */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex flex-col group">
              <span className="text-sm sm:text-lg lg:text-xl font-black tracking-tight text-amber-900 leading-tight font-heading group-hover:text-amber-700 transition-colors whitespace-nowrap">
                {language === 'te' ? 'ఓం సహజ చెక్క గానుగ నూనెలు' : 'OM Natural Chekka Ganuga Oils'}
              </span>
              <span className="hidden sm:block text-[9px] font-bold tracking-[0.15em] text-amber-600/70 uppercase">
                100% Pure Cold Pressed
              </span>
            </Link>
          </div>

          {/* Desktop Search — takes all available middle space */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-sm lg:max-w-md mx-auto relative">
            <input
              type="text"
              placeholder={t('nav_search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-amber-50 text-amber-900 border border-amber-200 rounded-full py-2 pl-4 pr-11 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-300 placeholder:text-amber-400/70"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 hover:text-amber-900 transition-colors"
            >
              <Search size={18} />
            </button>
          </form>

          {/* Spacer for mobile — pushes actions to the right */}
          <div className="flex-1 md:hidden" />

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center space-x-1 flex-shrink-0">
            <Link href="/" className={navLinkClass('/')}>{t('nav_home')}</Link>
            <Link href="/products?category=cold-pressed" className={navLinkClass('/products?category=cold-pressed')}>{t('nav_oils')}</Link>
            <Link href="/products?category=refined-filtered" className={navLinkClass('/products?category=refined-filtered')}>{t('nav_pooja')}</Link>
            <Link href="/track-order" className={navLinkClass('/track-order')}>{t('nav_track')}</Link>
          </nav>

          {/* Actions — flex-shrink-0 so they never get squeezed */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => {
                setShowMobileSearch(!showMobileSearch);
                setMobileMenuOpen(false);
              }}
              className="p-2 text-amber-800 hover:text-amber-600 md:hidden rounded-full hover:bg-amber-50 transition-colors focus:outline-none"
              aria-label="Toggle Search"
            >
              <Search size={20} />
            </button>

            {/* Language Switcher */}
            <div className="hidden md:flex items-center bg-amber-50 border border-amber-200 rounded-full overflow-hidden p-0.5 shrink-0">
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
              className="relative p-2 text-amber-800 hover:text-amber-600 transition-all rounded-full hover:bg-amber-50"
            >
              <ShoppingCart size={22} />
              {mounted && cartItemsCount > 0 && (
                <span
                  className={`absolute -top-1 -right-1 bg-gradient-to-br from-amber-500 to-amber-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm transition-transform duration-200 ${
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
                    className="flex items-center space-x-1.5 text-sm font-semibold text-amber-900 hover:text-amber-700 focus:outline-none py-1 px-2 rounded-full hover:bg-amber-50 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-black uppercase text-sm shadow-sm">
                      {(session.user?.name || 'U').charAt(0)}
                    </div>
                    <span className="hidden sm:inline text-xs font-bold text-amber-900">
                      {(session.user?.name || 'User').split(' ')[0]}
                    </span>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl smooth-shadow-lg border border-amber-100/80 py-2 z-50 animate-fade-in-up">
                      <div className="px-4 py-2.5 border-b border-amber-50">
                        <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">{t('nav_hello')}</p>
                        <p className="text-sm font-black text-amber-950 truncate">{session.user?.name}</p>
                      </div>
                      {session.user.role === 'ADMIN' ? (
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-50 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>{t('nav_admin_panel')}</span>
                        </Link>
                      ) : (
                        <>
                          <Link
                            href="/account"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                            <span>{t('nav_my_account')}</span>
                          </Link>
                          <Link
                            href="/account?tab=orders"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
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
                          className="w-full text-left flex items-center space-x-2 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
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
                  className="flex items-center space-x-1.5 bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <User size={14} />
                  <span className="hidden sm:inline">{t('nav_login')}</span>
                </Link>
              )}
            </div>

            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-amber-800 hover:text-amber-600 lg:hidden focus:outline-none rounded-full hover:bg-amber-50 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Sliding Mobile Search Panel */}
      {showMobileSearch && (
        <div className="md:hidden w-full bg-amber-50/70 backdrop-blur-md border-b border-amber-100 py-3 px-4 animate-fade-in-up">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              placeholder={t('nav_search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-amber-900 border border-amber-250 rounded-full py-2.5 pl-4 pr-11 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-600 hover:text-amber-900 transition-colors"
            >
              <Search size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden w-full bg-white border-t border-amber-100 py-4 px-4 space-y-3 smooth-shadow animate-fade-in-up">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              placeholder={t('nav_search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-amber-50 text-amber-900 border border-amber-200 rounded-full py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600">
              <Search size={18} />
            </button>
          </form>

          <div className="flex flex-col space-y-1 pt-1">
            {[
              { href: '/', label: t('nav_home_mobile') },
              { href: '/products?category=cold-pressed', label: t('nav_oils_mobile') },
              { href: '/products?category=refined-filtered', label: t('nav_pooja_mobile') },
              { href: '/track-order', label: t('nav_track_mobile') },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  pathname === href ? 'bg-amber-100 text-amber-900 font-bold' : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Mobile Language switcher */}
          <div className="flex items-center space-x-2 pt-2 border-t border-amber-50">
            <Globe size={14} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700">Language:</span>
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
      )}
    </header>
  );
}
