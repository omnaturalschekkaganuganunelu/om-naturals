import { sendEmail } from './email';
import { prisma } from './db';

export const sendOrderConfirmationEmail = async (orderId: string, userEmail: string, userName: string) => {
  try {
    if (!userEmail || userEmail.endsWith('@no-email.com')) {
      return true; // Skip sending email since user doesn't have an email address
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return false;

    // Calculate exact packing fee and GST rate dynamically from order totals
    const calculatedPacking = order.total - order.subtotal + (order.discount || 0) - (order.tax || 0) - order.shipping;
    const packingFee = Math.max(0, Math.round(calculatedPacking * 100) / 100);
    const gstRate = order.tax > 0 && (order.subtotal - (order.discount || 0)) > 0 
      ? Math.round((order.tax / (order.subtotal - (order.discount || 0))) * 100) 
      : 0;
    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
          <div style="display: flex; align-items: center;">
            <img src="${item.image}" width="48" height="48" style="border-radius: 8px; object-fit: contain; padding: 2px; background-color: #fafaf9; margin-right: 16px; border: 1px solid #f5f5f4;" alt="${item.name}" />
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
        <p style="color: #57534e; line-height: 1.6; margin: 0 0 24px 0; font-size: 15px;">Hi <strong style="color: #292524;">${userName}</strong>,<br>Thank you for choosing OM Naturals! Your freshly extracted, chemical-free cold-pressed oils are being packed with care.</p>
        
        <!-- Order Details Card -->
        <div style="background: #ffffff; border: 1px solid #fef08a; border-radius: 12px; padding: 24px; margin-bottom: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px dashed #fde047; padding-bottom: 16px; margin-bottom: 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="text-align: left;">
                  <p style="margin: 0; font-size: 11px; color: #78716c; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Order ID</p>
                  <p style="margin: 4px 0 0 0; font-size: 16px; color: #1c1917; font-weight: 800;">#${order.orderId}</p>
                </td>
                <td style="text-align: right;">
                  <p style="margin: 0; font-size: 11px; color: #78716c; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Payment Method</p>
                  <p style="margin: 4px 0 0 0; font-size: 16px; color: #1c1917; font-weight: 800;">${order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Prepaid (Online)'}</p>
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
                <td style="padding: 6px 0; color: #57534e; font-weight: 500;">Subtotal (${order.items.length} items)</td>
                <td style="padding: 6px 0; text-align: right; color: #292524; font-weight: 700;">₹${order.subtotal.toFixed(2)}</td>
              </tr>
              ${order.couponCode ? `
              <tr>
                <td style="padding: 6px 0; color: #059669; font-weight: 500;">
                  Discount Applied 
                  <span style="background: #d1fae5; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; font-weight: 700; border: 1px solid #34d399;">${order.couponCode}</span>
                </td>
                <td style="padding: 6px 0; text-align: right; color: #059669; font-weight: 800;">-₹${order.discount.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #57534e;">
                  <div style="font-weight: 500;">GST (GST ${gstRate}%)</div>
                </td>
                <td style="padding: 8px 0; text-align: right; color: #292524; font-weight: 700; vertical-align: top;">₹${order.tax.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #57534e;">
                  <div style="font-weight: 500;">Shipping</div>
                </td>
                <td style="padding: 8px 0; text-align: right; color: #292524; font-weight: 700; vertical-align: top;">₹${order.shipping.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #57534e;">
                  <div style="font-weight: 500;">Packing Charges</div>
                </td>
                <td style="padding: 8px 0; text-align: right; color: #292524; font-weight: 700; vertical-align: top;">₹${packingFee.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 16px 0 0 0; border-top: 1px solid #e7e5e4;"></td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #92400e; font-size: 18px; font-weight: 800;">Total Amount</td>
                <td style="padding: 4px 0; text-align: right; color: #92400e; font-size: 24px; font-weight: 900;">₹${order.total.toFixed(2)}</td>
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
    
    await sendEmail(userEmail, `Order Confirmation #${order.orderId} - OM Naturals`, emailHtml);
    return true;
  } catch (emailErr) {
    console.error('Failed to send confirmation email via template utility:', emailErr);
    return false;
  }
};
