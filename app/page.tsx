import React from 'react';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HomePageClient from '@/app/HomePageClient';

export const revalidate = 600; // Cache for 10 minutes to save Neon compute

async function getHomeData() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    const formattedProducts = products.map((p) => ({
      ...p,
      images: JSON.parse(p.images),
      benefits: JSON.parse(p.benefits),
      ingredients: p.ingredients ? JSON.parse(p.ingredients) : [],
      usage: p.usage ? JSON.parse(p.usage) : [],
    }));

    return { categories, products: formattedProducts };
  } catch (err) {
    console.error('Error loading home data:', err);
    return { categories: [], products: [] };
  }
}

export default async function HomePage() {
  const { categories, products } = await getHomeData();

  return (
    <>
      <Navbar />
      <HomePageClient categories={categories} products={products as any} />
      <Footer />
    </>
  );
}
