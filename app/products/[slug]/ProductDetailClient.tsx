'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, ShoppingBag, Check, Plus, Minus, ShieldCheck, Truck } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useLanguage } from '@/context/LanguageContext';

interface ProductDetailClientProps {
  product: {
    id: string;
    name: string;
    nameTe: string;
    slug: string;
    description: string;
    images: string[];
    price: number;
    mrp: number;
    stock: number;
    unit: string;
    weight: number;
    benefits: string[];
    ingredients: string[];
    usage: string[];
    category: {
      name: string;
      nameTe: string;
      slug: string;
    };
  };
  relatedProducts: any[];
}

export default function ProductDetailClient({ product, relatedProducts }: ProductDetailClientProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const { t, language } = useLanguage();
  
  const [activeImage, setActiveImage] = useState(product.images[0] || '/images/placeholder.jpg');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'benefits' | 'ingredients' | 'usage'>('details');

  const getUnitTranslation = (unit: string) => {
    switch (unit.toLowerCase()) {
      case 'litre':
      case 'liter':
        return t('misc_litre');
      case 'gram':
        return t('misc_gram');
      case 'kg':
      case 'kilogram':
        return t('misc_kg');
      case 'pack':
        return t('misc_pack');
      case 'piece':
        return t('misc_piece');
      default:
        return unit;
    }
  };

  const getStockStatus = () => {
    if (outOfStock) {
      return <span className="text-red-600 font-bold">{t('misc_out_of_stock')}</span>;
    }
    if (product.stock < 10) {
      return (
        <span className="text-amber-600 font-bold">
          {t('misc_hurry').replace('{count}', product.stock.toString())}
        </span>
      );
    }
    return <span className="text-green-600 font-bold">{t('misc_in_stock')}</span>;
  };


  const discountPercent = Math.round(((product.mrp - product.price) / product.mrp) * 100);
  const outOfStock = product.stock <= 0;

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = (shouldRedirect = false) => {
    if (outOfStock) return;

    addItem({
      productId: product.id,
      name: product.name,
      nameTe: product.nameTe,
      price: product.price,
      mrp: product.mrp,
      quantity,
      image: product.images[0] || '/images/placeholder.jpg',
      weight: product.weight,
      unit: product.unit,
      stock: product.stock,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);

    if (shouldRedirect) {
      router.push('/cart');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
      
      {/* Breadcrumbs */}
      <div className="text-xs text-gray-500 mb-6 flex flex-wrap items-center gap-1.5 font-medium min-w-0">
        <span className="hover:text-amber-800 cursor-pointer shrink-0" onClick={() => router.push('/')}>{t('nav_home')}</span>
        <span className="text-gray-400">/</span>
        <span className="hover:text-amber-800 cursor-pointer shrink-0" onClick={() => router.push('/products')}>{t('products_title')}</span>
        <span className="text-gray-400">/</span>
        <span className="hover:text-amber-800 cursor-pointer shrink-0" onClick={() => router.push(`/products?category=${product.category.slug}`)}>
          {(language === 'te' ? product.category.nameTe : product.category.name).split('(')[0]}
        </span>
        <span className="text-gray-400">/</span>
        <span className="text-amber-950 font-semibold truncate max-w-[200px] sm:max-w-xs">{language === 'te' ? product.nameTe : product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 bg-white border border-amber-100 rounded-3xl p-6 sm:p-8 smooth-shadow">
        
        {/* Left Side: Images View */}
        <div className="md:col-span-5 space-y-4">
          <div className="aspect-square bg-amber-50/20 rounded-2xl overflow-hidden relative border border-amber-50">
            {discountPercent > 0 && !outOfStock && (
              <div className="absolute top-4 left-4 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full z-10">
                {discountPercent}% OFF
              </div>
            )}
            {outOfStock && (
              <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full z-10">
                {t('products_out_of_stock')}
              </div>
            )}
            <img
              src={activeImage}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=500&auto=format&fit=crop';
              }}
            />
          </div>

          {/* Multiple Thumbnails (if available, fallback to single thumbs grid) */}
          <div className="flex space-x-3 overflow-x-auto pb-1">
            {product.images.map((img, index) => (
              <button
                key={index}
                onClick={() => setActiveImage(img)}
                className={`w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-colors ${
                  activeImage === img ? 'border-amber-600' : 'border-amber-100 hover:border-amber-300'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=100&auto=format&fit=crop';
                }} />
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Product Details */}
        <div className="md:col-span-7 space-y-6">
          <div>
            <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-100 rounded-full px-3 py-1">
              {product.weight} {getUnitTranslation(product.unit)} ({product.weight} {product.unit})
            </span>
            <h1 className="text-xl sm:text-3xl font-extrabold text-amber-950 font-heading mt-3 leading-snug">
              {language === 'te' ? product.nameTe : product.name}
            </h1>
            <h2 className="text-sm sm:text-base text-gray-500 font-medium mt-1">
              {language === 'te' ? product.name : product.nameTe}
            </h2>
          </div>

          {/* Star reviews block */}
          <div className="flex items-center space-x-2 border-y border-amber-50 py-3 text-xs sm:text-sm">
            <span className="text-amber-500 font-bold">★★★★★</span>
            <span className="text-gray-500">
              {language === 'te' ? '(4.8 / 5 నక్షత్రాలు)' : '(4.8 / 5 stars)'}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-amber-800 font-semibold">24 {t('misc_reviews')}</span>
          </div>

          {/* Price Block */}
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-900">₹{product.price}</span>
              {product.mrp > product.price && (
                <>
                  <span className="text-sm sm:text-base text-gray-400 line-through">₹{product.mrp}</span>
                  <span className="text-xs sm:text-sm text-green-600 font-extrabold">
                    ({language === 'te' ? 'సేవ్' : 'Save'} ₹{product.mrp - product.price})
                  </span>
                </>
              )}
            </div>
            <p className="text-[10px] text-gray-400">{t('misc_price_inclusive')}</p>
          </div>

          {/* Stock display */}
          <div className="text-xs">
            {getStockStatus()}
          </div>

          {/* Quantity Selector & Action buttons */}
          {!outOfStock && (
            <div className="space-y-4 border-t border-amber-50 pt-6">
              
              {/* Qty Selector */}
              <div className="flex items-center space-x-4">
                <span className="text-xs sm:text-sm font-bold text-amber-950">{t('misc_quantity')}</span>
                <div className="flex items-center border border-amber-200 rounded-full py-1 px-1.5 bg-amber-50/20">
                  <button
                    onClick={handleDecrement}
                    className="p-1 rounded-full text-amber-800 hover:bg-amber-100 disabled:text-gray-300"
                    disabled={quantity <= 1}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="px-4 font-bold text-xs sm:text-sm text-amber-950">{quantity}</span>
                  <button
                    onClick={handleIncrement}
                    className="p-1 rounded-full text-amber-800 hover:bg-amber-100 disabled:text-gray-300"
                    disabled={quantity >= product.stock}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleAddToCart(false)}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                    added
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-amber-100 hover:bg-amber-200/80 text-amber-950 border border-amber-200 shadow-sm'
                  }`}
                >
                  {added ? (
                    <>
                      <Check size={16} />
                      <span>{t('products_added')}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={16} />
                      <span>{t('misc_add_to_cart')}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleAddToCart(true)}
                  className="flex items-center justify-center space-x-2 py-3 px-4 bg-amber-800 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-full shadow-md hover:shadow-lg transition-all"
                >
                  <ShoppingBag size={16} />
                  <span>{t('misc_buy_now')}</span>
                </button>
              </div>

            </div>
          )}

          {/* Quick Local Promises */}
          <div className="border-t border-amber-50 pt-6 grid grid-cols-2 gap-4 text-xs font-semibold text-amber-950">
            <div className="flex items-center space-x-2">
              <ShieldCheck size={18} className="text-amber-700 shrink-0" />
              <span>{language === 'te' ? '100% ప్యూర్ & నమ్మకమైనది' : '100% Pure & Trustworthy'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Truck size={18} className="text-amber-700 shrink-0" />
              <span>{language === 'te' ? 'సులువైన డెలివరీ (24-48 గం.)' : 'Easy Delivery (24-48 hrs)'}</span>
            </div>
          </div>

        </div>

      </div>

      {/* Product Spec Tabs */}
      <section className="mt-12 bg-white border border-amber-100 rounded-3xl p-6 sm:p-8 smooth-shadow">
        
        {/* Tabs Headers */}
        <div className="flex border-b border-amber-100 overflow-x-auto no-scrollbar space-x-6 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 border-b-2 transition-colors duration-250 ${
              activeTab === 'details' ? 'border-amber-700 text-amber-950' : 'border-transparent text-gray-500 hover:text-amber-800'
            }`}
          >
            {t('misc_description')}
          </button>
          <button
            onClick={() => setActiveTab('benefits')}
            className={`pb-3 border-b-2 transition-colors duration-250 ${
              activeTab === 'benefits' ? 'border-amber-700 text-amber-950' : 'border-transparent text-gray-500 hover:text-amber-800'
            }`}
          >
            {t('misc_benefits')}
          </button>
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`pb-3 border-b-2 transition-colors duration-250 ${
              activeTab === 'ingredients' ? 'border-amber-700 text-amber-950' : 'border-transparent text-gray-500 hover:text-amber-800'
            }`}
          >
            {t('misc_ingredients')}
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`pb-3 border-b-2 transition-colors duration-250 ${
              activeTab === 'usage' ? 'border-amber-700 text-amber-950' : 'border-transparent text-gray-500 hover:text-amber-800'
            }`}
          >
            {t('misc_usage')}
          </button>
        </div>

        {/* Tab Body */}
        <div className="mt-6 text-xs sm:text-sm text-gray-600 leading-relaxed font-medium">
          {activeTab === 'details' && (
            <div className="space-y-2">
              <p>{product.description}</p>
            </div>
          )}
          {activeTab === 'benefits' && (
            <ul className="list-disc list-inside space-y-2 text-amber-950">
              {product.benefits.map((b, idx) => (
                <li key={idx}>{b}</li>
              ))}
            </ul>
          )}
          {activeTab === 'ingredients' && (
            <div className="space-y-2">
              <span className="font-bold text-amber-950 block">{t('misc_ingredients_label')}</span>
              <ul className="list-disc list-inside space-y-1">
                {product.ingredients.map((ing, idx) => (
                  <li key={idx}>{ing}</li>
                ))}
              </ul>
            </div>
          )}
          {activeTab === 'usage' && (
            <div className="space-y-2">
              <span className="font-bold text-amber-950 block">{t('misc_usage_label')}</span>
              <ul className="list-disc list-inside space-y-1">
                {product.usage.map((use, idx) => (
                  <li key={idx}>{use}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </section>

      {/* Related Products Grid */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl sm:text-2xl font-extrabold text-amber-950 font-heading mb-6">{t('misc_related_products')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((rel) => (
              <div key={rel.id} className="h-full">
                <img
                  src={JSON.parse(rel.images)[0] || '/images/placeholder.jpg'}
                  alt={rel.name}
                  onClick={() => router.push(`/products/${rel.slug}`)}
                  className="w-full aspect-square object-cover rounded-xl cursor-pointer hover:opacity-90 border border-amber-50"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=300&auto=format&fit=crop';
                  }}
                />
                <div className="mt-2 text-xs sm:text-sm font-bold text-amber-950 line-clamp-1 cursor-pointer hover:text-amber-800" onClick={() => router.push(`/products/${rel.slug}`)}>
                  {language === 'te' ? rel.nameTe : rel.name}
                </div>
                <div className="text-xs text-amber-800 font-extrabold mt-0.5">₹{rel.price}</div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
