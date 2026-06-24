import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

// GET /api/products - List products with search, filter, and sort
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort');
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN';

    // Build Prisma query filters
    const where: any = {
      price: {
        gte: minPrice,
        lte: maxPrice,
      },
    };

    if (!isAdmin) {
      where.isActive = true;
    }

    if (category) {
      where.category = {
        slug: category,
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameTe: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Build sort options
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price-asc') {
      orderBy = { price: 'asc' };
    } else if (sort === 'price-desc') {
      orderBy = { price: 'desc' };
    } else if (sort === 'popular') {
      orderBy = { stock: 'asc' }; // Mock popularity by lower stock or other criteria
    }

    const products = await prisma.product.findMany({
      where,
      orderBy,
      include: {
        category: true,
      },
    });

    // Parse JSON string arrays
    const formattedProducts = products.map((p) => ({
      ...p,
      images: JSON.parse(p.images),
      benefits: JSON.parse(p.benefits),
      ingredients: p.ingredients ? JSON.parse(p.ingredients) : [],
      usage: p.usage ? JSON.parse(p.usage) : [],
    }));

    return NextResponse.json(formattedProducts);
  } catch (err: any) {
    console.error('Error fetching products:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/products - Create new product (Admin Only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      nameTe,
      slug,
      description,
      images,
      price,
      mrp,
      sku,
      stock,
      unit,
      weight,
      categoryId,
      benefits,
      benefitsTe,
      ingredients,
      ingredientsTe,
      usage,
      usageTe,
    } = body;

    // Validation
    if (!name || !slug || !description || !price || !categoryId || !sku) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check slug uniqueness
    const existingProduct = await prisma.product.findUnique({
      where: { slug },
    });
    if (existingProduct) {
      return NextResponse.json({ error: 'Product with this slug already exists' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        nameTe: nameTe || name,
        slug,
        description,
        images: JSON.stringify(images || []),
        price: parseFloat(price.toString()),
        mrp: parseFloat(mrp ? mrp.toString() : price.toString()),
        sku,
        stock: parseInt(stock.toString() || '0'),
        unit: unit || 'Piece',
        weight: parseFloat(weight?.toString() || '1'),
        categoryId,
        benefits: JSON.stringify(benefits || []),
        benefitsTe: benefitsTe ? JSON.stringify(benefitsTe) : null,
        ingredients: JSON.stringify(ingredients || []),
        ingredientsTe: ingredientsTe ? JSON.stringify(ingredientsTe) : null,
        usage: JSON.stringify(usage || []),
        usageTe: usageTe ? JSON.stringify(usageTe) : null,
        isActive: true,
      },
    });

    revalidatePath('/', 'layout');

    return NextResponse.json(product);
  } catch (err: any) {
    console.error('Error creating product:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
