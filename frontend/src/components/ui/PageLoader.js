"use client";

/**
 * Full-page loading state: a plain spinner. Shown only after a short delay
 * (see .page-loader) so fast navigations do not flash it.
 */
export default function PageLoader({ label = "กำลังโหลด" }) {
  return (
    <div role="status" aria-live="polite" className="page-loader flex min-h-[60vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Inline spinner for buttons and small areas. */
export function Spinner({ className = "h-5 w-5" }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-2 border-fg/15 border-t-fg ${className}`}
    />
  );
}
