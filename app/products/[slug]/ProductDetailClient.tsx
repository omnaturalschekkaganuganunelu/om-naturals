'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, ShoppingBag, Check, Plus, Minus,
  ShieldCheck, Truck, Leaf, Star, ChevronRight,
  Zap, Award, ChevronDown
} from 'lucide-react';
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

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=500&auto=format&fit=crop';

/* ─── Small Related Product Card ─────────────────────────────────────────── */
function RelatedCard({ rel, language }: { rel: any; language: string }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const [justAdded, setJustAdded] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const [relModalOpen, setRelModalOpen] = useState(false);

  const relImages = Array.isArray(rel.images) ? rel.images :
    (typeof rel.images === 'string' ? (() => { try { return JSON.parse(rel.images); } catch { return []; } })() : []);

  const cartEntry = items.find((i) => i.productId === rel.id);
  const qty = cartEntry?.quantity || 0;
  const discount = rel.mrp > rel.price ? Math.round(((rel.mrp - rel.price) / rel.mrp) * 100) : 0;
  const outOfStock = rel.stock <= 0;
  const displayName = language === 'te' ? (rel.nameTe || rel.name) : rel.name;
  const imgSrc = imgErr ? FALLBACK_IMG : (relImages[0] || FALLBACK_IMG);
  const isSingle = !rel._isMulti; // all related products treated as single unless flagged

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock) return;
    addItem({
      productId: rel.id, name: rel.name, nameTe: rel.nameTe || rel.name,
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
        {/* Image */}
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
          <img
            src={imgSrc}
            alt={displayName}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-400"
            onError={() => setImgErr(true)}
            loading="lazy"
          />
          {/* Add button */}
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
                  className={`w-8 h-8 rounded-xl shadow-md flex items-center justify-center font-black transition-all active:scale-90 ${
                    justAdded ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-amber-800 text-amber-800 hover:bg-amber-800 hover:text-white'
                  }`}
                >
                  {justAdded ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
                </button>
              )}
            </div>
          )}
        </div>
        {/* Info */}
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

