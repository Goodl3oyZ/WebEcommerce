import { toPrice } from "@/lib/format";
import { resolveProductImageUrl } from "@/lib/images";

/** All usable image URLs of a product (variants' images are not merged in). */
export function productImages(product) {
  const list = Array.isArray(product?.imageUrl) ? product.imageUrl : [product?.imageUrl];
  return list.filter((u) => resolveProductImageUrl(u));
}

/** { min, max } of the purchasable prices (variant price, else product price). */
export function priceRange(product) {
  const prices = (product?.variants ?? [])
    .map((v) => toPrice(v.price ?? product.price))
    .filter((p) => p != null);
  if (prices.length === 0) {
    const p = toPrice(product?.price);
    return { min: p, max: p };
  }
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Total stock: the API's product.stock, else the sum of variant stock. */
export function totalStock(product) {
  if (typeof product?.stock === "number") return product.stock;
  return (product?.variants ?? []).reduce((sum, v) => sum + (v.stock || 0), 0);
}

export function variantLabel(variant) {
  if (!variant) return "";
  return [variant.color, variant.size].filter(Boolean).join(" / ");
}
