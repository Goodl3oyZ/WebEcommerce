"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, PackageSearch, ShieldCheck, Truck } from "lucide-react";
import { productsAPI } from "@/lib/api/products";
import { categoriesAPI } from "@/lib/api/categories";
import { brandsAPI } from "@/lib/api/brands";
import ProductCard, { ProductCardSkeleton, ProductGrid } from "@/components/ProductCard";
import Container from "@/components/shop/Container";
import SectionHeader from "@/components/shop/SectionHeader";
import { buttonClasses } from "@/components/ui/Button";

const listOf = (res, key) => {
  const list = res?.[key] ?? res?.data ?? res;
  return Array.isArray(list) ? list : [];
};

// Facts the store actually implements (zones cover all 77 provinces, cards are
// tokenized by Omise in the browser, orders are trackable in the account).
const services = [
  { Icon: Truck, title: "จัดส่งทั่วไทย 77 จังหวัด", text: "ค่าส่งคำนวณตามที่อยู่ เห็นยอดจริงก่อนชำระเงิน" },
  { Icon: ShieldCheck, title: "ชำระเงินปลอดภัย", text: "บัตรถูกเข้ารหัสผ่าน Omise ข้อมูลบัตรไม่ผ่านเซิร์ฟเวอร์ร้าน" },
  { Icon: PackageSearch, title: "ติดตามคำสั่งซื้อ", text: "ดูสถานะและเลขพัสดุได้ในบัญชีของคุณ" },
];

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="bg-[#0f0f0f] text-white">
      <Container className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">Run · Train · Gym</p>
          <h1
            id="hero-title"
            className="mt-4 font-display text-4xl font-bold italic leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            ซ้อมหนักแค่ไหน
            <br />
            อุปกรณ์ต้องตามทัน
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
            รองเท้า เสื้อผ้า และอุปกรณ์สำหรับนักวิ่งและสายเทรนนิ่ง ตั้งแต่ก้าวแรกจนถึงวันแข่ง
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className={buttonClasses({ variant: "brand", size: "lg" })}>
              เลือกซื้อสินค้า
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/products?sort=newest"
              className={buttonClasses({
                variant: "outline",
                size: "lg",
                className: "border-white/30 text-white hover:border-white hover:bg-white/10 focus-visible:outline-white",
              })}
            >
              สินค้ามาใหม่
            </Link>
          </div>
        </div>
        <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-[#f3f3f1] sm:aspect-[4/3] lg:aspect-square">
          <Image
            src="/homePageImages/imani-bahati-LxVxPA1LOVM-unsplash.jpg"
            alt="รองเท้าวิ่งสีดำพื้นสีเขียวมะนาว"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="scale-[1.35] object-contain"
          />
        </div>
      </Container>
    </section>
  );
}

function CategoryTiles({ categories, loading }) {
  if (!loading && categories.length === 0) return null;
  return (
    <section aria-labelledby="cat-title" className="py-14 sm:py-20">
      <Container>
        <SectionHeader id="cat-title" eyebrow="Shop by category" title="เลือกตามหมวดหมู่" href="/products" />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="h-28 animate-pulse rounded-card bg-surface-muted sm:h-36" aria-hidden />
              ))
            : categories.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/products?category=${c.id}`}
                    className="group relative flex h-28 flex-col justify-between overflow-hidden rounded-card border border-border bg-surface p-4 transition-colors duration-150 hover:border-fg sm:h-36 sm:p-5"
                  >
                    <ArrowUpRight
                      className="relative ml-auto h-5 w-5 text-fg-subtle transition-colors group-hover:text-fg"
                      aria-hidden
                    />
                    <span className="relative">
                      <span className="block font-display text-lg font-semibold leading-tight sm:text-xl">{c.name}</span>
                      {c.description && (
                        <span className="mt-0.5 line-clamp-1 block text-xs text-fg-subtle sm:text-sm">{c.description}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
      </Container>
    </section>
  );
}

function NewArrivals({ products, loading, error, onRetry }) {
  return (
    <section aria-labelledby="new-title" className="border-t border-border bg-surface py-14 sm:py-20">
      <Container>
        <SectionHeader
          id="new-title"
          eyebrow="New in"
          title="สินค้ามาใหม่"
          description="อัปเดตล่าสุดจากร้าน"
          href="/products?sort=newest"
        />
        {error ? (
          <div className="rounded-card border border-border p-8 text-center">
            <p className="text-sm text-fg-muted">โหลดสินค้าไม่สำเร็จ</p>
            <button type="button" onClick={onRetry} className={buttonClasses({ variant: "outline", size: "sm", className: "mt-4" })}>
              ลองอีกครั้ง
            </button>
          </div>
        ) : !loading && products.length === 0 ? (
          <p className="rounded-card border border-dashed border-border p-8 text-center text-sm text-fg-muted">
            ยังไม่มีสินค้าในร้าน
          </p>
        ) : (
          <ProductGrid>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
          </ProductGrid>
        )}
      </Container>
    </section>
  );
}

function Brands({ brands }) {
  if (brands.length === 0) return null;
  return (
    <section aria-labelledby="brand-title" className="py-14 sm:py-20">
      <Container>
        <SectionHeader id="brand-title" eyebrow="Brands" title="แบรนด์ในร้าน" />
        <ul className="flex flex-wrap gap-2 sm:gap-3">
          {brands.map((b) => (
            <li key={b.id}>
              <Link
                href={`/products?brand=${b.id}`}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-semibold transition-colors hover:border-fg"
              >
                {b.logo && <Image src={b.logo} alt="" width={20} height={20} className="h-5 w-5 object-contain" unoptimized />}
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function Services() {
  return (
    <section aria-label="บริการของร้าน" className="border-y border-border bg-surface">
      <Container as="ul" className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {services.map(({ Icon, title, text }) => (
          <li key={title} className="flex gap-4 py-6 sm:px-6 sm:first:pl-0 sm:last:pr-0">
            <Icon className="mt-0.5 h-6 w-6 shrink-0 text-fg" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-fg">{title}</p>
              <p className="mt-1 text-sm text-fg-muted">{text}</p>
            </div>
          </li>
        ))}
      </Container>
    </section>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productError, setProductError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setProductError(false);
    const [cat, prod, brand] = await Promise.allSettled([
      categoriesAPI.getAllCategories(),
      productsAPI.getAllProducts({ limit: 8, sort: "newest" }),
      brandsAPI.getAllBrands(),
    ]);
    setCategories(cat.status === "fulfilled" ? listOf(cat.value, "categories").filter((c) => !c.parentId) : []);
    if (prod.status === "fulfilled") setProducts(prod.value.products ?? []);
    else setProductError(true);
    setBrands(brand.status === "fulfilled" ? listOf(brand.value, "brands").filter((b) => b.isActive !== false) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Hero />
      <Services />
      <CategoryTiles categories={categories} loading={loading} />
      <NewArrivals products={products} loading={loading} error={productError} onRetry={load} />
      <Brands brands={brands} />
    </>
  );
}
