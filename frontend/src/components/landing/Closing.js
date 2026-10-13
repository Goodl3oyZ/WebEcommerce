"use client";

import Link from "next/link";
import { ArrowRight, CreditCard, Headphones, PackageSearch, Truck } from "lucide-react";
import { Reveal } from "./kit";

// Only what the shop actually does (see checkout, payments, orders and the support chat).
const SERVICES = [
  { Icon: Truck, title: "จัดส่งทั่วไทย 77 จังหวัด", text: "ค่าส่งคำนวณตามที่อยู่ เห็นยอดจริงก่อนยืนยันคำสั่งซื้อ" },
  { Icon: CreditCard, title: "บัตรเครดิตและพร้อมเพย์", text: "ชำระผ่าน Omise ข้อมูลบัตรถูกเข้ารหัสในเบราว์เซอร์ ไม่ผ่านเซิร์ฟเวอร์ร้าน" },
  { Icon: PackageSearch, title: "ติดตามคำสั่งซื้อ", text: "ดูสถานะและเลขพัสดุได้ในบัญชีของคุณ" },
  { Icon: Headphones, title: "คุยกับทีมงาน", text: "ทักแชทจากปุ่ม “ติดต่อทีมงาน” มุมขวาล่างได้ทุกหน้า" },
];

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

      <section aria-labelledby="closing-title" className="relative overflow-hidden border-t border-white/10 py-20 sm:py-28">
        <div className="pointer-events-none absolute -right-40 top-1/2 h-[32rem] w-[32rem] -translate-y-1/2 rounded-full bg-brand/10 blur-[120px]" aria-hidden />
        <div className="relative mx-auto grid max-w-[90rem] items-end gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-10">
          <Reveal>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand">
              <span className="h-px w-6 bg-brand" aria-hidden />
              Train with data
            </p>
            <h2 id="closing-title" className="mt-4 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-fg sm:text-6xl">
              Know more.
              <br />
              Train better.
            </h2>
            <p className="mt-5 max-w-md text-base text-fg-muted">เลือกอุปกรณ์ที่เหมาะกับการซ้อมของคุณ หรืออ่านวิธีใช้ข้อมูลจากอุปกรณ์ให้ได้ประโยชน์จริง</p>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-wrap gap-3 lg:justify-self-end">
            <Link
              href="/products"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-brand-ink transition-transform hover:bg-brand-hover active:scale-[0.97]"
            >
              เลือกซื้อสินค้า <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/blog"
              className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm font-semibold text-fg transition-colors hover:border-white/50"
            >
              อ่านบทความ
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
