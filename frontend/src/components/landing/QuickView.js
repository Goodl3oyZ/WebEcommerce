"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { toast } from "react-hot-toast";
import { ArrowUpRight, Loader2, ShoppingBag, X } from "lucide-react";
import { productsAPI } from "@/lib/api/products";
import useCartStore from "@/store/cartStore";
import useUiStore from "@/store/uiStore";
import ProductImage from "@/components/ui/ProductImage";
import QuantityStepper from "@/components/shop/QuantityStepper";
import { pickupOnly, priceRange, productImages, variantLabel, variantStock } from "@/components/shop/productData";
import { formatTHB, toPrice } from "@/lib/format";

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
const bySize = (a, b) => {
  const ra = SIZE_ORDER.indexOf(String(a).toUpperCase());
  const rb = SIZE_ORDER.indexOf(String(b).toUpperCase());
  if (ra !== -1 && rb !== -1) return ra - rb;
  const na = parseFloat(a);
  const nb = parseFloat(b);
  return Number.isNaN(na) || Number.isNaN(nb) ? 0 : na - nb;
};

/** Colour/size choice over the product's variants (same rules as the product page). */
function usePicker(variants) {
  const groups = useMemo(
    () =>
      [
        { key: "color", label: "สี" },
        { key: "size", label: "ขนาด" },
      ]
        .map((g) => {
          const values = [...new Set(variants.map((v) => v[g.key]).filter(Boolean))];
          return { ...g, values: g.key === "size" ? values.sort(bySize) : values };
        })
        .filter((g) => g.values.length > 0),
    [variants]
  );
  const [picked, setPicked] = useState({});
  useEffect(() => {
    const auto = {};
    groups.forEach((g) => g.values.length === 1 && (auto[g.key] = g.values[0]));
    setPicked(auto);
  }, [groups]);
  const matches = (v, sel) => Object.entries(sel).every(([k, val]) => !val || v[k] === val);
  const selected =
    variants.length === 1 ? variants[0] : groups.every((g) => picked[g.key]) ? variants.find((v) => matches(v, picked)) ?? null : null;
  const available = (key, value) => variants.some((v) => v[key] === value && variantStock(v) > 0 && matches(v, { ...picked, [key]: undefined }));
  return { groups, picked, setPicked, selected, available };
}

/**
 * Product quick view. Opens with the list data straight away, then loads the
 * product (fresh stock, specs). Adding is locked while a request is in flight.
 */
