'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Minus, Check, ChevronDown } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useLanguage } from '@/context/LanguageContext';
import VariantSelectorModal from '@/components/VariantSelectorModal';
import type { RawProduct, GroupedProduct } from '@/hooks/useGroupedProducts';

interface ProductCardProps {
  group: GroupedProduct;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=400&auto=format&fit=crop';

/** Formats weight + unit into a readable label like "1 L", "500 g", "5 Kg" */
export function formatVariantLabel(product: { weight: number; unit: string }): string {
  const w = product.weight;
  const u = product.unit;
  if (u === 'Litre' || u === 'Liter') {
    return w >= 1 ? `${w} L` : `${Math.round(w * 1000)} ml`;
  }
  if (u === 'Gram' || u === 'g') {
    return w >= 1000 ? `${w / 1000} Kg` : `${w} g`;
  }
  if (u === 'Kg' || u === 'kg') return `${w} Kg`;
  if (u === 'ml') return w >= 1000 ? `${w / 1000} L` : `${w} ml`;
  return `${w} ${u}`;
}

/** Strips Telugu size/unit suffixes to get a clean base name */
export function extractBaseNameTe(nameTe: string): string {
  return nameTe
    .replace(/\s*\([^)]*(?:లీటరు|లీ|మి\.లీ|మిల్లీ|గ్రా|కేజీ|ల|ml|L|g|kg)[^)]*\)/gi, '')
    .replace(/\s+\d+\.?\d*\s*(?:లీటరు|లీటర్|లీ|మి\.లీ|మిల్లీ లీటర్లు|గ్రా|గ్రాములు|కేజీ|కిలోలు)/gi, '')
    .replace(/\s+\d+\.?\d*\s*(?:Litre|Liter|L|ml|Kg|kg|g|Gram|Pack|Piece|pcs)\b/gi, '')
    .replace(/\s+\d+$/, '')
    .trim();
}

