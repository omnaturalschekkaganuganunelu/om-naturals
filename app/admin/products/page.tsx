'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminSidebar from '@/components/admin/AdminSidebar';
import {
  Plus, Edit3, Trash2, Search, X, AlertCircle, Layers, Package,
  ChevronDown, ChevronUp, Image as ImageIcon, RefreshCw
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PremiumLoader from '@/components/PremiumLoader';
import CustomSelect from '@/components/CustomSelect';
import { extractBaseName } from '@/hooks/useGroupedProducts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface VariantForm {
  id?: string; // present when editing existing
  weight: string;
  unit: string;
  price: string;
  mrp: string;
  sku: string;
  stock: string;
  imageUrl: string;
  description: string;
  variantNameTe: string; // renamed to avoid conflict with singleForm.nameTe
  benefits: string;
}

const EMPTY_VARIANT = (): VariantForm => ({
  weight: '',
  unit: 'Litre',
  price: '',
  mrp: '',
  sku: '',
  stock: '',
  imageUrl: '',
  description: '',
  variantNameTe: '',
  benefits: '',
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminProductsPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { t, language } = useLanguage();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'single' | 'multi'>('single');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Shared fields (same for all variants when creating multi)
  const [sharedName, setSharedName] = useState('');
  const [sharedSlugBase, setSharedSlugBase] = useState('');
  const [sharedCategoryId, setSharedCategoryId] = useState('');

  // Single product form — uses its own interface to avoid VariantForm field conflicts
  const [singleForm, setSingleForm] = useState<{
    id?: string;
    name: string;
    nameTe: string;
    slug: string;
    categoryId: string;
    weight: string;
    unit: string;
    price: string;
    mrp: string;
    sku: string;
    stock: string;
    imageUrl: string;
    description: string;
    benefits: string;
    isActive: boolean;
  }>({
    name: '',
    nameTe: '',
    slug: '',
    categoryId: '',
    weight: '',
    unit: 'Litre',
    price: '',
    mrp: '',
    sku: '',
    stock: '',
    imageUrl: '',
    description: '',
    benefits: '',
    isActive: true,
  });

  // Multi-variant list
  const [variants, setVariants] = useState<VariantForm[]>([EMPTY_VARIANT(), EMPTY_VARIANT()]);

  // ─── Image Uploading States & Handler ──────────────────────────────────
  const [uploadingSingle, setUploadingSingle] = useState(false);
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null);

  const handleUploadImage = async (file: File, isVariant: boolean, variantIdx?: number) => {
    if (!file) return;
    if (isVariant && variantIdx !== undefined) {
      setUploadingVariantIndex(variantIdx);
    } else {
      setUploadingSingle(true);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to upload image.');
        return;
      }

      const data = await res.json();
      if (isVariant && variantIdx !== undefined) {
        updateVariant(variantIdx, 'imageUrl', data.url);
      } else {
        setSingleForm((p) => ({ ...p, imageUrl: data.url }));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Connection error during file upload.');
    } finally {
      setUploadingSingle(false);
      setUploadingVariantIndex(null);
    }
  };



  // ─── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/admin/login');
    else if (authStatus === 'authenticated' && session?.user?.role !== 'ADMIN') router.push('/');
  }, [authStatus, session, router]);

  // ─── Load Data ────────────────────────────────────────────────────────────
  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user?.role === 'ADMIN') loadData();
  }, [authStatus, session?.user?.role]);

  // ─── Group products by base name ──────────────────────────────────────────
  const productGroups = React.useMemo(() => {
    const map = new Map<string, any[]>();
    products.forEach((p) => {
      const key = extractBaseName(p.name);
      map.set(key, [...(map.get(key) || []), p]);
    });
    return Array.from(map.entries())
      .map(([key, variants]) => ({
        key,
        variants: [...variants].sort((a, b) => a.weight - b.weight),
      }))
      .filter(({ key, variants: groupVariants }) =>
        key.toLowerCase().includes(search.toLowerCase()) ||
        groupVariants[0]?.nameTe?.toLowerCase().includes(search.toLowerCase())
      );
  }, [products, search]);

  // ─── Slug generator ───────────────────────────────────────────────────────
  const makeSlug = (name: string, weight?: string, unit?: string) => {
    const base = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-');
    if (weight && unit) {
      const wPart = `${weight}${unit.toLowerCase().slice(0, 2)}`;
      return `${base}-${wPart}`;
    }
    return base;
  };

  // ─── Open Add Modal ───────────────────────────────────────────────────────
  const handleOpenAdd = (mode: 'single' | 'multi') => {
    setEditingProduct(null);
    setModalMode(mode);
    setFormError('');
    setSharedName('');
    setSharedSlugBase('');
    setSharedCategoryId(categories[0]?.id || '');
    setSingleForm({
      name: '', nameTe: '', slug: '',
      categoryId: categories[0]?.id || '',
      weight: '', unit: 'Litre', price: '', mrp: '',
      sku: '', stock: '', imageUrl: '', description: '', benefits: '', isActive: true,
    });
    setVariants([EMPTY_VARIANT(), EMPTY_VARIANT()]);
    setShowModal(true);
  };


  // ─── Open Edit Modal ──────────────────────────────────────────────────────
  const handleOpenEdit = (p: any) => {
    setEditingProduct(p);
    setModalMode('single');
    setFormError('');
    setSingleForm({
      id: p.id,
      name: p.name,
      nameTe: p.nameTe,
      slug: p.slug,
      categoryId: p.categoryId,
      weight: p.weight.toString(),
      unit: p.unit,
      price: p.price.toString(),
      mrp: p.mrp.toString(),
      sku: p.sku,
      stock: p.stock.toString(),
      imageUrl: p.images[0] || '',
      description: p.description,
      benefits: Array.isArray(p.benefits) ? p.benefits.join(', ') : p.benefits,
      isActive: p.isActive !== undefined ? p.isActive : true,
    });
    setShowModal(true);
  };

  // ─── Submit Single ────────────────────────────────────────────────────────
  const handleSubmitSingle = async () => {
    const { name, nameTe, slug, categoryId, price, sku, stock, weight, description } = singleForm;
    if (!name || !slug || !description || !price || !sku || !stock || !weight || !categoryId) {
      setFormError(language === 'te' ? 'దయచేసి అన్ని అవసరమైన వివరాలు నింపండి.' : 'Please fill in all required fields.');
      return false;
    }
    const payload = {
      name,
      nameTe: nameTe || name,
      slug,
      description,
      images: singleForm.imageUrl ? [singleForm.imageUrl] : [],
      price: parseFloat(price),
      mrp: singleForm.mrp ? parseFloat(singleForm.mrp) : parseFloat(price),
      sku,
      stock: parseInt(stock),
      unit: singleForm.unit,
      weight: parseFloat(weight),
      categoryId,
      benefits: singleForm.benefits.split(',').map((s) => s.trim()).filter(Boolean),
      isActive: singleForm.isActive,
    };
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    const method = editingProduct ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      setFormError(err.error || 'Failed to save product.');
      return false;
    }
    return true;
  };

  // ─── Submit Multi-Variant ─────────────────────────────────────────────────
  const handleSubmitMulti = async () => {
    if (!sharedName || !sharedCategoryId) {
      setFormError('Please fill in the product name and category.');
      return false;
    }
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.weight || !v.price || !v.sku || !v.stock) {
        setFormError(`Variant ${i + 1}: Please fill in weight, price, SKU, and stock.`);
        return false;
      }
    }

    // Create each variant as a separate product
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const wLabel = v.unit === 'Litre' ? `${v.weight}L` : `${v.weight}${v.unit.slice(0, 2).toLowerCase()}`;
      const variantName = `${sharedName} ${wLabel}`;
      const slug = makeSlug(sharedName, v.weight, v.unit);
      const payload = {
        name: variantName,
        nameTe: v.variantNameTe || variantName,
        slug: i === 0 ? slug : `${slug}-${i + 1}`,
        description: v.description || `${sharedName} - ${wLabel} variant`,
        images: v.imageUrl ? [v.imageUrl] : [],
        price: parseFloat(v.price),
        mrp: v.mrp ? parseFloat(v.mrp) : parseFloat(v.price),
        sku: v.sku,
        stock: parseInt(v.stock),
        unit: v.unit,
        weight: parseFloat(v.weight),
        categoryId: sharedCategoryId,
        benefits: v.benefits.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(`Variant ${i + 1} (${wLabel}): ${err.error || 'Failed to save.'}`);
        return false;
      }
    }
    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const ok = modalMode === 'single'
        ? await handleSubmitSingle()
        : await handleSubmitMulti();
      if (ok) {
        loadData();
        setShowModal(false);
      }
    } catch {
      setFormError('Server connection error.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm(language === 'te' ? 'ఈ ఉత్పత్తిని తొలగించాలా?' : 'Delete this product?')) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) loadData();
  };

  // ─── Variant helpers ──────────────────────────────────────────────────────
  const updateVariant = (idx: number, field: keyof VariantForm, value: string) => {
    setVariants((prev) => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const addVariant = () => setVariants((prev) => [...prev, EMPTY_VARIANT()]);

  const removeVariant = (idx: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const unitOptions = [
    { value: 'Litre', label: language === 'te' ? 'లీటర్' : 'Litre' },
    { value: 'Gram', label: language === 'te' ? 'గ్రామ్స్' : 'Gram' },
    { value: 'Kg', label: language === 'te' ? 'కిలోగ్రామ్' : 'Kg' },
    { value: 'ml', label: 'ml' },
    { value: 'Piece', label: language === 'te' ? 'పీస్' : 'Piece' },
    { value: 'Pack', label: language === 'te' ? 'ప్యాక్' : 'Pack' },
  ];

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (authStatus === 'loading' || loading) {
    return <PremiumLoader fullScreen text={t('admin_products_loading')} />;
  }

  // ─── Input classes ────────────────────────────────────────────────────────
  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all';
  const labelCls = 'text-[10px] font-bold text-gray-500 block mb-1 uppercase tracking-wide';

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 overflow-x-hidden">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 items-start">
          <AdminSidebar />

          <section className="flex-1 w-full min-w-0 space-y-4 sm:space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl sm:text-3xl font-extrabold text-amber-950 font-heading">
                  {t('admin_products_title')}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('admin_products_sub')}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenAdd('single')}
                  className="flex items-center gap-1.5 bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-sm"
                >
                  <Package size={14} />
                  {language === 'te' ? 'ఉత్పత్తి చేర్చు' : 'Add Product'}
                </button>
                <button
                  onClick={() => handleOpenAdd('multi')}
                  className="flex items-center gap-1.5 bg-amber-950 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-sm"
                >
                  <Layers size={14} />
                  {language === 'te' ? 'వేర్వేరు సైజులు' : 'Multi-Size'}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white border border-amber-100 p-4 rounded-3xl shadow-sm flex items-center relative">
              <input
                type="text"
                placeholder={t('admin_products_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs border-none focus:outline-none"
              />
              <Search size={18} className="absolute right-7 text-gray-400" />
            </div>

            {/* Products List — mobile-first card layout */}
            <div className="bg-white border border-amber-100 rounded-3xl overflow-hidden shadow-sm">
              {productGroups.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Package size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-semibold">
                    {language === 'te' ? 'ఉత్పత్తులు లేవు' : 'No products found'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-amber-50">
                  {productGroups.map(({ key, variants: groupVariants }) => {
                    const isMulti = groupVariants.length > 1;
                    const first = groupVariants[0];
                    const isExpanded = expandedGroup === key;

                    return (
                      <div key={key}>
                        {/* Group Row - mobile card style */}
                        <div className="p-3 sm:p-4 hover:bg-amber-50/30 transition-colors">
                          {/* Top row: Image + Name + Expand toggle */}
                          <div className="flex items-start gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={first.images[0] || ''}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover border border-amber-50 flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=100&auto=format&fit=crop';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-extrabold text-amber-950 text-xs leading-snug">{key}</p>
                              <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                {isMulti
                                  ? `${groupVariants.length} ${language === 'te' ? 'పరిమాణాలు' : 'sizes'} · ₹${Math.min(...groupVariants.map((v) => v.price))} – ₹${Math.max(...groupVariants.map((v) => v.price))}`
                                  : `${first.weight} ${first.unit} · ₹${first.price}`}
                              </p>
                            </div>
                            {isMulti && (
                              <button
                                onClick={() => setExpandedGroup(isExpanded ? null : key)}
                                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-100 flex-shrink-0 transition-colors"
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                          </div>

                          {/* Bottom row: Stock badge + Actions (always visible on mobile) */}
                          <div className="flex items-center justify-between mt-2.5 pl-15">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                Math.min(...groupVariants.map((v) => v.stock)) < 10
                                  ? 'bg-red-50 text-red-600 border-red-100'
                                  : 'bg-green-50 text-green-700 border-green-100'
                              }`}>
                                {language === 'te' ? 'స్టాక్' : 'Stock'}: {groupVariants.reduce((s, v) => s + v.stock, 0)}
                              </span>
                              {isMulti && (
                                <span className="text-[10px] text-gray-400 font-medium">
                                  {language === 'te' ? 'విస్తరించరండి' : 'Tap ↑ to expand'}
                                </span>
                              )}
                            </div>
                            {!isMulti && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenEdit(first)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-100 text-[10px] font-bold transition-colors"
                                >
                                  <Edit3 size={11} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(first.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 text-[10px] font-bold transition-colors"
                                >
                                  <Trash2 size={11} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expanded Variant Rows */}
                        {isMulti && isExpanded && (
                          <div className="bg-amber-50/20 border-t border-amber-50 divide-y divide-amber-50/60">
                            {groupVariants.map((v) => (
                              <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={v.images[0] || ''}
                                  alt=""
                                  className="w-9 h-9 rounded-lg object-cover border border-amber-100 flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=100&auto=format&fit=crop';
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-bold text-amber-900">{v.weight} {v.unit}</p>
                                  <p className="text-[10px] text-gray-400">SKU: {v.sku} · Stock: {v.stock} · ₹{v.price}</p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleOpenEdit(v)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-100 text-[10px] font-bold"
                                  >
                                    <Edit3 size={10} /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(v.id)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 text-[10px] font-bold"
                                  >
                                    <Trash2 size={10} /> Del
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ─── Add / Edit Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="w-full sm:max-w-2xl bg-white shadow-2xl border border-amber-100 flex flex-col rounded-t-3xl sm:rounded-3xl" style={{maxHeight: '92dvh'}}>

            {/* Modal Header - sticky */}
            <div className="sticky top-0 z-10 bg-white flex justify-between items-center px-6 pt-6 pb-4 border-b border-gray-100 rounded-t-3xl">
              <div>
                <h3 className="font-extrabold text-base text-amber-950 font-heading">
                  {editingProduct
                    ? (language === 'te' ? 'ఉత్పత్తి సవరణ' : 'Edit Product')
                    : modalMode === 'multi'
                    ? (language === 'te' ? 'బహు-పరిమాణాల ఉత్పత్తి చేర్చు' : 'Add Multi-Size Product')
                    : (language === 'te' ? 'కొత్త ఉత్పత్తి చేర్చు' : 'Add New Product')}
                </h3>
                {!editingProduct && modalMode === 'multi' && (
                  <p className="text-[11px] text-amber-800 mt-0.5 font-medium">
                    {language === 'te'
                      ? 'ఒక ఉత్పత్తికి వివిధ పరిమాణాలు (2L, 5L, 3L) జోడించండి'
                      : 'Add different sizes (2L, 5L, 3L) for one product — each with its own price, image & description'}
                  </p>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - scrollable */}
            <div className="overflow-y-auto flex-1">
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">

              {/* ── SINGLE PRODUCT FORM ──────────────────────────────── */}
              {modalMode === 'single' && (
                <>
                  {/* Row 1: Name EN + Name TE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>{t('admin_products_form_name_en')} *</label>
                      <input
                        type="text"
                        className={inputCls}
                        value={singleForm.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSingleForm((p) => ({
                            ...p,
                            name: v,
                            slug: !editingProduct ? makeSlug(v) : p.slug,
                          }));
                        }}
                        placeholder="e.g. Groundnut Oil 1L"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{t('admin_products_form_name_te')} *</label>
                      <input
                        type="text"
                        className={inputCls}
                        value={singleForm.nameTe}
                        onChange={(e) => setSingleForm((p) => ({ ...p, nameTe: e.target.value }))}
                        placeholder="ఉదా: వేరుశనగ నూనె 1 లీ"
                      />
                    </div>
                  </div>

                  {/* Row 2: Slug + Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>{t('admin_products_form_slug')} *</label>
                      <input
                        type="text"
                        className={`${inputCls} font-mono`}
                        value={singleForm.slug}
                        onChange={(e) => setSingleForm((p) => ({ ...p, slug: e.target.value }))}
                        placeholder="groundnut-oil-1l"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{t('admin_products_form_category')} *</label>
                      <CustomSelect
                        value={singleForm.categoryId}
                        onChange={(val) => setSingleForm((p) => ({ ...p, categoryId: val }))}
                        options={categories.map((c) => ({
                          value: c.id,
                          label: language === 'te' ? c.nameTe : c.name,
                        }))}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className={labelCls}>{t('admin_products_form_desc')} *</label>
                    <textarea
                      rows={3}
                      className={inputCls}
                      value={singleForm.description}
                      onChange={(e) => setSingleForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder={language === 'te' ? 'ఉత్పత్తి వివరాలు...' : 'Product detailed description...'}
                    />
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className={labelCls}>
                      <ImageIcon size={10} className="inline mr-1" />
                      {t('admin_products_form_image')}
                      <span className="ml-1 text-amber-600 normal-case font-normal">
                        (Cloudinary upload or paste URL)
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className={`${inputCls} flex-1`}
                        value={singleForm.imageUrl}
                        onChange={(e) => setSingleForm((p) => ({ ...p, imageUrl: e.target.value }))}
                        placeholder="https://res.cloudinary.com/your-cloud/image/upload/..."
                      />
                      <label className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer select-none shrink-0 flex items-center justify-center min-w-[100px] transition-colors">
                        {uploadingSingle ? (
                          <div className="w-3.5 h-3.5 border-2 border-amber-900/30 border-t-amber-900 rounded-full animate-spin" />
                        ) : (
                          language === 'te' ? 'అప్‌లోడ్' : 'Upload File'
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadImage(file, false);
                          }}
                        />
                      </label>
                    </div>
                    {singleForm.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={singleForm.imageUrl} alt="" className="mt-2 w-20 h-20 rounded-xl object-cover border border-amber-100" />
                    )}
                  </div>

                  {/* Weight + Unit + Price + MRP */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className={labelCls}>{t('admin_products_form_weight')} *</label>
                      <input type="number" step="0.1" className={inputCls} value={singleForm.weight}
                        onChange={(e) => setSingleForm((p) => ({ ...p, weight: e.target.value }))}
                        placeholder="1.0" />
                    </div>
                    <div>
                      <label className={labelCls}>{t('admin_products_form_unit')} *</label>
                      <CustomSelect value={singleForm.unit}
                        onChange={(val) => setSingleForm((p) => ({ ...p, unit: val }))}
                        options={unitOptions} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('admin_products_form_price')} *</label>
                      <input type="number" className={inputCls} value={singleForm.price}
                        onChange={(e) => setSingleForm((p) => ({ ...p, price: e.target.value }))}
                        placeholder="280" />
                    </div>
                    <div>
                      <label className={labelCls}>{t('admin_products_form_mrp')}</label>
                      <input type="number" className={inputCls} value={singleForm.mrp}
                        onChange={(e) => setSingleForm((p) => ({ ...p, mrp: e.target.value }))}
                        placeholder="320" />
                    </div>
                  </div>

                  {/* SKU + Stock */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>{t('admin_products_form_sku')} *</label>
                      <input type="text" className={`${inputCls} font-mono`} value={singleForm.sku}
                        onChange={(e) => setSingleForm((p) => ({ ...p, sku: e.target.value }))}
                        placeholder="OIL-GND-1L" />
                    </div>
                    <div>
                      <label className={labelCls}>{t('admin_products_form_stock')} *</label>
                      <input type="number" className={inputCls} value={singleForm.stock}
                        onChange={(e) => setSingleForm((p) => ({ ...p, stock: e.target.value }))}
                        placeholder="50" />
                    </div>
                  </div>

                  {/* Benefits */}
                  <div>
                    <label className={labelCls}>{t('admin_products_form_benefits')}</label>
                    <input type="text" className={inputCls} value={singleForm.benefits}
                      onChange={(e) => setSingleForm((p) => ({ ...p, benefits: e.target.value }))}
                      placeholder={language === 'te' ? 'ఉదా: 100% ప్యూర్, విటమిన్ E కలదు' : 'e.g. 100% Pure, Wood Pressed, Contains Vitamin E'} />
                  </div>
                </>
              )}

              {/* ── MULTI-VARIANT FORM ───────────────────────────────── */}
              {modalMode === 'multi' && (
                <>
                  {/* Shared fields */}
                  <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 space-y-4">
                    <p className="text-[11px] font-black text-amber-900 uppercase tracking-wide">
                      {language === 'te' ? 'ఉత్పత్తి సాధారణ వివరాలు' : 'Common Product Details'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>
                          {language === 'te' ? 'ఉత్పత్తి పేరు (English) *' : 'Product Base Name (English) *'}
                        </label>
                        <input
                          type="text"
                          className={inputCls}
                          value={sharedName}
                          onChange={(e) => {
                            setSharedName(e.target.value);
                            setSharedSlugBase(makeSlug(e.target.value));
                          }}
                          placeholder="e.g. Extra Virgin Olive Oil"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          {language === 'te' ? 'విభాగం *' : 'Category *'}
                        </label>
                        <CustomSelect
                          value={sharedCategoryId}
                          onChange={setSharedCategoryId}
                          options={categories.map((c) => ({
                            value: c.id,
                            label: language === 'te' ? c.nameTe : c.name,
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Variant cards */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wide">
                        {language === 'te' ? 'పరిమాణాలు' : 'Size Variants'}
                      </p>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="flex items-center gap-1.5 text-xs font-bold text-amber-800 border border-amber-200 hover:bg-amber-50 rounded-xl px-3 py-1.5 transition-colors"
                      >
                        <Plus size={13} />
                        {language === 'te' ? 'పరిమాణం చేర్చు' : 'Add Size'}
                      </button>
                    </div>

                    {variants.map((v, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-2xl p-4 space-y-4 relative"
                      >
                        {/* Variant header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black text-amber-900 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                            {language === 'te' ? `పరిమాణం ${idx + 1}` : `Size Variant ${idx + 1}`}
                            {v.weight && v.unit && ` — ${v.weight} ${v.unit}`}
                          </span>
                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVariant(idx)}
                              className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* Name TE + Description */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>
                              {language === 'te' ? 'తెలుగు పేరు' : 'Telugu Name (optional)'}
                            </label>
                            <input
                              type="text"
                              className={inputCls}
                              value={v.variantNameTe}
                              onChange={(e) => updateVariant(idx, 'variantNameTe', e.target.value)}
                              placeholder={`ఉదా: ${sharedName || 'ఉత్పత్తి'} 1లీ`}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>
                              {language === 'te' ? 'వివరణ' : 'Description'}
                            </label>
                            <input
                              type="text"
                              className={inputCls}
                              value={v.description}
                              onChange={(e) => updateVariant(idx, 'description', e.target.value)}
                              placeholder={language === 'te' ? 'ఈ పరిమాణం వివరాలు...' : 'Description for this size...'}
                            />
                          </div>
                        </div>

                        {/* Image URL */}
                        <div>
                          <label className={labelCls}>
                            <ImageIcon size={10} className="inline mr-1" />
                            {language === 'te' ? 'చిత్రం URL' : 'Image URL'}
                            <span className="ml-1 text-amber-600 normal-case font-normal text-[9px]">
                              (Cloudinary upload or paste URL)
                            </span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              className={`${inputCls} flex-1`}
                              value={v.imageUrl}
                              onChange={(e) => updateVariant(idx, 'imageUrl', e.target.value)}
                              placeholder="https://res.cloudinary.com/..."
                            />
                            <label className="bg-amber-100 hover:bg-amber-250 text-amber-900 font-bold text-[10px] px-3 py-2 rounded-xl cursor-pointer select-none shrink-0 flex items-center justify-center min-w-[80px] transition-colors">
                              {uploadingVariantIndex === idx ? (
                                <div className="w-3 h-3 border-2 border-amber-900/30 border-t-amber-900 rounded-full animate-spin" />
                              ) : (
                                language === 'te' ? 'అప్‌లోడ్' : 'Upload File'
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadImage(file, true, idx);
                                }}
                              />
                            </label>
                          </div>
                          {v.imageUrl && (
                            <img src={v.imageUrl} alt="" className="mt-1.5 w-14 h-14 rounded-xl object-cover border border-amber-100" />
                          )}
                        </div>

                        {/* Weight + Unit + Price + MRP */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className={labelCls}>{language === 'te' ? 'బరువు *' : 'Weight *'}</label>
                            <input type="number" step="0.1" className={inputCls}
                              value={v.weight}
                              onChange={(e) => updateVariant(idx, 'weight', e.target.value)}
                              placeholder="1.0" />
                          </div>
                          <div>
                            <label className={labelCls}>{language === 'te' ? 'యూనిట్ *' : 'Unit *'}</label>
                            <CustomSelect
                              value={v.unit}
                              onChange={(val) => updateVariant(idx, 'unit', val)}
                              options={unitOptions}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>{language === 'te' ? 'ధర ₹ *' : 'Price ₹ *'}</label>
                            <input type="number" className={inputCls}
                              value={v.price}
                              onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                              placeholder="290" />
                          </div>
                          <div>
                            <label className={labelCls}>{language === 'te' ? 'MRP ₹' : 'MRP ₹'}</label>
                            <input type="number" className={inputCls}
                              value={v.mrp}
                              onChange={(e) => updateVariant(idx, 'mrp', e.target.value)}
                              placeholder="340" />
                          </div>
                        </div>

                        {/* SKU + Stock */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>{language === 'te' ? 'SKU *' : 'SKU Code *'}</label>
                            <input type="text" className={`${inputCls} font-mono`}
                              value={v.sku}
                              onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                              placeholder={`${sharedSlugBase ? sharedSlugBase.toUpperCase().slice(0, 6) : 'OIL'}-${v.weight || '1'}${v.unit.slice(0, 1).toUpperCase()}`} />
                          </div>
                          <div>
                            <label className={labelCls}>{language === 'te' ? 'స్టాక్ *' : 'Stock *'}</label>
                            <input type="number" className={inputCls}
                              value={v.stock}
                              onChange={(e) => updateVariant(idx, 'stock', e.target.value)}
                              placeholder="50" />
                          </div>
                        </div>

                        {/* Benefits */}
                        <div>
                          <label className={labelCls}>{language === 'te' ? 'ఆరోగ్య ప్రయోజనాలు' : 'Benefits (comma separated)'}</label>
                          <input type="text" className={inputCls}
                            value={v.benefits}
                            onChange={(e) => updateVariant(idx, 'benefits', e.target.value)}
                            placeholder={language === 'te' ? 'ఉదా: 100% ప్యూర్, విటమిన్ E కలదు' : '100% Pure, Wood Pressed, Rich in Vitamin E'} />
                        </div>
                      </div>
                    ))}

                    {/* Add another variant button */}
                    <button
                      type="button"
                      onClick={addVariant}
                      className="w-full border-2 border-dashed border-amber-200 hover:border-amber-500 text-amber-700 hover:text-amber-900 font-bold text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={15} />
                      {language === 'te' ? 'మరో పరిమాణం చేర్చు' : 'Add Another Size Variant'}
                    </button>
                  </div>
                </>
              )}

              {/* Error */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold text-xs flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-amber-800 hover:bg-amber-700 disabled:opacity-60 text-white py-3 rounded-full font-bold text-sm shadow-sm transition-all"
                >
                  {saving
                    ? (language === 'te' ? 'సేవ్ అవుతోంది...' : 'Saving...')
                    : editingProduct
                    ? (language === 'te' ? 'ఉత్పత్తి అప్‌డేట్ చేయి' : 'Update Product')
                    : modalMode === 'multi'
                    ? (language === 'te' ? 'అన్ని పరిమాణాలు సేవ్ చేయి' : `Save ${variants.length} Variants`)
                    : (language === 'te' ? 'ఉత్పత్తి సేవ్ చేయి' : 'Save Product')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-full font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  {language === 'te' ? 'రద్దు' : 'Cancel'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
