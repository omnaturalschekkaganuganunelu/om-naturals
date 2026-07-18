import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';

interface Props {
  params: {
    id: string;
  };
}

export default async function InvoicePage({ params }: Props) {
  const { id } = params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) {
    notFound();
  }

  // Fetch products to map weights/units
  const dbProducts = await prisma.product.findMany();

  const isCancelled = order.orderStatus === 'CANCELLED';
  const isCOD = order.paymentMethod === 'COD';
  const txnRef = order.transactionRef || null;

  const getTrackingId = (oid: string) => {
    const parts = oid.split('-');
    if (parts.length >= 3) {
      return `TRK-GNT-${parts[2]}`;
    }
    return `TRK-${oid.substring(0, 8)}`;
  };
  
  const trkId = getTrackingId(order.orderId);

  // Calculate dynamic packing fee
  const calculatedPacking = order.total - order.subtotal + (order.discount || 0) - (order.tax || 0) - order.shipping;
  const packingFee = Math.max(0, Math.round(calculatedPacking * 100) / 100);

  return (
    <html>
      <head>
        <title>Invoice - {order.orderId}</title>
        <style>{`
          body { font-family: 'Segoe UI', sans-serif; color: #1c1009; padding: 40px; margin: 0; background: #fff; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #b45309; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: 850; color: #78350f; }
          .invoice-title { font-size: 28px; font-weight: 900; color: #78350f; text-align: right; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 45px; }
          .details-box h3 { margin-top: 0; color: #78350f; border-bottom: 1px solid #fcd34d; padding-bottom: 8px; font-size: 13px; text-transform: uppercase; }
          .details-box p { margin: 6px 0; font-size: 13px; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #fdfbf7; padding: 12px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left; border-bottom: 2px solid #fcd34d; color: #78350f; }
          .totals { width: 300px; margin-left: auto; margin-top: 20px; font-size: 14px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fef3c7; }
          .totals-row.grand { font-size: 18px; font-weight: 900; color: #78350f; border-top: 2px solid #b45309; padding-top: 12px; margin-top: 8px; }
          .store-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 50px;
            padding-top: 25px;
            border-top: 2px dashed #fed7aa;
          }
          .store-box {
            flex: 1;
            margin-right: 40px;
          }
          .store-box h3 {
            margin-top: 0;
            font-size: 12px;
            text-transform: uppercase;
            color: #78350f;
            letter-spacing: 0.5px;
          }
          .store-box p {
            margin: 4px 0;
            font-size: 11.5px;
            line-height: 1.4;
            color: #451a03;
          }
          .map-box {
            width: 360px;
            height: 180px;
            border: 1px solid #fed7aa;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(120, 53, 15, 0.08);
            flex-shrink: 0;
          }
          .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #fed7aa; padding-top: 20px; margin-top: 50px; }
          .txn-badge { display: inline-block; background: #fefce8; border: 1px solid #fcd34d; color: #78350f; font-weight: 700; font-family: monospace; padding: 3px 10px; border-radius: 6px; font-size: 13px; letter-spacing: 0.5px; }
          @media print { body { padding: 20px; } }
        `}</style>
      </head>
      <body>
        <div className="header" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/images/logo.png" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #b45309' }} />
            <div>
              <div className="logo">Om Natural</div>
              <div style={{ fontSize: '11px', color: '#b45309' }}>Chekka Ganuga Nune</div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>📞 +91 86882 91288 | ✉️ info@om-naturals.com</div>
            </div>
          </div>
          <div>
            <div className="invoice-title">{isCancelled ? <span style={{ color: '#dc2626' }}>CANCELLED</span> : 'INVOICE'}</div>
            <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px', textAlign: 'right' }}>ID: {order.orderId}</div>
          </div>
        </div>
        
        {isCancelled && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', color: '#991b1b', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>
            ❌ THIS ORDER HAS BEEN CANCELLED
            {order.cancelReason && <><br/><span style={{ fontSize: '11px', fontWeight: 'normal', color: '#7f1d1d' }}>Reason: {order.cancelReason}</span></>}
          </div>
        )}
        
        <div className="details-grid">
          <div className="details-box">
            <h3>Billed To</h3>
            <p><strong>{order.name}</strong></p>
            <p>{order.line1}</p>
            {order.line2 && <p>{order.line2}</p>}
            <p>{order.city}, {order.state} - {order.pincode}</p>
            <p>Phone: {order.phone}</p>
          </div>
          <div className="details-box" style={{ textAlign: 'right' }}>
            <h3>Order Info</h3>
            <p><strong>Order ID:</strong> {order.orderId}</p>
            <p><strong>Tracking ID:</strong> {trkId}</p>
            <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            <p><strong>Payment:</strong> {isCOD ? 'Cash on Delivery (COD)' : 'PhonePe Online'}</p>
            {txnRef && <p><strong>{isCOD ? 'COD Reference:' : 'Transaction ID:'}</strong><br/><span className="txn-badge">{txnRef}</span></p>}
            <p><strong>Payment Status:</strong> <span style={{ color: order.paymentStatus === 'COMPLETED' ? '#16a34a' : order.paymentStatus === 'REFUNDED' ? '#9333ea' : '#b45309' }}>{order.paymentStatus}</span></p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Product Details</th>
              <th style={{ textAlign: 'center', width: '80px' }}>Qty</th>
              <th style={{ textAlign: 'right', width: '120px' }}>Price</th>
              <th style={{ textAlign: 'right', width: '120px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it: any) => {
              const prod = dbProducts.find((p: any) => p.id === it.productId);
              let sizeLabel = '';
              if (prod) {
                const w = prod.weight, u = prod.unit;
                if (u === 'Litre' || u === 'Liter') sizeLabel = w >= 1 ? `${w} Litre` : `${Math.round(w * 1000)} ml`;
                else if (u === 'Gram' || u === 'g') sizeLabel = w >= 1000 ? `${w / 1000} Kg` : `${w} g`;
                else if (u === 'Kg' || u === 'kg') sizeLabel = `${w} Kg`;
                else if (u === 'ml') sizeLabel = w >= 1000 ? `${w / 1000} L` : `${w} ml`;
              }

              const nameEn = sizeLabel ? `${it.name} (${sizeLabel})` : it.name;
              const nameTe = it.nameTe ? (sizeLabel ? `${it.nameTe} (${sizeLabel})` : it.nameTe) : '';
              const nameDisplay = nameTe ? `${nameEn} (${nameTe})` : nameEn;

              return (
                <tr key={it.id}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'left', fontSize: '13px' }}>{nameDisplay}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontSize: '13px' }}>{it.quantity}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontSize: '13px' }}>₹{it.price.toFixed(2)}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>₹{(it.price * it.quantity).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="totals">
          <div className="totals-row">
            <span>Subtotal</span>
            <span>₹{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span>Shipping</span>
            <span>₹{order.shipping.toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span>Packing Charges</span>
            <span>₹{packingFee.toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span>Tax (GST)</span>
            <span>₹{order.tax.toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div className="totals-row" style={{ color: '#16a34a' }}>
              <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
              <span>-₹{order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="totals-row grand">
            <span>Grand Total</span>
            <span>₹{order.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="store-section">
          <div className="store-box">
            <h3>Our Registered Office & Store</h3>
            <p><strong>OM NATURAL CHEKKA GANUGA NUNELU</strong></p>
            <p>D.No. 126-137, Sri Lakshmi Narasimha Nagar,</p>
            <p>5th Line, Inner Ring Road, Gorantla,</p>
            <p>Guntur, Andhra Pradesh - 522034</p>
            <p style={{ marginTop: '8px' }}>📞 <strong>Phone:</strong> +91 86882 91288</p>
            <p>✉️ <strong>Email:</strong> info@om-naturals.com</p>
          </div>
          <div className="map-box">
            <iframe 
              src="https://maps.google.com/maps?q=OM%20NATURAL%20CHEKKA%20GANUGA%20NUNE%20Gorantla%20Guntur&t=&z=16&ie=UTF8&iwloc=&output=embed" 
              width="360" 
              height="180" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy">
            </iframe>
          </div>
        </div>
        
        <div className="footer">
          <p>Thank you for choosing Om Natural wood-pressed oils!</p>
          <p>Computer-generated invoice. No physical signature required.</p>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          window.onload = function() {
            window.print();
          };
        `}} />
      </body>
    </html>
  );
}
