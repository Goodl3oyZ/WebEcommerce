"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import DOMPurify from "isomorphic-dompurify";
import { ChevronLeft, ChevronRight, Expand, Loader2, ShieldCheck, ShoppingBag, Star, Store, Truck, X } from "lucide-react";
import { productsAPI } from "@/lib/api/products";
import useCartStore from "@/store/cartStore";
import ProductImage from "@/components/ui/ProductImage";
import ReviewComposer from "@/components/shop/ReviewComposer";
import Dialog from "@/components/ui/Dialog";
import ProductCard, { ProductGrid } from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import Container from "@/components/shop/Container";
import Breadcrumbs from "@/components/shop/Breadcrumbs";
import PriceTag from "@/components/shop/PriceTag";
import QuantityStepper from "@/components/shop/QuantityStepper";
import SectionHeader from "@/components/shop/SectionHeader";
import { pickupOnly, priceRange, productImages, totalStock, variantLabel, variantStock } from "@/components/shop/productData";
import { Button, buttonClasses } from "@/components/ui/Button";

const ATTRS = [
  { key: "color", label: "สี" },
  { key: "size", label: "ขนาด" },
];
const APPAREL_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL"];
/** Sizes in a natural order: XS < S < M < L, 2.5 kg < 10 kg; anything else keeps its order. */
function bySize(a, b) {
  const ra = APPAREL_SIZES.indexOf(String(a).toUpperCase());
  const rb = APPAREL_SIZES.indexOf(String(b).toUpperCase());
  if (ra !== -1 && rb !== -1) return ra - rb;
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return 0;
}
const REVIEWS_PER_PAGE = 5;
const RECENT_KEY = "recentlyViewedProducts";

function Stars({ value, className = "h-4 w-4" }) {
  return (
    <span className="flex items-center" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${className} ${i < Math.round(value) ? "fill-fg text-fg" : "text-border"}`} />
      ))}
    </span>
  );
}

function Gallery({ images, name }) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const count = images.length;
  const go = useCallback((d) => setIndex((i) => (i + d + count) % count), [count]);

  return (
    <div>
      <div
        className="relative aspect-square overflow-hidden rounded-card bg-surface-muted"
        onKeyDown={(e) => {
          if (count < 2) return;
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        <ProductImage
          imageUrl={images[index]}
          alt={count > 1 ? `${name} รูปที่ ${index + 1} จาก ${count}` : name}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 55vw"
        />
        {count > 0 && (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-fg shadow-sm hover:bg-surface"
            aria-label="ขยายรูปภาพ"
          >
            <Expand className="h-4 w-4" aria-hidden />
          </button>
        )}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 shadow-sm hover:bg-surface"
              aria-label="รูปก่อนหน้า"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 shadow-sm hover:bg-surface"
              aria-label="รูปถัดไป"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <span className="absolute bottom-3 left-3 rounded-full bg-fg/80 px-2.5 py-1 text-xs font-medium tabular-nums text-canvas">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>
      {count > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((url, i) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`ดูรูปที่ ${i + 1}`}
                aria-current={i === index}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg bg-surface-muted ring-offset-2 transition ${
                  i === index ? "ring-2 ring-fg" : "opacity-70 hover:opacity-100"
                }`}
              >
                <ProductImage imageUrl={url} alt="" fill className="object-cover" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={zoomed} onClose={() => setZoomed(false)}>
        <div className="relative h-[85vh] w-[92vw] max-w-4xl">
          <Image src={images[index] || "/images/placeholder.svg"} alt={name} fill className="object-contain" unoptimized sizes="92vw" />
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface text-fg"
            aria-label="ปิดรูปขยาย"
            autoFocus
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </Dialog>
    </div>
  );
}