export default function ProductCard({ group }: ProductCardProps) {
  const { representative, variants, minPrice, minMrp, groupKey } = group;
  const router = useRouter();

  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const [imgError, setImgError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { language } = useLanguage();

  const isSingleVariant = variants.length === 1;
  const imageUrl = imgError ? FALLBACK_IMAGE : (representative.images?.[0] || FALLBACK_IMAGE);
  const outOfStock = representative.stock <= 0;
  const discountPercent = minMrp > minPrice ? Math.round(((minMrp - minPrice) / minMrp) * 100) : 0;

  const displayName =
    language === 'te'
      ? extractBaseNameTe(representative.nameTe || representative.name)
      : groupKey;

  // For single variant: direct cart qty
  const singleCartEntry = isSingleVariant ? items.find((i) => i.productId === representative.id) : null;
  const singleQty = singleCartEntry?.quantity || 0;

  // For multi variant: total qty across all variants
  const totalCartQty = variants.reduce((sum, v) => {
    const entry = items.find((i) => i.productId === v.id);
    return sum + (entry?.quantity || 0);
  }, 0);

  const handleAddSingle = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (outOfStock) return;
    addItem({
      productId: representative.id,
      name: representative.name,
      nameTe: representative.nameTe,
      price: representative.price,
      mrp: representative.mrp,
      quantity: 1,
      image: representative.images?.[0] || FALLBACK_IMAGE,
      weight: representative.weight,
      unit: representative.unit,
      stock: representative.stock,
      variantLabel: formatVariantLabel(representative),
    });
  }, [addItem, outOfStock, representative]);

  const handleOpenModal = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setModalOpen(true);
  }, []);

  return (
    <>
      <div className="group bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col h-full">

        {/* ── Image ── */}
        <Link
          href={`/products/${representative.slug}`}
          className="block relative overflow-hidden bg-[#fdfaf6] aspect-square flex-shrink-0"
        >
          <img
            src={imageUrl}
            alt={representative.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
            onError={() => setImgError(true)}
            loading="lazy"
          />

          {/* Discount badge */}
          {discountPercent > 0 && !outOfStock && (
            <div className="absolute top-2 left-2 z-10 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
              {discountPercent}% OFF
            </div>
          )}

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center">
              <span className="text-[10px] font-black text-red-500 bg-white px-2.5 py-1 rounded-full border border-red-100 shadow-sm">
                {language === 'te' ? 'అయిపోయింది' : 'Out of Stock'}
              </span>
            </div>
          )}

          {/* ADD / QTY button — top right */}
          {!outOfStock && (
            <div
              className="absolute top-2 right-2 z-20"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              {isSingleVariant ? (
                singleQty > 0 ? (
                  <div className="flex items-center bg-amber-800 rounded-xl h-8 shadow-md overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        singleQty === 1 ? removeItem(representative.id) : updateQuantity(representative.id, singleQty - 1);
                      }}
                      className="w-7 h-8 flex items-center justify-center text-white hover:bg-amber-700 transition-colors"
                    >
                      <Minus size={12} strokeWidth={3} />
                    </button>
                    <span className="px-1 text-white font-black text-xs min-w-[20px] text-center select-none">
                      {singleQty}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (singleQty < representative.stock) updateQuantity(representative.id, singleQty + 1);
                      }}
                      className="w-7 h-8 flex items-center justify-center text-white hover:bg-amber-700 transition-colors"
                    >
                      <Plus size={12} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAddSingle}
                    className="w-9 h-9 rounded-xl bg-white border-2 border-amber-800 text-amber-800 shadow-md flex items-center justify-center hover:bg-amber-800 hover:text-white transition-all duration-200 active:scale-90"
                  >
                    <Plus size={17} strokeWidth={3} />
                  </button>
                )
              ) : (
                totalCartQty > 0 ? (
                  <div className="flex items-center bg-amber-800 rounded-xl h-8 shadow-md overflow-hidden">
                    <button
                      onClick={handleOpenModal}
                      className="w-7 h-8 flex items-center justify-center text-white hover:bg-amber-700 transition-colors"
                    >
                      <Minus size={12} strokeWidth={3} />
                    </button>
                    <span className="px-1 text-white font-black text-xs min-w-[20px] text-center select-none">
                      {totalCartQty}
                    </span>
                    <button
                      onClick={handleOpenModal}
                      className="w-7 h-8 flex items-center justify-center text-white hover:bg-amber-700 transition-colors"
                    >
                      <Plus size={12} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleOpenModal}
                    className="w-9 h-9 rounded-xl bg-white border-2 border-amber-800 text-amber-800 shadow-md flex items-center justify-center hover:bg-amber-800 hover:text-white transition-all duration-200 active:scale-90"
                  >
                    <Plus size={17} strokeWidth={3} />
                  </button>
                )
              )}
            </div>
          )}
        </Link>

        {/* ── Card Body ── */}
        <div className="px-3 pt-2.5 pb-3 flex flex-col flex-1">

          <p className="text-[9px] sm:text-[10px] font-black text-amber-700 uppercase tracking-wider mb-1">
            ⚡ {language === 'te' ? '15 నిమిషాలు' : '15 MINS'}
          </p>

          <Link href={`/products/${representative.slug}`}>
            <h3 className="text-xs sm:text-[13px] font-bold text-gray-900 group-hover:text-amber-800 line-clamp-2 leading-snug transition-colors mb-1.5" style={{ minHeight: '2.4em' }}>
              {displayName}
            </h3>
          </Link>

          {/* Size chip */}
          {!isSingleVariant ? (
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 rounded-lg px-2 py-0.5 text-[10px] font-bold text-gray-600 w-fit cursor-pointer transition-colors mb-2"
            >
              <span>{formatVariantLabel(representative)}</span>
              <ChevronDown size={10} className="text-gray-400" />
            </button>
          ) : (
            <p className="text-[10px] font-semibold text-gray-400 mb-2">
              {formatVariantLabel(representative)}
            </p>
          )}

          {/* Price & Buy Now Button */}
          <div className="mt-auto flex items-center justify-between gap-1.5">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm sm:text-[15px] font-black text-gray-900">₹{minPrice}</span>
              {minMrp > minPrice && (
                <span className="text-[10px] text-gray-400 line-through font-medium">₹{minMrp}</span>
              )}
              {!isSingleVariant && (
                <span className="text-[9px] text-gray-400 font-medium">onwards</span>
              )}
            </div>

            {!outOfStock && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isSingleVariant) {
                    addItem({
                      productId: representative.id,
                      name: representative.name,
                      nameTe: representative.nameTe,
                      price: representative.price,
                      mrp: representative.mrp,
                      quantity: 1,
                      image: representative.images?.[0] || FALLBACK_IMAGE,
                      weight: representative.weight,
                      unit: representative.unit,
                      stock: representative.stock,
                      variantLabel: formatVariantLabel(representative),
                    });
                    router.push('/cart');
                  } else {
                    setModalOpen(true);
                  }
                }}
                className="bg-amber-800 hover:bg-amber-700 active:scale-95 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg sm:rounded-xl transition-all duration-200 uppercase tracking-wider shrink-0 shadow-sm"
              >
                {language === 'te' ? 'కొనండి' : 'Buy Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Centered modal for multi-variant */}
      {!isSingleVariant && (
        <VariantSelectorModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          groupKey={groupKey}
          variants={variants}
        />
      )}
    </>
  );
}
