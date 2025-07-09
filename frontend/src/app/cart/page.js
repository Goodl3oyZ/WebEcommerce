"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cartAPI } from "@/lib/api/cart";
import useCartStore from "@/store/cartStore";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  FiShoppingCart,
  FiTrash2,
  FiPlus,
  FiMinus,
  FiArrowLeft,
  FiShoppingBag,
  FiHeart,
  FiGift,
  FiTruck,
  FiShield,
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";
import Image from "next/image";

export default function CartPage() {
  const { user, authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [updatingItems, setUpdatingItems] = useState(new Set());

  // Track if we've attempted sync for the current session
  const syncAttemptedRef = useRef(false);

  const {
    items: localItems,
    removeItem: removeLocalItem,
    updateQuantity: updateLocalQuantity,
    getTotalPrice,
  } = useCartStore();
  const clearCartStore = useCartStore((state) => state.clearCart);

  const formatPrice = (price) => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return numPrice.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const syncCartData = useCallback(async () => {
    try {
      const currentLocalItems = useCartStore.getState().items;
      console.log("🛒 Local cart items to sync:", currentLocalItems);

      if (!currentLocalItems || currentLocalItems.length === 0) {
        console.log("❌ No local cart items to sync.");
        return null;
      }

      const sanitizedItems = currentLocalItems.map((item) => ({
        productId: item.id,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
        price: parseFloat(item.price),
      }));

      console.log("🔄 Syncing items:", JSON.stringify(sanitizedItems));
      setIsSyncing(true);

      const response = await cartAPI.mergeGuestCart({ items: sanitizedItems });
      console.log("✅ Merged guest cart with user cart");

      clearCartStore();
      return await cartAPI.getCart();
    } catch (error) {
      console.error("🛑 Error syncing cart:", error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [clearCartStore]);

  // Main cart initialization effect
  useEffect(() => {
    if (authLoading) return;

    const initializeCart = async () => {
      try {
        setLoading(true);
        setError(null);

        if (user) {
          // Case 1: User is logged in and we have local items to sync
          if (localItems.length > 0 && !syncAttemptedRef.current) {
            console.log("🔄 Starting cart sync process...");
            syncAttemptedRef.current = true;

            try {
              const syncResult = await syncCartData();
              setCart(syncResult || (await cartAPI.getCart()));
            } catch (syncError) {
              console.error("❌ Cart sync failed:", syncError);
              toast.error("Failed to sync cart");
              setCart(await cartAPI.getCart());
            }
          }
          // Case 2: User is logged in but no sync needed
          else {
            console.log("📦 Fetching user cart (no sync needed)...");
            setCart(await cartAPI.getCart());
          }
        }
        // Case 3: User is not logged in - use local cart
        else {
          console.log("🏠 Using local cart");
          setCart({
            items: localItems,
            subtotal: getTotalPrice(),
          });
        }
      } catch (error) {
        console.error("❌ Error initializing cart:", error);
        setError(error.message || "Failed to load cart");
      } finally {
        setLoading(false);
      }
    };

    initializeCart();
  }, [user, authLoading, getTotalPrice, localItems, syncCartData]);

  // Reset sync attempt flag when user logs out
  useEffect(() => {
    if (!user) {
      syncAttemptedRef.current = false;
    }
  }, [user, getTotalPrice, localItems, syncCartData]);

  // Update quantity with loading state
  const updateQuantity = async (itemId, quantity, variantId = null) => {
    const itemKey = `${itemId}-${variantId || ""}`;
    setUpdatingItems((prev) => new Set([...prev, itemKey]));

    try {
      console.log("Updating quantity:", { itemId, quantity, variantId });
      const items = user ? cart.items : localItems;
      const item = items.find(
        (item) => item.id === itemId && item.variantId === variantId
      );

      if (!item) {
        throw new Error("Item not found");
      }

      // Check if quantity exceeds stock
      const maxStock = item.variant
        ? item.variant.stock
        : item.product?.stock || 999;
      if (quantity > maxStock) {
        toast.error(`มีสินค้าคงเหลือเพียง ${maxStock} ชิ้น`);
        return;
      }

      await updateLocalQuantity(itemId, quantity, variantId);

      // Update cart state based on whether user is logged in
      if (user) {
        const response = await cartAPI.getCart();
        setCart(response);
      } else {
        // For local cart, update immediately
        setCart({
          items: useCartStore.getState().items,
          subtotal: useCartStore.getState().getTotalPrice(),
        });
      }

      toast.success("อัปเดตตะกร้าแล้ว");
    } catch (err) {
      console.error("Error updating quantity:", err);
      setError(err.message || "Failed to update quantity");
      toast.error(err.message || "ไม่สามารถอัปเดตได้");
    } finally {
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  // Remove item with loading state
  const removeItem = async (itemId, variantId = null) => {
    const itemKey = `${itemId}-${variantId || ""}`;
    setUpdatingItems((prev) => new Set([...prev, itemKey]));

    try {
      console.log("Removing item:", { itemId, variantId });
      await removeLocalItem(itemId, variantId);

      // Update cart state based on whether user is logged in
      if (user) {
        const response = await cartAPI.getCart();
        setCart(response);
      } else {
        // For local cart, update immediately
        setCart({
          items: useCartStore.getState().items,
          subtotal: useCartStore.getState().getTotalPrice(),
        });
      }

      toast.success("ลบสินค้าออกจากตะกร้าแล้ว");
    } catch (err) {
      console.error("Error removing item:", err);
      setError(err.message || "Failed to remove item");
      toast.error(err.message || "ไม่สามารถลบสินค้าได้");
    } finally {
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 text-lg">
              {isSyncing
                ? "กำลังซิงค์ตะกร้าสินค้า..."
                : "กำลังโหลดตะกร้าสินค้า..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <FiAlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              เกิดข้อผิดพลาด
            </h3>
            <p className="text-gray-600 mb-6 text-center max-w-md">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span>ลองใหม่</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const items = user ? cart.items : localItems;
  const subtotal = user ? cart.subtotal : getTotalPrice();
  const sortedItems = [...items].sort((a, b) => a.id - b.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 md:px-8 animate-fade-in">
      <div className="container mx-auto px-2 md:px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-3 md:gap-0 animate-fade-in-down">
          <div className="flex items-center space-x-3">
            <Link
              href="/products"
              className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors text-sm md:text-base font-medium"
            >
              <FiArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
              <span>กลับไปช็อป</span>
            </Link>
            <div className="h-5 w-px bg-gray-300"></div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center space-x-2">
              <FiShoppingCart className="w-6 h-6 text-blue-600 animate-bounce" />
              <span>ตะกร้าสินค้า</span>
            </h1>
          </div>
          {sortedItems.length > 0 && (
            <div className="text-sm md:text-base text-gray-600 font-medium bg-white rounded-lg px-3 py-1.5 shadow-sm animate-fade-in">
              {sortedItems.length} รายการ
            </div>
          )}
        </div>

        {sortedItems.length === 0 ? (
          // Empty Cart State
          <div className="bg-white rounded-2xl shadow p-6 md:p-10 flex flex-col items-center justify-center animate-fade-in-up">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6 shadow animate-pulse">
              <FiShoppingBag className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
              ตะกร้าสินค้าว่างเปล่า
            </h2>
            <p className="text-gray-600 mb-6 text-base text-center">
              ยังไม่มีสินค้าในตะกร้า เริ่มเลือกซื้อสินค้าที่คุณชอบกันเลย!
            </p>
            {/* Suggested Actions */}
            <div className="flex flex-col md:flex-row gap-3 w-full max-w-xs mx-auto mb-8">
              <Link href="/products" className="flex-1">
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 px-4 rounded-lg font-semibold text-base shadow hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 animate-fade-in">
                  เริ่มช็อปปิ้ง
                </button>
              </Link>
              <Link href="/products?featured=true" className="flex-1">
                <button className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg font-semibold text-base hover:bg-gray-200 transition-colors shadow animate-fade-in">
                  ดูสินค้าแนะนำ
                </button>
              </Link>
            </div>
            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8 pt-6 border-t border-gray-100 w-full max-w-2xl animate-fade-in-up">
              <div className="text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2 shadow">
                  <FiTruck className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-0.5 text-sm">
                  จัดส่งฟรี
                </h4>
                <p className="text-xs text-gray-600">
                  สำหรับคำสั่งซื้อ 1,000 บาทขึ้นไป
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2 shadow">
                  <FiShield className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-0.5 text-sm">
                  ชำระเงินปลอดภัย
                </h4>
                <p className="text-xs text-gray-600">
                  รองรับการชำระหลายช่องทาง
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2 shadow">
                  <FiGift className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-0.5 text-sm">
                  สะสมแต้ม
                </h4>
                <p className="text-xs text-gray-600">รับแต้มทุกการซื้อ</p>
              </div>
            </div>
          </div>
        ) : (
          // Cart Items
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">
                    รายการสินค้า
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {sortedItems.map((item, index) => {
                    const itemKey = `${item.id}-${item.variantId || ""}`;
                    const isUpdating = updatingItems.has(itemKey);
                    return (
                      <div
                        key={itemKey}
                        className={`p-5 transition-all duration-200 flex items-center gap-4 ${
                          isUpdating ? "opacity-60" : "opacity-100"
                        }`}
                      >
                        {/* Product Image */}
                        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow">
                          <Image
                            src={
                              user
                                ? item.product?.imageUrl[0] ||
                                  "/images/placeholder.svg"
                                : item.imageUrl || "/images/placeholder.svg"
                            }
                            alt={user ? item.product?.name : item.name}
                            fill
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                        {/* Product Details */}
                        <div className="flex-grow min-w-0 flex flex-col gap-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-grow pr-1">
                              <h3 className="font-bold text-base md:text-lg text-gray-900 mb-0.5 line-clamp-2">
                                {user ? item.product?.name : item.name}
                              </h3>
                              {/* Variant Info */}
                              {(user ? item.variant : item.variant) && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {user
                                      ? item.variant.color
                                      : item.variant.color}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {user
                                      ? item.variant.size
                                      : item.variant.size}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    คงเหลือ{" "}
                                    {user
                                      ? item.variant.stock
                                      : item.variant.stock}{" "}
                                    ชิ้น
                                  </span>
                                </div>
                              )}
                              {!user && item.variantName && !item.variant && (
                                <div className="mb-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {item.variantName}
                                  </span>
                                </div>
                              )}
                            </div>
                            {/* Actions */}
                            <div className="flex flex-col items-end gap-1">
                              <button className="p-1.5 text-gray-400 hover:text-pink-500 transition-colors rounded-full bg-gray-50 shadow-sm">
                                <FiHeart className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  removeItem(
                                    item.id,
                                    user ? item.variantId : item.variantId
                                  )
                                }
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-full bg-gray-50 shadow-sm"
                                disabled={isUpdating}
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {/* Price and Quantity Controls */}
                          <div className="flex items-center justify-between mt-1">
                            {/* Quantity Controls */}
                            <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    Math.max(1, item.quantity - 1),
                                    user ? item.variantId : item.variantId
                                  )
                                }
                                className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-l-lg"
                                disabled={item.quantity <= 1 || isUpdating}
                              >
                                <FiMinus className="w-4 h-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-semibold min-w-[2.5rem] text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => {
                                  const maxStock = user
                                    ? item.variant
                                      ? item.variant.stock
                                      : item.product?.stock || 999
                                    : item.variant
                                    ? item.variant.stock
                                    : 999;
                                  updateQuantity(
                                    item.id,
                                    Math.min(maxStock, item.quantity + 1),
                                    user ? item.variantId : item.variantId
                                  );
                                }}
                                className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-r-lg"
                                disabled={
                                  item.quantity >=
                                    (user
                                      ? item.variant
                                        ? item.variant.stock
                                        : item.product?.stock || 999
                                      : item.variant
                                      ? item.variant.stock
                                      : 999) || isUpdating
                                }
                              >
                                <FiPlus className="w-4 h-4" />
                              </button>
                            </div>
                            {/* Price */}
                            <div className="text-right">
                              <div className="text-sm text-gray-500 mb-0.5">
                                ฿{formatPrice(user ? item.price : item.price)} ×{" "}
                                {item.quantity}
                              </div>
                              <div className="font-bold text-lg text-gray-900">
                                ฿
                                {formatPrice(
                                  parseFloat(user ? item.price : item.price) *
                                    item.quantity
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow p-5 sticky top-24 flex flex-col gap-4 animate-fade-in">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  สรุปคำสั่งซื้อ
                </h2>
                <div className="space-y-2 mb-1">
                  <div className="flex justify-between text-gray-600 text-sm">
                    <span>ราคาสินค้า ({sortedItems.length} รายการ)</span>
                    <span>฿{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-sm">
                    <span>ค่าจัดส่ง</span>
                    <span>ยังไม่ได้ทำ...</span>
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">
                        ยอดรวม
                      </span>
                      <span className="text-2xl font-extrabold text-gray-900">
                        ฿{formatPrice(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Benefits */}
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-3 flex items-center gap-2 mb-1">
                  <FiGift className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    🎉 ได้รับแต้มสะสม {Math.floor(subtotal / 100)} แต้ม
                  </span>
                  <span>ยังไม่ได้ทำ...</span>
                </div>
                <button
                  onClick={() => {
                    if (!user) {
                      window.location.href = "/auth/login";
                      return;
                    }
                    window.location.href = "/checkout";
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-bold text-base shadow hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none animate-fade-in"
                  disabled={isSyncing || sortedItems.length === 0}
                >
                  {isSyncing
                    ? "กำลังซิงค์..."
                    : user
                    ? "ดำเนินการชำระเงิน"
                    : "เข้าสู่ระบบเพื่อสั่งซื้อ"}
                </button>
                {!user && (
                  <p className="text-xs text-gray-500 text-center mt-1">
                    กรุณาเข้าสู่ระบบเพื่อดำเนินการสั่งซื้อ
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
