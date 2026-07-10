'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, ShoppingBag, Check, Plus, Minus,
  ShieldCheck, Truck, Leaf, Star, ChevronRight,
  Zap, Award, ChevronDown, X, ZoomIn
} from 'lucide-react';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import { useLanguage } from '@/context/LanguageContext';
import { formatVariantLabel, extractBaseNameTe } from '@/components/ProductCard';
import VariantSelectorModal from '@/components/VariantSelectorModal';

interface Variant {
  id: string;
  name: string;
  nameTe: string;
  slug: string;
  price: number;
  mrp: number;
  stock: number;
  unit: string;
  weight: number;
  images: string[];
}

interface ProductDetailClientProps {
  product: {
    id: string;
    name: string;
    nameTe: string;
    slug: string;
    description: string;
    descriptionTe?: string | null;
    images: string[];
    price: number;
    mrp: number;
    stock: number;
    unit: string;
    weight: number;
    benefits: string[];
    benefitsTe?: string[];
    ingredients: string[];
    ingredientsTe?: string[];
    usage: string[];
    usageTe?: string[];
    category: { name: string; nameTe: string; slug: string };
  };
  relatedProducts: any[];
  siblings?: Variant[];
}

const FALLBACK_IMG = '/images/logo-512.png';

/* ─── Small Related Product Card ─────────────────────────────────────────── */
function RelatedCard({ rel, language }: { rel: any; language: string }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const [justAdded, setJustAdded] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const relImages = Array.isArray(rel.images) ? rel.images :
    (typeof rel.images === 'string' ? (() => { try { return JSON.parse(rel.images); } catch { return []; } })() : []);

  const cartEntry = items.find((i) => i.productId === rel.id);
  const qty = cartEntry?.quantity || 0;
  const discount = rel.mrp > rel.price ? Math.round(((rel.mrp - rel.price) / rel.mrp) * 100) : 0;
  const outOfStock = rel.stock <= 0;
  const displayName = language === 'te' ? (rel.nameTe || rel.name) : rel.name;
  const imgSrc = imgErr ? FALLBACK_IMG : (relImages[0] || FALLBACK_IMG);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock) return;
    addItem({
      productId: rel.id,
      slug: rel.slug,
      name: rel.name,
      nameTe: rel.nameTe || rel.name,
      price: rel.price, mrp: rel.mrp, quantity: 1,
      image: relImages[0] || FALLBACK_IMG,
      weight: rel.weight, unit: rel.unit, stock: rel.stock,
      variantLabel: formatVariantLabel(rel),
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <>
      <div
        className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer flex flex-col w-full min-w-0"
        onClick={() => router.push(`/products/${rel.slug}`)}
      >
        <div className="relative aspect-square bg-amber-50/40 overflow-hidden flex-shrink-0">
          {discount > 0 && (
            <div className="absolute top-2 left-2 z-10 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {discount}% OFF
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
              <span className="text-[10px] font-black text-red-500">{language === 'te' ? 'అయిపోయింది' : 'Out of Stock'}</span>
            </div>
          )}
          <Image
            src={imgSrc}
            alt={displayName}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover group-hover:scale-[1.04] transition-transform duration-400"
            onError={() => setImgErr(true)}
          />
          {!outOfStock && (
            <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
              {qty > 0 ? (
                <div className="flex items-center bg-amber-800 rounded-xl overflow-hidden shadow-md">
                  <button className="w-7 h-8 flex items-center justify-center text-white hover:bg-amber-700"
                    onClick={(e) => { e.stopPropagation(); qty === 1 ? removeItem(rel.id) : updateQuantity(rel.id, qty - 1); }}>
                    <Minus size={11} strokeWidth={3} />
                  </button>
                  <span className="text-white font-black text-xs min-w-[20px] text-center">{qty}</span>
                  <button className="w-7 h-8 flex items-center justify-center text-white hover:bg-amber-700"
                    onClick={(e) => { e.stopPropagation(); if (qty < rel.stock) updateQuantity(rel.id, qty + 1); }}>
                    <Plus size={11} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  className={`w-8 h-8 rounded-xl shadow-md flex items-center justify-center font-black transition-all active:scale-90 ${justAdded ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-amber-800 text-amber-800 hover:bg-amber-800 hover:text-white'}`}
                >
                  {justAdded ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="p-2.5 flex flex-col flex-1">
          <p className="text-[9px] font-black text-amber-700 uppercase tracking-wider">⚡ 15 MINS</p>
          <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug mt-0.5 flex-1">{displayName}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">{formatVariantLabel(rel)}</p>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-sm font-black text-gray-900">₹{rel.price}</span>
            {rel.mrp > rel.price && <span className="text-[10px] text-gray-400 line-through">₹{rel.mrp}</span>}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Amazon-style Image Viewer ──────────────────────────────────────────── */
function ImageViewer({ images, displayName }: { images: string[]; displayName: string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [showZoom, setShowZoom] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const ZOOM_FACTOR = 2.5;

  const activeImage = images[activeIdx] || FALLBACK_IMG;

  // Reset when images change (variant switch)
  useEffect(() => {
    setActiveIdx(0);
    setShowZoom(false);
  }, [images]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = mainRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const y = Math.min(Math.max(0, e.clientY - rect.top), rect.height);
    setLensPos({ x, y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (diff > 50) { // swipe left (next)
      setActiveIdx((prev) => (prev + 1) % images.length);
      setShowZoom(false);
    } else if (diff < -50) { // swipe right (prev)
      setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
      setShowZoom(false);
    }
    setTouchStart(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      setActiveIdx((prev) => (prev + 1) % images.length);
      setShowZoom(false);
    } else if (e.key === 'ArrowLeft') {
      setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
      setShowZoom(false);
    }
  };

  // Lens size in pixels (the square on the main image that gets zoomed)
  const lensW = 120;
  const lensH = 120;

  // Clamp lens so it doesn't go outside the image
  const mainW = mainRef.current?.clientWidth || 400;
  const mainH = mainRef.current?.clientHeight || 400;
  const clampedLensX = Math.min(Math.max(lensPos.x - lensW / 2, 0), mainW - lensW);
  const clampedLensY = Math.min(Math.max(lensPos.y - lensH / 2, 0), mainH - lensH);

  // Background position for zoomed panel
  const bgX = -(clampedLensX * ZOOM_FACTOR);
  const bgY = -(clampedLensY * ZOOM_FACTOR);

  return (
    <>
      {/* Always stacked: main image on top, thumbnails below */}
      <div className="flex flex-col w-full">

        {/* ── Main Image + Zoom Panel ── */}
        <div className="relative w-full">
          <div
            ref={mainRef}
            tabIndex={0}
            className={`relative w-full aspect-square overflow-hidden bg-[#fdfaf6] rounded-none md:rounded-t-2xl select-none outline-none ${showZoom ? 'cursor-crosshair' : 'cursor-zoom-in'}`}
            onMouseEnter={() => setShowZoom(true)}
            onMouseLeave={() => setShowZoom(false)}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onKeyDown={handleKeyDown}
            onClick={() => setLightboxOpen(true)}
          >
            <Image
              src={activeImage}
              alt={displayName}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).srcset = FALLBACK_IMG; }}
            />

            {/* Lens overlay (desktop only) */}
            {showZoom && (
              <div
                className="hidden md:block absolute border-2 border-amber-400 bg-amber-100/20 pointer-events-none z-10"
                style={{ width: lensW, height: lensH, left: clampedLensX, top: clampedLensY }}
              />
            )}

            {/* Zoom hint */}
            {!showZoom && (
              <div className="absolute bottom-3 left-3 z-10 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 pointer-events-none">
                <ZoomIn size={11} />
                Zoom
              </div>
            )}

            {/* Full view button on mobile */}
            <button
              className="md:hidden absolute bottom-3 right-3 z-10 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5"
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
            >
              <ZoomIn size={11} />
              Full view
            </button>
          </div>

          {/* Amazon-style Zoom Panel (desktop only) — floats to right */}
          {showZoom && (
            <div
              className="hidden md:block absolute top-0 left-[calc(100%+12px)] z-50 w-[380px] h-[380px] border border-amber-200 rounded-2xl overflow-hidden shadow-2xl bg-white"
              style={{
                backgroundImage: `url(${activeImage})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${mainW * ZOOM_FACTOR}px ${mainH * ZOOM_FACTOR}px`,
                backgroundPosition: `${bgX}px ${bgY}px`,
              }}
            />
          )}
        </div>

        {/* ── Thumbnails BELOW the main image ── */}
        {images.length > 1 && (
          <div className="flex gap-2 p-2.5 overflow-x-auto no-scrollbar border-t border-gray-100 bg-white rounded-none md:rounded-b-2xl">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => { setActiveIdx(i); setShowZoom(false); }}
                className={`relative flex-shrink-0 w-[60px] h-[60px] rounded-xl overflow-hidden border-2 transition-all ${
                  activeIdx === i
                    ? 'border-amber-700 shadow-md scale-105'
                    : 'border-gray-200 hover:border-amber-400 opacity-70 hover:opacity-100'
                }`}
              >
                <Image src={img} alt="" fill sizes="64px" className="object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).srcset = FALLBACK_IMG; }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox / Fullscreen Modal (for mobile tap and desktop click) ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 outline-none"
          tabIndex={0}
          onClick={() => setLightboxOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxOpen(false);
            else handleKeyDown(e);
          }}
        >
          <button
            className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/40 rounded-full p-2 z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <X size={22} />
          </button>
          <div className="relative w-full max-w-lg aspect-square" onClick={(e) => e.stopPropagation()}>
            <Image
              src={activeImage}
              alt={displayName}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
          {/* Thumbnail strip at bottom of lightbox */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                    activeIdx === i ? 'border-amber-400 scale-105' : 'border-white/30 opacity-60'
                  }`}
                >
                  <Image src={img} alt="" fill sizes="56px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ─── Main Page Component ─────────────────────────────────────────────────── */
export default function ProductDetailClient({ product, relatedProducts, siblings = [] }: ProductDetailClientProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const { t, language } = useLanguage();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'benefits' | 'ingredients' | 'usage'>('details');
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const allVariants: Variant[] = [
    { ...product },
    ...siblings.filter((s) => s.id !== product.id),
  ].sort((a, b) => a.weight - b.weight);

  const hasVariants = allVariants.length > 1;
  const discountPercent = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const outOfStock = product.stock <= 0;

  const displayName = language === 'te' ? product.nameTe : product.name;
  const altName = language === 'te' ? product.name : product.nameTe;

  const cartEntry = items.find((i) => i.productId === product.id);
  const cartQty = cartEntry?.quantity || 0;
  const inCart = cartQty > 0;
  const activeQty = inCart ? cartQty : quantity;

  const handleAddToCart = useCallback((shouldRedirect = false) => {
    if (outOfStock) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      nameTe: product.nameTe,
      price: product.price, mrp: product.mrp, quantity,
      image: product.images[0] || FALLBACK_IMG,
      weight: product.weight, unit: product.unit, stock: product.stock,
      variantLabel: formatVariantLabel(product),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    if (shouldRedirect) router.push('/checkout');
  }, [outOfStock, addItem, product, quantity, router]);

  const handleIncrement = () => {
    if (inCart) { if (cartQty < product.stock) updateQuantity(product.id, cartQty + 1); }
    else { if (quantity < product.stock) setQuantity((q) => q + 1); }
  };
  const handleDecrement = () => {
    if (inCart) { cartQty === 1 ? removeItem(product.id) : updateQuantity(product.id, cartQty - 1); }
    else { if (quantity > 1) setQuantity((q) => q - 1); }
  };

  return (
    <>
      <div className="pb-8 md:pb-10 w-full max-w-full overflow-x-hidden">
        <div className="max-w-screen-xl mx-auto w-full min-w-0">

          {/* ── Breadcrumb ── */}
          <nav className="text-[11px] text-gray-400 flex items-center gap-1 font-medium pt-4 pb-3 overflow-x-auto no-scrollbar whitespace-nowrap px-4 md:px-0">
            <span className="hover:text-amber-700 cursor-pointer shrink-0" onClick={() => router.push('/')}>{t('nav_home')}</span>
            <ChevronRight size={11} className="shrink-0" />
            <span className="hover:text-amber-700 cursor-pointer shrink-0" onClick={() => router.push('/products')}>{t('products_title')}</span>
            <ChevronRight size={11} className="shrink-0" />
            <span className="hover:text-amber-700 cursor-pointer truncate max-w-[120px] sm:max-w-none shrink-0"
              onClick={() => router.push(`/products?category=${product.category.slug}`)}>
              {(language === 'te' ? product.category.nameTe : product.category.name).split('(')[0].trim()}
            </span>
            <ChevronRight size={11} className="shrink-0" />
            <span className="text-amber-900 font-semibold truncate max-w-[180px] sm:max-w-xs shrink-0">{displayName}</span>
          </nav>

          {/* ── Main Layout: image left, info right ── */}
          <div className="bg-white rounded-none md:rounded-3xl shadow-sm border-0 md:border border-gray-100 overflow-visible md:overflow-hidden w-full">
            <div className="flex flex-col md:grid md:grid-cols-2 items-start w-full">

              {/* ══ LEFT: Image Viewer ══ */}
              <div className="w-full relative">
                {/* Discount Badge */}
                {discountPercent > 0 && !outOfStock && (
                  <div className="absolute top-3 left-3 z-20 bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-sm">
                    {discountPercent}% OFF
                  </div>
                )}
                {outOfStock && (
                  <div className="absolute top-3 left-3 z-20 bg-red-500 text-white px-3 py-1 rounded-full font-black text-xs shadow-sm">
                    {language === 'te' ? 'అయిపోయింది' : 'Out of Stock'}
                  </div>
                )}
                <ImageViewer images={product.images.length > 0 ? product.images : [FALLBACK_IMG]} displayName={displayName} />
              </div>

              {/* ══ RIGHT: Info ══ */}
              <div className="p-4 sm:p-6 flex flex-col gap-3 min-w-0 w-full md:border-l border-gray-100">

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-0.5">
                    <Zap size={10} className="fill-amber-700" />
                    {language === 'te' ? '15 నిమిషాలలో' : '15 MINS'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5">
                    <Leaf size={10} />
                    {language === 'te' ? '100% సహజ' : '100% Natural'}
                  </span>
                </div>

                {/* Name */}
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-black text-gray-900 leading-tight break-words">{displayName}</h1>
                  {altName && altName !== displayName && (
                    <p className="text-sm text-gray-400 font-medium mt-0.5 break-words">{altName}</p>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-emerald-600 text-white text-xs font-black px-2 py-0.5 rounded-lg">
                    <span>4.8</span>
                    <Star size={10} className="fill-white" />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">24 {t('misc_reviews')}</span>
                  <span className="text-gray-200">·</span>
                  <span className="text-xs text-amber-700 font-bold">{language === 'te' ? 'ధృవీకరించబడింది' : 'Verified'}</span>
                </div>

                <div className="h-px bg-gray-100" />

                {/* ── Size Selector ── */}
                {hasVariants && (
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                      {language === 'te' ? 'పరిమాణం ఎంచుకోండి' : 'Select Size'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allVariants.map((v) => {
                        const isActive = v.id === product.id;
                        const vDisc = v.mrp > v.price ? Math.round(((v.mrp - v.price) / v.mrp) * 100) : 0;
                        return (
                          <button key={v.id}
                            onClick={() => {
                              if (!isActive) {
                                setLoadingSlug(v.slug);
                                router.push(`/products/${v.slug}`);
                              }
                            }}
                            disabled={(v.stock <= 0 && !isActive) || loadingSlug === v.slug}
                            className={`relative flex flex-col items-start px-3 py-2 rounded-xl border-2 min-w-[72px] transition-all text-left ${
                              isActive
                                ? 'border-amber-800 bg-amber-800 text-white shadow-md'
                                : v.stock <= 0
                                ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                                : 'border-gray-200 bg-white hover:border-amber-400 hover:shadow-sm cursor-pointer'
                            } ${loadingSlug === v.slug ? 'opacity-80' : ''}`}
                          >
                            <span className={`text-sm font-black flex items-center gap-1 ${isActive ? 'text-white' : 'text-gray-900'}`}>
                              {formatVariantLabel(v)}
                              {loadingSlug === v.slug && (
                                <svg className="animate-spin h-3 w-3 text-amber-300" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              )}
                            </span>
                            <span className={`text-xs font-bold ${isActive ? 'text-amber-200' : 'text-gray-600'}`}>₹{v.price}</span>
                            {vDisc > 0 && (
                              <span className={`text-[9px] font-black ${isActive ? 'text-amber-300' : 'text-emerald-600'}`}>{vDisc}% off</span>
                            )}
                            {v.stock <= 0 && (
                              <span className="absolute -top-2 -right-1 bg-red-400 text-white text-[8px] font-black px-1.5 rounded-full">
                                {language === 'te' ? 'లేదు' : 'Out'}
                              </span>
                            )}
                            {isActive && (
                              <span className="absolute -top-2 -right-2 bg-emerald-500 w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                <Check size={10} strokeWidth={3.5} className="text-white" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Price ── */}
                <div className="bg-amber-50/60 rounded-xl px-4 py-2.5 border border-amber-100/60">
                  <div className="flex items-end gap-2 flex-wrap">
                    <span className="text-2xl font-black text-gray-900">₹{product.price}</span>
                    {product.mrp > product.price && (
                      <>
                        <span className="text-sm text-gray-400 line-through font-medium mb-0.5">₹{product.mrp}</span>
                        <span className="text-sm font-black text-emerald-600 mb-0.5">
                          {language === 'te' ? `₹${product.mrp - product.price} తక్కువ` : `Save ₹${product.mrp - product.price}`}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{t('misc_price_inclusive')}</p>
                  <div className="mt-1 text-xs font-bold">
                    {outOfStock
                      ? <span className="text-red-500">{t('misc_out_of_stock')}</span>
                      : product.stock < 10
                      ? <span className="text-amber-600">⚠ {language === 'te' ? `${product.stock} మాత్రమే మిగిలాయి!` : `Only ${product.stock} left!`}</span>
                      : <span className="text-emerald-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          {t('misc_in_stock')}
                        </span>
                    }
                  </div>
                </div>

                {/* ── Quantity + Action Buttons (DESKTOP) ── */}
                {!outOfStock && (
                  <div className="hidden md:block space-y-2.5">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-gray-500 uppercase tracking-wider">{t('misc_quantity')}</span>
                      <div className="flex items-center bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <button onClick={handleDecrement} disabled={activeQty <= 1 && !inCart}
                          className="w-9 h-9 flex items-center justify-center text-amber-800 hover:bg-amber-50 disabled:text-gray-300 transition-colors">
                          <Minus size={14} strokeWidth={2.5} />
                        </button>
                        <span className="px-3 font-black text-base text-gray-900 min-w-[32px] text-center select-none">{activeQty}</span>
                        <button onClick={handleIncrement} disabled={activeQty >= product.stock}
                          className="w-9 h-9 flex items-center justify-center text-amber-800 hover:bg-amber-50 disabled:text-gray-300 transition-colors">
                          <Plus size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                      {inCart && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <Check size={12} strokeWidth={3} />
                          {language === 'te' ? 'కార్ట్‌లో ఉంది' : 'In cart'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {inCart ? (
                        <>
                          <button onClick={() => router.push('/cart')}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all border-2 bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700">
                            <ShoppingCart size={15} />
                            {language === 'te' ? `కార్ట్‌లో ఉంది (${cartQty})` : `In Cart (${cartQty})`}
                          </button>
                          <button onClick={() => router.push('/checkout')}
                            className="flex items-center justify-center gap-2 py-3 bg-amber-800 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl font-black text-sm shadow-lg shadow-amber-800/20 transition-all">
                            <ShoppingBag size={15} />
                            {t('misc_buy_now')}
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleAddToCart(false)}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all border-2 ${
                              added ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-amber-800 text-amber-800 hover:bg-amber-50'
                            }`}>
                            {added
                              ? <><Check size={15} strokeWidth={3} />{language === 'te' ? 'చేర్చారు' : 'Added'}</>
                              : <><ShoppingCart size={15} />{t('misc_add_to_cart')}</>
                            }
                          </button>
                          <button onClick={() => handleAddToCart(true)}
                            className="flex items-center justify-center gap-2 py-3 bg-amber-800 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl font-black text-sm shadow-lg shadow-amber-800/20 transition-all">
                            <ShoppingBag size={15} />
                            {t('misc_buy_now')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { icon: <ShieldCheck size={13} className="text-emerald-600 shrink-0" />, text: language === 'te' ? '100% ప్యూర్' : '100% Pure & Safe' },
                    { icon: <Truck size={13} className="text-blue-500 shrink-0" />, text: language === 'te' ? 'వేగవంతమైన డెలివరీ' : 'Fast Delivery' },
                    { icon: <Leaf size={13} className="text-green-600 shrink-0" />, text: language === 'te' ? 'సహజ నూనె' : 'Natural Oil' },
                    { icon: <Award size={13} className="text-amber-600 shrink-0" />, text: language === 'te' ? 'నాణ్యత హామీ' : 'Quality Assured' },
                  ].map(({ icon, text }, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-2.5 py-2 border border-gray-100">
                      {icon}
                      <span className="text-[11px] font-bold text-gray-700 break-words">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs Section ── */}
          <div className="mt-3 bg-white rounded-none md:rounded-3xl shadow-sm border-0 md:border border-gray-100 overflow-hidden w-full">
            <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar w-full">
              {(['details', 'benefits', 'ingredients', 'usage'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-5 py-3.5 text-xs sm:text-sm font-black border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-amber-800 text-amber-900 bg-amber-50/40'
                      : 'border-transparent text-gray-400 hover:text-amber-700 hover:bg-gray-50'
                  }`}>
                  {tab === 'details' ? t('misc_description')
                    : tab === 'benefits' ? t('misc_benefits')
                    : tab === 'ingredients' ? t('misc_ingredients')
                    : t('misc_usage')}
                </button>
              ))}
            </div>
            <div className="p-4 sm:p-6 text-sm text-gray-600 leading-relaxed">
              {activeTab === 'details' && <p className="font-medium">{language === 'te' && product.descriptionTe ? product.descriptionTe : product.description}</p>}
              {activeTab === 'benefits' && (
                <ul className="space-y-2">
                  {(language === 'te' && product.benefitsTe && product.benefitsTe.length > 0 ? product.benefitsTe : product.benefits).map((b: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 w-4 h-4 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                        <Check size={9} strokeWidth={3} className="text-emerald-600" />
                      </span>
                      <span className="font-medium text-gray-700">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {activeTab === 'ingredients' && (
                <ul className="space-y-2">
                  {(language === 'te' && product.ingredientsTe && product.ingredientsTe.length > 0 ? product.ingredientsTe : product.ingredients).map((ing: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {ing}
                    </li>
                  ))}
                </ul>
              )}
              {activeTab === 'usage' && (
                <ol className="space-y-2.5">
                  {(language === 'te' && product.usageTe && product.usageTe.length > 0 ? product.usageTe : product.usage).map((use: string, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0 border border-amber-200">
                        {i + 1}
                      </span>
                      <span className="font-medium text-gray-700 pt-0.5">{use}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* ── Related Products ── */}
          {relatedProducts.length > 0 && (
            <div className="mt-3 bg-white rounded-none md:rounded-3xl shadow-sm border-0 md:border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg sm:text-xl font-black text-gray-900">{t('misc_related_products')}</h2>
                <button onClick={() => router.push(`/products?category=${product.category.slug}`)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1">
                  {language === 'te' ? 'అన్నీ చూడు' : 'See all'} <ChevronRight size={13} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {relatedProducts.map((rel) => (
                  <RelatedCard key={rel.id} rel={rel} language={language} />
                ))}
              </div>
            </div>
          )}

          {/* Mobile spacer for sticky bar */}
          <div className="md:hidden h-36" />
        </div>
      </div>

      {/* ══ MOBILE STICKY BAR ══ */}
      {!outOfStock && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-[60] px-3 py-2">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex items-center gap-2.5 px-3 py-2.5 max-w-lg mx-auto">
            {hasVariants && (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl px-3 h-11 text-xs font-black text-amber-900 transition-colors shrink-0"
              >
                <span>{formatVariantLabel(product)}</span>
                <ChevronDown size={14} className="text-amber-800" />
              </button>
            )}
            {inCart ? (
              <>
                <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 h-11 border border-gray-200">
                  <button onClick={handleDecrement} className="w-10 h-full flex items-center justify-center text-amber-800 hover:bg-amber-50 active:bg-gray-200 transition-colors">
                    <Minus size={14} strokeWidth={2.5} />
                  </button>
                  <span className="px-3 font-black text-sm text-gray-900 min-w-[28px] text-center select-none">{cartQty}</span>
                  <button onClick={handleIncrement} disabled={cartQty >= product.stock} className="w-10 h-full flex items-center justify-center text-amber-800 hover:bg-amber-50 active:bg-gray-200 transition-colors">
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
                <button onClick={() => router.push('/cart')}
                  className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-amber-800 hover:bg-amber-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-lg shadow-amber-800/20 active:scale-95 transition-all">
                  <ShoppingBag size={15} />
                  <span>{language === 'te' ? 'కార్ట్‌కు వెళ్ళు' : 'Go to Cart'}</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => handleAddToCart(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-11 border-2 border-amber-800 text-amber-800 bg-white hover:bg-amber-50 active:bg-amber-100 rounded-xl font-black text-xs sm:text-sm transition-all">
                  <ShoppingCart size={15} />
                  <span>{t('misc_add_to_cart')}</span>
                </button>
                <button onClick={() => handleAddToCart(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-amber-800 hover:bg-amber-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-lg shadow-amber-800/20 active:scale-95 transition-all">
                  <ShoppingBag size={15} />
                  <span>{t('misc_buy_now')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Variant Selector Modal */}
      {hasVariants && (
        <VariantSelectorModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          groupKey={extractBaseNameTe(product.nameTe || product.name)}
          variants={allVariants as any}
        />
      )}
    </>
  );
}