/* ─── Main Page Component ─────────────────────────────────────────────────── */
export default function ProductDetailClient({ product, relatedProducts, siblings = [] }: ProductDetailClientProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const { t, language } = useLanguage();

  const [activeImage, setActiveImage] = useState(product.images[0] || FALLBACK_IMG);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'benefits' | 'ingredients' | 'usage'>('details');
  const [modalOpen, setModalOpen] = useState(false);

  React.useEffect(() => {
    setActiveImage(product.images[0] || FALLBACK_IMG);
  }, [product.id, product.images]);

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

  // Cart entry for this specific product
  const cartEntry = items.find((i) => i.productId === product.id);
  const cartQty = cartEntry?.quantity || 0;
  const inCart = cartQty > 0;
  const activeQty = inCart ? cartQty : quantity;

  const handleAddToCart = useCallback((shouldRedirect = false) => {
    if (outOfStock) return;
    addItem({
      productId: product.id, name: product.name, nameTe: product.nameTe,
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
      {/* ── Page wrapper: pb-32 on mobile so content never hides behind sticky bar + nav ── */}
      <div className="pb-8 md:pb-10 w-full max-w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto w-full min-w-0">

          {/* ── Breadcrumb ── */}
          <nav className="text-[11px] text-gray-400 flex items-center gap-1 font-medium pt-4 pb-3 overflow-x-auto no-scrollbar whitespace-nowrap">
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

          {/* ── Main Card ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-w-0 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 min-w-0 w-full">

              {/* ══ LEFT: Images ══ */}
              <div className="relative bg-[#fdfaf6] md:border-r border-gray-100">
                {/* Badges */}
                {discountPercent > 0 && !outOfStock && (
                  <div className="absolute top-4 left-4 z-20 bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-sm">
                    {discountPercent}% OFF
                  </div>
                )}
                {outOfStock && (
                  <div className="absolute inset-0 z-20 bg-white/60 flex items-center justify-center">
                    <div className="bg-red-500 text-white px-5 py-2 rounded-full font-black text-sm shadow-lg">
                      {language === 'te' ? 'అయిపోయింది' : 'Out of Stock'}
                    </div>
                  </div>
                )}
                {/* Main image */}
                <div className="aspect-square overflow-hidden">
                  <img
                    src={activeImage}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                  />
                </div>
                {/* Thumbnails */}
                {product.images.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar border-t border-gray-100">
                    {product.images.map((img, i) => (
                      <button key={i} onClick={() => setActiveImage(img)}
                        className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                          activeImage === img ? 'border-amber-700 shadow-sm scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}>
                        <img src={img} alt="" className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ══ RIGHT: Product Info ══ */}
              <div className="p-5 sm:p-7 flex flex-col gap-4 min-w-0">

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
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight break-words">{displayName}</h1>
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
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2.5">
                      {language === 'te' ? 'పరిమాణం ఎంచుకోండి' : 'Select Size'}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {allVariants.map((v) => {
                        const isActive = v.id === product.id;
                        const vDisc = v.mrp > v.price ? Math.round(((v.mrp - v.price) / v.mrp) * 100) : 0;
                        return (
                          <button key={v.id}
                            onClick={() => { if (!isActive) router.push(`/products/${v.slug}`); }}
                            disabled={v.stock <= 0 && !isActive}
                            className={`relative flex flex-col items-start px-3.5 py-2.5 rounded-2xl border-2 min-w-[76px] transition-all text-left ${
                              isActive
                                ? 'border-amber-800 bg-amber-800 text-white shadow-md'
                                : v.stock <= 0
                                ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                                : 'border-gray-200 bg-white hover:border-amber-400 hover:shadow-sm cursor-pointer'
                            }`}
                          >
                            <span className={`text-sm font-black ${isActive ? 'text-white' : 'text-gray-900'}`}>
                              {formatVariantLabel(v)}
                            </span>
                            <span className={`text-xs font-bold mt-0.5 ${isActive ? 'text-amber-200' : 'text-gray-700'}`}>
                              ₹{v.price}
                            </span>
                            {vDisc > 0 && (
                              <span className={`text-[9px] font-black mt-0.5 ${isActive ? 'text-amber-300' : 'text-emerald-600'}`}>
                                {vDisc}% off
                              </span>
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
                <div className="bg-amber-50/60 rounded-2xl px-4 py-3 border border-amber-100/60">
                  <div className="flex items-end gap-2.5 flex-wrap">
                    <span className="text-3xl font-black text-gray-900">₹{product.price}</span>
                    {product.mrp > product.price && (
                      <>
                        <span className="text-base text-gray-400 line-through font-medium mb-0.5">₹{product.mrp}</span>
                        <span className="text-sm font-black text-emerald-600 mb-0.5">
                          {language === 'te' ? `₹${product.mrp - product.price} తక్కువ` : `Save ₹${product.mrp - product.price}`}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">{t('misc_price_inclusive')}</p>
                  <div className="mt-1.5 text-xs font-bold">
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

                {/* ── Quantity + Action (DESKTOP only) ── */}
                {!outOfStock && (
                  <div className="hidden md:block space-y-3">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-gray-500 uppercase tracking-wider">{t('misc_quantity')}</span>
                      <div className="flex items-center bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <button onClick={handleDecrement} disabled={activeQty <= 1 && !inCart}
                          className="w-10 h-10 flex items-center justify-center text-amber-800 hover:bg-amber-50 disabled:text-gray-300 transition-colors">
                          <Minus size={16} strokeWidth={2.5} />
                        </button>
                        <span className="px-4 font-black text-base text-gray-900 min-w-[36px] text-center select-none">
                          {activeQty}
                        </span>
                        <button onClick={handleIncrement} disabled={activeQty >= product.stock}
                          className="w-10 h-10 flex items-center justify-center text-amber-800 hover:bg-amber-50 disabled:text-gray-300 transition-colors">
                          <Plus size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                      {inCart && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <Check size={12} strokeWidth={3} />
                          {language === 'te' ? 'కార్ట్‌లో ఉంది' : 'In cart'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => {
                          if (hasVariants) setModalOpen(true);
                          else handleAddToCart(false);
                        }}
                        className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all border-2 ${
                          added || inCart
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-amber-800 text-amber-800 hover:bg-amber-50'
                        }`}>
                        {added || inCart
                          ? <><Check size={16} strokeWidth={3} />{language === 'te' ? 'చేర్చారు' : 'Added'}</>
                          : <><ShoppingCart size={16} />{t('misc_add_to_cart')}</>
                        }
                      </button>
                      <button onClick={() => {
                          if (hasVariants) setModalOpen(true);
                          else handleAddToCart(true);
                        }}
                        className="flex items-center justify-center gap-2 py-3.5 bg-amber-800 hover:bg-amber-700 active:scale-[0.98] text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-800/20 transition-all">
                        <ShoppingBag size={16} />
                        {t('misc_buy_now')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Trust Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { icon: <ShieldCheck size={14} className="text-emerald-600" />, text: language === 'te' ? '100% ప్యూర్' : '100% Pure & Safe' },
                    { icon: <Truck size={14} className="text-blue-500" />, text: language === 'te' ? 'వేగవంతమైన డెలివరీ' : 'Fast Delivery' },
                    { icon: <Leaf size={14} className="text-green-600" />, text: language === 'te' ? 'సహజ నూనె' : 'Natural Oil' },
                    { icon: <Award size={14} className="text-amber-600" />, text: language === 'te' ? 'నాణ్యత హామీ' : 'Quality Assured' },
                  ].map(({ icon, text }, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                      {icon}
                      <span className="text-[11px] font-bold text-gray-700 break-words">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs Section ── */}
          <div className="mt-4 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full">
            <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar w-full">
              {(['details', 'benefits', 'ingredients', 'usage'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-5 py-4 text-xs sm:text-sm font-black border-b-2 transition-all whitespace-nowrap ${
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
            <div className="p-5 sm:p-7 text-sm text-gray-600 leading-relaxed">
              {activeTab === 'details' && <p className="font-medium">{language === 'te' && product.descriptionTe ? product.descriptionTe : product.description}</p>}
              {activeTab === 'benefits' && (
                <ul className="space-y-2.5">
                  {(language === 'te' && product.benefitsTe && product.benefitsTe.length > 0 ? product.benefitsTe : product.benefits).map((b: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
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
                <ol className="space-y-3">
                  {(language === 'te' && product.usageTe && product.usageTe.length > 0 ? product.usageTe : product.usage).map((use: string, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0 border border-amber-200">
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
            <div className="mt-4 bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-7">
              <div className="flex items-center justify-between mb-4">
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

          {/* ── Mobile spacer: enough room for sticky bar + bottom nav (16 + ~18 = ~36 = pb-36) ── */}
          <div className="md:hidden h-36" />
        </div>
      </div>

      {/* ══ MOBILE STICKY BAR — sits ABOVE the bottom nav (bottom-16 = 64px = nav height) ══ */}
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
                {/* Qty stepper (when in cart) */}
                <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 h-11 border border-gray-200">
                  <button
                    onClick={handleDecrement}
                    className="w-10 h-full flex items-center justify-center text-amber-800 hover:bg-amber-50 active:bg-gray-200 transition-colors"
                  >
                    <Minus size={14} strokeWidth={2.5} />
                  </button>
                  <span className="px-3 font-black text-sm text-gray-900 min-w-[28px] text-center select-none">
                    {cartQty}
                  </span>
                  <button
                    onClick={handleIncrement}
                    disabled={cartQty >= product.stock}
                    className="w-10 h-full flex items-center justify-center text-amber-800 hover:bg-amber-50 active:bg-gray-200 transition-colors"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Go to Cart (since already in cart) */}
                <button
                  onClick={() => router.push('/cart')}
                  className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-amber-800 hover:bg-amber-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-lg shadow-amber-800/20 active:scale-95 transition-all"
                >
                  <ShoppingBag size={15} />
                  <span>{language === 'te' ? 'కార్ట్‌కు వెళ్ళు' : 'Go to Cart'}</span>
                </button>
              </>
            ) : (
              <>
                {/* Add to Cart */}
                <button
                  onClick={() => {
                    if (hasVariants) setModalOpen(true);
                    else handleAddToCart(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 h-11 border-2 border-amber-800 text-amber-800 bg-white hover:bg-amber-50 active:bg-amber-100 rounded-xl font-black text-xs sm:text-sm transition-all"
                >
                  <ShoppingCart size={15} />
                  <span>{t('misc_add_to_cart')}</span>
                </button>

                {/* Buy Now */}
                <button
                  onClick={() => {
                    if (hasVariants) setModalOpen(true);
                    else handleAddToCart(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-amber-800 hover:bg-amber-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-lg shadow-amber-800/20 active:scale-95 transition-all"
                >
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
