import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cartAPI } from "@/lib/api/cart";

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
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
            const currentItems = get().items;
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
          console.error("Error adding item:", error);
          set({ error: error.message });
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
          console.error("Error removing item:", error);
          set({ error: error.message });
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
          console.error("Error updating quantity:", error);
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchCartFromBackend: async () => {
        try {
          const user = localStorage.getItem("user");
          if (!user) return;

          if (get().isLoading) return;

          set({ isLoading: true });
          const backendCart = await cartAPI.getCart();

          const backendItems =
            backendCart.items?.map((item) => ({
              id: item.productId,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              price: parseFloat(item.price),
              name: item.product?.name,
              image: item.product?.image,
              variantName: item.variant
                ? `${item.variant.color} - ${item.variant.size}`
                : null,
            })) || [];

          set({ items: backendItems, isLoading: false });
        } catch (error) {
          console.error("Error fetching cart from backend:", error);
          set({ error: error.message, isLoading: false });
        }
      },

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
