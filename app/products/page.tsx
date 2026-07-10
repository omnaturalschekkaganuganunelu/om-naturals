import React from 'react';
import { prisma } from '@/lib/db';
import ProductListingClient from './ProductListingClient';
import { unstable_cache } from 'next/cache';

export const revalidate = 600; // Cache for 10 minutes to save Neon compute

const getCatalogData = unstable_cache(
  async () => {
    try {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: {
          category: {
            select: { id: true, name: true, nameTe: true, slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formattedProducts = products.map((p) => ({
        ...p,
        images: JSON.parse(p.images),
        benefits: JSON.parse(p.benefits),
        benefitsTe: p.benefitsTe ? JSON.parse(p.benefitsTe) : [],
        ingredients: p.ingredients ? JSON.parse(p.ingredients) : [],
        usage: p.usage ? JSON.parse(p.usage) : [],
      }));

      return { categories, products: formattedProducts };
    } catch (err) {
      console.error('Error fetching catalog data:', err);
      return { categories: [], products: [] };
    }
  },
  ['catalog-data'],
  { revalidate: 600, tags: ['categories', 'products'] }
);

export default async function ProductListingPage() {
  const { categories, products } = await getCatalogData();

  return (
    <ProductListingClient
      initialProducts={products}
      initialCategories={categories}
    />
  );
}
