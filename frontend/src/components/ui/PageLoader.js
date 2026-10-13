"use client";

import { useSiteSettings } from "@/contexts/SiteSettingsContext";

/**
 * Full-page loading state in the brand language: the wordmark, a pulse line
 * drawing itself and a thin lime progress sweep. Shown only after a short
 * delay so fast navigations do not flash it; still for reduced motion.
 */
export default function PageLoader({ label = "กำลังโหลด" }) {
  const { siteName } = useSiteSettings();
  return (
    <div
      role="status"
      aria-live="polite"
      className="page-loader flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4"
    >
      <p className="font-display text-2xl font-bold uppercase italic tracking-tight text-fg">{siteName}</p>
      <svg viewBox="0 0 160 36" className="h-9 w-40 text-fg" aria-hidden>
        <path
          d="M0 20 H40 L48 20 L54 6 L60 32 L66 14 L70 20 H100 L108 20 L114 6 L120 32 L126 14 L130 20 H160"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M0 20 H40 L48 20 L54 6 L60 32 L66 14 L70 20 H100 L108 20 L114 6 L120 32 L126 14 L130 20 H160"
          fill="none"
          stroke="hsl(var(--brand))"
          strokeWidth="1.8"
          strokeLinejoin="round"
          className="landing-ecg"
        />
      </svg>
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-fg/10">
        <div className="page-loader-bar h-full w-1/3 rounded-full bg-brand" />
      </div>
      <p className="text-sm text-fg-muted">{label}…</p>
    </div>
  );
}

/** Inline spinner for buttons and small areas. */
export function Spinner({ className = "h-5 w-5" }) {
  return (
    <span
      role="status"
      aria-label="กำลังโหลด"
      className={`inline-block animate-spin rounded-full border-2 border-fg/15 border-t-brand ${className}`}
    />
  );
}
