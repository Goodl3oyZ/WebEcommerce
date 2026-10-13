"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Headphones, PackageSearch, Truck } from "lucide-react";
import { Reveal } from "./kit";

// Only what the shop actually does (see checkout, payments, orders and the support chat).
const SERVICES = [
  { Icon: Truck, title: "จัดส่งทั่วไทย 77 จังหวัด", text: "ค่าส่งคำนวณตามที่อยู่ เห็นยอดจริงก่อนยืนยันคำสั่งซื้อ" },
  { Icon: CreditCard, title: "บัตรเครดิตและพร้อมเพย์", text: "ชำระผ่าน Omise ข้อมูลบัตรถูกเข้ารหัสในเบราว์เซอร์ ไม่ผ่านเซิร์ฟเวอร์ร้าน" },
  { Icon: PackageSearch, title: "ติดตามคำสั่งซื้อ", text: "ดูสถานะและเลขพัสดุได้ในบัญชีของคุณ" },
  { Icon: Headphones, title: "คุยกับทีมงาน", text: "ทักแชทจากปุ่ม “ติดต่อทีมงาน” มุมขวาล่างได้ทุกหน้า" },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** No newsletter service exists yet: validate, then say so instead of pretending to subscribe. */
function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ kind: "idle" });

  const submit = (e) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setState({ kind: "invalid" });
      return;
    }
    setState({ kind: "unavailable" });
  };

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-md">
      <label htmlFor="newsletter-email" className="text-sm font-medium text-fg">
        อีเมล
      </label>
      <div className={`mt-2 flex rounded-full border bg-white/[0.04] p-1 transition-colors focus-within:border-brand ${state.kind === "invalid" ? "border-danger" : "border-white/15"}`}>
        <input
          id="newsletter-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.kind !== "idle") setState({ kind: "idle" });
          }}
          placeholder="you@example.com"
          aria-invalid={state.kind === "invalid"}
          aria-describedby="newsletter-status"
          className="min-w-0 flex-1 border-0 bg-transparent px-4 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-0"
        />
        <button type="submit" className="h-11 shrink-0 rounded-full bg-brand px-5 text-sm font-semibold text-brand-ink transition-transform hover:bg-brand-hover active:scale-[0.97]">
          แจ้งฉัน
        </button>
      </div>
      <p id="newsletter-status" role="status" className="mt-3 min-h-[2.5rem] text-sm">
        {state.kind === "invalid" ? (
          <span className="text-danger">กรอกอีเมลให้ถูกต้อง เช่น name@example.com</span>
        ) : state.kind === "unavailable" ? (
          <span className="text-fg-muted">
            ระบบรับข่าวสารทางอีเมลยังไม่เปิดให้บริการ อีเมลนี้ยังไม่ถูกบันทึก{" "}
            <Link href="/auth/register" className="font-medium text-brand underline-offset-4 hover:underline">
              สมัครสมาชิก
            </Link>{" "}
            เพื่อรับคูปองและติดตามคำสั่งซื้อได้เลย
          </span>
        ) : (
          <span className="text-fg-subtle">ยังไม่เปิดรับสมัคร เมื่อเปิดแล้วจะประกาศบนหน้านี้</span>
        )}
      </p>
    </form>
  );
}

export default function Closing() {
  return (
    <>
      <section aria-labelledby="trust-title" className="border-t border-white/10 py-16 sm:py-20">
        <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
          <h2 id="trust-title" className="sr-only">
            บริการของร้าน
          </h2>
          <ul className="grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map(({ Icon, title, text }, i) => (
              <li key={title} className="bg-[#090B0A]">
                <Reveal delay={i * 0.06} className="flex h-full flex-col gap-4 p-6 sm:p-8">
                  <Icon className="h-6 w-6 text-brand" aria-hidden />
                  <div>
                    <p className="font-display text-lg font-semibold text-fg">{title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="news-title" className="relative overflow-hidden border-t border-white/10 py-20 sm:py-28">
        <div className="pointer-events-none absolute -right-40 top-1/2 h-[32rem] w-[32rem] -translate-y-1/2 rounded-full bg-brand/10 blur-[120px]" aria-hidden />
        <div className="relative mx-auto grid max-w-[90rem] items-end gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-10">
          <Reveal>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand">
              <span className="h-px w-6 bg-brand" aria-hidden />
              Stay in the loop
            </p>
            <h2 id="news-title" className="mt-4 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-fg sm:text-6xl">
              New tech.
              <br />
              First.
            </h2>
            <p className="mt-5 max-w-md text-base text-fg-muted">รับข่าวสินค้าใหม่และวิธีใช้ข้อมูลจากอุปกรณ์ให้ซ้อมได้ดีขึ้น</p>
          </Reveal>
          <Reveal delay={0.1} className="lg:justify-self-end">
            <Newsletter />
          </Reveal>
        </div>
      </section>
    </>
  );
}
