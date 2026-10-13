"use client";

import { useSiteSettings } from "@/contexts/SiteSettingsContext";

/** First letter of the store name (Thai or Latin), for the generated mark. */
export const monogram = (name) => (Array.from((name || "").trim())[0] || "•").toUpperCase();

/**
 * The store's mark: the uploaded logo if there is one, else a lime monogram
 * of the store name (the same mark the browser tab uses).
 */
export default function BrandMark({ size = 32, className = "", logoUrl, siteName }) {
  const settings = useSiteSettings();
  const url = logoUrl !== undefined ? logoUrl : settings.logoUrl;
  const name = siteName ?? settings.siteName;
  const box = { width: size, height: size };
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded file from storage, any size
      <img src={url} alt="" style={box} className={`shrink-0 rounded-lg object-contain ${className}`} />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...box, fontSize: size * 0.56 }}
      className={`flex shrink-0 items-center justify-center rounded-lg bg-brand font-display font-bold italic leading-none text-brand-ink ${className}`}
    >
      {monogram(name)}
    </span>
  );
}
