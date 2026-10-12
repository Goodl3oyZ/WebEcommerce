"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { SlidersHorizontal, X } from "lucide-react";
import { productsAPI } from "@/lib/api/products";
import { categoriesAPI } from "@/lib/api/categories";
import { brandsAPI } from "@/lib/api/brands";
import ProductCard, { ProductCardSkeleton, ProductGrid } from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import Container from "@/components/shop/Container";
import Breadcrumbs from "@/components/shop/Breadcrumbs";
import { Button, buttonClasses } from "@/components/ui/Button";
import { formatTHB } from "@/lib/format";

const PAGE_SIZE = 12;
const SORTS = [
  { value: "newest", label: "มาใหม่ล่าสุด" },
  { value: "price_asc", label: "ราคา: ต่ำ → สูง" },
  { value: "price_desc", label: "ราคา: สูง → ต่ำ" },
  { value: "name_asc", label: "ชื่อ: ก → ฮ / A → Z" },
  { value: "name_desc", label: "ชื่อ: ฮ → ก / Z → A" },
];
const FILTER_KEYS = ["category", "brand", "minPrice", "maxPrice", "inStock", "search"];

const listOf = (res, key) => {
  const list = res?.[key] ?? res?.data ?? res;
  return Array.isArray(list) ? list : [];
};

