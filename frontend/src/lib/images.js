export const PRODUCT_PLACEHOLDER = "/images/placeholder.svg";

/** Resolve and sanitize a product imageUrl to a single usable URL or null */
export function resolveProductImageUrl(imageUrl) {
  if (!imageUrl) return null;
  const url = Array.isArray(imageUrl)
    ? imageUrl.find((u) => u && typeof u === "string" && u.trim() !== "")
    : imageUrl;
  if (!url || typeof url !== "string" || url.trim() === "") return null;
  if (url.includes("example.com") || url.includes("avatar") || url.includes("default-avatar")) return null;
  return url;
}
