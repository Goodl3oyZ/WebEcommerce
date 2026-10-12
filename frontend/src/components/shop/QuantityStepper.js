"use client";

import classNames from "classnames";
import { Minus, Plus } from "lucide-react";

/** − [n] + control. Buttons stay keyboard-accessible and announce their purpose. */
export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = "md",
  label = "จำนวน",
  className,
}) {
  const h = size === "sm" ? "h-9" : "h-11";
  const w = size === "sm" ? "w-9" : "w-11";
  const set = (n) => onChange(Math.max(min, Math.min(max, n)));
  return (
    <div
      className={classNames("inline-flex items-center rounded-full border border-border bg-surface", h, className)}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={classNames("inline-flex items-center justify-center rounded-full text-fg transition-colors hover:bg-fg/5 disabled:opacity-40", h, w)}
        onClick={() => set(value - 1)}
        disabled={disabled || value <= min}
        aria-label="ลดจำนวน"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={classNames("inline-flex items-center justify-center rounded-full text-fg transition-colors hover:bg-fg/5 disabled:opacity-40", h, w)}
        onClick={() => set(value + 1)}
        disabled={disabled || value >= max}
        aria-label="เพิ่มจำนวน"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
