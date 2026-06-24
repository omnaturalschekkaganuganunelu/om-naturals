'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { useCartStore } from '@/store/cartStore';
import { 
  User, 
  MapPin, 
  Package, 
  LogOut, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  CheckCircle, 
  ClipboardList, 
  Info,
  Search, 
  Copy, 
  Check, 
  FileText, 
  ShoppingBag, 
  Printer, 
  X, 
  AlertTriangle,
  Clock,
  Truck
} from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';
import CustomSelect from '@/components/CustomSelect';
import OrderHistorySection from '@/components/OrderHistorySection';
import { useRealtime } from '@/hooks/useRealtime';
import ConfirmModal from '@/components/ConfirmModal';

// Deterministic Tracking ID Generator
const getTrackingId = (orderId: string) => {
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = orderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let trk = 'TRK-';
  let tempHash = Math.abs(hash);
  for (let i = 0; i < 8; i++) {
    trk += chars[tempHash % chars.length];
    tempHash = Math.floor(tempHash / chars.length);
  }
  return trk;
};

// Progress percentage mapping
const getProgressPercentage = (status: string) => {
  switch (status) {
    case 'PENDING': return 15;
    case 'CONFIRMED': return 35;
    case 'PROCESSING': return 50;
    case 'PACKED': return 70;
    case 'OUT_FOR_DELIVERY':
    case 'SHIPPED': return 85;
    case 'DELIVERED': return 100;
    default: return 0;
  }
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function AccountContent() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus, update: updateSession } = useSession();

  // Navigation tab from URL or default
  const defaultTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // Profile edit states
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileRole, setProfileRole] = useState('CUSTOMER');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Fetch profile details
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    setLoadingProfile(true);
    fetch('/api/profile')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch profile');
        return res.json();
      })
      .then((data) => {
        setProfileName(data.name || '');
        setProfileEmail(data.email && data.email.endsWith('@no-email.com') ? '' : data.email || '');
        setProfilePhone(data.phone || '');
        setProfileRole(data.role || 'CUSTOMER');
        setLoadingProfile(false);
      })
      .catch((err) => {
        console.error('Error loading profile:', err);
        // Fallback to session values
        if (session?.user) {
          setProfileName(session.user.name || '');
          setProfileEmail(session.user.email && session.user.email.endsWith('@no-email.com') ? '' : session.user.email || '');
          setProfilePhone(session.user.phone || '');
          setProfileRole(session.user.role || 'CUSTOMER');
        }
        setLoadingProfile(false);
      });
  }, [authStatus, session]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMsg('');
    setProfileSuccessMsg('');
    setUpdatingProfile(true);

    if (!profileName.trim()) {
      setProfileErrorMsg(language === 'te' ? 'దయచేసి పేరు నమోదు చేయండి.' : 'Name is required.');
      setUpdatingProfile(false);
      return;
    }

    if (!profileEmail.trim() && !profilePhone.trim()) {
      setProfileErrorMsg(
        language === 'te'
          ? 'దయచేసి ఈమెయిల్ లేదా ఫోన్ నెంబర్ ఏదైనా ఒకటి నమోదు చేయండి.'
          : 'Please provide either an Email address or a Mobile number.'
      );
      setUpdatingProfile(false);
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          phone: profilePhone,
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        if (updateSession) {
          await updateSession({
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
          });
        }
        setProfileSuccessMsg(
          language === 'te'
            ? 'ప్రొఫైల్ వివరాలు విజయవంతంగా నవీకరించబడ్డాయి!'
            : 'Profile details updated successfully!'
        );
        showToast(
          language === 'te'
            ? 'ప్రొఫైల్ నవీకరించబడింది!'
            : 'Profile updated successfully!',
          'success'
        );
      } else {
        const err = await res.json();
        setProfileErrorMsg(err.error || (language === 'te' ? 'నవీకరించడం విఫలమైంది.' : 'Update failed.'));
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileErrorMsg(language === 'te' ? 'కనెక్షన్ లోపం.' : 'Connection error.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Data states
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Search query for orders
  const [searchQuery, setSearchQuery] = useState('');

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal / Drawer state
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<any>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered by mistake');
  const [customReason, setCustomReason] = useState('');
  const [isCancellingLoading, setIsCancellingLoading] = useState(false);

  // Address form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: 'Telangana',
    pincode: '',
    latitude: null as number | null,
    longitude: null as number | null,
    isDefault: false,
  });
  const [formError, setFormError] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  // Expandable order items state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Copy tracking ID handler
  const handleCopyTrackingId = (e: React.MouseEvent, trkId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(trkId);
    setCopiedId(trkId);
    showToast(
      language === 'te' 
        ? 'ట్రాకింగ్ ఐడీ క్లిప్‌బోర్డ్‌కు కాపీ చేయబడింది!' 
        : 'Tracking ID copied to clipboard!',
      'success'
    );
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Redirect if unauthenticated or admin
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login?redirect=/account');
    } else if (authStatus === 'authenticated' && session?.user?.role === 'ADMIN') {
      router.push('/admin/dashboard');
    }
  }, [authStatus, session, router]);

  // Sync tab with URL parameter changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // Load Orders
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    setLoadingOrders(true);

    fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoadingOrders(false);
      })
      .catch((err) => {
        console.error('Error fetching user orders:', err);
        setLoadingOrders(false);
        showToast(
          language === 'te' ? 'ఆర్డర్‌లను లోడ్ చేయడంలో విఫలమైంది.' : 'Failed to load orders.',
          'error'
        );
      });
  }, [authStatus]);

  // Realtime updates for Customer's Orders
  useRealtime('Order', '*', (payload) => {
    if (payload.eventType === 'UPDATE') {
      const updated = payload.new;
      setOrders((prev) =>
        prev.map((ord) => (ord.id === updated.id ? { ...ord, ...updated } : ord))
      );
    } else if (payload.eventType === 'INSERT') {
      // Reload orders to get complete order details with items
      fetch('/api/orders')
        .then((res) => res.json())
        .then((data) => setOrders(data))
        .catch((err) => console.error('Error reloading orders after realtime insert:', err));
    } else if (payload.eventType === 'DELETE') {
      setOrders((prev) => prev.filter((ord) => ord.id !== payload.old.id));
    }
  });

  // Load Addresses
  const fetchAddresses = () => {
    if (authStatus !== 'authenticated') return;
    setLoadingAddresses(true);

    fetch('/api/addresses')
      .then((res) => res.json())
      .then((data) => {
        setAddresses(data);
        setLoadingAddresses(false);
      })
      .catch((err) => {
        console.error('Error loading addresses:', err);
        setLoadingAddresses(false);
      });
  };

  useEffect(() => {
    fetchAddresses();
  }, [authStatus]);

  // Handle address input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Get User's Live Geolocation Coordinates
  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setFetchingLocation(true);
    setLocationStatus("📍 Fetching location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude
        }));
        
        try {
          // Attempt reverse geocoding with OpenStreetMap Nominatim
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            
            // Auto fill fields if found
            const line1Val = addr.road || addr.suburb || addr.neighbourhood || '';
            const line2Val = addr.suburb || addr.county || addr.state_district || '';
            const cityVal = addr.city || addr.town || addr.village || addr.city_district || '';
            const stateVal = addr.state === 'Andhra Pradesh' ? 'Andhra Pradesh' : 'Telangana';
            const pincodeVal = addr.postcode || '';

            setFormData(prev => ({
              ...prev,
              line1: prev.line1 || line1Val,
              line2: prev.line2 || `${line2Val} (Coords: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
              city: prev.city || cityVal,
              state: stateVal,
              pincode: prev.pincode || pincodeVal,
            }));
            setLocationStatus('📍 Live location captured and address autofilled!');
          } else {
            setFormData(prev => ({
              ...prev,
              line2: prev.line2 || `Coords: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            }));
            setLocationStatus('📍 Location coordinates captured!');
          }
        } catch (err) {
          setFormData(prev => ({
            ...prev,
            line2: prev.line2 || `Coords: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          }));
          setLocationStatus('📍 Location coordinates captured!');
        } finally {
          setFetchingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting geolocation:', error);
        setLocationStatus('❌ Could not retrieve location. Please fill manually.');
        setFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Create address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSavingAddress(true);

    const { name, phone, line1, city, state, pincode } = formData;
    if (!name || !phone || !line1 || !city || !state || !pincode) {
      setFormError('దయచేసి అన్ని వివరాలు నింపండి.');
      setSavingAddress(false);
      return;
    }

    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchAddresses();
        setShowForm(false);
        setFormData({
          name: '',
          phone: '',
          line1: '',
          line2: '',
          city: '',
          state: 'Telangana',
          pincode: '',
          latitude: null,
          longitude: null,
          isDefault: false,
        });
      } else {
        const err = await res.json();
        setFormError(err.error || 'చిరునామాను సృష్టించలేకపోయాము.');
      }
    } catch (err) {
      setFormError('కనెక్షన్ లోపం.');
    } finally {
      setSavingAddress(false);
    }
  };

  // Delete address
  const handleDeleteAddress = async (id: string) => {
    if (!confirm('ఈ చిరునామాను ఖచ్చితంగా తొలగించాలనుకుంటున్నారా?')) return;

    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAddresses();
      }
    } catch (err) {
      console.error('Error deleting address:', err);
    }
  };

  // Set address as default
  const handleSetDefaultAddress = async (id: string) => {
    const addr = addresses.find((a) => a.id === id);
    if (!addr) return;

    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addr, isDefault: true }),
      });
      if (res.ok) {
        fetchAddresses();
      }
    } catch (err) {
      console.error('Error setting default address:', err);
    }
  };

  // Reorder Handler
  const handleReorder = async (order: any) => {
    showToast(
      language === 'te' ? 'ఉత్పత్తులను కార్ట్‌లోకి జోడిస్తున్నాము...' : 'Adding products to cart...', 
      'info'
    );
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to load products');
      const dbProducts = await res.json();
      
      let addedCount = 0;
      const cartStore = useCartStore.getState();
      
      for (const item of order.items) {
        const p = dbProducts.find((prod: any) => prod.id === item.productId);
        if (p && p.isActive) {
          const w = p.weight;
          const u = p.unit;
          let label = `${w} ${u}`;
          if (u === 'Litre' || u === 'Liter') {
            label = w >= 1 ? `${w} Litre` : `${Math.round(w * 1000)} ml`;
          } else if (u === 'Gram' || u === 'g') {
            label = w >= 1000 ? `${w / 1000} Kg` : `${w} g`;
          } else if (u === 'Kg' || u === 'kg') {
            label = `${w} Kg`;
          } else if (u === 'ml') {
            label = w >= 1000 ? `${w / 1000} L` : `${w} ml`;
          }

          cartStore.addItem({
            productId: p.id,
            name: p.name,
            nameTe: p.nameTe,
            price: p.price,
            mrp: p.mrp,
            quantity: item.quantity,
            image: p.images[0] || item.image,
            weight: p.weight,
            unit: p.unit,
            stock: p.stock,
            variantLabel: label,
          });
          addedCount++;
        }
      }
      
      if (addedCount > 0) {
        showToast(
          language === 'te' 
            ? `${addedCount} వస్తువులు విజయవంతంగా కార్ట్‌కు జోడించబడ్డాయి!` 
            : `${addedCount} items added to cart successfully!`,
          'success'
        );
        router.push('/cart');
      } else {
        showToast(
          language === 'te' 
            ? 'క్షమించండి, ఈ ఉత్పత్తులు ప్రస్తుతం అందుబాటులో లేవు.' 
            : 'Sorry, these products are not available currently.',
          'error'
        );
      }
    } catch (err) {
      console.error('Error during reordering:', err);
      showToast(
        language === 'te' ? 'రీఆర్డర్ చేయడంలో లోపం జరిగింది.' : 'Error placing reorder.',
        'error'
      );
    }
  };

  // Printable Invoice Generation
  const handleDownloadInvoice = (order: any) => {
    const trkId = getTrackingId(order.orderId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast(
        language === 'te' ? 'దయచేసి పాపప్స్ అనుమతించండి.' : 'Please allow popups to download invoice.', 
        'error'
      );
      return;
    }
    
    const itemsHtml = order.items.map((it: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: left;">${it.nameTe || it.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">${it.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">₹${it.price.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">₹${(it.price * it.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const invoiceHtml = `
      <html>
        <head>
          <title>Invoice - ${order.orderId}</title>
          <style>
            body { font-family: 'Outfit', 'Inter', sans-serif; color: #1c1009; padding: 40px; margin: 0; background: #fff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #b45309; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 850; color: #78350f; font-family: 'Outfit'; }
            .invoice-title { font-size: 28px; font-weight: 900; color: #78350f; text-align: right; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .details-box h3 { margin-top: 0; color: #78350f; border-bottom: 1px solid #fcd34d; padding-bottom: 8px; font-size: 14px; text-transform: uppercase; }
            .details-box p { margin: 6px 0; font-size: 13px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #fdfbf7; padding: 12px; font-weight: bold; font-size: 12px; text-transform: uppercase; text-align: left; border-bottom: 2px solid #fcd34d; color: #78350f; }
            .totals { width: 300px; margin-left: auto; margin-top: 20px; font-size: 14px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .totals-row.grand { font-size: 18px; font-weight: 900; color: #78350f; border-top: 2px solid #b45309; padding-top: 12px; margin-top: 8px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #fed7aa; padding-top: 20px; margin-top: 50px; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header" style="align-items: center;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <img src="/images/logo.png" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #b45309;" alt="Logo" />
              <div>
                <div class="logo">Om Natural</div>
                <div style="font-size: 12px; color: #b45309; margin-top: 4px;">Chekka Ganuga Nune</div>
              </div>
            </div>
            <div>
              <div class="invoice-title">INVOICE</div>
              <div style="font-size: 12px; color: #b45309; margin-top: 4px; text-align: right;">ID: ${order.orderId}</div>
            </div>
          </div>
          
          <div class="details-grid">
            <div class="details-box">
              <h3>Billed To:</h3>
              <p><strong>${order.name}</strong></p>
              <p>${order.line1}</p>
              ${order.line2 ? `<p>${order.line2}</p>` : ''}
              <p>${order.city}, ${order.state} - ${order.pincode}</p>
              <p>Phone: ${order.phone}</p>
            </div>
            <div class="details-box" style="text-align: right;">
              <h3>Order Info:</h3>
              <p><strong>Order ID:</strong> ${order.orderId}</p>
              <p><strong>Tracking ID:</strong> ${trkId}</p>
              <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
              <p><strong>Payment Method:</strong> ${order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'PhonePe Online'}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Product Details</th>
                <th style="text-align: center; width: 80px;">Qty</th>
                <th style="text-align: right; width: 120px;">Price</th>
                <th style="text-align: right; width: 120px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>₹${order.subtotal.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>Shipping:</span>
              <span>₹${order.shipping.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>Tax (GST):</span>
              <span>₹${order.tax.toFixed(2)}</span>
            </div>
            ${order.discount > 0 ? `
              <div class="totals-row" style="color: #16a34a;">
                <span>Discount:</span>
                <span>-₹${order.discount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="totals-row grand">
              <span>Grand Total:</span>
              <span>₹${order.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for purchasing organic wood-pressed oil from Om Natural!</p>
            <p>This is a computer-generated invoice and does not require a physical signature.</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  // Open cancellation modal
  const triggerCancelOrder = (e: React.MouseEvent, order: any) => {
    e.stopPropagation();
    setCancellingOrder(order);
    setCancelReason('Ordered by mistake');
    setCustomReason('');
    setIsCancelOpen(true);
  };

  // Submit cancellation
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingOrder) return;
    setIsCancellingLoading(true);

    const finalReason = cancelReason === 'Other' 
      ? customReason.trim() || 'No reason specified' 
      : cancelReason;

    try {
      const res = await fetch(`/api/orders/${cancellingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderStatus: 'CANCELLED',
          notes: `Cancelled by customer. Reason: ${finalReason}`,
        }),
      });

      if (res.ok) {
        // Update local order list
        setOrders(prev => prev.map(o => o.id === cancellingOrder.id ? {
          ...o,
          orderStatus: 'CANCELLED',
          notes: `Cancelled by customer. Reason: ${finalReason}`,
          updatedAt: new Date().toISOString()
        } : o));

        showToast(
          language === 'te' 
            ? 'ఆర్డర్ విజయవంతంగా రద్దు చేయబడింది!' 
            : 'Order cancelled successfully!',
          'success'
        );
        setIsCancelOpen(false);
        setCancellingOrder(null);
      } else {
        const err = await res.json();
        showToast(err.error || 'Cancellation failed', 'error');
      }
    } catch (err) {
      console.error('Cancellation error:', err);
      showToast('Connection error. Please try again.', 'error');
    } finally {
      setIsCancellingLoading(false);
    }
  };

  // Open Track Order Drawer
  const triggerTrackOrder = (e: React.MouseEvent, order: any) => {
    e.stopPropagation();
    setTrackingOrder(order);
    setIsTrackingOpen(true);
  };

  // Expand / collapse order card
  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  // Date formatter helpers
  const getFormattedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'te' ? 'te-IN' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getFormattedDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(language === 'te' ? 'te-IN' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEstimatedArrival = (createdAtStr: string) => {
    const d = new Date(createdAtStr);
    d.setDate(d.getDate() + 3); // 3 days expected delivery
    return d.toLocaleDateString(language === 'te' ? 'te-IN' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return language === 'te' ? 'పెండింగ్' : 'Pending';
      case 'CONFIRMED': return language === 'te' ? 'నిర్ధారించబడింది' : 'Confirmed';
      case 'PROCESSING': return language === 'te' ? 'ప్రాసెసింగ్' : 'Processing';
      case 'PACKED': return language === 'te' ? 'ప్యాక్ చేయబడింది' : 'Packed';
      case 'OUT_FOR_DELIVERY':
      case 'SHIPPED': return language === 'te' ? 'డెలివరీలో ఉంది' : 'Out for Delivery';
      case 'DELIVERED': return language === 'te' ? 'డెలివరీ పూర్తయింది' : 'Delivered';
      case 'CANCELLED': return language === 'te' ? 'రద్దు చేయబడింది' : 'Cancelled';
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'CONFIRMED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PROCESSING': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'PACKED': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'OUT_FOR_DELIVERY':
      case 'SHIPPED': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DELIVERED': return 'bg-green-50 text-green-700 border-green-200';
      case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  const getStatusUpdateMsg = (status: string) => {
    switch (status) {
      case 'PENDING':
        return language === 'te' ? 'ఆర్డర్ విజయవంతంగా నమోదైంది' : 'Your order is placed and awaiting confirmation.';
      case 'CONFIRMED':
        return language === 'te' ? 'మీ ఆర్డర్ నిర్ధారించబడింది' : 'Your order has been confirmed by our warehouse.';
      case 'PROCESSING':
        return language === 'te' ? 'మీ ఆర్డర్ సిద్ధం చేయబడుతోంది' : 'Your wood-pressed oil is currently being prepared.';
      case 'PACKED':
        return language === 'te' ? 'మీ ఆర్డర్ ప్యాక్ చేయబడింది' : 'Your order is securely packed and ready to ship.';
      case 'OUT_FOR_DELIVERY':
      case 'SHIPPED':
        return language === 'te' ? 'డెలివరీ ఏజెంట్ బయలుదేరారు' : 'Our delivery representative is out delivering your package.';
      case 'DELIVERED':
        return language === 'te' ? 'సక్సెస్ఫుల్గా డెలివరీ అయింది!' : 'Delivered successfully! Thank you for buying organic.';
      case 'CANCELLED':
        return language === 'te' ? 'మీ ఆర్డర్ రద్దు చేయబడింది' : 'This order has been cancelled.';
      default:
        return '';
    }
  };

  const trackingSteps = [
    { key: 'PENDING', label: language === 'te' ? 'ఆర్డర్ నమోదు' : 'Order Placed', icon: Clock },
    { key: 'CONFIRMED', label: language === 'te' ? 'స్థిరపరచబడింది' : 'Confirmed', icon: CheckCircle },
    { key: 'PROCESSING', label: language === 'te' ? 'ప్రాసెసింగ్' : 'Processing', icon: Info },
    { key: 'PACKED', label: language === 'te' ? 'ప్యాక్ అయింది' : 'Packed', icon: Package },
    { key: 'OUT_FOR_DELIVERY', label: language === 'te' ? 'డెలివరీ' : 'Out for Delivery', icon: Truck },
    { key: 'DELIVERED', label: language === 'te' ? 'డెలివరీ అయింది' : 'Delivered', icon: MapPin }
  ];

  // Helper to map DB statuses for index tracking
  const getStepIndex = (status: string) => {
    if (status === 'SHIPPED') return 4; // Treat SHIPPED equivalent to OUT_FOR_DELIVERY
    return trackingSteps.findIndex(s => s.key === status);
  };

  // Filter orders based on search
  const filteredOrders = orders.filter((ord) => {
    const trackingId = getTrackingId(ord.orderId);
    return (
      ord.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trackingId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (authStatus === 'loading') {
    return <PremiumLoader fullScreen={true} text={t('account_loading')} />;
  }

  if (!session) return null;

  return (
    <>
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-8 lg:px-12 py-6 sm:py-8 flex-1 relative w-full">
      
      {/* Account Greeting Header */}
      <div className="bg-gradient-to-r from-amber-800 to-amber-950 text-white rounded-3xl p-5 sm:p-6 lg:p-8 smooth-shadow mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-amber-300 uppercase tracking-widest">
            {t('account_greeting')}
          </h2>
          <h1 className="text-2xl sm:text-3xl font-black font-heading">{t('account_hello')} {session.user.name}</h1>
          <p className="text-xs text-amber-200">{session.user.email}</p>
        </div>
        
        <button
          onClick={() => setLogoutModalOpen(true)}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center space-x-1.5"
        >
          <LogOut size={14} />
          <span>{t('account_logout')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-8 items-start">
        
        {/* Navigation Sidebar Tabs */}
        <aside className="bg-white border border-amber-100 rounded-3xl p-4 smooth-shadow flex flex-col space-y-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full text-left text-xs font-bold py-3 px-4 rounded-2xl flex items-center space-x-2.5 transition-colors ${
              activeTab === 'orders' ? 'bg-amber-100 text-amber-900 font-extrabold' : 'text-amber-900 hover:bg-amber-50'
            }`}
          >
            <Package size={16} />
            <span>{t('account_my_orders')}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('addresses')}
            className={`w-full text-left text-xs font-bold py-3 px-4 rounded-2xl flex items-center space-x-2.5 transition-colors ${
              activeTab === 'addresses' ? 'bg-amber-100 text-amber-900 font-extrabold' : 'text-amber-900 hover:bg-amber-50'
            }`}
          >
            <MapPin size={16} />
            <span>{t('account_my_addresses')}</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left text-xs font-bold py-3 px-4 rounded-2xl flex items-center space-x-2.5 transition-colors ${
              activeTab === 'profile' ? 'bg-amber-100 text-amber-900 font-extrabold' : 'text-amber-900 hover:bg-amber-50'
            }`}
          >
            <User size={16} />
            <span>{t('account_my_profile')}</span>
          </button>
        </aside>

        {/* Dynamic Detail Card Content */}
        <section className="lg:col-span-3">
          
          {/* TAB 1: ORDERS – Swiggy-style component */}
          {activeTab === 'orders' && (
            <OrderHistorySection
              orders={orders}
              loadingOrders={loadingOrders}
              language={language}
              t={t}
              onOrdersChange={setOrders}
            />
          )}
          {/* TAB 2: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-amber-950 font-heading flex items-center space-x-1.5">
                  <MapPin size={18} className="text-amber-700" />
                  <span>{t('account_saved_addresses')}</span>
                </h3>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-1 shadow-sm"
                >
                  <Plus size={14} />
                  <span>{t('account_new_address')}</span>
                </button>
              </div>

              {/* Add address form overlay */}
              {showForm && (
                <form onSubmit={handleSaveAddress} className="bg-white border border-amber-100 p-4 sm:p-5 lg:p-6 rounded-3xl smooth-shadow grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
                  <h4 className="col-span-1 sm:col-span-2 text-xs font-bold text-amber-950">{t('checkout_new_address')}</h4>
                  
                  <div className="col-span-1 sm:col-span-2 pb-2">
                    <button
                      type="button"
                      onClick={handleGetLiveLocation}
                      disabled={fetchingLocation}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-950 font-bold text-xs rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50"
                    >
                      <span>{fetchingLocation ? t('checkout_fetching_location') : t('checkout_live_location')}</span>
                    </button>
                    {locationStatus && (
                      <p className="text-[10px] font-bold text-center mt-1.5 text-amber-900">
                        {locationStatus}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_name')}</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Suresh Kumar"
                      className="w-full bg-amber-50/10 text-xs border border-amber-100 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_phone')}</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-amber-50/10 text-xs border border-amber-100 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_line1')}</label>
                    <input
                      type="text"
                      name="line1"
                      value={formData.line1}
                      onChange={handleInputChange}
                      placeholder="e.g. Flat No, Street Address"
                      className="w-full bg-amber-50/10 text-xs border border-amber-100 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_line2')}</label>
                    <input
                      type="text"
                      name="line2"
                      value={formData.line2}
                      onChange={handleInputChange}
                      placeholder="e.g. Area, Landmark (Optional)"
                      className="w-full bg-amber-50/10 text-xs border border-amber-100 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_city')}</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g. Hyderabad"
                      className="w-full bg-amber-50/10 text-xs border border-amber-100 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_state')}</label>
                    <CustomSelect
                      value={formData.state}
                      onChange={(val) => setFormData({ ...formData, state: val })}
                      options={[
                        { value: 'Telangana', label: t('checkout_state_telangana') },
                        { value: 'Andhra Pradesh', label: t('checkout_state_ap') },
                      ]}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">{t('checkout_pincode')}</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="e.g. 500072"
                      className="w-full bg-amber-50/10 text-xs border border-amber-100 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      name="isDefault"
                      checked={formData.isDefault}
                      onChange={handleInputChange}
                      className="accent-amber-800"
                    />
                    <label htmlFor="isDefault" className="text-[10px] font-bold text-amber-900 cursor-pointer">
                      {t('checkout_default')}
                    </label>
                  </div>

                  {formError && (
                    <div className="col-span-1 sm:col-span-2 text-xs text-red-600 font-bold">
                      {formError}
                    </div>
                  )}

                  <div className="col-span-1 sm:col-span-2 flex space-x-4 pt-2">
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="flex-1 bg-amber-800 text-white py-2 font-bold text-xs rounded-xl shadow-sm"
                    >
                      {savingAddress ? t('checkout_saving') : t('checkout_save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 bg-white text-amber-900 border border-amber-200 py-2 font-bold text-xs rounded-xl"
                    >
                      {t('checkout_cancel')}
                    </button>
                  </div>
                </form>
              )}
              {/* Saved Addresses list */}
              {loadingAddresses ? (
                <div className="bg-white border border-amber-100 rounded-3xl p-12 smooth-shadow">
                  <PremiumLoader fullScreen={false} text={t('checkout_loading_addresses')} />
                </div>
              ) : addresses.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-amber-100 rounded-3xl p-12 text-center text-xs text-gray-500 smooth-shadow">
                  {t('account_no_addresses')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="bg-white border border-amber-100 rounded-3xl p-5 smooth-shadow flex flex-col justify-between"
                    >
                      <div className="space-y-1.5 text-xs font-medium text-gray-600 leading-relaxed">
                        <div className="flex justify-between items-center border-b border-amber-50 pb-2">
                          <span className="font-extrabold text-amber-950 text-sm">{addr.name}</span>
                          <span className="text-gray-400 font-bold">{addr.phone}</span>
                        </div>
                        <p className="pt-2">{addr.line1}</p>
                        {addr.line2 && <p>{addr.line2}</p>}
                        <p>{addr.city}, {addr.state} - <span className="font-bold">{addr.pincode}</span></p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-amber-50 flex items-center justify-between">
                        {addr.isDefault ? (
                          <span className="bg-green-100 border border-green-200 text-green-800 font-black text-[9px] px-2 py-0.5 rounded-md uppercase">
                            {t('account_default_address')}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-[10px] text-amber-800 font-bold hover:underline"
                          >
                            {t('account_set_default')}
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-full transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-white border border-amber-100 rounded-3xl p-4 sm:p-6 lg:p-8 smooth-shadow space-y-6">
              <h3 className="text-lg font-bold text-amber-950 font-heading border-b border-amber-50 pb-3 flex items-center space-x-2">
                <div className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-900 shrink-0">
                  <Info size={15} />
                </div>
                <span>{t('account_profile_details')}</span>
              </h3>

              {loadingProfile ? (
                <div className="py-6 flex justify-center">
                  <PremiumLoader fullScreen={false} text={language === 'te' ? 'ప్రొఫైల్ వివరాలు లోడ్ అవుతున్నాయి...' : 'Loading profile details...'} />
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 text-xs font-semibold text-amber-950">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <label className="text-gray-500 font-bold block">{language === 'te' ? 'పూర్తి పేరు:' : 'Full Name:'}</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full bg-white border-2 border-[#8f4412] rounded-2xl py-3 px-4 font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#8f4412]/10 transition-all text-xs"
                      />
                    </div>

                    {/* Email Address */}
                    <div className="space-y-2">
                      <label className="text-gray-500 font-bold block">{language === 'te' ? 'ఈమెయిల్ చిరునామా:' : 'Email Address:'}</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full bg-white border-2 border-[#8f4412] rounded-2xl py-3 px-4 font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#8f4412]/10 transition-all text-xs"
                      />
                    </div>

                    {/* Mobile Phone */}
                    <div className="space-y-2">
                      <label className="text-gray-500 font-bold block">{language === 'te' ? 'మొబైల్ ఫోన్:' : 'Mobile Phone:'}</label>
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="e.g. 9999988888"
                        className="w-full bg-white border-2 border-[#8f4412] rounded-2xl py-3 px-4 font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#8f4412]/10 transition-all text-xs"
                      />
                    </div>

                    {/* Account Type */}
                    <div className="space-y-2">
                      <label className="text-gray-500 font-bold block">{language === 'te' ? 'ఖాతా రకం:' : 'Account Type:'}</label>
                      <input
                        type="text"
                        value={profileRole}
                        readOnly
                        disabled
                        className="w-full bg-[#fdfbf7]/60 border border-[#8f4412]/40 rounded-2xl py-3 px-4 font-bold text-gray-900/60 cursor-not-allowed text-xs uppercase"
                      />
                    </div>
                  </div>

                  {profileSuccessMsg && (
                    <p className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                      {profileSuccessMsg}
                    </p>
                  )}

                  {profileErrorMsg && (
                    <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                      {profileErrorMsg}
                    </p>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={updatingProfile}
                      className="bg-amber-800 hover:bg-amber-700 active:scale-95 text-white font-black px-8 py-3 rounded-2xl shadow-lg transition-all duration-200 text-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      {updatingProfile ? (language === 'te' ? 'నవీకరించబడుతోంది...' : 'Updating...') : (language === 'te' ? 'ప్రొఫైల్ అప్‌డేట్ చేయి' : 'Update Profile')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </section>
      </div>

      {/* ─── CUSTOM TOAST SYSTEM OVERLAY ─── */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`p-4 rounded-2xl shadow-lg border text-xs font-bold pointer-events-auto animate-fade-in-up flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500 animate-ping' : toast.type === 'error' ? 'bg-red-500' : 'bg-amber-500'
            }`} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Cancel + Track modals are now self-contained inside OrderHistorySection */}
      {false && isCancelOpen && cancellingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-amber-950/40 backdrop-blur-xs">
          <div className="relative bg-white border border-amber-100 max-w-md w-full rounded-3xl p-6 sm:p-8 smooth-shadow-lg space-y-6">
            
            {/* Header */}
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle size={28} className="shrink-0 animate-bounce" />
              <h3 className="text-lg font-black font-heading">Cancel Order?</h3>
            </div>

            {/* Message */}
            <p className="text-xs text-gray-500 font-bold leading-relaxed">
              Are you sure you want to cancel this order? This action cannot be undone. 
              Refunds (if payment was completed online) will be processed back to the original method.
            </p>

            {/* Reasons capture */}
            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Select a reason for cancellation:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-[#fdfbf7] border border-amber-100 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                >
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Incorrect delivery address">Incorrect delivery address</option>
                  <option value="Found a better price elsewhere">Found a better price elsewhere</option>
                  <option value="Changed mind / No longer needed">Changed mind / No longer needed</option>
                  <option value="Other">Other (Please describe below)</option>
                </select>
              </div>

              {cancelReason === 'Other' && (
                <div className="space-y-1.5 animate-fade-in-up">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                    Custom Reason:
                  </label>
                  <textarea
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Describe why you want to cancel..."
                    className="w-full bg-[#fdfbf7] border border-amber-100 rounded-xl p-3 text-xs font-bold min-h-[80px] focus:outline-none"
                  ></textarea>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCancelOpen(false);
                    setCancellingOrder(null);
                  }}
                  className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 py-2.5 font-bold text-xs rounded-xl"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={isCancellingLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {isCancellingLoading ? 'Cancelling...' : 'Yes, Cancel Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TRACK ORDER DRAWER/MODAL ─── */}
      {isTrackingOpen && trackingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center md:justify-end p-4 md:p-0 bg-amber-950/40 backdrop-blur-xs">
          {/* Backdrop closer */}
          <div className="absolute inset-0" onClick={() => setIsTrackingOpen(false)}></div>

          {/* Drawer panel */}
          <div className="relative bg-white border-l border-amber-100 max-w-lg w-full h-full md:h-screen rounded-3xl md:rounded-l-3xl md:rounded-r-none p-6 sm:p-8 smooth-shadow-lg flex flex-col justify-between overflow-y-auto animate-fade-in-up z-10">
            
            {/* Drawer Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black font-heading text-amber-950 flex items-center gap-2">
                  <Truck className="text-amber-800 animate-pulse" size={20} />
                  <span>{language === 'te' ? 'లైవ్ ఆర్డర్ ట్రాకింగ్' : 'Live Order Tracking'}</span>
                </h3>
                <button
                  onClick={() => setIsTrackingOpen(false)}
                  className="p-1.5 hover:bg-amber-50 text-gray-400 hover:text-amber-950 rounded-full transition-colors border border-amber-100/50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* General details */}
              <div className="bg-[#fdfbf7] border border-amber-100 rounded-2xl p-4 space-y-2.5 text-xs text-amber-950 font-bold">
                <div className="flex justify-between border-b border-amber-50 pb-2">
                  <span className="text-gray-400 font-bold">{language === 'te' ? 'ట్రాకింగ్ ఐడీ:' : 'Tracking ID:'}</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-amber-900 font-black">{getTrackingId(trackingOrder.orderId)}</span>
                    <button
                      onClick={(e) => handleCopyTrackingId(e, getTrackingId(trackingOrder.orderId))}
                      className="p-1 bg-white hover:bg-amber-50 border border-amber-100 rounded-lg text-amber-900 transition-colors"
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between border-b border-amber-50 pb-2">
                  <span className="text-gray-400 font-bold">{language === 'te' ? 'ఆర్డర్ ఐడీ:' : 'Order ID:'}</span>
                  <span className="font-mono">{trackingOrder.orderId}</span>
                </div>

                <div className="flex justify-between border-b border-amber-50 pb-2">
                  <span className="text-gray-400 font-bold">{language === 'te' ? 'డెలివరీ అంచనా:' : 'Expected Delivery:'}</span>
                  <span className="text-amber-900">{trackingOrder.orderStatus === 'CANCELLED' ? 'N/A' : getEstimatedArrival(trackingOrder.createdAt)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold">{language === 'te' ? 'ప్రస్తుత స్థితి:' : 'Current Status:'}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadgeClass(trackingOrder.orderStatus)}`}>
                    {getStatusLabel(trackingOrder.orderStatus)}
                  </span>
                </div>
              </div>
            </div>

            {/* Latest updates & Timeline */}
            <div className="flex-1 my-6 overflow-y-auto space-y-6">
              
              {/* Latest text update */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <Info size={16} className="text-amber-800 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 font-bold">
                  <p className="text-amber-900 font-black">{language === 'te' ? 'తాజా సమాచారం' : 'Latest Update'}</p>
                  <p className="text-amber-900 font-medium text-[11px] mt-1">
                    {getStatusUpdateMsg(trackingOrder.orderStatus)}
                  </p>
                </div>
              </div>

              {/* Timeline layout */}
              {trackingOrder.orderStatus === 'CANCELLED' ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700 text-xs font-bold animate-fade-in-up">
                  <AlertTriangle size={18} className="shrink-0" />
                  <div>
                    <p className="font-black text-red-800">{language === 'te' ? 'ఈ ఆర్డర్ రద్దు చేయబడింది' : 'This order has been cancelled.'}</p>
                    <p className="text-[10px] text-red-600 mt-1">{trackingOrder.notes || ''}</p>
                    <p className="text-[9px] text-gray-400 mt-1">{language === 'te' ? 'రద్దు చేసిన సమయం:' : 'Cancelled at:'} {getFormattedDateTime(trackingOrder.updatedAt)}</p>
                  </div>
                </div>
              ) : (
                <div className="relative pl-8 border-l-2 border-amber-200 space-y-6 py-2 ml-4">
                  {trackingSteps.map((step, idx) => {
                    const currentIdx = getStepIndex(trackingOrder.orderStatus);
                    const isCompleted = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;
                    const IconComp = step.icon;

                    return (
                      <div key={step.key} className="relative flex items-start space-x-4">
                        
                        {/* Timeline Circle */}
                        <div className={`absolute -left-[42px] top-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'bg-white border-amber-200 text-gray-300'
                        } ${isCurrent ? 'ring-4 ring-amber-100 scale-110' : ''}`}>
                          {isCompleted ? <Check size={11} strokeWidth={3.5} /> : <IconComp size={10} />}
                        </div>

                        {/* Timeline Label details */}
                        <div className="space-y-0.5 text-xs">
                          <p className={`font-black ${isCompleted ? 'text-amber-950' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          <p className="text-[10px] text-gray-400 font-semibold">
                            {isCompleted 
                              ? getStatusUpdateMsg(step.key) 
                              : (language === 'te' ? 'త్వరలో...' : 'Pending execution...')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer close button */}
            <div className="pt-4 border-t border-amber-100">
              <button
                onClick={() => setIsTrackingOpen(false)}
                className="w-full bg-amber-800 hover:bg-amber-700 text-white font-bold py-3 rounded-2xl text-xs shadow-sm transition-all text-center"
              >
                {language === 'te' ? 'మూసివేయి' : 'Close Drawer'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>

      <ConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={() => signOut({ callbackUrl: '/' })}
        title={language === 'te' ? 'లాగ్ అవుట్ చేయాలా?' : 'Logout?'}
        message={language === 'te' ? 'మీరు లాగ్ అవుట్ అవుతున్నారు. మీరు ఖచ్చితంగా కొనసాగించాలనుకుంటున్నారా?' : 'You are about to sign out of your account. Are you sure you want to continue?'}
        confirmText={language === 'te' ? 'లాగ్ అవుట్' : 'Logout'}
        cancelText={language === 'te' ? 'రద్దు చేయి' : 'Cancel'}
        isDestructive
      />
    </>
  );
}

export default function AccountPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<PremiumLoader fullScreen={false} />}>
        <AccountContent />
      </Suspense>
      <Footer />
    </>
  );
}
