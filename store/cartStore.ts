import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

        if (existingItem) {
          const newQuantity = existingItem.quantity + item.quantity;
          if (newQuantity > item.stock) {
            alert(`క్షమించండి, స్టాక్ పరిమితి దాటింది. గరిష్ట స్టాక్: ${item.stock}`);
            return;
          }
          set({
            items: currentItems.map((i) =>
              i.productId === item.productId ? { ...i, quantity: newQuantity } : i
            ),
          });
        } else {
          if (item.quantity > item.stock) {
            alert(`క్షమించండి, స్టాక్ పరిమితి దాటింది. గరిష్ట స్టాక్: ${item.stock}`);
            return;
          }
          set({ items: [...currentItems, item] });
        }
        // Clear coupon when cart changes
        set({ coupon: null });
      },
      removeItem: (productId) => {
        set({
          items: get().items.filter((i) => i.productId !== productId),
          coupon: null,
        });
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
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
          coupon: null,
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
