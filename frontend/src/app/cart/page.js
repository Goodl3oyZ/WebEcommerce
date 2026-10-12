"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { AlertCircle, ArrowRight, Loader2, ShoppingBag, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cartAPI } from "@/lib/api/cart";
import useCartStore from "@/store/cartStore";
import Container from "@/components/shop/Container";
import QuantityStepper from "@/components/shop/QuantityStepper";
import ProductImage from "@/components/ui/ProductImage";
import { Button, buttonClasses } from "@/components/ui/Button";
import { formatTHB } from "@/lib/format";
import { variantLabel } from "@/components/shop/productData";

/** One display shape for server cart lines (signed in) and local lines (guest). */
function normalize(item, signedIn) {
  if (signedIn) {
    return {
      key: item.id,
      storeId: item.id,
      productId: item.productId,
      variantId: item.variantId ?? null,
      name: item.product?.name ?? "สินค้า",
      image: item.variant?.images?.[0] || item.product?.imageUrl?.[0] || null,
      options: variantLabel(item.variant),
      price: Number(item.price),
      quantity: item.quantity,
      maxStock: item.variant?.stock ?? 99,
      inStock: item.inStock !== false,
      priceChanged: !!item.priceChanged,
      available: item.product?.isActive !== false,
    };
  }
  return {
    key: `${item.id}-${item.variantId ?? ""}`,
    storeId: item.id,
    productId: item.id,
    variantId: item.variantId ?? null,
    name: item.name ?? "สินค้า",
    image: Array.isArray(item.imageUrl) ? item.imageUrl[0] : item.imageUrl,
    options: item.variantName || variantLabel(item.variant),
    price: Number(item.price),
    quantity: item.quantity,
    maxStock: item.variant?.stock ?? 99,
    inStock: true,
    priceChanged: false,
    available: true,
  };
}

function CartLine({ line, busy, onQuantity, onRemove }) {
  return (
    <li className="flex gap-4 py-6 first:pt-0 sm:gap-6">
      <Link
        href={`/products/${line.productId}`}
        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-muted sm:h-32 sm:w-32"
        tabIndex={-1}
        aria-hidden
      >
        <ProductImage imageUrl={line.image} alt="" fill className="object-cover" sizes="128px" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href={`/products/${line.productId}`} className="font-medium leading-snug hover:underline underline-offset-4">
              {line.name}
            </Link>
            {line.options && <p className="mt-1 text-sm text-fg-muted">{line.options}</p>}
            <p className="mt-1 text-sm text-fg-subtle tabular-nums">{formatTHB(line.price)} / ชิ้น</p>
          </div>
          <p className="shrink-0 font-semibold tabular-nums">{formatTHB(line.price * line.quantity)}</p>
        </div>

        {(!line.inStock || !line.available || line.priceChanged) && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-warning">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            {!line.available
              ? "สินค้านี้ไม่เปิดขายแล้ว กรุณานำออกจากตะกร้า"
              : !line.inStock
                ? `สต็อกไม่พอ (เหลือ ${line.maxStock} ชิ้น) กรุณาลดจำนวน`
                : "ราคาสินค้าถูกปรับเป็นราคาปัจจุบันแล้ว"}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <QuantityStepper
            size="sm"
            value={line.quantity}
            max={Math.max(line.maxStock, line.quantity)}
            disabled={busy}
            onChange={(q) => onQuantity(line, q)}
            label={`จำนวน ${line.name}`}
          />
          <button
            type="button"
            onClick={() => onRemove(line)}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-fg-muted transition-colors hover:bg-fg/5 hover:text-danger disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
            ลบ<span className="sr-only"> {line.name}</span>
          </button>
        </div>
      </div>
    </li>
  );
}

