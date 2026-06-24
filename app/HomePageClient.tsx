'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';
import { Shield, Sparkles, Truck, Award, ArrowRight, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useGroupedProducts } from '@/hooks/useGroupedProducts';

import { useRealtime } from '@/hooks/useRealtime';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=500&auto=format&fit=crop';

// ─── Home page product grid with client-side variant grouping ────────────────
// Defined before HomePageClient so it's available when JSX is evaluated
function HomePageProductGrid({ products }: { products: any[] }) {
  const grouped = useGroupedProducts(products);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
      {grouped.map((grp) => (
        <ProductCard key={grp.groupKey} group={grp} />
      ))}
    </div>
  );
}

interface Category {
  id: string;
  name: string;
  nameTe: string;
  slug: string;
  image: string;
  description?: string | null;
}

interface Product {
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
  isActive: boolean;
  [key: string]: any;
}

interface Props {
  categories: Category[];
  products: Product[];
}

export default function HomePageClient({ categories, products }: Props) {
  const { t, language } = useLanguage();
  const [heroImgError, setHeroImgError] = useState(false);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  
  // Realtime products state
  const [liveProducts, setLiveProducts] = useState(products);

  useRealtime('Product', '*', (payload) => {
    if (payload.eventType === 'UPDATE') {
      const updated = payload.new;
      setLiveProducts(prev => prev.map(p => {
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
      }));
    } else if (payload.eventType === 'INSERT') {
      const newProd = payload.new;
      const formatted = {
        ...newProd,
        images: typeof newProd.images === 'string' ? JSON.parse(newProd.images || '[]') : newProd.images,
        benefits: typeof newProd.benefits === 'string' ? JSON.parse(newProd.benefits || '[]') : newProd.benefits,
        ingredients: typeof newProd.ingredients === 'string' ? JSON.parse(newProd.ingredients || '[]') : newProd.ingredients,
        usage: typeof newProd.usage === 'string' ? JSON.parse(newProd.usage || '[]') : newProd.usage,
      };
      setLiveProducts(prev => [formatted, ...prev]);
    } else if (payload.eventType === 'DELETE') {
      setLiveProducts(prev => prev.filter(p => p.id !== payload.old.id));
    }
  });

  const reviews = [
    {
      quote_en: '"The sesame oil has a beautiful traditional aroma — our curries and chutneys have never tasted better. Placing another order for groundnut oil soon!"',
      quote_te: '"నువ్వుల నూనె వంటలకు చాలా అద్భుతంగా ఉంది. కూరలకూ, పచ్చళ్ళకూ అసలైన కమ్మని రుచి వస్తోంది."',
      name_en: 'Ramarao, Guntur',
      name_te: 'రామారావు, గుంటూరు',
      initial: 'R',
      rating: 5,
    },
    {
      quote_en: '"The cold pressed almond (badam) oil is extremely premium. My skin and hair have never felt better, and it has a wonderful natural fragrance."',
      quote_te: '"చెక్క గానుగ ద్వారా తీసిన బాదం నూనె చాలా అద్భుతంగా ఉంది. జుట్టు మరియు చర్మ సంరక్షణకు ఇది చాలా మేలు చేస్తుంది, మరియు సహజ సిద్ధమైన సువాసనతో ఉంది."',
      name_en: 'Venkatesh, Vijayawada',
      name_te: 'వెంకటేష్, విజయవాడ',
      initial: 'V',
      rating: 5,
    },
    {
      quote_en: '"I regularly order their wooden pressed groundnut and mustard oils. The taste of our daily curries has improved so much. Highly recommended!"',
      quote_te: '"నేను ప్రతి నెలా వేరుశనగ మరియు ఆవ నూనెలు ఇక్కడే కొంటాను. మా ఇంట్లో వండే కూరలు చాలా రుచికరంగా ఉంటున్నాయి. అందరూ తప్పక వాడవచ్చు!"',
      name_en: 'Srinivas, Rajahmundry',
      name_te: 'శ్రీనివాస్, రాజమండ్రి',
      initial: 'S',
      rating: 5,
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  return (
    <main className="flex-1 pb-16">
      

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex flex-col sm:flex-row justify-between items-baseline mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-amber-950 font-heading">{t('products_heading')}</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('products_sub')}</p>
          </div>
          <Link
            href="/products"
            className="text-amber-800 hover:text-amber-600 text-xs sm:text-sm font-bold flex items-center space-x-1 group mt-2 sm:mt-0"
          >
            <span>{t('products_view_all')}</span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <HomePageProductGrid products={liveProducts} />
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-amber-950 font-heading">{t('categories_heading')}</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">{t('categories_sub')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} cat={cat} language={language} />
          ))}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-gradient-to-r from-amber-50 to-amber-50/50 border-y border-amber-100 mt-20 py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: <Shield size={24} className="fill-amber-700/5" />, heading: t('trust_chemical_free'), sub: t('trust_chemical_sub') },
            { icon: <Award size={24} />, heading: t('trust_woodpress'), sub: t('trust_woodpress_sub') },
            { icon: <Sparkles size={24} />, heading: t('trust_pure'), sub: t('trust_pure_sub') },
            { icon: <Truck size={24} />, heading: t('trust_delivery'), sub: t('trust_delivery_sub') },
          ].map(({ icon, heading, sub }) => (
            <div key={heading} className="space-y-3 flex flex-col items-center group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-amber-700 shadow-sm border border-amber-100 group-hover:shadow-md group-hover:-translate-y-1 transition-all duration-300">
                {icon}
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-amber-950">{heading}</h4>
              <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Carousel (Telugu Reel / Story style) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="inline-flex items-center space-x-1.5 bg-amber-100 text-amber-950 text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase border border-amber-200 shadow-sm mb-3">
            <span>{t('testimonials_heading')}</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-amber-950 font-heading">
            {language === 'te' ? 'మన కస్టమర్ల అనుభవాలు' : 'What Our Family Says'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            {language === 'te' 
              ? 'స్వచ్ఛమైన గానుగ నూనెలు వాడిన కస్టమర్ల నిజాయితీ గల అభిప్రాయాలు.' 
              : 'Honest reviews from customers using our wood-pressed edible oils.'}
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-xl mx-auto">
          {/* Card Frame resembling a premium Reel story */}
          <div className="bg-gradient-to-br from-white to-amber-50/20 p-8 rounded-3xl border border-amber-200/60 shadow-xl overflow-hidden min-h-[240px] flex flex-col justify-between relative group hover:border-amber-400 transition-all duration-300">
            {/* Glowing amber background highlight */}
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />
            
            {/* Large Decorative Quote icon */}
            <span className="absolute top-4 right-6 text-7xl font-serif text-amber-200/50 pointer-events-none select-none leading-none">
              “
            </span>

            {/* Stars */}
            <div className="flex space-x-1 mb-4 relative z-10">
              {[...Array(reviews[activeReviewIndex].rating)].map((_, i) => (
                <span key={i} className="text-amber-400 text-sm animate-pulse">★</span>
              ))}
            </div>

            {/* Quote Text */}
            <div className="flex-1 relative z-10 transition-all duration-500 transform animate-fade-in-up">
              <p className="text-sm sm:text-base text-amber-950/90 font-medium italic leading-relaxed">
                {language === 'te' ? reviews[activeReviewIndex].quote_te : reviews[activeReviewIndex].quote_en}
              </p>
            </div>

            {/* Author details */}
            <div className="mt-6 flex items-center space-x-3.5 relative z-10 pt-4 border-t border-amber-100/50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white font-black flex items-center justify-center text-sm shadow-md uppercase">
                {reviews[activeReviewIndex].initial}
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-950">
                  {language === 'te' ? reviews[activeReviewIndex].name_te : reviews[activeReviewIndex].name_en}
                </h4>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                  <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wide">
                    {t('testimonial_verified')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Indicators / Navigation Dots */}
          <div className="flex justify-center items-center space-x-2.5 mt-6">
            {reviews.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveReviewIndex(index)}
                className={`transition-all duration-300 rounded-full ${
                  activeReviewIndex === index 
                    ? 'w-6 h-2 bg-amber-800' 
                    : 'w-2 h-2 bg-amber-200 hover:bg-amber-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>


      {/* Floating WhatsApp CTA */}
      <a
        href={`https://wa.me/918688291288?text=${encodeURIComponent(t('misc_whatsapp_cta'))}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-full shadow-2xl z-40 transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2 font-bold text-sm"
      >
        <MessageCircle size={20} className="fill-white/10" />
        <span className="hidden sm:inline">{t('misc_help')}</span>
      </a>
    </main>
  );
}

function CategoryCard({ cat, language }: { cat: Category; language: string }) {
  const [imgError, setImgError] = useState(false);
  
  // Use local images to ensure they load properly and don't rely on external URLs
  const localImage = cat.slug === 'cold-pressed'
    ? '/images/categories/cold_pressed.png'
    : '/images/categories/refined_filtered.png';

  // If DB image is unsplash or missing, use local image
  const isExternalOrBroken = !cat.image || cat.image.includes('unsplash') || imgError;
  const imgSrc = isExternalOrBroken ? localImage : cat.image;

  const catName = language === 'te' ? (cat.nameTe || cat.name) : cat.name;
  const catDesc = cat.description || '';

  return (
    <Link
      href={`/products?category=${cat.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-amber-100 shadow-sm hover:shadow-lg transition-all duration-300 aspect-[16/9] flex items-end p-6 bg-amber-900"
    >
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/45 transition-colors duration-300 z-10" />
      <Image
        src={imgSrc}
        alt={catName}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover group-hover:scale-105 transition-transform duration-500"
        onError={() => setImgError(true)}
      />
      <div className="relative z-20 text-white space-y-1">
        <h3 className="text-lg sm:text-xl font-black font-heading leading-tight">{catName}</h3>
        <p className="text-[11px] sm:text-xs text-amber-200 line-clamp-2 max-w-sm leading-relaxed">{catDesc}</p>
      </div>
      <div className="absolute top-4 right-4 z-20 bg-white/20 backdrop-blur-sm p-2.5 rounded-full text-white group-hover:bg-amber-600 transition-all duration-200 group-hover:scale-110">
        <ArrowRight size={16} />
      </div>
    </Link>
  );
}
