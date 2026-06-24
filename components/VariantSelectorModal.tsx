'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, Minus, Plus, Check, Percent, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useLanguage } from '@/context/LanguageContext';
import type { RawProduct } from '@/hooks/useGroupedProducts';
import { extractBaseNameTe, formatVariantLabel } from '@/components/ProductCard';

interface VariantSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupKey: string;
  variants: RawProduct[];
  anchorRef?: React.RefObject<HTMLElement>;
}

const FALLBACK_IMAGE = '/images/logo-512.png';

export default function VariantSelectorModal({
  isOpen,
  onClose,
  groupKey,
  variants,
}: VariantSelectorModalProps) {
  const { language } = useLanguage();
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleAdd = (variant: RawProduct) => {
    addItem({
      productId: variant.id,
      name: variant.name,
      nameTe: variant.nameTe,
      price: variant.price,
      mrp: variant.mrp,
      quantity: 1,
      image: variant.images?.[0] || FALLBACK_IMAGE,
      weight: variant.weight,
      unit: variant.unit,
      stock: variant.stock,
      variantLabel: formatVariantLabel(variant),
    });
    setJustAdded((prev) => ({ ...prev, [variant.id]: true }));
    setTimeout(() => setJustAdded((prev) => ({ ...prev, [variant.id]: false })), 1500);
  };

  const displayName =
    language === 'te'
      ? extractBaseNameTe(variants[0]?.nameTe || variants[0]?.name || groupKey)
      : groupKey;

  const totalCartQty = variants.reduce((sum, v) => {
    const entry = items.find((i) => i.productId === v.id);
    return sum + (entry?.quantity || 0);
  }, 0);

  const totalCartValue = variants.reduce((sum, v) => {
    const entry = items.find((i) => i.productId === v.id);
    return sum + (entry ? entry.quantity * v.price : 0);
  }, 0);

  if (!isOpen || !mounted) return null;

  return createPortal(
    // Backdrop — full screen centered overlay
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.52)' }}
      onClick={handleBackdropClick}
    >
      {/* Dialog box — centered, max width, never overflows */}
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full overflow-hidden flex flex-col"
        style={{ maxWidth: 400, maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-base font-black text-gray-900 leading-tight pr-4">{displayName}</h3>
            <p className="text-xs text-amber-700 font-bold mt-0.5">
              {variants.length}{' '}
              {language === 'te'
                ? 'పరిమాణాలు అందుబాటులో ఉన్నాయి'
                : `size${variants.length > 1 ? 's' : ''} available`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Variant List ── */}
        <div className="overflow-y-auto overscroll-contain flex-1 divide-y divide-gray-50">
          {variants.map((variant) => {
            const cartEntry = items.find((i) => i.productId === variant.id);
            const qty = cartEntry?.quantity || 0;
            const discount = variant.mrp > variant.price
              ? Math.round(((variant.mrp - variant.price) / variant.mrp) * 100)
              : 0;
            const outOfStock = variant.stock <= 0;
            const label = formatVariantLabel(variant);
            const imgSrc = imgErrors[variant.id] ? FALLBACK_IMAGE : (variant.images?.[0] || FALLBACK_IMAGE);
            const isJustAdded = justAdded[variant.id];

            return (
              <div
                key={variant.id}
                className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${qty > 0 ? 'bg-amber-50/40' : ''}`}
              >
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden bg-amber-50 border border-amber-100">
                  <img
                    src={imgSrc}
                    alt={variant.name}
                    className="w-full h-full object-cover"
                    onError={() => setImgErrors((prev) => ({ ...prev, [variant.id]: true }))}
                    loading="lazy"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-gray-900">{label}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-sm font-black text-gray-900">₹{variant.price}</span>
                    {variant.mrp > variant.price && (
                      <span className="text-xs text-gray-400 line-through">₹{variant.mrp}</span>
                    )}
                    {discount > 0 && (
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Percent size={8} />{discount}% off
                      </span>
                    )}
                  </div>
                  {outOfStock && (
                    <p className="text-[10px] font-bold text-red-500 mt-0.5">
                      {language === 'te' ? 'అయిపోయింది' : 'Out of Stock'}
                    </p>
                  )}
                </div>

                {/* Add / Qty */}
                <div className="flex-shrink-0">
                  {qty > 0 ? (
                    <div className="flex items-center bg-amber-800 rounded-xl overflow-hidden shadow-md">
                      <button
                        onClick={() => qty === 1 ? removeItem(variant.id) : updateQuantity(variant.id, qty - 1)}
                        className="w-8 h-9 flex items-center justify-center text-white hover:bg-amber-700 transition-colors"
                      >
                        <Minus size={14} strokeWidth={3} />
                      </button>
                      <span className="text-white font-black text-sm min-w-[24px] text-center select-none px-1">
                        {qty}
                      </span>
                      <button
                        onClick={() => { if (qty < variant.stock) updateQuantity(variant.id, qty + 1); }}
                        className="w-8 h-9 flex items-center justify-center text-white hover:bg-amber-700 transition-colors"
                      >
                        <Plus size={14} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => !outOfStock && handleAdd(variant)}
                      disabled={outOfStock}
                      className={`min-w-[64px] px-3 py-2 rounded-xl text-sm font-black border-2 transition-all duration-200 ${
                        outOfStock
                          ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                          : isJustAdded
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-amber-800 text-amber-800 hover:bg-amber-800 hover:text-white active:scale-95'
                      }`}
                    >
                      {isJustAdded ? (
                        <span className="flex items-center gap-1 justify-center">
                          <Check size={13} strokeWidth={3} />
                          {language === 'te' ? 'OK' : 'Added'}
                        </span>
                      ) : (
                        language === 'te' ? 'చేర్చు' : 'ADD'
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer: Cart summary + Confirm ── */}
        {totalCartQty > 0 && (
          <div className="flex-shrink-0 border-t border-gray-100 px-5 py-4 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {language === 'te'
                    ? `${totalCartQty} వస్తువులు · మొత్తం`
                    : `${totalCartQty} item${totalCartQty === 1 ? '' : 's'} · Total`}
                </p>
                <p className="text-lg font-black text-gray-900 leading-tight">
                  ₹{totalCartValue.toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex items-center gap-2 bg-amber-800 hover:bg-amber-700 active:scale-95 text-white font-black px-6 py-3 rounded-2xl shadow-lg transition-all text-sm"
              >
                <ShoppingCart size={16} />
                {language === 'te' ? 'సరే' : 'Done'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
