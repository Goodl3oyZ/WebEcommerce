"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FiStar, FiEye } from "react-icons/fi";
import ProductImage from "@/components/ui/ProductImage";
import { resolveProductImageUrl } from "@/lib/images";

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  const images = Array.isArray(product.imageUrl)
    ? product.imageUrl.filter((u) => resolveProductImageUrl(u))
    : resolveProductImageUrl(product.imageUrl)
      ? [product.imageUrl]
      : [];
  const displayImageUrl =
    images.length > 0 ? images[hovered && images[1] ? 1 : 0] : null;

  // Badge logic
  const isNew =
    product.createdAt &&
    Date.now() - new Date(product.createdAt).getTime() <
      1000 * 60 * 60 * 24 * 7;
  const isHot = product.stock < 20 && product.stock > 0;
  const isOutOfStock = product.stock === 0;

  // Rating
  const averageRating = product.reviews?.length
    ? (
        product.reviews.reduce((acc, r) => acc + r.rating, 0) /
        product.reviews.length
      ).toFixed(1)
    : null;

  // Stock + Variant
  const stockText = isOutOfStock
    ? "หมด"
    : product.stock <= 10
    ? `เหลือ ${product.stock} ชิ้น`
    : null;
  const variantText = product.variants?.length
    ? `${product.variants.length} ตัวเลือก`
    : null;

  // Price formatter
  const formatPrice = (price) => {
    if (price === undefined || price === null) return "0.00";
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return isNaN(numPrice)
      ? "0.00"
      : numPrice.toLocaleString("th-TH", {
          style: "currency",
          currency: "THB",
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
  };

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white shadow hover:shadow-lg transition-all duration-300 hover:scale-105"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* IMAGE */}
      <div className="relative w-full aspect-[4/5] bg-gray-100 rounded-2xl border border-gray-100 shadow overflow-hidden flex items-center justify-center max-w-xs mx-auto">
        <ProductImage
          imageUrl={displayImageUrl}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {/* BADGES */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {isNew && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
              NEW
            </span>
          )}
          {isHot && !isOutOfStock && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
              HOT
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
              OUT
            </span>
          )}
        </div>
        {/* IMAGE COUNT INDICATOR */}
        {images.length > 1 && (
          <span className="absolute top-2 right-2 bg-black/70 text-white text-xs rounded-full px-2 py-0.5 z-10">
            1 / {images.length}
          </span>
        )}
      </div>

      {/* DETAILS */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* NAME + CATEGORY */}
        <div className="flex items-center gap-2">
          <h3
            className="text-sm font-bold text-gray-900 truncate flex-1"
            title={product.name}
          >
            {product.name}
          </h3>
          {product.category && (
            <span className="text-[10px] bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 font-medium">
              {product.category.name}
            </span>
          )}
        </div>

        {/* PRICE + RATING */}
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-blue-700">
            {formatPrice(product.price)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-700">
            <FiStar className="text-yellow-400" />
            {averageRating ? (
              <>
                <span className="font-semibold">{averageRating}</span>
                <span className="text-gray-500">
                  ({product.reviews.length})
                </span>
              </>
            ) : (
              <span className="text-gray-400">ยังไม่มีรีวิว</span>
            )}
          </span>
        </div>

        {/* STOCK + VARIANT */}
        <div className="flex items-center gap-2">
          {stockText && (
            <span className="text-[10px] text-red-500 font-semibold">
              {stockText}
            </span>
          )}
          {variantText && (
            <span className="text-[10px] text-blue-500 font-medium">
              {variantText}
            </span>
          )}
        </div>

        {/* BUTTON */}
        <div className="mt-auto">
          <Link href={`/products/${product.id}`}>
            <Button
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-500 text-white text-xs rounded-lg py-1 flex items-center justify-center gap-1 hover:from-indigo-700 hover:to-blue-600 shadow hover:shadow-md transition-all"
              aria-label={`ดูรายละเอียด ${product.name}`}
            >
              <FiEye className="w-4 h-4" />
              ดูรายละเอียด
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
