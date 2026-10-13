"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import ProductImage from "@/components/ui/ProductImage";
import { priceRange, productImages, totalStock } from "@/components/shop/productData";
import { formatTHB } from "@/lib/format";

/** Dark product card: second photo on hover, stock state, quick view. */
export default function ProductTile({ product, onQuickView, priority = false, size = "md" }) {
  const images = productImages(product);
  const { min, max } = priceRange(product);
  const stock = totalStock(product);
  const soldOut = stock <= 0;
  const low = !soldOut && stock <= 5;

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#151715] ring-1 ring-white/[0.06]">
        <Link href={`/products/${product.id}`} className="absolute inset-0" aria-label={product.name}>
          <ProductImage
            imageUrl={images[0]}
            alt={product.name}
            fill
            priority={priority}
            sizes={size === "sm" ? "(max-width: 640px) 70vw, 280px" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
          />
          {images[1] && (
            <ProductImage
              imageUrl={images[1]}
              alt=""
              fill
              sizes={size === "sm" ? "280px" : "(max-width: 640px) 50vw, 25vw"}
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none"
            />
          )}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" aria-hidden />
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex gap-1.5">
          {soldOut ? (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-black">สินค้าหมด</span>
          ) : low ? (
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">เหลือน้อย</span>
          ) : null}
        </div>

        {onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView(product)}
            className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-black shadow-lg transition-all duration-300 hover:bg-brand focus-visible:translate-y-0 focus-visible:opacity-100 active:scale-95 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 motion-reduce:transition-none"
          >
            <Eye className="h-4 w-4" aria-hidden />
            ดูด่วน<span className="sr-only"> {product.name}</span>
          </button>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-fg-subtle">
            {product.category?.name ?? product.brand?.name ?? ""}
          </p>
          <h3 className="mt-1 line-clamp-2 text-[15px] font-medium leading-snug text-fg">
            <Link href={`/products/${product.id}`} className="hover:underline hover:underline-offset-4">
              {product.name}
            </Link>
          </h3>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-fg">
          {min == null ? "–" : formatTHB(min)}
          {max != null && min !== max && <span className="block text-right text-[11px] font-normal text-fg-subtle">เริ่มต้น</span>}
        </p>
      </div>
    </article>
  );
}

export function ProductTileSkeleton() {
  return (
    <div aria-hidden>
      <div className="aspect-[4/5] animate-pulse rounded-2xl bg-white/[0.06]" />
      <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
    </div>
  );
}
