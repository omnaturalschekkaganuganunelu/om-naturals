// lib/paymentConfirm.ts
import { prisma } from './db';
import { orderEmitter } from './sse';
import { sendOrderConfirmationEmail } from './orderEmail';

/**
 * Confirms a paid order by assigning it a custom sequential order number,
 * checking and decrementing inventory, creating notifications, and sending confirmation email.
 */
export async function confirmPaidOrder(
  dbOrderId: string,
  transactionId: string,
  providerResponse: any
) {
  return await prisma.$transaction(async (tx) => {
    // Acquire exclusive row lock on the order
    const lockedOrders = await tx.$queryRaw<{ id: string; orderId: string; paymentStatus: string; userId: string; total: number }[]>`
      SELECT id, "orderId", "paymentStatus", "userId", "total" FROM "Order" WHERE id = ${dbOrderId} FOR UPDATE
    `;
    const order = lockedOrders[0];

    if (!order) {
      throw new Error(`Order not found for confirmation: ${dbOrderId}`);
    }

    // If order is already completed/paid, just return the order details (fast path)
    if (order.paymentStatus === 'COMPLETED') {
      return await tx.order.findUnique({
        where: { id: dbOrderId },
        include: { items: true },
      });
    }

    // Verify stock first
    const currentOrder = await tx.order.findUnique({
      where: { id: dbOrderId },
      include: { items: true },
    });

    if (!currentOrder) {
      throw new Error(`Order not found for confirmation items: ${dbOrderId}`);
    }

    // Verify and decrement product stocks
    for (const item of currentOrder.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || !product.isActive || product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product "${product?.name || item.productId}"`);
      }
    }

    // 1. Generate the next sequential orderId (e.g. Om-YYYYMMDD-NNNNN)
    // Filter by orderIds starting with 'Om-' to ignore temporary 'UNPAID-' orders
    const orderCount = await tx.order.count({
      where: {
        orderId: { startsWith: 'Om-' },
      },
    });
    const nextNum = orderCount + 1;
    const serialStr = nextNum.toString().padStart(5, '0');

    const today = new Date();
    const y = today.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' });
    const m = today.toLocaleDateString('en-US', { month: '2-digit', timeZone: 'Asia/Kolkata' });
    const day = today.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Kolkata' });
    const dateStr = `${y}${m}${day}`;
    const customOrderId = `Om-${dateStr}-${serialStr}`;

    // 2. Update the order fields
    const updatedOrder = await tx.order.update({
      where: { id: dbOrderId },
      data: {
        orderId: customOrderId,
        paymentStatus: 'COMPLETED',
        orderStatus: 'CONFIRMED',
        transactionRef: transactionId,
      },
      include: {
        items: true,
      },
    });

    // 3. Upsert/Update the Payment record
    const merchantTransactionId = 
      providerResponse?.data?.merchantTransactionId || 
      providerResponse?.merchantTransactionId || 
      providerResponse?.merchantOrderId || 
      `TXN-${dbOrderId}-${Date.now()}`;
    await tx.payment.upsert({
      where: { merchantTransactionId },
      update: {
        status: 'COMPLETED',
        providerResponse: JSON.stringify(providerResponse),
      },
      create: {
        orderId: dbOrderId,
        merchantTransactionId,
        amount: order.total,
        status: 'COMPLETED',
        providerResponse: JSON.stringify(providerResponse),
      },
    });

    // 4. Decrement product stocks and increment salesCount
    const admins = await tx.user.findMany({ where: { role: 'ADMIN' } });
    for (const item of currentOrder.items) {
      const updatedProduct = await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          salesCount: { increment: item.quantity },
        },
      });

      // Stock alerts
      if (updatedProduct.stock < 5 && admins.length > 0) {
        await tx.notification.create({
          data: {
            title: '⚠️ Low Stock Alert!',
            body: `Product "${updatedProduct.name}" has critically low stock (${updatedProduct.stock} left).`,
            type: 'INFO',
            userId: admins[0].id,
          },
        });
      }
    }

    // 5. Create notifications
    // Customer notification
    await tx.notification.create({
      data: {
        title: '💳 Payment Successful!',
        body: `Your payment for Order ${customOrderId} was successful and your order is confirmed.`,
        type: 'ORDER',
        userId: order.userId,
        orderId: dbOrderId,
      },
    });

    // Admin notifications
    for (const admin of admins) {
      await tx.notification.create({
        data: {
          title: '💰 Order Paid!',
          body: `Payment for Order ${customOrderId} (₹${order.total}) was successful.`,
          type: 'ORDER',
          userId: admin.id,
          orderId: dbOrderId,
        },
      });
    }

    // 6. Broadcast SSE events
    orderEmitter.emit('order-update', {
      orderId: dbOrderId,
      status: 'CONFIRMED',
      updatedAt: new Date().toISOString(),
    });

    // 7. Send confirmation email asynchronously
    const user = await tx.user.findUnique({ where: { id: order.userId } });
    if (user?.email) {
      sendOrderConfirmationEmail(dbOrderId, user.email, user.name || 'Customer').catch((emailErr) => {
        console.error(`Email confirmation failed for order ${customOrderId}:`, emailErr);
      });
    }

    return updatedOrder;
  });
}

/**
 * Cleanly deletes a failed checkout order and its payment links to keep db clean.
 */
export async function deleteFailedOrder(dbOrderId: string) {
  try {
    await prisma.order.delete({
      where: { id: dbOrderId },
    });
    console.log(`Failed order record deleted successfully: ${dbOrderId}`);
  } catch (err) {
    console.error(`Error deleting failed order ${dbOrderId}:`, err);
  }
}
