"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Check, Copy, Ticket } from "lucide-react";
import { couponsAPI, couponValueText } from "@/lib/api/coupons";
import { buttonClasses } from "@/components/ui/Button";

const date = (d) => new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

/** Load the coupons the signed-in user can use now. */
export function useAvailableCoupons() {
  const [state, setState] = useState({ loading: true, error: null, coupons: [] });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      setState({ loading: false, error: null, coupons: await couponsAPI.available() });
    } catch (e) {
      setState({ loading: false, error: e?.response?.data?.message || e.message, coupons: [] });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

/**
 * Coupon tickets. With `onApply` (checkout) each one has a "ใช้" button and
 * is disabled when the subtotal is below its minimum; otherwise (profile)
 * the code can be copied.
 */
export default function CouponList({ coupons, subtotal, onApply, appliedCode, compact = false }) {
  const [copied, setCopied] = useState(null);
  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success(`คัดลอกโค้ด ${code} แล้ว`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <ul className={compact ? "space-y-2" : "grid gap-3 sm:grid-cols-2"}>
      {coupons.map((c) => {
        const short = onApply && c.minPurchase != null && subtotal < c.minPurchase;
        const applied = appliedCode === c.code;
        return (
          <li
            key={c.id}
            className={`flex items-stretch overflow-hidden rounded-lg border ${
              applied ? "border-fg ring-1 ring-fg" : "border-border"
            } bg-surface`}
          >
            <div className={`flex w-12 shrink-0 items-center justify-center ${short ? "bg-surface-muted" : "bg-brand"}`} aria-hidden>
              <Ticket className="h-5 w-5 text-brand-ink" />
            </div>
            <div className="min-w-0 flex-1 border-l border-dashed border-border px-3 py-2.5">
              <p className="text-sm font-semibold">{couponValueText(c)}</p>
              <p className="mt-0.5 font-mono text-xs tracking-wide text-fg-muted">{c.code}</p>
              <p className="mt-1 text-[11px] leading-snug text-fg-subtle">
                {c.minPurchase ? `ขั้นต่ำ ฿${c.minPurchase.toLocaleString("th-TH")} · ` : ""}ใช้ได้ถึง {date(c.endDate)}
                {c.personal && " · คูปองส่วนตัว"}
              </p>
              {short && (
                <p className="mt-1 text-[11px] font-medium text-warning">
                  ซื้อเพิ่มอีก ฿{(c.minPurchase - subtotal).toLocaleString("th-TH", { maximumFractionDigits: 2 })} เพื่อใช้โค้ดนี้
                </p>
              )}
            </div>
            <div className="flex items-center pr-3">
              {onApply ? (
                <button
                  type="button"
                  onClick={() => onApply(c.code)}
                  disabled={short || applied}
                  className={buttonClasses({ variant: applied ? "outline" : "default", size: "sm", className: "h-8 px-3" })}
                >
                  {applied ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden /> ใช้อยู่
                    </>
                  ) : (
                    "ใช้"
                  )}
                  <span className="sr-only"> โค้ด {c.code}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => copy(c.code)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold hover:bg-fg/5"
                >
                  {copied === c.code ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                  คัดลอก<span className="sr-only"> โค้ด {c.code}</span>
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Profile tab: the user's usable coupons with copy buttons. */
export function CouponWallet() {
  const { loading, error, coupons, reload } = useAvailableCoupons();
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-muted" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-border p-6 text-center text-sm">
        <p className="text-fg-muted">โหลดคูปองไม่สำเร็จ: {error}</p>
        <button type="button" onClick={reload} className={buttonClasses({ variant: "outline", size: "sm", className: "mt-3" })}>
          ลองอีกครั้ง
        </button>
      </div>
    );
  }
  if (coupons.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <Ticket className="mx-auto h-8 w-8 text-fg-subtle" aria-hidden />
        <p className="mt-3 font-semibold">ยังไม่มีคูปองที่ใช้ได้ตอนนี้</p>
        <p className="mt-1 text-sm text-fg-muted">คูปองที่ร้านเปิดให้ใช้ และคูปองจากการแลกแต้มจะแสดงที่นี่</p>
        <Link href="/products" className={buttonClasses({ variant: "outline", size: "sm", className: "mt-4" })}>
          เลือกซื้อสินค้า
        </Link>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-4 text-sm text-fg-muted">คัดลอกโค้ด แล้วใส่ในหน้าชำระเงิน หรือกด &quot;ใช้&quot; ได้เลยในขั้นตอนชำระเงิน</p>
      <CouponList coupons={coupons} />
    </div>
  );
}
