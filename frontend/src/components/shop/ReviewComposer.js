"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { productsAPI } from "@/lib/api/products";

const LABELS = ["", "แย่", "พอใช้", "ปานกลาง", "ดี", "ดีมาก"];

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role="radiogroup" aria-label="ให้คะแนน" className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ดาว`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="rounded p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-fg"
        >
          <Star className={`h-7 w-7 ${n <= shown ? "fill-fg text-fg" : "text-border"}`} aria-hidden />
        </button>
      ))}
      <span className="ml-2 text-sm text-fg-muted">{LABELS[shown]}</span>
    </div>
  );
}

/**
 * The reviewer's side of the reviews section: a form once the product has
 * been received, their own review (edit/delete) afterwards, or why they
 * cannot review yet.
 */
export default function ReviewComposer({ productId, onSaved }) {
  const { user } = useAuth();
  const [state, setState] = useState(null); // eligibility from the API
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  const load = useCallback(async () => {
    if (!user) return setState(null);
    try {
      setState(await productsAPI.getReviewEligibility(productId));
    } catch {
      setState(null);
    }
  }, [user, productId]);

  useEffect(() => {
    load();
  }, [load]);

  // Arriving from "write a review" on an order: bring the form into view.
  useEffect(() => {
    if (state && new URLSearchParams(window.location.search).get("review") === "1") {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state]);

  const reward = state?.reward ?? { points: 20, minLength: 10 };
  const own = state?.review;
  const earns = comment.trim().length >= reward.minLength;

  const startEdit = () => {
    setRating(own.rating);
    setComment(own.comment ?? "");
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!rating) return toast.error("เลือกจำนวนดาวก่อน");
    setSaving(true);
    try {
      const body = { rating, comment: comment.trim() || null };
      const res = own
        ? await productsAPI.updateReview(productId, own.id, body)
        : await productsAPI.createReview(productId, body);
      const awarded = res?.pointsAwarded ?? res?.data?.pointsAwarded ?? 0;
      toast.success(awarded ? `ขอบคุณสำหรับรีวิว! ได้รับ ${awarded} แต้ม` : "บันทึกรีวิวแล้ว");
      setEditing(false);
      setRating(0);
      setComment("");
      await load();
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "บันทึกรีวิวไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("ลบรีวิวนี้? แต้มที่ได้ไปแล้วจะไม่ได้ซ้ำถ้ารีวิวใหม่")) return;
    try {
      await productsAPI.deleteReview(productId, own.id);
      toast.success("ลบรีวิวแล้ว");
      await load();
      onSaved?.();
    } catch (err) {
      toast.error(err?.message || "ลบไม่สำเร็จ");
    }
  };

  const box = "mt-6 rounded-2xl border border-border bg-canvas p-5";

  if (!user) {
    return (
      <p className={`${box} text-sm text-fg-muted`}>
        <Link href="/auth/login" className="font-semibold text-fg underline underline-offset-4">เข้าสู่ระบบ</Link>{" "}
        เพื่อรีวิวสินค้าที่ได้รับแล้ว รับ {reward.points} แต้มต่อรีวิว
      </p>
    );
  }
  if (!state) return null;

  if (own && !editing) {
    return (
      <div ref={ref} className={box}>
        <p className="text-sm font-semibold text-fg">รีวิวของคุณ</p>
        <div className="mt-2 flex items-center gap-1" aria-label={`${own.rating} จาก 5 ดาว`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`h-4 w-4 ${n <= own.rating ? "fill-fg text-fg" : "text-border"}`} aria-hidden />
          ))}
        </div>
        {own.comment && <p className="mt-2 whitespace-pre-line text-sm text-fg-muted">{own.comment}</p>}
        <div className="mt-3 flex gap-3 text-sm">
          <button type="button" onClick={startEdit} className="font-semibold text-fg underline underline-offset-4">แก้ไข</button>
          <button type="button" onClick={remove} className="font-semibold text-danger underline underline-offset-4">ลบ</button>
        </div>
      </div>
    );
  }

  if (!state.canReview && !own) {
    return (
      <p className={`${box} text-sm text-fg-muted`}>
        รีวิวได้หลังได้รับสินค้านี้จากคำสั่งซื้อของคุณ รับ {reward.points} แต้มต่อรีวิว
      </p>
    );
  }

  return (
    <form ref={ref} onSubmit={save} className={box}>
      <p className="text-sm font-semibold text-fg">{own ? "แก้ไขรีวิว" : "เขียนรีวิว"}</p>
      <div className="mt-3">
        <StarInput value={rating} onChange={setRating} />
      </div>
      <label htmlFor="review-comment" className="sr-only">ความคิดเห็น</label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="ใช้งานเป็นยังไงบ้าง เล่าให้คนอื่นฟังหน่อย"
        className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-fg focus:outline-none focus:ring-2 focus:ring-fg/10"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-xs ${earns ? "font-semibold text-success" : "text-fg-subtle"}`}>
          {earns
            ? `ข้อความนี้ได้รับ ${reward.points} แต้ม (ครั้งแรกต่อสินค้า)`
            : `เขียนอย่างน้อย ${reward.minLength} ตัวอักษร รับ ${reward.points} แต้ม`}
        </p>
        <div className="flex gap-2">
          {own && (
            <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-full border border-border px-4 text-sm font-medium">
              ยกเลิก
            </button>
          )}
          <button type="submit" disabled={saving} className="h-10 rounded-full bg-fg px-5 text-sm font-semibold text-canvas hover:bg-fg/85 disabled:opacity-60">
            {saving ? "กำลังบันทึก..." : "ส่งรีวิว"}
          </button>
        </div>
      </div>
    </form>
  );
}
