import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cartAPI } from "@/lib/api/cart";

/** Signed-in user's id from the saved session, or null for a guest. */
const signedInUserId = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null")?.id ?? null;
  } catch {
    return null;
  }
};

/** Server cart lines -> the shape the storefront uses. */
const fromServer = (cart) =>
  cart?.items?.map((item) => ({
    id: item.productId,
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    price: parseFloat(item.price),
    name: item.product?.name,
    image: item.product?.image,
    variantName: item.variant ? `${item.variant.color} - ${item.variant.size}` : null,
  })) || [];

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      // Whose items these are: a user id (a copy of their server cart) or
      // null (a guest cart, to be merged into the account on sign-in).
      owner: null,
      isLoading: false,
      error: null,
      setItems: (items) => set({ items }),
      addItem: async (item) => {
        try {
          set({ isLoading: true, error: null });
          const user = localStorage.getItem("user");

          if (user) {
            const cartItemData = {
              productId: item.id,
              quantity: item.quantity,
              variantId: item.variantId || null,
              price: parseFloat(item.price),
            };
            await cartAPI.addItem(cartItemData);
            await get().fetchCartFromBackend();
          } else {
            // A copy of someone's server cart left after their session ended
            // is not this guest's cart: start a fresh one.
            const currentItems = get().owner ? [] : get().items;
            if (get().owner) set({ items: [], owner: null });
            const existingItem = currentItems.find(
              (i) => i.id === item.id && i.variantId === item.variantId
            );

            if (existingItem) {
              const updatedItems = currentItems.map((i) =>
                i.id === item.id && i.variantId === item.variantId
                  ? {
                      ...i,
                      quantity: i.quantity + item.quantity,
                      price: parseFloat(item.price),
                      variant: item.variant,
                      variantName: item.variantName,
                    }
                  : i
              );
              set({ items: updatedItems });
            } else {
              set({
                items: [
                  ...currentItems,
                  {
                    ...item,
                    price: parseFloat(item.price),
                    variant: item.variant,
                    variantName: item.variantName,
                  },
                ],
              });
            }
          }
        } catch (error) {
          set({ error: error.message });
          // Let the caller show the reason (and not a "success" toast).
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (itemId, variantId = null) => {
        try {
          set({ isLoading: true, error: null });
          const user = localStorage.getItem("user");

          if (user) {
            const id = typeof itemId === "object" ? itemId.id : itemId;
            await cartAPI.removeItem(id);
            await get().fetchCartFromBackend();
          } else {
            const currentItems = get().items;
            const id = typeof itemId === "object" ? itemId.id : itemId;

            const updatedItems = currentItems.filter(
              (item) => !(item.id === id && item.variantId === variantId)
            );
            set({ items: updatedItems });
          }
        } catch (error) {
          set({ error: error.message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateQuantity: async (itemId, quantity, variantId = null) => {
        try {
          set({ isLoading: true, error: null });
          const user = localStorage.getItem("user");

          if (user) {
            const id = typeof itemId === "object" ? itemId.itemId : itemId;
            await cartAPI.updateItem(id, quantity);
            await get().fetchCartFromBackend();
          } else {
            const id = typeof itemId === "object" ? itemId.itemId : itemId;
            const updatedItems = get().items.map((item) =>
              item.id === id && item.variantId === variantId
                ? { ...item, quantity }
                : item
            );
            set({ items: updatedItems });
          }
        } catch (error) {
          set({ error: error.message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      fetchCartFromBackend: async () => {
        try {
          const user = localStorage.getItem("user");
          if (!user) return;

          // No isLoading guard: add/update/remove call this while their own
          // isLoading flag is still set, and the badge must refresh.
          const backendCart = await cartAPI.getCart();
          set({ items: fromServer(backendCart), owner: signedInUserId() });
        } catch (error) {
          console.error("Error fetching cart from backend:", error.message);
          set({ error: error.message });
        }
      },

      /**
       * Right after sign-in: add the guest cart to the account's cart, then
       * show the account's cart. Returns what happened, for a message.
       */
      mergeGuestCart: async () => {
        const { items, owner } = get();
        const lines = owner
          ? []
          : items
              .filter((i) => i.variantId && i.quantity > 0)
              .map((i) => ({ productId: i.productId ?? i.id, variantId: i.variantId, quantity: i.quantity }));
        if (lines.length === 0) {
          await get().fetchCartFromBackend();
          return { added: 0, skipped: 0, limited: 0 };
        }
        const merged = await cartAPI.mergeGuestCart({ items: lines });
        set({ items: fromServer(merged), owner: signedInUserId() });
        const skipped = merged.skipped?.length ?? 0;
        return { added: lines.length - skipped, skipped, limited: merged.limited?.length ?? 0 };
      },

      /** Forget the local copy only (sign-out); the account keeps its cart. */
      resetLocal: () => set({ items: [], owner: null, isLoading: false, error: null }),

      clearCart: async () => {
        try {
          const user = localStorage.getItem("user");
          if (user) {
            await cartAPI.clearCart();
          }
          set({ items: [], isLoading: false, error: null });
        } catch (error) {
          console.error("Error clearing cart:", error);
          set({ error: error.message });
        }
      },

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (sum, item) => sum + parseFloat(item.price || 0) * item.quantity,
          0
        );
      },

      initializeCart: async () => {
        try {
          const user = localStorage.getItem("user");
          if (user) {
            await get().fetchCartFromBackend();
          } else {
            const items = get().items;
            console.log("Initializing guest cart from storage:", items);
            set({ items }); // force trigger for hydration
          }
        } catch (error) {
          console.error("Error initializing cart:", error);
          set({ error: error.message });
        }
      },
    }),
    {
      name: "cart-storage",
      getStorage: () => ({
        getItem: (name) => {
          const str = localStorage.getItem(name);
          try {
            JSON.parse(str);
            return str;
          } catch (e) {
            console.warn("Invalid JSON in localStorage for", name);
            return null;
          }
        },
        setItem: (name, value) => {
          localStorage.setItem(name, value);
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      }),
    }
  )
);

export default useCartStore;