/** Colour / size pickers derived from the product's variants. */
function useVariantPicker(variants) {
  const groups = useMemo(
    () =>
      ATTRS.map((a) => ({
        ...a,
        values: (() => {
          const values = [...new Set(variants.map((v) => v[a.key]).filter(Boolean))];
          return a.key === "size" ? values.sort(bySize) : values;
        })(),
      }))
        .filter((g) => g.values.length > 0)
        .concat(
          // Variants without colour/size: choose by SKU instead.
          variants.length > 1 && variants.every((v) => !v.color && !v.size)
            ? [{ key: "sku", label: "ตัวเลือก", values: variants.map((v) => v.sku).filter(Boolean) }]
            : []
        ),
    [variants]
  );
  const [picked, setPicked] = useState({});

  // A single variant (or a single value per attribute) needs no choice.
  useEffect(() => {
    const auto = {};
    groups.forEach((g) => {
      if (g.values.length === 1) auto[g.key] = g.values[0];
    });
    setPicked(auto);
  }, [groups]);

  const matches = (v, sel) => Object.entries(sel).every(([k, val]) => !val || v[k] === val);
  const selected =
    variants.length === 1
      ? variants[0]
      : groups.every((g) => picked[g.key])
        ? variants.find((v) => matches(v, picked)) ?? null
        : null;
  const available = (key, value) =>
    variants.some((v) => v[key] === value && variantStock(v) > 0 && matches(v, { ...picked, [key]: undefined }));
  const missing = groups.filter((g) => !picked[g.key]);

  return { groups, picked, setPicked, selected, available, missing };
}

