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

/**
 * Units of a variant one order can get: online stock (delivery) or what one
 * branch holds (pickup), whichever is more.
 */
export function variantStock(variant) {
  return Math.max(variant?.stock || 0, variant?.branchStock || 0);
}

/** Total stock to sell, counting branch-only units; else the API's product.stock. */
export function totalStock(product) {
  const variants = product?.variants ?? [];
  if (variants.length > 0) return variants.reduce((sum, v) => sum + variantStock(v), 0);
  return typeof product?.stock === "number" ? product.stock : 0;
}

/** Has stock, but none online: it can only be collected at a branch. */
export function pickupOnly(product, variant) {
  const online = variant ? variant.stock || 0 : (product?.variants ?? []).reduce((sum, v) => sum + (v.stock || 0), 0);
  return online <= 0 && (variant ? variantStock(variant) : totalStock(product)) > 0;
}

export function variantLabel(variant) {
  if (!variant) return "";
  return [variant.color, variant.size].filter(Boolean).join(" / ");
}
