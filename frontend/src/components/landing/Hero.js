"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

// Callouts point at the watch in /landing/hero-watch.webp (percent of the 3:2 box).
// Values match the Pulse One spec sheet in the demo catalogue.
const CALLOUTS = [
  { id: "screen", dot: [47, 47], label: [7, 16], title: "AMOLED 1.43″", sub: "อ่านง่ายกลางแดด" },
  { id: "gps", dot: [71.5, 58], label: [79, 30], title: "GPS ในตัว", sub: "บันทึกระยะและเพซ" },
  { id: "water", dot: [57, 80], label: [14, 86], title: "5 ATM", sub: "ใส่ว่ายน้ำได้" },
];

/** A heart-rate readout that drifts like a resting pulse. Clearly marked as a sample. */
function SampleReadout() {
  const reduce = useReducedMotion();
  const [bpm, setBpm] = useState(62);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setBpm((b) => Math.max(58, Math.min(67, b + Math.round(Math.random() * 4 - 2)))), 1400);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <div className="rounded-2xl border border-white/10 bg-black/55 p-3 backdrop-blur-md sm:p-4" aria-label="ตัวอย่างหน้าจอแสดงชีพจร">
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand motion-reduce:animate-none" aria-hidden />
        Resting HR · sample
      </p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums text-white sm:text-4xl" aria-live="off">
        {bpm}
        <span className="ml-1 text-sm font-medium text-white/50">bpm</span>
      </p>
      <svg viewBox="0 0 160 36" className="mt-1 h-8 w-40 text-brand" aria-hidden>
        <path
          d="M0 20 H40 L48 20 L54 6 L60 32 L66 14 L70 20 H100 L108 20 L114 6 L120 32 L126 14 L130 20 H160"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          className="landing-ecg motion-reduce:[animation:none]"
        />
      </svg>
    </div>
  );
}

