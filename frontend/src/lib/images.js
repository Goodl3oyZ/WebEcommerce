export const PRODUCT_PLACEHOLDER = "/images/placeholder.svg";

/** Ignore broken seed URLs and empty values */
export function resolveProductImageUrl(imageUrl) {
  if (!imageUrl) return null;
  const url = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
  if (!url || typeof url !== "string") return null;
  if (url.includes("example.com")) return null;
  return url;
}