export default function QuickView({ product: initial, onClose }) {
  const open = Boolean(initial);
  const [product, setProduct] = useState(initial);
  const [loadError, setLoadError] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [showChoiceError, setShowChoiceError] = useState(false);
  const inFlight = useRef(false);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useUiStore((s) => s.openCart);

  useEffect(() => {
    if (!initial) return;
    setProduct(initial);
    setImageIndex(0);
    setQuantity(1);
    setShowChoiceError(false);
    setLoadError(false);
    let alive = true;
    productsAPI
      .getProductById(initial.id)
      .then((res) => alive && setProduct(res?.data ?? res?.product ?? res))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, [initial]);

  // Stable identity: a fresh [] each render would re-run the picker's effects forever.
  const variants = useMemo(() => product?.variants ?? [], [product]);
  const { groups, picked, setPicked, selected, available } = usePicker(variants);
  const images = product ? productImages(product) : [];
  const range = product ? priceRange(product) : { min: null };
  const price = selected ? toPrice(selected.price ?? product.price) : range.min;
  const stock = selected ? variantStock(selected) : variants.reduce((s, v) => s + variantStock(v), 0);
  const branchOnly = pickupOnly(product, selected);
  const needsChoice = variants.length > 1 && !selected;
  const soldOut = !needsChoice && stock <= 0;
  const specs = Object.entries(product?.attributes ?? {}).slice(0, 4);

  const add = async () => {
    if (inFlight.current) return;
    if (needsChoice) {
      setShowChoiceError(true);
      return;
    }
    inFlight.current = true;
    setAdding(true);
    try {
      await addItem({
        id: product.id,
        name: product.name,
        price,
        imageUrl: images[0] || "/images/placeholder.svg",
        quantity,
        variantId: selected?.id,
        variant: selected,
        variantName: selected ? variantLabel(selected) : null,
      });
      toast.success("เพิ่มลงตะกร้าแล้ว");
      onClose();
      openCart();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "เพิ่มลงตะกร้าไม่สำเร็จ");
    } finally {
      inFlight.current = false;
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[125]">
      <DialogBackdrop transition className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 data-[closed]:opacity-0" />
      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6">
        <DialogPanel
          transition
          className="dark relative flex max-h-[92svh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#101210] text-fg shadow-2xl transition duration-300 ease-out data-[closed]:translate-y-8 data-[closed]:opacity-0 sm:rounded-3xl md:flex-row motion-reduce:transition-none"
        >
          {product && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
                aria-label="ปิด"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>

              <div className="shrink-0 md:w-[46%]">
                <div className="relative aspect-[4/3] bg-[#181a18] md:aspect-[4/5]">
                  <ProductImage imageUrl={images[imageIndex]} alt={product.name} fill sizes="(max-width: 768px) 100vw, 420px" className="object-cover" />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 p-3" role="group" aria-label="รูปสินค้า">
                    {images.slice(0, 5).map((src, i) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setImageIndex(i)}
                        aria-label={`รูปที่ ${i + 1}`}
                        aria-pressed={i === imageIndex}
                        className={`relative h-14 w-14 overflow-hidden rounded-lg border-2 ${i === imageIndex ? "border-brand" : "border-transparent opacity-60 hover:opacity-100"}`}
                      >
                        <ProductImage imageUrl={src} alt="" fill sizes="56px" className="object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8">
                {product.brand?.name && (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">{product.brand.name}</p>
                )}
                <DialogTitle className="mt-2 pr-10 font-display text-2xl font-bold leading-tight sm:text-3xl">{product.name}</DialogTitle>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {price != null ? formatTHB(price) : "ยังไม่เปิดขาย"}
                  {!selected && range.max != null && range.min !== range.max && (
                    <span className="ml-2 text-sm font-normal text-fg-muted">เริ่มต้น</span>
                  )}
                </p>
                {product.description && <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-fg-muted">{product.description}</p>}

                {specs.length > 0 && (
                  <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 text-sm">
                    {specs.map(([k, v]) => (
                      <div key={k} className="bg-[#101210] p-3">
                        <dt className="text-[11px] uppercase tracking-wider text-fg-subtle">{k}</dt>
                        <dd className="mt-1 text-fg">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {groups.map((g) => (
                  <fieldset key={g.key} className="mt-5">
                    <legend className="text-sm font-medium">
                      {g.label}
                      {picked[g.key] && <span className="ml-2 text-fg-muted">{picked[g.key]}</span>}
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {g.values.map((value) => {
                        const on = picked[g.key] === value;
                        const ok = available(g.key, value);
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              setPicked((p) => ({ ...p, [g.key]: on ? undefined : value }));
                              setShowChoiceError(false);
                            }}
                            className={`min-w-[3rem] rounded-full border px-4 py-2 text-sm transition-colors ${
                              on ? "border-brand bg-brand text-brand-ink" : "border-white/20 hover:border-white/60"
                            } ${ok ? "" : "text-fg-subtle line-through decoration-1"}`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
                {showChoiceError && <p className="mt-3 text-sm text-danger" role="alert">เลือก{groups.filter((g) => !picked[g.key]).map((g) => g.label).join(" และ ")}ก่อนเพิ่มลงตะกร้า</p>}

                <p className={`mt-4 text-sm ${soldOut ? "text-danger" : stock <= 5 && !needsChoice ? "text-warning" : "text-success"}`}>
                  {needsChoice ? "มีสินค้า เลือกตัวเลือกเพื่อดูจำนวนคงเหลือ" : soldOut ? "สินค้าหมด" : stock <= 5 ? `เหลือ ${stock} ชิ้น` : "มีสินค้า"}
                  {branchOnly && !needsChoice && " · รับที่สาขาเท่านั้น"}
                </p>
                {loadError && <p className="mt-1 text-xs text-fg-subtle">โหลดข้อมูลล่าสุดไม่สำเร็จ แสดงข้อมูลจากหน้ารายการ</p>}

                <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                  <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, Math.min(99, selected ? variantStock(selected) : 99))} disabled={adding || soldOut} />
                  <button
                    type="button"
                    onClick={add}
                    disabled={adding || soldOut || price == null}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-brand-ink transition-transform hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShoppingBag className="h-4 w-4" aria-hidden />}
                    {adding ? "กำลังเพิ่ม…" : soldOut ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
                  </button>
                </div>
                <Link href={`/products/${product.id}`} onClick={onClose} className="mt-4 inline-flex items-center gap-1 self-start text-sm text-fg-muted hover:text-fg">
                  ดูรายละเอียดเต็ม <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
