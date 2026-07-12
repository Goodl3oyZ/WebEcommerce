export const PRODUCT_PLACEHOLDER = "/images/placeholder.svg";

/** Resolve and sanitize a product imageUrl to a single usable URL or null */
export function resolveProductImageUrl(imageUrl) {
  if (!imageUrl) return null;
  // If array, find first non-empty URL
  const url = Array.isArray(imageUrl)
    ? imageUrl.find((u) => u && typeof u === "string" && u.trim() !== "")
    : imageUrl;
  if (!url || typeof url !== "string" || url.trim() === "") return null;
  if (url.includes("example.com")) return null;
  return url;
}
