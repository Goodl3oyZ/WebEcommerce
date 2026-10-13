"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { SectionIntro } from "./kit";
import { LOOP, targetHref } from "./landingData";

const R = 42; // ring radius in the 100x100 viewBox
const C = 2 * Math.PI * R;
// Nodes at 12, 3, 6 and 9 o'clock.
const NODE = (i) => {
  const a = (i / LOOP.length) * 2 * Math.PI - Math.PI / 2;
  return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) };
};

/** Measure → Understand → Train → Recover, as a loop you can step through. */
export default function PerformanceLoop({ categories }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const stage = LOOP[active];

  // Advances by itself while visible, until the visitor picks a stage.
  useEffect(() => {
    if (!auto || !inView || reduce) return;
    const t = setTimeout(() => setActive((i) => (i + 1) % LOOP.length), 4500);
    return () => clearTimeout(t);
  }, [active, auto, inView, reduce]);

  const pick = (i) => {
    setAuto(false);
    setActive(i);
  };

  return (
    <section ref={ref} aria-labelledby="loop-title" className="relative overflow-hidden border-t border-white/10 py-20 sm:py-28">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
        <SectionIntro id="loop-title" eyebrow="The performance loop" title="Measure. Understand. Train. Recover.">
          ความก้าวหน้าไม่ได้มาจากการซ้อมหนักอย่างเดียว แต่มาจากการวนครบทั้งสี่ขั้นซ้ำทุกสัปดาห์
        </SectionIntro>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative mx-auto aspect-square w-full max-w-[30rem]">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
              <circle cx="50" cy="50" r={R - 6} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" strokeDasharray="0.6 1.6" />
              <motion.circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke="#C8FF3D"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeDasharray={C}
                initial={false}
                animate={{ strokeDashoffset: C - (C * (active + 1)) / LOOP.length }}
                transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>

            <div className="absolute inset-[22%] flex flex-col items-center justify-center text-center" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div key={stage.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <p className="font-mono text-xs tracking-[0.25em] text-brand">0{active + 1} / 0{LOOP.length}</p>
                  <p className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-fg sm:text-4xl">{stage.label}</p>
                  <p className="mt-1 text-sm text-fg-muted">{stage.th}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {LOOP.map((s, i) => {
              const p = NODE(i);
              const on = i === active;
              const done = i < active;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(i)}
                  aria-pressed={on}
                  aria-label={`${s.label} (${s.th})`}
                  className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300 ${
                      on
                        ? "scale-125 border-brand bg-brand text-brand-ink shadow-[0_0_30px_-4px_rgba(200,255,61,0.8)]"
                        : done
                          ? "border-brand/60 bg-[#090B0A] text-brand"
                          : "border-white/25 bg-[#090B0A] text-fg-muted hover:border-white/60"
                    }`}
                  >
                    {i + 1}
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="ขั้นตอน">
              {LOOP.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(i)}
                  aria-pressed={i === active}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    i === active ? "border-brand text-fg" : "border-white/15 text-fg-subtle hover:text-fg-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={stage.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.35 }}>
                <p className="mt-8 font-display text-3xl font-semibold leading-snug text-fg sm:text-4xl">{stage.th}</p>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-fg-muted sm:text-lg">{stage.text}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {stage.links.map((l) => (
                    <Link
                      key={l.label}
                      href={targetHref(l, categories)}
                      className="group inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-fg ring-1 ring-white/10 transition-colors hover:bg-brand hover:text-brand-ink"
                    >
                      {l.label}
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </Link>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
            {auto && (
              <button type="button" onClick={() => setAuto(false)} className="mt-8 text-xs text-fg-subtle underline-offset-4 hover:underline motion-reduce:hidden">
                หยุดเล่นอัตโนมัติ
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
