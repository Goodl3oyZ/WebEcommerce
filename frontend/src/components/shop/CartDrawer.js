"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { toast } from "react-hot-toast";
import { AlertCircle, Loader2, ShoppingBag, Store, Trash2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cartAPI } from "@/lib/api/cart";
import useCartStore from "@/store/cartStore";
import useUiStore from "@/store/uiStore";
import { normalizeCartLine } from "@/components/shop/cartLines";
import QuantityStepper from "@/components/shop/QuantityStepper";
import ProductImage from "@/components/ui/ProductImage";
import { buttonClasses } from "@/components/ui/Button";
import { formatTHB } from "@/lib/format";

/**
 * Slide-over cart. Signed in: the server cart (prices and stock as the API
 * sees them); guests: the local cart. Totals here are item subtotals only;
 * shipping, VAT and coupons are worked out at checkout.
 */
export default function CartDrawer() {
  const router = useRouter();
  const open = useUiStore((s) => s.cartOpen);
  const close = useUiStore((s) => s.closeCart);
  const { user } = useAuth();
  const localItems = useCartStore((s) => s.items);
  const [serverItems, setServerItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const signedIn = !!user;

  const load = useCallback(async () => {
    if (!signedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await cartAPI.getCart();
      setServerItems(res.items ?? []);
    } catch (e) {
      setError(e.message || "โหลดตะกร้าไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const lines = (signedIn ? serverItems : localItems).map((i) => normalizeCartLine(i, signedIn));
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const blocked = lines.some((l) => !l.inStock || !l.available);

  const run = async (line, action, done) => {
    if (busyKey) return;
    setBusyKey(line.key);
    try {
      await action();
      if (signedIn) await load();
      if (done) toast.success(done);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "ทำรายการไม่สำเร็จ");
    } finally {
      setBusyKey(null);
    }
  };
  const { updateQuantity, removeItem } = useCartStore.getState();

  const go = (href) => {
    close();
    router.push(href);
  };
  const checkout = () => go(signedIn ? "/checkout" : `/auth/login?redirect=${encodeURIComponent("/checkout")}`);

  return (
    <Dialog open={open} onClose={close} className="relative z-[130]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 data-[closed]:opacity-0"
      />
      <DialogPanel
        transition
        className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface text-fg shadow-2xl transition-transform duration-300 ease-out data-[closed]:translate-x-full motion-reduce:transition-none"
      >
        <header className="flex h-16 items-center justify-between border-b border-border px-5">
          <DialogTitle className="font-display text-lg font-semibold">
            ตะกร้าสินค้า {count > 0 && <span className="text-fg-muted">({count})</span>}
          </DialogTitle>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-fg/5"
            aria-label="ปิดตะกร้า"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5">
          {loading && lines.length === 0 ? (
            <ul className="space-y-5 py-6" aria-label="กำลังโหลด">
              {[0, 1].map((i) => (
                <li key={i} className="flex animate-pulse gap-4">
                  <div className="h-20 w-20 rounded-lg bg-surface-muted" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 w-2/3 rounded bg-surface-muted" />
                    <div className="h-3 w-1/3 rounded bg-surface-muted" />
                  </div>
                </li>
              ))}
            </ul>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-sm text-fg-muted">{error}</p>
              <button type="button" onClick={load} className={buttonClasses({ variant: "outline", size: "sm", className: "mt-4" })}>
                ลองอีกครั้ง
              </button>
            </div>
          ) : lines.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <ShoppingBag className="h-10 w-10 text-fg-subtle" aria-hidden />
              <p className="mt-4 font-medium">ตะกร้ายังว่างอยู่</p>
              <p className="mt-1 text-sm text-fg-muted">เลือกสินค้าที่ชอบแล้วกดเพิ่มลงตะกร้า</p>
              <button type="button" onClick={() => go("/products")} className={buttonClasses({ variant: "default", size: "md", className: "mt-6" })}>
                เลือกซื้อสินค้า
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lines.map((line) => {
                const busy = busyKey === line.key;
                return (
                  <li key={line.key} className="flex gap-4 py-5">
                    <Link
                      href={`/products/${line.productId}`}
                      onClick={close}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-muted"
                      tabIndex={-1}
                    >
                      <ProductImage imageUrl={line.image} alt={line.name} fill sizes="80px" className="object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/products/${line.productId}`} onClick={close} className="line-clamp-2 text-sm font-medium hover:underline">
                            {line.name}
                          </Link>
                          {line.options && <p className="mt-0.5 text-xs text-fg-muted">{line.options}</p>}
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums">{formatTHB(line.price * line.quantity)}</p>
                      </div>
                      {(!line.inStock || !line.available) && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-danger">
                          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                          {!line.available ? "สินค้านี้ปิดการขายแล้ว" : "สต็อกไม่พอ ปรับจำนวนก่อนชำระเงิน"}
                        </p>
                      )}
                      {line.inStock && line.available && line.pickupOnly && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-fg-muted">
                          <Store className="h-3.5 w-3.5" aria-hidden />
                          มีที่สาขาเท่านั้น รับที่ร้าน
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                        <QuantityStepper
                          size="sm"
                          value={line.quantity}
                          max={Math.max(1, line.maxStock)}
                          disabled={Boolean(busyKey)}
                          onChange={(q) => run(line, () => updateQuantity(line.storeId, q, line.variantId))}
                          label={`จำนวน ${line.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => run(line, () => removeItem(line.storeId, line.variantId), "นำออกจากตะกร้าแล้ว")}
                          disabled={Boolean(busyKey)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-fg-muted hover:bg-fg/5 hover:text-danger disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                          ลบ<span className="sr-only"> {line.name}</span>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <footer className="border-t border-border p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-fg-muted">ยอดรวมสินค้า</span>
              <span className="text-lg font-semibold tabular-nums">{formatTHB(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-fg-subtle">ค่าจัดส่ง VAT และส่วนลดคำนวณตอนชำระเงิน</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => go("/cart")} className={buttonClasses({ variant: "outline", size: "md" })}>
                ดูตะกร้า
              </button>
              <button type="button" onClick={checkout} disabled={blocked} className={buttonClasses({ variant: "brand", size: "md" })}>
                ชำระเงิน
              </button>
            </div>
          </footer>
        )}
      </DialogPanel>
    </Dialog>
  );
}
