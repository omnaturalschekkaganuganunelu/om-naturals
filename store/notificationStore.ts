import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  orderId: string | null;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetched: boolean;
  loading: boolean;
  fetchNotifications: (status: string, force?: boolean) => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  addRealtimeNotification: (notif: Notification) => void;
  clearStore: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  fetched: false,
  loading: false,

  fetchNotifications: async (status, force = false) => {
    if (status !== 'authenticated') return;
    // Skip if already fetched and not forced
    if (get().fetched && !force) return;

    set({ loading: true });
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        set({
          notifications: data.notifications || [],
          unreadCount: data.unreadCount || 0,
          fetched: true,
        });
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      set({ loading: false });
    }
  },

  markAllRead: async () => {
    set({
      notifications: get().notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    });
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'PUT' });
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  },

  markRead: async (id: string) => {
    set({
      notifications: get().notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, get().unreadCount - 1),
    });
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    } catch (err) {
      console.error(`Failed to mark read notification ${id}:`, err);
    }
  },

  addRealtimeNotification: (notif: Notification) => {
    const exists = get().notifications.some((n) => n.id === notif.id);
    if (exists) return;

    set({
      notifications: [notif, ...get().notifications],
      unreadCount: get().unreadCount + 1,
    });
  },

  clearStore: () => set({ notifications: [], unreadCount: 0, fetched: false }),
}));