function OptionList({ legend, name, options, value, onChange }) {
  if (options.length === 0) return null;
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-fg">{legend}</legend>
      <div className="space-y-1">
        {[{ id: "", name: "ทั้งหมด" }, ...options].map((o) => {
          const checked = (value || "") === o.id;
          return (
            <label
              key={o.id || "all"}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-fg/5 ${
                checked ? "font-semibold text-fg" : "text-fg-muted"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.id}
                checked={checked}
                onChange={() => onChange(o.id)}
                className="h-4 w-4 border-border text-fg focus:ring-fg"
              />
              {o.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function PriceRange({ minPrice, maxPrice, onApply }) {
  const [min, setMin] = useState(minPrice ?? "");
  const [max, setMax] = useState(maxPrice ?? "");
  useEffect(() => {
    setMin(minPrice ?? "");
    setMax(maxPrice ?? "");
  }, [minPrice, maxPrice]);
  const invalid = min !== "" && max !== "" && Number(min) > Number(max);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid) onApply(min, max);
      }}
    >
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-fg">ช่วงราคา (บาท)</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="price-min">ราคาต่ำสุด</label>
          <input
            id="price-min"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="ต่ำสุด"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className="h-10 w-full rounded-lg border-border bg-surface px-3 text-sm focus:border-fg focus:ring-fg"
          />
          <span className="text-fg-subtle" aria-hidden>–</span>
          <label className="sr-only" htmlFor="price-max">ราคาสูงสุด</label>
          <input
            id="price-max"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="สูงสุด"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            aria-invalid={invalid}
            aria-describedby={invalid ? "price-error" : undefined}
            className="h-10 w-full rounded-lg border-border bg-surface px-3 text-sm focus:border-fg focus:ring-fg"
          />
        </div>
        {invalid && (
          <p id="price-error" className="mt-2 text-xs text-danger">ราคาต่ำสุดต้องไม่มากกว่าราคาสูงสุด</p>
        )}
        <Button type="submit" variant="outline" size="sm" className="mt-3 w-full" disabled={invalid}>
          ใช้ช่วงราคานี้
        </Button>
      </fieldset>
    </form>
  );
}

function Filters({ params, categories, brands, update }) {
  return (
    <div className="space-y-8">
      <OptionList
        legend="หมวดหมู่"
        name="category"
        options={categories}
        value={params.get("category")}
        onChange={(v) => update({ category: v })}
      />
      <OptionList
        legend="แบรนด์"
        name="brand"
        options={brands}
        value={params.get("brand")}
        onChange={(v) => update({ brand: v })}
      />
      <PriceRange
        minPrice={params.get("minPrice")}
        maxPrice={params.get("maxPrice")}
        onApply={(minPrice, maxPrice) => update({ minPrice, maxPrice })}
      />
      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-fg">
        <input
          type="checkbox"
          checked={params.get("inStock") === "true"}
          onChange={(e) => update({ inStock: e.target.checked ? "true" : "" })}
          className="h-4 w-4 rounded border-border text-fg focus:ring-fg"
        />
        แสดงเฉพาะสินค้าที่มีของ
      </label>
    </div>
  );
}

function ProductsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const sort = SORTS.some((s) => s.value === params.get("sort")) ? params.get("sort") : "newest";
  const queryKey = params.toString();

  useEffect(() => {
    Promise.allSettled([categoriesAPI.getAllCategories(), brandsAPI.getAllBrands()]).then(([c, b]) => {
      if (c.status === "fulfilled") setCategories(listOf(c.value, "categories"));
      if (b.status === "fulfilled") setBrands(listOf(b.value, "brands").filter((x) => x.isActive !== false));
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query = { page, limit: PAGE_SIZE, sort };
    FILTER_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) query[k] = v;
    });
    try {
      const res = await productsAPI.getAllProducts(query);
      setProducts(res.products ?? []);
      setTotal(res.pagination?.total ?? res.total ?? 0);
    } catch (e) {
      setError(e.message || "โหลดสินค้าไม่สำเร็จ");
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
    // queryKey captures every search param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  useEffect(() => {
    load();
  }, [load]);

  /** Merge changes into the URL; any filter change returns to page 1. */
  const update = useCallback(
    (changes, { resetPage = true } = {}) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
      if (resetPage) next.delete("page");
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router]
  );

  const categoryName = categories.find((c) => c.id === params.get("category"))?.name;
  const brandName = brands.find((b) => b.id === params.get("brand"))?.name;
  const search = params.get("search");
  const title = search ? `ผลการค้นหา “${search}”` : categoryName || brandName || "สินค้าทั้งหมด";

  const chips = useMemo(() => {
    const list = [];
    if (search) list.push({ key: "search", label: `ค้นหา: ${search}` });
    if (categoryName) list.push({ key: "category", label: categoryName });
    if (brandName) list.push({ key: "brand", label: brandName });
    const min = params.get("minPrice");
    const max = params.get("maxPrice");
    if (min || max) {
      list.push({
        key: "price",
        label: min && max ? `${formatTHB(min)} – ${formatTHB(max)}` : min ? `ตั้งแต่ ${formatTHB(min)}` : `ไม่เกิน ${formatTHB(max)}`,
        clear: { minPrice: "", maxPrice: "" },
      });
    }
    if (params.get("inStock") === "true") list.push({ key: "inStock", label: "มีของ" });
    return list;
  }, [search, categoryName, brandName, params]);

  const clearAll = () => router.push(sort !== "newest" ? `${pathname}?sort=${sort}` : pathname, { scroll: false });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <Container className="py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { label: "หน้าแรก", href: "/" },
          { label: "สินค้า", href: "/products" },
          ...(categoryName ? [{ label: categoryName }] : []),
        ]}
      />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-fg-muted" aria-live="polite">
            {loading ? "กำลังโหลด…" : `${total.toLocaleString("th-TH")} รายการ`}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className={buttonClasses({ variant: "outline", size: "md", className: "flex-1 sm:flex-none lg:hidden" })}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            ตัวกรอง
            {chips.length > 0 && (
              <span className="rounded-full bg-fg px-1.5 text-xs text-canvas">{chips.length}</span>
            )}
          </button>
          <label htmlFor="sort" className="sr-only">เรียงตาม</label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => update({ sort: e.target.value === "newest" ? "" : e.target.value })}
            className="h-11 flex-1 rounded-full border-border bg-surface pl-4 pr-10 text-sm font-medium focus:border-fg focus:ring-fg sm:flex-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                เรียง: {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="ตัวกรองที่ใช้อยู่">
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => update(c.clear ?? { [c.key]: "" })}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-muted pl-3 pr-2 text-xs font-medium text-fg hover:bg-fg/10"
              >
                {c.label}
                <X className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">ลบตัวกรองนี้</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={clearAll} className="px-2 text-xs font-semibold underline underline-offset-4">
              ล้างทั้งหมด
            </button>
          </li>
        </ul>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[15rem_1fr]">
        <aside aria-label="ตัวกรองสินค้า" className="hidden lg:block">
          <div className="sticky top-24">
            <Filters params={params} categories={categories} brands={brands} update={update} />
          </div>
        </aside>

        <section aria-label="รายการสินค้า">
          {error ? (
            <div className="rounded-card border border-border p-10 text-center">
              <p className="font-semibold">โหลดสินค้าไม่สำเร็จ</p>
              <p className="mt-1 text-sm text-fg-muted">{error}</p>
              <Button variant="outline" size="sm" className="mt-5" onClick={load}>
                ลองอีกครั้ง
              </Button>
            </div>
          ) : !loading && products.length === 0 ? (
            <div className="rounded-card border border-dashed border-border px-6 py-16 text-center">
              <p className="font-display text-xl font-semibold">ไม่พบสินค้าที่ตรงกับเงื่อนไข</p>
              <p className="mt-2 text-sm text-fg-muted">ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองบางอย่าง</p>
              {chips.length > 0 && (
                <Button variant="default" size="md" className="mt-6" onClick={clearAll}>
                  ล้างตัวกรองทั้งหมด
                </Button>
              )}
            </div>
          ) : (
            <>
              <ProductGrid columns={3}>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
                  : products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 3} />)}
              </ProductGrid>
              {!loading && total > 0 && (
                <div className="mt-12 flex flex-col items-center gap-4">
                  <p className="text-xs text-fg-subtle">
                    แสดง {from}–{to} จาก {total.toLocaleString("th-TH")} รายการ
                  </p>
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => {
                      update({ page: p > 1 ? p : "" }, { resetPage: false });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <Dialog open={filtersOpen} onClose={setFiltersOpen} className="relative z-[120] lg:hidden">
        <DialogBackdrop transition className="fixed inset-0 bg-black/40 transition-opacity duration-200 data-[closed]:opacity-0" />
        <DialogPanel
          transition
          className="fixed inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-surface shadow-xl transition-transform duration-200 ease-out data-[closed]:translate-x-full"
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-5">
            <h2 className="text-base font-semibold">ตัวกรอง</h2>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-fg/5"
              aria-label="ปิดตัวกรอง"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <Filters params={params} categories={categories} brands={brands} update={update} />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
            <Button variant="outline" onClick={clearAll} disabled={chips.length === 0}>
              ล้างทั้งหมด
            </Button>
            <Button variant="default" onClick={() => setFiltersOpen(false)}>
              ดู {loading ? "…" : total} รายการ
            </Button>
          </div>
        </DialogPanel>
      </Dialog>
    </Container>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <Container className="py-10">
          <ProductGrid columns={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </ProductGrid>
        </Container>
      }
    >
      <ProductsView />
    </Suspense>
  );
}
