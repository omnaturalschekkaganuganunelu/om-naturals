import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Start with 0 so no fake values are shown before settings load.
      // On first ever visit, the API call resolves in <500ms and updates these.
      // On every subsequent visit, the cached values load instantly from localStorage.
      shippingFee: 0,
      packingFee: 0,
      gstRate: 0,
      freeShippingAbove: 500,
      lastFetched: null,

      setSettings: (settings) => set((state) => ({ ...state, ...settings })),

      fetchSettings: async () => {
        const now = Date.now();
        const lastFetched = get().lastFetched;

        // Re-fetch at most once every 5 minutes to avoid hammering the DB
        if (lastFetched && now - lastFetched < 5 * 60 * 1000) return;

        try {
          const res = await fetch('/api/settings');
          if (!res.ok) return;
          const data = await res.json();
          set({
            shippingFee: data.shippingFee ?? 0,
            packingFee: data.packingFee ?? 0,
            gstRate: data.gstRate ?? 0,
            freeShippingAbove: data.freeShippingAbove ?? 500,
            lastFetched: now,
          });
        } catch {
          // silently fail — cached values remain correct
        }
      },
    }),
    {
      name: 'om-naturals-settings',
    }
  )
);
