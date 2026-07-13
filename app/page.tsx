import React from 'react';
import { prisma } from '@/lib/db';
import HomePageClient from '@/app/HomePageClient';

export const revalidate = 86400; // 24 hours - relies on on-demand admin revalidatePath for updates

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "OM Natural Chekka Ganuga Nunelu",
    "image": "https://www.om-naturals.com/images/hero_cooking_oils.png",
    "@id": "https://www.om-naturals.com/#localbusiness",
    "url": "https://www.om-naturals.com",
    "telephone": "+918688291288",
    "priceRange": "₹₹",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "D.No. 126-137, Sri Lakshmi Narasimha Nagar, 5th Line, Inner Ring Road, Gorantla",
      "addressLocality": "Guntur",
      "addressRegion": "Andhra Pradesh",
      "postalCode": "522034",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 16.3312015,
      "longitude": 80.4072242
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ],
      "opens": "09:00",
      "closes": "20:00"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageClient categories={categories} products={products as any} />
    </>
  );
}