export default function CartPage() {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const localItems = useCartStore((s) => s.items);
  const { updateQuantity, removeItem } = useCartStore.getState();
  const [serverItems, setServerItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const merged = useRef(false);

  const loadServerCart = useCallback(async () => {
    const res = await cartAPI.getCart();
    setServerItems(res.items ?? []);
  }, []);

  // Signed in: merge any guest items once, then show the server cart.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      merged.current = false;
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Lines loaded from the server carry productId; guest lines do not.
        const guest = useCartStore.getState().items.filter((i) => !i.productId);
        if (!merged.current && guest.length > 0) {
          merged.current = true;
          await cartAPI.mergeGuestCart({
            items: guest.map((i) => ({ productId: i.id, variantId: i.variantId ?? null, quantity: i.quantity })),
          });
          // Local copy only: clearCart() would also empty the server cart.
          useCartStore.getState().setItems([]);
        }
        if (!cancelled) await loadServerCart();
        useCartStore.getState().fetchCartFromBackend();
      } catch (e) {
        if (!cancelled) setError(e.message || "โหลดตะกร้าไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, loadServerCart]);

  const signedIn = !!user;
  const lines = (signedIn ? serverItems : localItems).map((i) => normalize(i, signedIn));
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const blocked = lines.some((l) => !l.inStock || !l.available);

  const run = async (line, action, done) => {
    setBusyKey(line.key);
    try {
      await action();
      if (signedIn) await loadServerCart();
      if (done) toast.success(done);
    } catch (e) {
      toast.error(e.message || "ทำรายการไม่สำเร็จ");
    } finally {
      setBusyKey(null);
    }
  };

  const onQuantity = (line, q) => run(line, () => updateQuantity(line.storeId, q, line.variantId));
  const onRemove = (line) => run(line, () => removeItem(line.storeId, line.variantId), "นำสินค้าออกจากตะกร้าแล้ว");

  const checkout = () => {
    if (!signedIn) router.push(`/auth/login?redirect=${encodeURIComponent("/checkout")}`);
    else router.push("/checkout");
  };

  if (loading || authLoading) {
    return (
      <Container className="py-10">
        <div className="h-9 w-48 animate-pulse rounded bg-surface-muted" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            {[0, 1].map((i) => (
              <div key={i} className="flex animate-pulse gap-6">
                <div className="h-32 w-32 rounded-lg bg-surface-muted" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-2/3 rounded bg-surface-muted" />
                  <div className="h-4 w-1/3 rounded bg-surface-muted" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-56 animate-pulse rounded-card bg-surface-muted" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">โหลดตะกร้าไม่สำเร็จ</h1>
        <p className="mt-2 text-sm text-fg-muted">{error}</p>
        <Button className="mt-6" variant="outline" onClick={() => window.location.reload()}>
          ลองอีกครั้ง
        </Button>
      </Container>
    );
  }

  if (lines.length === 0) {
    return (
      <Container className="flex flex-col items-center py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
          <ShoppingBag className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-2xl font-semibold">ตะกร้าของคุณยังว่างอยู่</h1>
        <p className="mt-2 text-sm text-fg-muted">เลือกอุปกรณ์สำหรับการซ้อมครั้งต่อไปได้เลย</p>
        <Link href="/products" className={buttonClasses({ variant: "brand", size: "lg", className: "mt-8" })}>
          เลือกซื้อสินค้า
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">ตะกร้าสินค้า</h1>
      <p className="mt-1 text-sm text-fg-muted">{itemCount} ชิ้น</p>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1fr_22rem]">
        <section aria-label="สินค้าในตะกร้า">
          <ul className="divide-y divide-border border-b border-border">
            {lines.map((line) => (
              <CartLine key={line.key} line={line} busy={busyKey === line.key} onQuantity={onQuantity} onRemove={onRemove} />
            ))}
          </ul>
          <Link href="/products" className="mt-6 inline-flex text-sm font-semibold underline underline-offset-4">
            เลือกซื้อสินค้าต่อ
          </Link>
        </section>

        <aside aria-labelledby="summary-title" className="rounded-card border border-border bg-surface p-6 lg:sticky lg:top-24">
          <h2 id="summary-title" className="text-lg font-semibold">
            สรุปคำสั่งซื้อ
          </h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">ราคาสินค้า ({itemCount} ชิ้น)</dt>
              <dd className="font-medium tabular-nums">{formatTHB(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-muted">ค่าจัดส่ง</dt>
              <dd className="text-right text-fg-subtle">คำนวณตอนชำระเงิน</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-muted">VAT 7%</dt>
              <dd className="text-right text-fg-subtle">คำนวณตอนชำระเงิน</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-baseline justify-between border-t border-border pt-5">
            <span className="font-semibold">ยอดสินค้า</span>
            <span className="text-xl font-semibold tabular-nums">{formatTHB(subtotal)}</span>
          </div>
          {blocked && (
            <p role="alert" className="mt-4 rounded-lg bg-warning-soft p-3 text-xs font-medium text-warning">
              มีสินค้าบางรายการที่สต็อกไม่พอหรือไม่เปิดขายแล้ว กรุณาแก้ไขก่อนชำระเงิน
            </p>
          )}
          <Button variant="brand" size="lg" className="mt-5 w-full" onClick={checkout} disabled={blocked}>
            {signedIn ? "ดำเนินการชำระเงิน" : "เข้าสู่ระบบเพื่อชำระเงิน"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <p className="mt-3 text-center text-xs text-fg-subtle">มีโค้ดส่วนลด? ใส่ได้ในขั้นตอนชำระเงิน</p>
        </aside>
      </div>
    </Container>
  );
}
