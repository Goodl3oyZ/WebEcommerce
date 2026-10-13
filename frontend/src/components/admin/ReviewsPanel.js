"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Search, Star, Trash2 } from "lucide-react";
import { adminAPI } from "@/lib/api/admin";
import { productsAPI } from "@/lib/api/products";
import EntityThumb from "@/components/admin/ui/EntityThumb";

const card = "rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6";
const PER_PAGE = 20;

function Stars({ value }) {
  return (
    <span className="inline-flex items-center" aria-label={`${value} จาก 5 ดาว`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= value ? "fill-fg text-fg" : "text-border"}`} aria-hidden />
      ))}
    </span>
  );
}

/** Admin: every product review, to read and remove abusive ones. */
export function ReviewsPanel() {
  const [reviews, setReviews] = useState(null);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setReviews(null);
    try {
      const res = await adminAPI.listProductReviews({
        page,
        limit: PER_PAGE,
        ...(rating ? { rating } : {}),
        ...(search ? { search } : {}),
      });
      setReviews(res.reviews ?? []);
      setPages(res.pagination?.pages || 1);
      setTotal(res.pagination?.total ?? 0);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "โหลดรีวิวไม่สำเร็จ");
      setReviews([]);
    }
  }, [page, rating, search]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (r) => {
    if (!confirm(`ลบรีวิวของ ${r.user?.name || "ลูกค้า"} ใน "${r.product?.name}"? ลบแล้วกู้คืนไม่ได้`)) return;
    try {
      await productsAPI.deleteReview(r.productId, r.id);
      toast.success("ลบรีวิวแล้ว");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "ลบไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-fg">รีวิวสินค้า</h2>
        <p className="mt-1 text-sm text-fg-muted">
          ลูกค้ารีวิวได้หลังได้รับสินค้า และได้แต้มเมื่อเขียนข้อความ ลบรีวิวที่ไม่เหมาะสมได้ที่นี่
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(query.trim());
        }}
      >
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">ค้นหารีวิว</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาสินค้า ชื่อลูกค้า หรือข้อความ"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm"
          />
        </label>
        <select
          value={rating}
          onChange={(e) => {
            setRating(e.target.value);
            setPage(1);
          }}
          aria-label="กรองตามดาว"
          className="h-10 rounded-xl border border-border bg-surface px-3 text-sm"
        >
          <option value="">ทุกระดับดาว</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} ดาว</option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-xl bg-fg px-4 text-sm font-semibold text-canvas">ค้นหา</button>
      </form>

      <section className={card} aria-label="รายการรีวิว">
        {reviews === null ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-muted" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-muted">{search || rating ? "ไม่พบรีวิวที่ตรงกับเงื่อนไข" : "ยังไม่มีรีวิว"}</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-fg-subtle">ทั้งหมด {total} รีวิว</p>
            <ul className="divide-y divide-border">
              {reviews.map((r) => (
                <li key={r.id} className="flex gap-4 py-4">
                  <EntityThumb src={r.product?.imageUrl?.[0]} name={r.product?.name || ""} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link href={`/products/${r.productId}#reviews`} target="_blank" className="truncate font-semibold text-fg hover:underline">
                        {r.product?.name || "สินค้าที่ถูกลบ"}
                      </Link>
                      <Stars value={r.rating} />
                    </div>
                    {r.comment ? (
                      <p className="mt-1 whitespace-pre-line text-sm text-fg-muted">{r.comment}</p>
                    ) : (
                      <p className="mt-1 text-sm italic text-fg-subtle">ให้ดาวอย่างเดียว</p>
                    )}
                    <p className="mt-1 text-xs text-fg-subtle">
                      {r.user?.name || "ลูกค้า"} · {new Date(r.createdAt).toLocaleDateString("th-TH", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg px-3 text-sm text-danger hover:bg-danger-soft"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden /> ลบ
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-50">
              ก่อนหน้า
            </button>
            <span className="text-sm text-fg-muted">หน้า {page} / {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-50">
              ถัดไป
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
