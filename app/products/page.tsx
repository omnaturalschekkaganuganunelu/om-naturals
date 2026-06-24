'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { useLanguage } from '@/context/LanguageContext';
import { Search, Filter, ArrowUpDown, LayoutGrid } from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';
import CustomSelect from '@/components/CustomSelect';
import { useGroupedProducts } from '@/hooks/useGroupedProducts';
import { useRealtime } from '@/hooks/useRealtime';

// ─── Inner content (needs Suspense for useSearchParams) ───────────────────────
function ProductListingContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCategory = searchParams.get('category') || '';
  const initialSearch   = searchParams.get('search')   || '';

  const [products,           setProducts]           = useState<any[]>([]);
  const [categories,         setCategories]         = useState<any[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [category,           setCategory]           = useState(initialCategory);
  const [search,             setSearch]             = useState(initialSearch);
  const [sort,               setSort]               = useState('newest');
  const [maxPrice,           setMaxPrice]           = useState(2500);
  const [mobileFiltersOpen,  setMobileFiltersOpen]  = useState(false);

  // Sync with URL params
  useEffect(() => {
    setCategory(searchParams.get('category') || '');
    setSearch(searchParams.get('search')   || '');
  }, [searchParams]);

  // Load categories
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  // Load products whenever filters change (debounced to prevent API spam)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      const p = new URLSearchParams();
      if (category) p.append('category', category);
      if (search)   p.append('search',   search);
      if (sort)     p.append('sort',     sort);
      if (maxPrice) p.append('maxPrice', maxPrice.toString());

      fetch(`/api/products?${p}`)
        .then((r) => r.json())
        .then((data) => { setProducts(data); setLoading(false); })
        .catch(() => setLoading(false));
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [category, search, sort, maxPrice]);

  const clearFilters = () => {
    setCategory(''); setSearch(''); setSort('newest'); setMaxPrice(2500);
    router.push('/products');
  };

  useRealtime('Product', '*', (payload) => {
    if (payload.eventType === 'UPDATE') {
      const updated = payload.new;
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === updated.id) {
            return {
              ...p,
              ...updated,
              images: typeof updated.images === 'string' ? JSON.parse(updated.images || '[]') : updated.images,
              benefits: typeof updated.benefits === 'string' ? JSON.parse(updated.benefits || '[]') : updated.benefits,
              ingredients: typeof updated.ingredients === 'string' ? JSON.parse(updated.ingredients || '[]') : updated.ingredients,
              usage: typeof updated.usage === 'string' ? JSON.parse(updated.usage || '[]') : updated.usage,
            };
          }
          return p;
        })
      );
    } else if (payload.eventType === 'INSERT') {
      const newProd = payload.new;
      const formatted = {
        ...newProd,
        images: typeof newProd.images === 'string' ? JSON.parse(newProd.images || '[]') : newProd.images,
        benefits: typeof newProd.benefits === 'string' ? JSON.parse(newProd.benefits || '[]') : newProd.benefits,
        ingredients: typeof newProd.ingredients === 'string' ? JSON.parse(newProd.ingredients || '[]') : newProd.ingredients,
        usage: typeof newProd.usage === 'string' ? JSON.parse(newProd.usage || '[]') : newProd.usage,
      };
      setProducts((prev) => [formatted, ...prev]);
    } else if (payload.eventType === 'DELETE') {
      setProducts((prev) => prev.filter((p) => p.id !== payload.old.id));
    }
  });

  // Group variants client-side
  const grouped = useGroupedProducts(products);

  const categoryLabel = useMemo(() => {
    if (!category) return t('products_title');
    const cat = categories.find((c) => c.slug === category);
    return cat ? (language === 'te' ? cat.nameTe : cat.name) : t('products_title');
  }, [category, categories, language, t]);

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-8 lg:px-12 py-6 sm:py-8 flex-1">

      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-3xl font-extrabold text-amber-950 font-heading">
          {categoryLabel}
        </h1>
        {search && (
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {t('products_search_results')}:{' '}
            <span className="font-bold text-amber-900">&quot;{search}&quot;</span>
          </p>
        )}
        {!loading && products.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 font-semibold">
            {grouped.length} product{grouped.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8 items-start">

        {/* ─── Sidebar Filters — Desktop ─────────────────────── */}
        <aside className="hidden lg:flex flex-col bg-white border border-amber-100/80 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-amber-50 pb-3">
            <h3 className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
              <Filter size={15} />
              {t('products_filters')}
            </h3>
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline"
            >
              {t('products_reset')}
            </button>
          </div>

          {/* Keyword Search */}
          <div className="space-y-2">
            <label htmlFor="products-keyword-search" className="text-xs font-bold text-amber-950 block">
              {t('products_search_keyword')}
            </label>
            <div className="relative">
              <input
                type="text"
                id="products-keyword-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('products_search_placeholder')}
                className="w-full bg-amber-50/30 text-xs text-amber-900 border border-amber-100 rounded-xl py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Pills */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-amber-950 block">
              {t('products_category')}
            </label>
            <div className="space-y-1.5">
              <button
                onClick={() => setCategory('')}
                className={`w-full text-left text-xs px-3 py-2 rounded-xl font-semibold transition-colors ${
                  category === ''
                    ? 'bg-amber-800 text-white font-bold'
                    : 'text-gray-600 hover:bg-amber-50'
                }`}
              >
                {t('products_all_categories')}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.slug)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-xl font-semibold transition-colors ${
                    category === cat.slug
                      ? 'bg-amber-800 text-white font-bold'
                      : 'text-gray-600 hover:bg-amber-50'
                  }`}
                >
                  {language === 'te' ? cat.nameTe : cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-3">
            <label htmlFor="products-price-range" className="text-xs font-bold text-amber-950 block">
              {t('products_price_range')}
            </label>
            <input
              type="range" min="0" max="2500" step="50"
              id="products-price-range"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
              className="w-full accent-amber-800 cursor-pointer h-1.5 bg-amber-100 rounded-full"
            />
            <div className="flex justify-between text-[11px] text-gray-500 font-bold">
              <span>₹0</span>
              <span>Up to ₹{maxPrice}</span>
            </div>
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-amber-950 block">
              {t('products_sort_by')}
            </label>
            <CustomSelect
              value={sort}
              onChange={setSort}
              options={[
                { value: 'newest',     label: t('products_sort_newest') },
                { value: 'price-asc',  label: t('products_sort_price_asc') },
                { value: 'price-desc', label: t('products_sort_price_desc') },
                { value: 'popular',    label: t('products_sort_popular') },
              ]}
            />
          </div>
        </aside>

        {/* ─── Products Section ──────────────────────────────── */}
        <section className="lg:col-span-3 space-y-5">

          {/* Mobile controls bar */}
          <div className="flex justify-between items-center bg-white border border-amber-100 rounded-2xl p-3 shadow-sm lg:hidden">
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 hover:bg-amber-100 transition-colors"
            >
              <Filter size={13} />
              {t('products_filters')}
            </button>
            <div className="flex items-center gap-1">
              <ArrowUpDown size={13} className="text-amber-800" />
              <CustomSelect
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'newest',     label: t('products_sort_newest') },
                  { value: 'price-asc',  label: t('products_sort_price_asc') },
                  { value: 'price-desc', label: t('products_sort_price_desc') },
                ]}
                className="w-36"
              />
            </div>
          </div>

          {/* Mobile Filters Drawer */}
          {mobileFiltersOpen && (
            <div className="bg-white border border-amber-100 rounded-2xl p-4 space-y-4 shadow-sm lg:hidden animate-fade-in-up">
              <div className="flex justify-between items-center border-b border-amber-50 pb-2">
                <span className="text-xs font-bold text-amber-950">{t('products_filters')}</span>
                <button onClick={clearFilters} className="text-[10px] font-bold text-amber-800 underline">
                  {t('products_reset')}
                </button>
              </div>
              {/* Keyword */}
              <div className="space-y-1">
                <label htmlFor="mobile-products-keyword-search" className="text-[10px] font-bold text-gray-500 block">{t('products_search_keyword')}</label>
                <input
                  type="text"
                  id="mobile-products-keyword-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('products_search_placeholder')}
                  className="w-full bg-amber-50/20 text-xs text-amber-900 border border-amber-100 rounded-lg py-1.5 px-3 focus:outline-none"
                />
              </div>
              {/* Categories */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 block">{t('products_category')}</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setCategory('')}
                    className={`text-[10px] font-semibold px-3 py-1 rounded-full ${
                      category === '' ? 'bg-amber-800 text-white' : 'bg-amber-50 text-amber-900 border border-amber-100'
                    }`}
                  >
                    {t('products_all_categories')}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.slug)}
                      className={`text-[10px] font-semibold px-3 py-1 rounded-full ${
                        category === cat.slug ? 'bg-amber-800 text-white' : 'bg-amber-50 text-amber-900 border border-amber-100'
                      }`}
                    >
                      {language === 'te' ? cat.nameTe : cat.name}
                    </button>
                  ))}
                </div>
              </div>
              {/* Price */}
              <div className="space-y-1">
                <label htmlFor="mobile-products-price-range" className="text-[10px] font-bold text-gray-500 block">Up to ₹{maxPrice}</label>
                <input
                  type="range" min="0" max="2500" step="50"
                  id="mobile-products-price-range"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                  className="w-full accent-amber-800 h-1.5 bg-amber-100 rounded-full cursor-pointer"
                />
              </div>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full py-2 bg-amber-800 text-white font-bold text-xs rounded-xl hover:bg-amber-700 transition-colors"
              >
                {language === 'te' ? 'ఫిల్టర్లు వర్తింపజేయి' : 'Apply Filters'}
              </button>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <PremiumLoader fullScreen={false} text={t('misc_loading')} />
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 bg-white border border-amber-100 rounded-2xl p-6">
              <Search size={48} className="text-amber-300 stroke-1" />
              <h3 className="font-bold text-amber-950 text-sm sm:text-base">{t('products_not_found')}</h3>
              <p className="text-xs text-gray-400 max-w-sm">{t('products_not_found_sub')}</p>
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold rounded-full shadow-sm transition-colors"
              >
                {t('products_reset')}
              </button>
            </div>
          ) : (
            /* ─── Products Grid ─── */
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 animate-fade-in-up">
              {grouped.map((grp) => (
                <ProductCard key={grp.groupKey} group={grp} />
              ))}
            </div>
          )}

        </section>
      </div>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────
export default function ProductListingPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<PremiumLoader fullScreen={false} />}>
        <ProductListingContent />
      </Suspense>
      <Footer />
    </>
  );
}
