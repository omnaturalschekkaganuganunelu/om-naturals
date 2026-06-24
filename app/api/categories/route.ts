import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// GET /api/categories - List all categories
export async function GET(req: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (err: any) {
    console.error('Error fetching categories:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/categories - Create category (Admin Only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, nameTe, slug, image, description, sortOrder } = body;

    if (!name || !slug || !image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingCategory = await prisma.category.findUnique({
      where: { slug },
    });
    if (existingCategory) {
      return NextResponse.json({ error: 'Category with this slug already exists' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        nameTe: nameTe || name,
        slug,
        image,
        description,
        sortOrder: sortOrder ? parseInt(sortOrder.toString()) : 0,
      },
    });

    revalidatePath('/', 'layout');

    return NextResponse.json(category, { status: 201 });
  } catch (err: any) {
    console.error('Error creating category:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
