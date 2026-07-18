import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useToastStore } from '@/store/toastStore';

export interface CartItem {
  productId: string;
  slug?: string;
  name: string;
  nameTe: string;
  price: number;
  mrp: number;
  quantity: number;
  image: string;
  weight: number;
  unit: string;
  stock: number;
  isActive?: boolean;
  variantLabel?: string; // e.g. "1 Litre", "500ml", "5 Kg"
}

export interface CouponInfo {
  code: string;
  type: string;
  value: number;
  discount: number;
  minOrderValue?: number;  // from DB — used to re-validate when cart changes
  maxDiscount?: number | null;  // from DB — used to re-apply cap when cart changes
}

interface CartState {
  items: CartItem[];
  coupon: CouponInfo | null;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCoupon: (coupon: CouponInfo | null) => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      addItem: (item) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((i) => i.productId === item.productId);
        let newItems = [];

        if (existingItem) {
          const newQuantity = existingItem.quantity + item.quantity;
          if (newQuantity > item.stock) {
            alert(`క్షమించండి, స్టాక్ పరిమితి దాటింది. గరిష్ట స్టాక్: ${item.stock}`);
            return;
          }
          newItems = currentItems.map((i) =>
            i.productId === item.productId ? { ...i, quantity: newQuantity } : i
          );
        } else {
          if (item.quantity > item.stock) {
            alert(`క్షమించండి, స్టాక్ పరిమితి దాటింది. గరిష్ట స్టాక్: ${item.stock}`);
            return;
          }
          newItems = [...currentItems, item];
        }

        const newSubtotal = newItems.reduce((total, it) => total + it.price * it.quantity, 0);
        let newCoupon = get().coupon;
        if (newCoupon) {
          const minRequired = newCoupon.minOrderValue ?? 0;
          if (newSubtotal >= minRequired) {
            let newDiscount = 0;
            if (newCoupon.type === 'PERCENT') {
              newDiscount = (newSubtotal * newCoupon.value) / 100;
              if (newCoupon.maxDiscount && newDiscount > newCoupon.maxDiscount) {
                newDiscount = newCoupon.maxDiscount;
              }
            } else {
              newDiscount = newCoupon.value;
            }
            if (newDiscount > newSubtotal) newDiscount = newSubtotal;
            newCoupon = { ...newCoupon, discount: parseFloat(newDiscount.toFixed(2)) };
          } else {
            newCoupon = null;
          }
        }

        set({
          items: newItems,
          coupon: newCoupon,
        });

        // Trigger premium cart toast
        const isTe = typeof document !== 'undefined' && document.cookie.includes('nune-lang=te');
        const pName = isTe ? item.nameTe : item.name;
        useToastStore.getState().showToast(
          isTe ? `${pName} కార్ట్‌కు జోడించబడింది!` : `${pName} added to cart!`,
          'cart',
          isTe ? 'కార్ట్' : 'Cart'
        );
      },
      removeItem: (productId) => {
        const removedItem = get().items.find((i) => i.productId === productId);
        const newItems = get().items.filter((i) => i.productId !== productId);
        const newSubtotal = newItems.reduce((total, it) => total + it.price * it.quantity, 0);

        let newCoupon = get().coupon;
        if (newCoupon) {
          const minRequired = newCoupon.minOrderValue ?? 0;
          if (newSubtotal >= minRequired) {
            let newDiscount = 0;
            if (newCoupon.type === 'PERCENT') {
              newDiscount = (newSubtotal * newCoupon.value) / 100;
              if (newCoupon.maxDiscount && newDiscount > newCoupon.maxDiscount) {
                newDiscount = newCoupon.maxDiscount;
              }
            } else {
              newDiscount = newCoupon.value;
            }
            if (newDiscount > newSubtotal) newDiscount = newSubtotal;
            newCoupon = { ...newCoupon, discount: parseFloat(newDiscount.toFixed(2)) };
          } else {
            newCoupon = null;
          }
        }

        set({
          items: newItems,
          coupon: newCoupon,
        });

        if (removedItem) {
          const isTe = typeof document !== 'undefined' && document.cookie.includes('nune-lang=te');
          const pName = isTe ? removedItem.nameTe : removedItem.name;
          useToastStore.getState().showToast(
            isTe ? `${pName} కార్ట్ నుండి తొలగించబడింది.` : `${pName} removed from cart.`,
            'info',
            isTe ? 'కార్ట్' : 'Cart'
          );
        }
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const item = get().items.find((i) => i.productId === productId);
        if (item && quantity > item.stock) {
          alert(`క్షమించండి, స్టాక్ పరిమితి దాటింది. గరిష్ట స్టాక్: ${item.stock}`);
          return;
        }

        const newItems = get().items.map((i) =>
          i.productId === productId ? { ...i, quantity } : i
        );
        const newSubtotal = newItems.reduce((total, it) => total + it.price * it.quantity, 0);

        let newCoupon = get().coupon;
        if (newCoupon) {
          const minRequired = newCoupon.minOrderValue ?? 0;
          if (newSubtotal >= minRequired) {
            let newDiscount = 0;
            if (newCoupon.type === 'PERCENT') {
              newDiscount = (newSubtotal * newCoupon.value) / 100;
              if (newCoupon.maxDiscount && newDiscount > newCoupon.maxDiscount) {
                newDiscount = newCoupon.maxDiscount;
              }
            } else {
              newDiscount = newCoupon.value;
            }
            if (newDiscount > newSubtotal) newDiscount = newSubtotal;
            newCoupon = { ...newCoupon, discount: parseFloat(newDiscount.toFixed(2)) };
          } else {
            newCoupon = null;
          }
        }

        set({
          items: newItems,
          coupon: newCoupon,
        });
      },
      clearCart: () => set({ items: [], coupon: null }),
      setCoupon: (coupon) => set({ coupon }),
      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      getCartCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'nune-bazaar-cart',
    }
  )
);
