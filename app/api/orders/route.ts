import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { orderEmitter } from '@/lib/sse';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET /api/orders - Fetch user orders, or all orders for Admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    let orders;

    if (session.user.role === 'ADMIN') {
      const where: any = {};
      if (status) {
        where.orderStatus = status;
      }
      if (date) {
        // Find orders created on exactly this date (local timezone or UTC depending on DB, assume UTC for now)
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        where.createdAt = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
      orders = await prisma.order.findMany({
        where,
        include: {
          items: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      orders = await prisma.order.findMany({
        where: {
          userId: session.user.id,
        },
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(orders);
  } catch (err: any) {
    console.error('Error fetching orders:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/orders - Create a new order
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'உత్తర్వు సృష్టించడానికి దయచేసి లాగిన్ చేయండి. (Please log in to place an order)' }, { status: 401 });
    }

    const body = await req.json();
    const { items, address, couponCode, paymentMethod, notes } = body;

    if (!items || items.length === 0 || !address) {
      return NextResponse.json({ error: 'Missing items or address details' }, { status: 400 });
    }

    // Fetch site settings
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
    });
    const shippingFee = settings?.shippingFee ?? 30;
    const packingFee = settings?.packingFee ?? 20;
    const freeShippingAbove = settings?.freeShippingAbove ?? 500;
    const gstRate = settings?.gstRate ?? 5;

    // Verify products, stock, and calculate subtotal
    let subtotal = 0;
    const itemsToCreate: {
      productId: string;
      name: string;
      nameTe: string;
      price: number;
      quantity: number;
      image: string;
    }[] = [];

    for (const cartItem of items) {
      const product = await prisma.product.findUnique({
        where: { id: cartItem.productId },
      });

      if (!product || !product.isActive) {
        return NextResponse.json({ error: `ఉత్పత్తి లభ్యం కాలేదు: ${cartItem.name}` }, { status: 400 });
      }

      if (product.stock < cartItem.quantity) {
        return NextResponse.json({
          error: `క్షమించండి, ${product.name} తగినంత స్టాక్ లేదు. అందుబాటులో ఉన్న స్టాక్: ${product.stock} (Insufficient stock for ${product.name})`
        }, { status: 400 });
      }

      const itemTotal = product.price * cartItem.quantity;
      subtotal += itemTotal;

      itemsToCreate.push({
        productId: product.id,
        name: product.name,
        nameTe: product.nameTe,
        price: product.price,
        quantity: cartItem.quantity,
        image: JSON.parse(product.images)[0] || '',
      });
    }

    // Apply Coupon if applicable
    let discount = 0;
    let validCouponCode = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });

      if (coupon && coupon.isActive && subtotal >= coupon.minOrderValue) {
        // Verify expiration
        if (!coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()) {
          validCouponCode = coupon.code;
          if (coupon.type === 'PERCENT') {
            discount = (subtotal * coupon.value) / 100;
            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
              discount = coupon.maxDiscount;
            }
          } else {
            discount = coupon.value;
          }
          
          if (discount > subtotal) {
            discount = subtotal;
          }
        }
      }
    }

    // Calculate Tax, Shipping & Packing
    const taxableAmount = subtotal - discount;
    const tax = parseFloat(((taxableAmount * gstRate) / 100).toFixed(2));
    const shipping = taxableAmount >= freeShippingAbove ? 0 : shippingFee;
    const total = parseFloat((taxableAmount + tax + shipping + packingFee).toFixed(2));

    // Custom Order ID
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const customOrderId = `NUNE-${dateStr}-${randomSuffix}`;

    // Execute order creation in transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create the order
      const newOrder = await tx.order.create({
        data: {
          orderId: customOrderId,
          userId: session.user.id,
          name: address.name,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          latitude: address.latitude ? parseFloat(address.latitude) : null,
          longitude: address.longitude ? parseFloat(address.longitude) : null,
          subtotal,
          shipping,
          tax,
          discount,
          total,
          couponCode: validCouponCode,
          paymentMethod,
          paymentStatus: 'PENDING',
          orderStatus: 'PENDING',
          notes: notes || `Packing: ₹${packingFee} + Shipping: ₹${shipping}`,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          items: true,
        },
      });

      // 2. If COD, we can immediately deduct inventory stock
      if (paymentMethod === 'COD') {
        for (const item of itemsToCreate) {
          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          if (updatedProduct.stock < 5) {
            const admin = await tx.user.findFirst({ where: { role: 'ADMIN' } });
            if (admin) {
              await tx.notification.create({
                data: {
                  title: '⚠️ Low Stock Alert!',
                  body: `Product "${updatedProduct.name}" has critically low stock (${updatedProduct.stock} left).`,
                  type: 'INFO',
                  userId: admin.id,
                }
              });
            }
          }
        }
      }

      return newOrder;
    });

    // Broadcast SSE alert for ADMIN
    orderEmitter.emit('new-order', {
      ...order,
      user: {
        name: session.user.name,
        email: session.user.email,
      },
    });

    // Auto-notify user that order was placed
    try {
      await prisma.notification.create({
        data: {
          title: '🛒 Order Placed Successfully!',
          body: `Your order ${order.orderId} for ₹${order.total} has been placed. ${paymentMethod === 'COD' ? 'Pay on delivery.' : 'Complete your payment to confirm.'} Expected delivery in 2-3 days.`,
          type: 'ORDER',
          userId: session.user.id,
          orderId: order.id,
        },
      });
    } catch (notifErr) {
      console.error('Order-placed notification failed:', notifErr);
    }

    // Instantly invalidate the cache globally so the frontend shows accurate live stock!
    if (paymentMethod === 'COD') {
      revalidatePath('/', 'layout');
    }

    // Send Beautiful Order Confirmation Email
    try {
      const itemsHtml = itemsToCreate.map(item => `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
            <div style="display: flex; align-items: center;">
              <img src="${item.image}" width="48" height="48" style="border-radius: 8px; object-fit: cover; margin-right: 16px; border: 1px solid #e5e7eb;" alt="${item.name}" />
              <div>
                <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 15px;">${item.name}</p>
                <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 13px;">Qty: ${item.quantity} × ₹${item.price.toFixed(2)}</p>
              </div>
            </div>
          </td>
          <td style="padding: 16px 0; border-bottom: 1px solid #f3f4f6; text-align: right; color: #111827; font-weight: 700; font-size: 15px;">
            ₹${(item.price * item.quantity).toFixed(2)}
          </td>
        </tr>
      `).join('');

      const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-w: 600px; margin: 0 auto; background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #180e05 0%, #381e02 100%); padding: 32px 20px; text-align: center; border-bottom: 4px solid #d97706;">
          <h1 style="color: #fcd34d; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">OM Naturals</h1>
          <p style="color: #fca5a5; margin: 8px 0 0; font-size: 13px; letter-spacing: 3px; font-weight: 600; text-transform: uppercase;">Chekka Ganuga Oils</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #92400e; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Order Successfully Placed! 🎉</h2>
          <p style="color: #57534e; line-height: 1.6; margin: 0 0 24px 0; font-size: 15px;">Hi <strong style="color: #292524;">${address.name}</strong>,<br>Thank you for choosing OM Naturals! Your freshly extracted, chemical-free cold-pressed oils are being packed with care.</p>
          
          <!-- Order Details Card -->
          <div style="background: #ffffff; border: 1px solid #fef08a; border-radius: 12px; padding: 24px; margin-bottom: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; border-bottom: 2px dashed #fde047; padding-bottom: 16px; margin-bottom: 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: left;">
                    <p style="margin: 0; font-size: 11px; color: #78716c; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Order ID</p>
                    <p style="margin: 4px 0 0 0; font-size: 16px; color: #1c1917; font-weight: 800;">#${customOrderId}</p>
                  </td>
                  <td style="text-align: right;">
                    <p style="margin: 0; font-size: 11px; color: #78716c; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Payment Method</p>
                    <p style="margin: 4px 0 0 0; font-size: 16px; color: #1c1917; font-weight: 800;">${paymentMethod === 'COD' ? 'Cash on Delivery' : 'Prepaid (Online)'}</p>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Items -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              ${itemsHtml}
            </table>

            <!-- Summary -->
            <div style="background: #fafaf9; border-radius: 8px; padding: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #57534e; font-weight: 500;">Subtotal (${itemsToCreate.length} items)</td>
                  <td style="padding: 6px 0; text-align: right; color: #292524; font-weight: 700;">₹${subtotal.toFixed(2)}</td>
                </tr>
                ${validCouponCode ? `
                <tr>
                  <td style="padding: 6px 0; color: #059669; font-weight: 500;">
                    Discount Applied 
                    <span style="background: #d1fae5; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; font-weight: 700; border: 1px solid #34d399;">${validCouponCode}</span>
                  </td>
                  <td style="padding: 6px 0; text-align: right; color: #059669; font-weight: 800;">-₹${discount.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #57534e;">
                    <div style="font-weight: 500;">Taxes (GST ${gstRate}%)</div>
                    <div style="font-size: 11px; color: #a8a29e; margin-top: 2px;">Govt. mandated tax on edible oils</div>
                  </td>
                  <td style="padding: 8px 0; text-align: right; color: #292524; font-weight: 700; vertical-align: top;">₹${tax.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #57534e;">
                    <div style="font-weight: 500;">Shipping & Packing</div>
                    <div style="font-size: 11px; color: #a8a29e; margin-top: 2px;">Secure spill-proof packaging + Delivery fee</div>
                  </td>
                  <td style="padding: 8px 0; text-align: right; color: #292524; font-weight: 700; vertical-align: top;">₹${(shipping + packingFee).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 16px 0 0 0; border-top: 1px solid #e7e5e4;"></td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #92400e; font-size: 18px; font-weight: 800;">Total Amount</td>
                  <td style="padding: 4px 0; text-align: right; color: #92400e; font-size: 24px; font-weight: 900;">₹${total.toFixed(2)}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Tracking Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/account?tab=orders" style="background: linear-gradient(to right, #d97706, #b45309); color: #ffffff; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(180, 83, 9, 0.3); text-transform: uppercase; letter-spacing: 1px;">Track Your Order</a>
          </div>

          <!-- Store Info -->
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; overflow: hidden; text-align: center;">
            <div style="background-color: #fef3c7; padding: 16px; border-bottom: 1px solid #fde68a;">
              <img src="https://cdn-icons-png.flaticon.com/512/854/854878.png" width="32" height="32" alt="Map Pin" style="display: block; margin: 0 auto; opacity: 0.8;" />
            </div>
            <div style="padding: 24px;">
              <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 18px; font-weight: 800;">Visit Our Physical Store</h3>
              <p style="color: #78716c; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5;">Experience the traditional wooden cold-press extraction live at our store in Guntur!</p>
              <a href="https://www.google.com/maps/search/?api=1&query=OM+NATURAL+CHEKKA+GANUGA+NUNE" style="background-color: #f59e0b; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 50px; display: inline-block; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);">View on Google Maps</a>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #1c1917; padding: 24px; text-align: center;">
          <p style="color: #a8a29e; font-size: 12px; margin: 0 0 8px 0; line-height: 1.5;">
            Need help with your order? Contact us at <a href="tel:+918688291288" style="color: #fcd34d; text-decoration: none; font-weight: bold;">+91 86882 91288</a><br>
            or reply directly to this email.
          </p>
          <p style="color: #57534e; font-size: 11px; margin: 0; font-weight: 600;">&copy; ${new Date().getFullYear()} OM Naturals. All Rights Reserved.</p>
        </div>
      </div>
      `;
      
      await sendEmail(session.user.email as string, `Order Confirmation #${customOrderId} - OM Naturals`, emailHtml);
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      order,
      triggerPayment: paymentMethod === 'PHONEPE',
    });
  } catch (err: any) {
    console.error('Error creating order:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
