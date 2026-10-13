"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { productsAPI } from "@/lib/api/products";
import ProductImage from "@/components/ui/ProductImage";
import { priceRange, productImages, totalStock } from "@/components/shop/productData";
import { formatTHB } from "@/lib/format";
import { Reveal } from "./kit";
import { STORY_PRODUCT } from "./landingData";

/**
 * One product, told big: photo, real price/stock/variants and its spec sheet
 * (product attributes) from the API. Hidden when the product is not in the shop.
 */
export default function ProductStory({ onQuickView }) {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await productsAPI.getAllProducts({ search: STORY_PRODUCT, limit: 5 });
        const match = (res.products ?? []).find((p) => p.name === STORY_PRODUCT);
        if (!match) return;
        const detail = await productsAPI.getProductById(match.id).catch(() => null);
        if (alive) setProduct({ ...match, ...(detail?.data ?? detail ?? {}) });
      } catch {
        // Section stays hidden.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return product ? <Story product={product} onQuickView={onQuickView} /> : null;
}

function Story({ product, onQuickView }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [60, -60]);
  const images = productImages(product);
  const { min } = priceRange(product);
  const stock = totalStock(product);
  const specs = Object.entries(product.attributes ?? {});
  const colors = [...new Set((product.variants ?? []).map((v) => v.color).filter(Boolean))];

  return (
    <section ref={ref} aria-labelledby="story-title" className="relative overflow-hidden bg-[#ECEBE6] py-20 text-[#0B0D0B] sm:py-28">
      <div className="mx-auto grid max-w-[90rem] items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-10">
        <div className="relative order-2 lg:order-1">
          <motion.div style={{ y }} className="relative mx-auto aspect-[4/5] max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_80px_-40px_rgba(0,0,0,0.45)]">
            <ProductImage imageUrl={images[0]} alt={product.name} fill sizes="(max-width: 1024px) 90vw, 45vw" className="object-cover" />
          </motion.div>
          <p
            className="pointer-events-none absolute -left-2 top-1/2 hidden -translate-y-1/2 font-display text-[11rem] font-bold uppercase leading-none tracking-tighter text-[#0B0D0B]/[0.05] xl:block"
            aria-hidden
          >
            01
          </p>
        </div>

        <div className="order-1 lg:order-2">
          <Reveal>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0B0D0B]/60">
              <span className="h-px w-6 bg-[#0B0D0B]/60" aria-hidden />
              Featured · {product.brand?.name ?? "Spotlight"}
            </p>
            <h2 id="story-title" className="mt-4 font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight sm:text-6xl xl:text-7xl">
              {product.name}
            </h2>
            {product.description && <p className="mt-6 max-w-lg text-base leading-relaxed text-[#0B0D0B]/70 sm:text-lg">{product.description}</p>}
          </Reveal>

          {specs.length > 0 && (
            <Reveal delay={0.1}>
              <dl className="mt-10 grid grid-cols-2 border-t border-[#0B0D0B]/15 sm:grid-cols-3">
                {specs.slice(0, 6).map(([k, v]) => (
                  <div key={k} className="border-b border-[#0B0D0B]/15 py-4 pr-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#0B0D0B]/50">{k}</dt>
                    <dd className="mt-1 text-sm font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-[#0B0D0B]/50">สเปกจากข้อมูลสินค้าในร้าน</p>
            </Reveal>
          )}

          <Reveal delay={0.2} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <div>
              <p className="font-display text-3xl font-bold tabular-nums">{min != null ? formatTHB(min) : "–"}</p>
              <p className={`text-xs ${stock > 0 ? "text-[#0B0D0B]/60" : "text-red-700"}`}>
                {stock > 0 ? `มีสินค้า${colors.length ? ` · ${colors.join(" / ")}` : ""}` : "สินค้าหมด"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onQuickView(product)}
                disabled={stock <= 0}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0B0D0B] px-6 text-sm font-semibold text-white transition-transform hover:bg-black active:scale-[0.97] disabled:opacity-40"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden /> เลือกสีและเพิ่มลงตะกร้า
              </button>
              <Link
                href={`/products/${product.id}`}
                className="inline-flex h-12 items-center gap-1.5 rounded-full border border-[#0B0D0B]/25 px-6 text-sm font-semibold hover:border-[#0B0D0B]"
              >
                รายละเอียด <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
