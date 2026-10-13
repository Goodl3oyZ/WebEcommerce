"use client";

import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { authAPI } from "@/lib/api/auth";

const COOLDOWN = 60; // seconds; the server sends at most one a minute

/** "Check your inbox" with a resend button; after sign-up and on a blocked login. */
export default function VerifyEmailNotice({ email, title = "ยืนยันอีเมลของคุณ", sentAlready = true, onBack }) {
  const [wait, setWait] = useState(sentAlready ? COOLDOWN : 0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const resend = async () => {
    setSending(true);
    try {
      await authAPI.resendVerification(email);
      toast.success("ส่งลิงก์ยืนยันใหม่แล้ว");
      setWait(COOLDOWN);
    } catch (e) {
      toast.error((e?.status ?? e?.response?.status) === 429 ? "ขอบ่อยเกินไป กรุณารอสักครู่" : "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSending(false);
    }
  };

  return (
    <div role="status" className="rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-fg" aria-hidden>
        <MailCheck className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-xl font-semibold text-fg">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        {sentAlready ? "เราส่งลิงก์ยืนยันไปที่" : "บัญชีนี้ยังไม่ได้ยืนยันอีเมล ลิงก์ยืนยันอยู่ในอีเมลที่ส่งไปที่"}
        <br />
        <span className="font-medium text-fg break-all">{email}</span>
        <br />
        กดลิงก์ในอีเมลแล้วกลับมาเข้าสู่ระบบได้เลย
      </p>
      <p className="mt-3 text-xs text-fg-subtle">ไม่เจออีเมล? ลองดูในโฟลเดอร์สแปมหรือโปรโมชัน</p>
      <button
        type="button"
        onClick={resend}
        disabled={sending || wait > 0}
        className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-fg px-6 text-sm font-semibold text-canvas transition-opacity disabled:opacity-50"
      >
        {sending ? "กำลังส่ง..." : wait > 0 ? `ส่งอีกครั้งได้ใน ${wait} วินาที` : "ส่งลิงก์ยืนยันอีกครั้ง"}
      </button>
      {onBack && (
        <button type="button" onClick={onBack} className="mt-3 text-sm font-medium text-fg-muted underline-offset-4 hover:underline">
          กลับไปหน้าเข้าสู่ระบบ
        </button>
      )}
    </div>
  );
}
