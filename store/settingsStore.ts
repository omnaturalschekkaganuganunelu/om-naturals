import { create } from 'zustand';

interface SiteSettings {
  shippingFee: number;
  packingFee: number;
  gstRate: number;
  freeShippingAbove: number;
  lastFetched: number | null;
}

interface SettingsState extends SiteSettings {
  setSettings: (settings: Partial<SiteSettings>) => void;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  // Start with 0 so no fake values are shown before settings load.
  shippingFee: 0,
  packingFee: 0,
  gstRate: 0,
  freeShippingAbove: 500,
  lastFetched: null,

  setSettings: (settings) => set((state) => ({ ...state, ...settings })),

  fetchSettings: async () => {
    // If already fetched during this page session, do not fetch again
    if (get().lastFetched) return;

    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const data = await res.json();
      set({
        shippingFee: data.shippingFee ?? 0,
        packingFee: data.packingFee ?? 0,
        gstRate: data.gstRate ?? 0,
        freeShippingAbove: data.freeShippingAbove ?? 500,
        lastFetched: Date.now(),
      });
    } catch {
      // silently fail — cached values remain correct
    }
  },
}));
