import { create } from "zustand";
import { notificationsAPI } from "@/lib/api/notifications";

const PAGE = 20;

/**
 * Notifications shared by the header bell and the notifications page, so
 * reading one in either place updates both.
 */
const useNotificationStore = create((set, get) => ({
  items: [],
  unread: 0,
  page: 0,
  hasMore: false,
  loading: false,
  loaded: false,

  /** First page again (on sign-in, a push from the server, or tab focus). */
  async refresh() {
    set({ loading: true });
    try {
      const res = await notificationsAPI.list({ page: 1, limit: PAGE });
      set({
        items: res.notifications ?? [],
        unread: res.unreadCount ?? 0,
        page: 1,
        hasMore: (res.pagination?.pages ?? 1) > 1,
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  async loadMore() {
    const { page, hasMore, loading } = get();
    if (!hasMore || loading) return;
    set({ loading: true });
    try {
      const res = await notificationsAPI.list({ page: page + 1, limit: PAGE });
      const seen = new Set(get().items.map((n) => n.id));
      set({
        items: [...get().items, ...(res.notifications ?? []).filter((n) => !seen.has(n.id))],
        unread: res.unreadCount ?? get().unread,
        page: page + 1,
        hasMore: (res.pagination?.pages ?? 1) > page + 1,
      });
    } finally {
      set({ loading: false });
    }
  },

  async markRead(id) {
    const n = get().items.find((i) => i.id === id);
    if (!n || n.isRead) return;
    set({ items: get().items.map((i) => (i.id === id ? { ...i, isRead: true } : i)), unread: Math.max(0, get().unread - 1) });
    await notificationsAPI.markRead(id).catch(() => get().refresh());
  },

  async markAllRead() {
    set({ items: get().items.map((i) => ({ ...i, isRead: true })), unread: 0 });
    await notificationsAPI.markAllRead().catch(() => get().refresh());
  },

  async remove(id) {
    const n = get().items.find((i) => i.id === id);
    set({ items: get().items.filter((i) => i.id !== id), unread: get().unread - (n && !n.isRead ? 1 : 0) });
    await notificationsAPI.remove(id).catch(() => get().refresh());
  },

  reset: () => set({ items: [], unread: 0, page: 0, hasMore: false, loaded: false }),
}));

export default useNotificationStore;