function stockText(stock, branchOnly) {
  if (stock <= 0) return { text: "สินค้าหมด", tone: "text-danger" };
  if (stock <= 5) return { text: `เหลือ ${stock} ชิ้น`, tone: "text-warning" };
  return { text: branchOnly ? "มีสินค้า" : "มีสินค้าพร้อมส่ง", tone: "text-success" };
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const addToCart = useCartStore((s) => s.addItem);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [showVariantError, setShowVariantError] = useState(false);
  const [related, setRelated] = useState([]);
  const [recent, setRecent] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const pickerRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsAPI.getProductById(id);
      if (!data) setError("ไม่พบสินค้านี้");
      else setProduct(data);
    } catch (e) {
      setError(e.message || "โหลดข้อมูลสินค้าไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  // After a review is saved: refresh reviews without the page skeleton.
  const refreshReviews = useCallback(async () => {
    try {
      const data = await productsAPI.getProductById(id);
      if (data) setProduct(data);
    } catch {
      /* keep what is shown */
    }
  }, [id]);

  const variants = useMemo(() => product?.variants ?? [], [product]);
  const { groups, picked, setPicked, selected, available, missing } = useVariantPicker(variants);

  // Related products: same category when known.
  useEffect(() => {
    if (!product) return;
    const req = product.categoryId
      ? productsAPI.getProductsByCategory(product.categoryId, { limit: 8 })
      : productsAPI.getAllProducts({ limit: 8 });
    req
      .then((res) => setRelated((res.products || []).filter((p) => p.id !== product.id).slice(0, 4)))
      .catch(() => setRelated([]));
  }, [product]);

  // Recently viewed (this browser only).
  useEffect(() => {
    if (!product) return;
    let viewed = [];
    try {
      viewed = JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch {}
    viewed = viewed.filter((p) => p.id !== product.id);
    setRecent(viewed.slice(0, 4));
    const entry = {
      id: product.id,
      name: product.name,
      imageUrl: productImages(product).slice(0, 1),
      price: product.price,
      variants: product.variants?.map((v) => ({ price: v.price, stock: v.stock, branchStock: v.branchStock })),
      stock: totalStock(product),
      brand: product.brand,
    };
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...viewed].slice(0, 8)));
    } catch {}
  }, [product]);

  useEffect(() => setQuantity(1), [selected?.id]);

  if (loading) {
    return (
      <Container className="py-10">
        <div className="grid animate-pulse gap-10 lg:grid-cols-[1.1fr_1fr]" aria-busy="true" aria-label="กำลังโหลดสินค้า">
          <div className="aspect-square rounded-card bg-surface-muted" />
          <div className="space-y-4">
            <div className="h-4 w-24 rounded bg-surface-muted" />
            <div className="h-9 w-3/4 rounded bg-surface-muted" />
            <div className="h-7 w-32 rounded bg-surface-muted" />
            <div className="h-24 rounded bg-surface-muted" />
            <div className="h-12 rounded-full bg-surface-muted" />
          </div>
        </div>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container className="py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">{error || "ไม่พบสินค้านี้"}</h1>
        <p className="mt-2 text-sm text-fg-muted">สินค้าอาจถูกนำออกจากร้าน หรือลิงก์ไม่ถูกต้อง</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={load}>
            ลองอีกครั้ง
          </Button>
          <Link href="/products" className={buttonClasses()}>
            ดูสินค้าทั้งหมด
          </Link>
        </div>
      </Container>
    );
  }

  const images = productImages(product);
  const range = priceRange(product);
  const price = selected ? selected.price ?? product.price : range.min;
  const stock = selected ? variantStock(selected) : totalStock(product);
  const branchOnly = pickupOnly(product, selected);
  const stockInfo = stockText(stock, branchOnly);
  const unpriced = !(Number(price) > 0);
  const soldOut = stock <= 0;
  const reviews = product.reviews ?? [];
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const reviewPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
  const pagedReviews = reviews.slice((reviewPage - 1) * REVIEWS_PER_PAGE, reviewPage * REVIEWS_PER_PAGE);
  const needsChoice = variants.length > 0 && !selected;

  const handleAdd = async () => {
    if (needsChoice) {
      setShowVariantError(true);
      pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      pickerRef.current?.querySelector("button:not([disabled])")?.focus({ preventScroll: true });
      return;
    }
    setAdding(true);
    try {
      await addToCart({
        id: product.id,
        name: product.name,
        price,
        imageUrl: images[0] || "/images/placeholder.svg",
        quantity,
        variantId: selected?.id,
        variant: selected,
        variantName: selected ? variantLabel(selected) : null,
      });
      toast.success(
        <span className="flex items-center gap-3">
          เพิ่มลงตะกร้าแล้ว
          <Link href="/cart" className="font-semibold underline underline-offset-4">
            ดูตะกร้า
          </Link>
        </span>
      );
    } catch (e) {
      toast.error(e.message || "เพิ่มลงตะกร้าไม่สำเร็จ");
    } finally {
      setAdding(false);
    }
  };

  const ctaLabel = soldOut && !needsChoice ? "สินค้าหมด" : unpriced ? "ยังไม่เปิดขาย" : "เพิ่มลงตะกร้า";
  const ctaDisabled = adding || (!needsChoice && (soldOut || unpriced));

  return (
    <div>
      <Container className="py-6 sm:py-8">
        <Breadcrumbs
          items={[
            { label: "หน้าแรก", href: "/" },
            { label: "สินค้า", href: "/products" },
            ...(product.category ? [{ label: product.category.name, href: `/products?category=${product.category.id}` }] : []),
            { label: product.name },
          ]}
        />

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <Gallery images={images} name={product.name} />

          <div className="lg:pt-2">
            {product.brand?.name && (
              <Link
                href={`/products?brand=${product.brand.id}`}
                className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle hover:text-fg"
              >
                {product.brand.name}
              </Link>
            )}
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            {reviews.length > 0 && (
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
                <Stars value={avg} />
                <span>
                  {avg.toFixed(1)} · {reviews.length} รีวิว
                </span>
              </a>
            )}

            <div className="mt-5">
              <PriceTag value={price} from={!selected && range.min !== range.max} size="lg" />
              <p className="mt-1 text-xs text-fg-subtle">ยังไม่รวม VAT 7% และค่าจัดส่ง (คำนวณตอนชำระเงิน)</p>
            </div>

            {groups.length > 0 && (
              <div ref={pickerRef} className="mt-8 space-y-6">
                {groups.map((g) => {
                  const err = showVariantError && !picked[g.key];
                  return (
                    <fieldset key={g.key} aria-describedby={err ? `err-${g.key}` : undefined}>
                      <legend className="mb-3 flex w-full items-baseline justify-between text-sm">
                        <span className="font-semibold">
                          {g.label}
                          {picked[g.key] && <span className="ml-2 font-normal text-fg-muted">{picked[g.key]}</span>}
                        </span>
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {g.values.map((value) => {
                          const isOn = picked[g.key] === value;
                          const ok = available(g.key, value);
                          return (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={isOn}
                              disabled={!ok && g.values.length > 1}
                              onClick={() => {
                                setPicked((p) => ({ ...p, [g.key]: isOn && g.values.length > 1 ? undefined : value }));
                                setShowVariantError(false);
                              }}
                              className={`min-h-11 min-w-[3.25rem] rounded-lg border px-4 text-sm font-medium transition-colors ${
                                isOn
                                  ? "border-fg bg-fg text-canvas"
                                  : ok
                                    ? "border-border bg-surface text-fg hover:border-fg"
                                    : "cursor-not-allowed border-dashed border-border text-fg-subtle"
                              }`}
                            >
                              {value}
                              {!ok && g.values.length > 1 && <span className="sr-only"> (หมด)</span>}
                            </button>
                          );
                        })}
                      </div>
                      {err && (
                        <p id={`err-${g.key}`} role="alert" className="mt-2 text-sm font-medium text-danger">
                          กรุณาเลือก{g.label}
                        </p>
                      )}
                    </fieldset>
                  );
                })}
              </div>
            )}

            <p className={`mt-6 flex items-center gap-2 text-sm font-medium ${stockInfo.tone}`}>
              <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
              {needsChoice && stock > 0 ? "มีสินค้า — เลือกตัวเลือกเพื่อดูจำนวนคงเหลือ" : stockInfo.text}
            </p>
            {branchOnly && (
              <p className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
                <Store className="h-4 w-4 shrink-0" aria-hidden />
                {needsChoice ? "มีเฉพาะที่สาขา" : "ตอนนี้มีที่สาขาเท่านั้น"} สั่งออนไลน์แล้วเลือก &quot;รับที่สาขา&quot; ตอนชำระเงิน
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                max={Math.max(1, selected ? variantStock(selected) : 99)}
                disabled={soldOut || needsChoice}
              />
              <Button variant="brand" size="lg" className="min-w-[12rem] flex-1" onClick={handleAdd} disabled={ctaDisabled}>
                {adding ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ShoppingBag className="h-5 w-5" aria-hidden />}
                {adding ? "กำลังเพิ่ม…" : ctaLabel}
              </Button>
            </div>

            <ul className="mt-8 divide-y divide-border rounded-card border border-border text-sm">
              <li className="flex gap-3 p-4">
                <Truck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span>
                  <span className="font-semibold">จัดส่งทั่วประเทศ</span>
                  <span className="block text-fg-muted">ค่าจัดส่งคำนวณตามที่อยู่ เห็นยอดก่อนยืนยันคำสั่งซื้อ</span>
                </span>
              </li>
              <li className="flex gap-3 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span>
                  <span className="font-semibold">ชำระเงินปลอดภัย</span>
                  <span className="block text-fg-muted">ระบบชำระเงินโดย Omise</span>
                </span>
              </li>
            </ul>

            <section aria-labelledby="desc-title" className="mt-10">
              <h2 id="desc-title" className="text-base font-semibold">
                รายละเอียดสินค้า
              </h2>
              <div
                className="prose prose-sm mt-3 max-w-none text-fg-muted prose-headings:text-fg prose-strong:text-fg prose-a:text-fg"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(product.description || "<p>ยังไม่มีรายละเอียดสินค้า</p>"),
                }}
              />
              <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                {product.brand?.name && (
                  <>
                    <dt className="text-fg-subtle">แบรนด์</dt>
                    <dd>{product.brand.name}</dd>
                  </>
                )}
                {product.category?.name && (
                  <>
                    <dt className="text-fg-subtle">หมวดหมู่</dt>
                    <dd>{product.category.name}</dd>
                  </>
                )}
                {selected?.sku && (
                  <>
                    <dt className="text-fg-subtle">รหัสสินค้า</dt>
                    <dd className="font-mono text-xs leading-5">{selected.sku}</dd>
                  </>
                )}
              </dl>
            </section>
          </div>
        </div>
      </Container>

      <section id="reviews" aria-labelledby="reviews-title" className="mt-16 border-t border-border bg-surface py-14">
        <Container className="grid gap-10 lg:grid-cols-[18rem_1fr]">
          <div>
            <h2 id="reviews-title" className="font-display text-2xl font-semibold">
              รีวิวจากผู้ซื้อ
            </h2>
            {reviews.length > 0 ? (
              <div className="mt-5">
                <p className="font-display text-5xl font-semibold tabular-nums">{avg.toFixed(1)}</p>
                <div className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
                  <Stars value={avg} /> {reviews.length} รีวิว
                </div>
                <ul className="mt-5 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const n = reviews.filter((r) => r.rating === star).length;
                    return (
                      <li key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-10 text-fg-muted">{star} ดาว</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                          <span className="block h-full bg-fg" style={{ width: `${(100 * n) / reviews.length}%` }} />
                        </span>
                        <span className="w-6 text-right tabular-nums text-fg-subtle">{n}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm text-fg-muted">ยังไม่มีรีวิวสำหรับสินค้านี้</p>
            )}
            <ReviewComposer productId={product.id} onSaved={refreshReviews} />
          </div>
          {reviews.length > 0 && (
            <div>
              <ul className="divide-y divide-border">
                {pagedReviews.map((r, i) => (
                  <li key={r.id ?? i} className="py-5 first:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Stars value={r.rating} className="h-3.5 w-3.5" />
                        <span className="sr-only">{r.rating} จาก 5 ดาว</span>
                        <span className="text-sm font-semibold">{r.user?.name || "ผู้ซื้อ"}</span>
                      </div>
                      {r.createdAt && (
                        <time className="text-xs text-fg-subtle" dateTime={r.createdAt}>
                          {new Date(r.createdAt).toLocaleDateString("th-TH", { dateStyle: "medium" })}
                        </time>
                      )}
                    </div>
                    {r.comment && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg-muted">{r.comment}</p>}
                  </li>
                ))}
              </ul>
              {reviewPages > 1 && (
                <div className="mt-6">
                  <Pagination currentPage={reviewPage} totalPages={reviewPages} onPageChange={setReviewPage} />
                </div>
              )}
            </div>
          )}
        </Container>
      </section>

      {related.length > 0 && (
        <Container as="section" aria-labelledby="related-title" className="py-14">
          <SectionHeader
            id="related-title"
            title="สินค้าที่เกี่ยวข้อง"
            href={product.category ? `/products?category=${product.category.id}` : "/products"}
          />
          <ProductGrid>
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ProductGrid>
        </Container>
      )}

      {recent.length > 0 && (
        <Container as="section" aria-labelledby="recent-title" className="pb-14">
          <SectionHeader id="recent-title" title="ดูล่าสุด" />
          <ProductGrid>
            {recent.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ProductGrid>
        </Container>
      )}

      {/* Mobile purchase bar: keeps price and the main action in reach. */}
      <div className="sticky bottom-0 z-40 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-content items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-fg-subtle">{selected ? variantLabel(selected) : product.name}</p>
            <PriceTag value={price} from={!selected && range.min !== range.max} />
          </div>
          <Button variant="brand" size="md" onClick={handleAdd} disabled={ctaDisabled}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShoppingBag className="h-4 w-4" aria-hidden />}
            {needsChoice ? "เลือกตัวเลือก" : ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
