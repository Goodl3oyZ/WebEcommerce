import { create } from "zustand";

/** Site-wide overlays (cart drawer, search) that several components open. */
const useUiStore = create((set) => ({
  cartOpen: false,
  searchOpen: false,
  openCart: () => set({ cartOpen: true, searchOpen: false }),
  closeCart: () => set({ cartOpen: false }),
  openSearch: () => set({ searchOpen: true, cartOpen: false }),
  closeSearch: () => set({ searchOpen: false }),
}));

export default useUiStore;
