"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/** Page numbers with ellipses: 1 … 4 5 6 … 12 */
function pageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const total = Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;
  const current = Math.min(Math.max(Number(currentPage) || 1, 1), total);
  if (total <= 1) return null;

  const arrow =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-fg transition-colors hover:border-fg disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav aria-label="เลือกหน้า" className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        className={arrow}
        onClick={() => onPageChange(current - 1)}
        disabled={current <= 1}
        aria-label="หน้าก่อนหน้า"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      {pageList(current, total).map((p) =>
        typeof p === "string" ? (
          <span key={p} className="px-1 text-fg-subtle" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === current ? "page" : undefined}
            aria-label={`หน้า ${p}`}
            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold tabular-nums transition-colors ${
              p === current ? "bg-fg text-canvas" : "text-fg hover:bg-fg/5"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className={arrow}
        onClick={() => onPageChange(current + 1)}
        disabled={current >= total}
        aria-label="หน้าถัดไป"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
}
