import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import ProductDetailClient from './ProductDetailClient';
import { extractBaseName } from '@/hooks/useGroupedProducts';
import { unstable_cache } from 'next/cache';

export const revalidate = 600; // Cache for 10 minutes to save Neon compute

const getProductData = unstable_cache(
  async (slug: string) => {
    try {
    let product = await prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    });

    if (!product && slug.length === 36) { // uuid length fallback
      product = await prisma.product.findUnique({
        where: { id: slug },
        include: { category: true },
      });
    }

    if (!product || !product.isActive) return null;

    // Extract base name to find sibling variants (same product group, different sizes)
    const baseName = extractBaseName(product.name);

    // Fetch all active products in same category that share the same base name
    const allInCategory = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        isActive: true,
      },
    });

    // Filter siblings by base name match
    const siblings = allInCategory
      .filter((p) => extractBaseName(p.name) === baseName)
      .map((p) => ({
        ...p,
        images: (() => {
          try { return JSON.parse(p.images); } catch { return []; }
        })(),
      }));

    // Group other products in the same category by base name to ensure uniqueness
    const relatedGroups: { [key: string]: any[] } = {};
    for (const p of allInCategory) {
      const pBaseName = extractBaseName(p.name);
      if (pBaseName !== baseName) {
        if (!relatedGroups[pBaseName]) {
          relatedGroups[pBaseName] = [];
        }
        relatedGroups[pBaseName].push(p);
      }
    }

    // Pick the representative (lowest price / smallest variant) from each unique group
    const relatedRaw = Object.values(relatedGroups)
      .map((variants) => {
        const sorted = [...variants].sort((a, b) => a.weight - b.weight);
        return sorted[0];
      })
      .slice(0, 4);

    const relatedProducts = relatedRaw.map((p) => ({
      ...p,
      images: (() => {
        try { return JSON.parse(p.images); } catch { return []; }
      })(),
    }));

    // Format current product fields
    const formattedProduct = {
      ...product,
      images: (() => {
        try { return JSON.parse(product.images); } catch { return []; }
      })(),
      benefits: (() => {
        try { return JSON.parse(product.benefits); } catch { return []; }
      })(),
      benefitsTe: (() => {
        try { return product.benefitsTe ? JSON.parse(product.benefitsTe) : []; } catch { return []; }
      })(),
      ingredients: (() => {
        try { return product.ingredients ? JSON.parse(product.ingredients) : []; } catch { return []; }
      })(),
      ingredientsTe: (() => {
        try { return product.ingredientsTe ? JSON.parse(product.ingredientsTe) : []; } catch { return []; }
      })(),
      usage: (() => {
        try { return product.usage ? JSON.parse(product.usage) : []; } catch { return []; }
      })(),
      usageTe: (() => {
        try { return product.usageTe ? JSON.parse(product.usageTe) : []; } catch { return []; }
      })(),
    };

    return { product: formattedProduct, relatedProducts, siblings };
  } catch (err) {
    console.error('Error fetching product detail data:', err);
    return null;
  }
},
['product-detail'],
{ revalidate: 60, tags: ['products'] }
);

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    let product = await prisma.product.findUnique({
      where: { slug: params.slug },
    });

    if (!product && params.slug.length === 36) {
      product = await prisma.product.findUnique({
        where: { id: params.slug },
      });
    }

    if (!product) {
      return {
        title: 'Product Not Found | OM Natural Oils',
        description: 'The requested wood pressed cooking oil could not be found.',
      };
    }

    let imageUrl = '/favicon.ico';
    try {
      const images = JSON.parse(product.images);
      if (Array.isArray(images) && images.length > 0) {
        imageUrl = images[0];
      }
    } catch (e) {}

    const titleStr = `${product.name} (${product.nameTe}) | OM Natural Chekka Ganuga Oils`;
    const descStr = `Buy 100% pure traditional wood pressed ${product.name.toLowerCase()} (${product.nameTe}) online. ${product.description.slice(0, 120)}... Free delivery above ₹500 across AP & TS.`;

    return {
      title: titleStr,
      description: descStr,
      keywords: `${product.name}, ${product.nameTe}, wood pressed oil, cold pressed ${product.name.toLowerCase()}, chekka ganuga nune, organic cooking oil, OM Natural Oils`,
      openGraph: {
        title: titleStr,
        description: descStr,
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 800,
            alt: product.name,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: titleStr,
        description: descStr,
        images: [imageUrl],
      },
    };
  } catch (err) {
    console.error('Error generating metadata:', err);
    return {
      title: 'OM Natural Chekka Ganuga Oils',
      description: '100% Pure Traditional Wood Pressed Cooking Oils',
    };
  }
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const data = await getProductData(params.slug);

  if (!data) {
    notFound();
  }

  // If the user arrived via ID instead of slug, gently redirect to the clean URL
  if (params.slug !== data.product.slug) {
    const { redirect } = await import('next/navigation');
    redirect(`/products/${data.product.slug}`);
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.om-naturals.com';

  // Generate Schema.org Product Structured Data (JSON-LD)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: data.product.name,
    image: data.product.images,
    description: data.product.description,
    sku: data.product.sku,
    brand: {
      '@type': 'Brand',
      name: 'OM Naturals',
    },
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/products/${data.product.slug}`,
      priceCurrency: 'INR',
      price: data.product.price,
      itemCondition: 'https://schema.org/NewCondition',
      availability: data.product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Products',
        item: `${baseUrl}/products`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: data.product.name,
        item: `${baseUrl}/products/${data.product.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-3 sm:px-8 lg:px-12 py-8 flex-1 w-full min-w-0 overflow-x-hidden">
        <div className="mb-4">
          <BackButton />
        </div>
        <ProductDetailClient
          product={data.product}
          relatedProducts={data.relatedProducts}
          siblings={data.siblings}
        />
      </main>
      <Footer />
    </>
  );
}