export default function Hero() {
  const reduce = useReducedMotion();
  const stageRef = useRef(null);

  // Pointer parallax on the photo (transform only, one update per frame).
  useEffect(() => {
    const el = stageRef.current;
    if (!el || reduce || !window.matchMedia("(pointer: fine)").matches) return;
    let frame = 0;
    let next = null;
    const apply = () => {
      frame = 0;
      if (!next) return;
      el.style.setProperty("--px", next.x.toFixed(3));
      el.style.setProperty("--py", next.y.toFixed(3));
    };
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      next = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      next = { x: 0, y: 0 };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduce]);

  const rise = (delay) => ({
    initial: { opacity: 0, y: 36 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease: EASE, delay },
  });

  return (
    <section aria-labelledby="hero-title" className="landing-grid relative -mt-16 overflow-hidden pt-16">
      <div className="mx-auto grid max-w-[90rem] items-center gap-10 px-4 pb-10 pt-8 sm:px-6 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6 lg:px-10 lg:pb-16">
        <div className="relative z-10">
          <motion.p {...rise(0.05)} className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">
            <span className="h-px w-8 bg-brand" aria-hidden />
            Health &amp; performance technology
          </motion.p>
          <h1 id="hero-title" className="mt-6 font-display font-bold uppercase leading-[0.86] tracking-[-0.03em] text-white">
            <motion.span {...rise(0.12)} className="block text-[clamp(3.2rem,9.4vw,7.6rem)]">
              Your body.
            </motion.span>
            <motion.span {...rise(0.22)} className="block text-[clamp(3.2rem,9.4vw,7.6rem)] text-brand">
              Decoded.
            </motion.span>
          </h1>
          <motion.p {...rise(0.34)} className="mt-7 max-w-md text-base leading-relaxed text-white/65 sm:text-lg">
            อุปกรณ์สวมใส่ รองเท้าวิ่ง และเครื่องมือฟื้นตัว ที่ช่วยให้คุณเห็นการซ้อม การนอน และการฟื้นตัวของตัวเองชัดขึ้น
            แล้วตัดสินใจได้ดีขึ้นในวันถัดไป
          </motion.p>
          <motion.div {...rise(0.44)} className="mt-9 flex flex-wrap gap-3">
            <a
              href="#collection"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-brand-ink transition-all hover:bg-brand-hover hover:shadow-[0_0_40px_-8px_rgba(200,255,61,0.7)] active:scale-[0.97]"
            >
              Explore the Collection
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </a>
            <a
              href="#technology"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/5 active:scale-[0.97]"
            >
              Discover the Technology
            </a>
          </motion.div>
          <motion.dl {...rise(0.54)} className="mt-12 hidden max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6 sm:grid">
            {[
              ["Track", "ชีพจรและการวิ่ง"],
              ["Sleep", "ระยะการนอน"],
              ["Recover", "คลายกล้ามเนื้อ"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-display text-sm font-semibold uppercase tracking-wider text-white">{k}</dt>
                <dd className="mt-1 text-xs text-white/50">{v}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.1 }}
          className="relative"
        >
          <div ref={stageRef} className="hero-stage relative aspect-[3/2] w-full overflow-hidden rounded-[1.75rem] ring-1 ring-white/10 lg:rounded-[2.25rem]">
            <Image
              src="/landing/hero-watch.webp"
              alt="สมาร์ทวอทช์หน้าปัดกลมแสดงเวลาและจำนวนก้าว วางบนโต๊ะในแสงสลัว"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="hero-photo object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090B0A]/70 via-transparent to-[#090B0A]/20" aria-hidden />

            {/* Measurement callouts (desktop) */}
            <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {CALLOUTS.map((c, i) => (
                <motion.polyline
                  key={c.id}
                  // From the dot to the near edge of its label.
                  points={`${c.dot[0]},${c.dot[1]} ${c.label[0] < c.dot[0] ? c.label[0] + 13 : c.label[0] - 1},${c.label[1] + 4}`}
                  fill="none"
                  stroke="rgba(200,255,61,0.7)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="3 3"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.1, ease: EASE, delay: 0.9 + i * 0.2 }}
                />
              ))}
            </svg>
            {CALLOUTS.map((c, i) => (
              <div key={c.id} className="pointer-events-none hidden md:block">
                <motion.span
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand bg-brand/30"
                  style={{ left: `${c.dot[0]}%`, top: `${c.dot[1]}%` }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 + i * 0.2 }}
                >
                  <span className="absolute inset-0 animate-ping rounded-full bg-brand/40 motion-reduce:animate-none" />
                </motion.span>
                <motion.div
                  className="absolute rounded-lg bg-black/45 px-2.5 py-1.5 backdrop-blur-sm"
                  style={{ left: `${c.label[0]}%`, top: `${c.label[1]}%` }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.3 + i * 0.2 }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">0{i + 1}</p>
                  <p className="font-display text-sm font-semibold text-white">{c.title}</p>
                  <p className="text-[11px] text-white/55">{c.sub}</p>
                </motion.div>
              </div>
            ))}

            <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5">
              <SampleReadout />
            </div>
          </div>
          <p className="mt-3 text-right text-[11px] text-white/35">
            Pulse One Smartwatch · ตัวเลขบนหน้าจอเป็นภาพตัวอย่าง
          </p>
        </motion.div>
      </div>

      <a
        href="#collection"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/40 hover:text-white lg:flex"
      >
        Scroll <ArrowDown className="h-3.5 w-3.5 animate-bounce motion-reduce:animate-none" aria-hidden />
      </a>

      {/* Category ticker */}
      <div className="relative border-y border-white/10 bg-[#0d0f0d] py-4" aria-hidden>
        <div className="landing-marquee flex w-max gap-10 whitespace-nowrap font-display text-sm font-semibold uppercase tracking-[0.25em] text-white/70 motion-reduce:[animation:none]">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ["Wearables", "Smart rings", "Running", "Recovery", "Training", "Sleep"].map((w) => (
              <span key={`${k}-${w}`} className="flex items-center gap-10">
                {w}
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
