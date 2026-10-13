"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";
import { Reveal, SectionIntro } from "./kit";
import { TECH } from "./landingData";

/** How the sensors work: hotspots on the photo and the list stay in sync. */
export default function Technology() {
  const [active, setActive] = useState(TECH[0].id);
  const current = TECH.find((t) => t.id === active);

  return (
    <section id="technology" aria-labelledby="tech-title" className="scroll-mt-20 border-t border-white/10 py-20 sm:py-28">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
        <SectionIntro id="tech-title" eyebrow="Technology" title={<>Technology that<br className="hidden sm:block" /> understands you</>}>
          เซนเซอร์แต่ละตัววัดสิ่งที่ต่างกัน เมื่อดูรวมกันหลายวัน จะเห็นภาพการซ้อม การนอน และการฟื้นตัวของคุณเอง
        </SectionIntro>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <Reveal className="lg:sticky lg:top-24">
            <div className="relative mx-auto aspect-[4/5] max-w-md overflow-hidden rounded-[2rem] ring-1 ring-white/10 lg:max-w-none">
              <Image
                src="/landing/tech-wrist.webp"
                alt="สมาร์ทวอทช์บนข้อมือแสดงวงแหวนกิจกรรมและจำนวนก้าว"
                fill
                sizes="(max-width: 1024px) 90vw, 45vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" aria-hidden />
              {TECH.map((t, i) => {
                const on = t.id === active;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActive(t.id)}
                    aria-pressed={on}
                    aria-label={`${t.label}: ${t.th}`}
                    className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                    style={{ left: `${t.x}%`, top: `${t.y}%` }}
                  >
                    <span
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[11px] font-semibold transition-all duration-300 ${
                        on ? "scale-110 border-brand bg-brand text-brand-ink" : "border-white/70 bg-black/50 text-white backdrop-blur hover:border-brand"
                      }`}
                    >
                      {i + 1}
                      {on && <span className="absolute inset-0 animate-ping rounded-full border border-brand motion-reduce:animate-none" aria-hidden />}
                    </span>
                  </button>
                );
              })}
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md lg:hidden"
                >
                  <p className="font-display text-base font-semibold text-white">{current.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{current.text}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>

          <ol className="hidden divide-y divide-white/10 border-y border-white/10 lg:block">
            {TECH.map((t, i) => {
              const on = t.id === active;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActive(t.id)}
                    onMouseEnter={() => setActive(t.id)}
                    aria-expanded={on}
                    className="group flex w-full gap-6 py-7 text-left"
                  >
                    <span className={`font-mono text-sm transition-colors ${on ? "text-brand" : "text-fg-subtle"}`}>0{i + 1}</span>
                    <span className="flex-1">
                      <span className={`block font-display text-2xl font-semibold transition-colors xl:text-3xl ${on ? "text-fg" : "text-fg-subtle group-hover:text-fg-muted"}`}>
                        {t.label}
                      </span>
                      <span className="mt-1 block text-sm text-fg-subtle">{t.th}</span>
                      <AnimatePresence initial={false}>
                        {on && (
                          <motion.span
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35 }}
                            className="block overflow-hidden"
                          >
                            <span className="block pt-4 text-base leading-relaxed text-fg-muted">{t.text}</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Mobile: the same items as a compact selector under the photo. */}
          <div className="grid grid-cols-2 gap-2 lg:hidden" role="group" aria-label="เลือกเทคโนโลยี">
            {TECH.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                aria-pressed={t.id === active}
                className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                  t.id === active ? "border-brand bg-brand/10 text-fg" : "border-white/10 text-fg-muted"
                }`}
              >
                <span className="font-mono text-[11px] text-brand">0{i + 1}</span>
                <span className="mt-0.5 block font-medium">{t.th}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-12 flex max-w-3xl gap-3 rounded-2xl border border-white/10 p-4 text-sm leading-relaxed text-fg-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          ข้อมูลจากอุปกรณ์สวมใส่ใช้ติดตามกิจกรรมและสุขภาพทั่วไปเท่านั้น ไม่ใช่อุปกรณ์ทางการแพทย์ และไม่ได้ใช้วินิจฉัย ป้องกัน หรือรักษาโรค
          หากมีข้อกังวลด้านสุขภาพควรปรึกษาแพทย์
        </p>
      </div>
    </section>
  );
}
