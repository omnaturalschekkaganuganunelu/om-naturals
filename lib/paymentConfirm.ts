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
  // 1. Run core transaction (lock order, check stock, update order/payment details, decrement stock)
  // Set explicit 15s timeout to support slow/cold DB connections
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Acquire a pessimistic row lock on the site settings singleton to serialize global sequential orderId generation
    await tx.$executeRaw`SELECT 1 FROM "SiteSettings" WHERE "id" = 'singleton' FOR UPDATE`;

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

    // Generate the next sequential orderId (e.g. Om-YYYYMMDD-NNNNN)
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

    // Update the order fields
    const updated = await tx.order.update({
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

    // Upsert/Update the Payment record
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

    // Decrement product stocks and increment salesCount
    for (const item of currentOrder.items) {
      const updatedProduct = await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          salesCount: { increment: item.quantity },
        },
      });

      if (updatedProduct.stock < 0) {
        throw new Error(`Stock went below zero for product "${updatedProduct.name}"`);
      }
    }

    return updated;
  }, {
    timeout: 15000,
    maxWait: 5000,
  });

  if (!updatedOrder) {
    throw new Error('Failed to confirm order within transaction.');
  }

  // 2. Perform out-of-transaction, async tasks (notifications, SSE, emails)
  // This speeds up the database transaction significantly and prevents lock timeouts.
  try {
    const customOrderId = updatedOrder.orderId;
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });

    // Stock alerts
    for (const item of updatedOrder.items) {
      const p = await prisma.product.findUnique({ where: { id: item.productId } });
      if (p && p.stock < 5 && admins.length > 0) {
        await prisma.notification.create({
          data: {
            title: '⚠️ Low Stock Alert!',
            body: `Product "${p.name}" has critically low stock (${p.stock} left).`,
            type: 'INFO',
            userId: admins[0].id,
          },
        }).catch(err => console.error('Error creating stock alert notification:', err));
      }
    }

    // Customer confirmation notification
    await prisma.notification.create({
      data: {
        title: '💳 Payment Successful!',
        body: `Your payment for Order ${customOrderId} was successful and your order is confirmed.`,
        type: 'ORDER',
        userId: updatedOrder.userId,
        orderId: dbOrderId,
      },
    }).catch(err => console.error('Error creating customer notification:', err));

    // Admin confirmation notifications
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          title: '💰 Order Paid!',
          body: `Payment for Order ${customOrderId} (₹${updatedOrder.total}) was successful.`,
          type: 'ORDER',
          userId: admin.id,
          orderId: dbOrderId,
        },
      }).catch(err => console.error('Error creating admin notification:', err));
    }

    // Broadcast SSE order-update event
    orderEmitter.emit('order-update', {
      orderId: dbOrderId,
      status: 'CONFIRMED',
      updatedAt: new Date().toISOString(),
    });

    // Send confirmation email asynchronously via a background fetch (keeps the main checkout status poll fast)
    const user = await prisma.user.findUnique({ where: { id: updatedOrder.userId } });
    if (user?.email && !user.email.endsWith('@no-email.com')) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.om-naturals.com';
      fetch(`${appUrl}/api/orders/${dbOrderId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, name: user.name || 'Customer' }),
        keepalive: true,
      }).catch((emailErr) => {
        console.error(`Background email trigger failed for order ${customOrderId}:`, emailErr);
      });
    }
  } catch (asyncErr) {
    console.error('Error executing post-confirmation activities:', asyncErr);
  }

  return updatedOrder;
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
