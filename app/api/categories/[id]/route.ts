import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// PUT /api/categories/[id] - Update category (Admin Only)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, nameTe, slug, image, description, sortOrder, isActive } = body;

    const categoryExists = await prisma.category.findUnique({ where: { id } });
    if (!categoryExists) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        nameTe,
        slug,
        image,
        description,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder.toString()) : undefined,
        isActive,
      },
    });

    revalidatePath('/', 'layout');

    return NextResponse.json(updatedCategory);
  } catch (err: any) {
    console.error('Error updating category:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/categories/[id] - Delete category (Admin Only)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 401 });
    }

    const { id } = params;

    const categoryExists = await prisma.category.findUnique({ where: { id } });
    if (!categoryExists) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if there are products in this category
    const productsCount = await prisma.product.count({
      where: { categoryId: id },
    });
    if (productsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category containing products. Reassign or delete products first.' },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });

    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting category:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
