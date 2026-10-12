"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import ProductImage from "@/components/ui/ProductImage";
import PriceTag from "@/components/shop/PriceTag";
import { priceRange, productImages, totalStock } from "@/components/shop/productData";

const NEW_DAYS = 14;

export default function ProductCard({ product, priority = false }) {
  const images = productImages(product);
  const { min, max } = priceRange(product);
  const stock = totalStock(product);
  const outOfStock = stock <= 0;
  const optionCount = product.variants?.length ?? 0;
  const isNew =
    product.createdAt && Date.now() - new Date(product.createdAt).getTime() < NEW_DAYS * 86400000;
  const reviewCount = product.reviewCount ?? product.reviews?.length ?? 0;
  const rating = Number(product.rating ?? 0);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col rounded-card focus-visible:outline-offset-4"
    >
      <div className="relative aspect-square overflow-hidden rounded-card bg-surface-muted">
        <ProductImage
          imageUrl={images[0]}
          alt={product.name}
          fill
          priority={priority}
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {images[1] && (
          <ProductImage
            imageUrl={images[1]}
            alt=""
            fill
            className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {outOfStock ? (
            <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-fg shadow-sm">
              สินค้าหมด
            </span>
          ) : (
            isNew && (
              <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-ink">
                ใหม่
              </span>
            )
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 pt-3">
        {product.brand?.name && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
            {product.brand.name}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-fg group-hover:underline group-hover:underline-offset-4 sm:text-[15px]">
          {product.name}
        </h3>
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 pt-1">
          <PriceTag value={min} from={max != null && min !== max} />
          {optionCount > 1 && <span className="text-xs text-fg-subtle">{optionCount} ตัวเลือก</span>}
        </div>
        {reviewCount > 0 && (
          <p className="flex items-center gap-1 text-xs text-fg-muted">
            <Star className="h-3.5 w-3.5 fill-fg text-fg" aria-hidden />
            <span>
              {rating.toFixed(1)} <span className="text-fg-subtle">({reviewCount})</span>
            </span>
            <span className="sr-only">คะแนนรีวิว</span>
          </p>
        )}
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="aspect-square rounded-card bg-surface-muted" />
      <div className="mt-3 h-3 w-1/3 rounded bg-surface-muted" />
      <div className="mt-2 h-4 w-4/5 rounded bg-surface-muted" />
      <div className="mt-2 h-4 w-1/4 rounded bg-surface-muted" />
    </div>
  );
}

/** Responsive product grid: 2 → 3 → 4 columns. */
export function ProductGrid({ children, columns = 4 }) {
  const cols =
    columns === 3
      ? "grid-cols-2 lg:grid-cols-3"
      : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
  return <div className={`grid ${cols} gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10`}>{children}</div>;
}
