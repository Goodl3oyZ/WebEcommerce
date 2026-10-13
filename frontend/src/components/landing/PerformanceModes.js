"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { productsAPI } from "@/lib/api/products";
import ProductTile, { ProductTileSkeleton } from "./ProductTile";
import { SectionIntro } from "./kit";
import { MODES, targetHref, targetParams } from "./landingData";

/** Track / Train / Recover / Sleep / Explore: each a mood, a photo and real products. */
export default function PerformanceModes({ categories, ready, onQuickView }) {
  const [active, setActive] = useState(0);
  const [lists, setLists] = useState({});
  const tabRefs = useRef([]);
  const mode = MODES[active];

  useEffect(() => {
    if (!ready || lists[mode.id]) return;
    let alive = true;
    setLists((l) => ({ ...l, [mode.id]: { status: "loading", products: [] } }));
    productsAPI
      .getAllProducts({ limit: 3, sort: "newest", ...targetParams(mode, categories) })
      .then((res) => alive && setLists((l) => ({ ...l, [mode.id]: { status: "done", products: res.products ?? [] } })))
      .catch(() => alive && setLists((l) => ({ ...l, [mode.id]: { status: "error", products: [] } })));
    return () => {
      alive = false;
    };
    // lists is a cache; refetching when it changes would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.id, ready]);

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onKeyDown = (e) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? MODES.length - 1 : (active + delta + MODES.length) % MODES.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const list = lists[mode.id] ?? { status: "loading", products: [] };

  return (
    <section aria-labelledby="modes-title" className="border-t border-white/10 py-20 sm:py-28">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
        <SectionIntro id="modes-title" eyebrow="Shop by performance" title="What are you training for?">
          เลือกจากสิ่งที่อยากพัฒนา ไม่ใช่จากชื่อหมวดหมู่
        </SectionIntro>

        <div role="tablist" aria-label="เป้าหมาย" onKeyDown={onKeyDown} className="-mx-4 mt-12 flex overflow-x-auto border-b border-white/10 px-4 sm:mx-0 sm:px-0">
          {MODES.map((m, i) => {
            const on = i === active;
            return (
              <button
                key={m.id}
                ref={(el) => (tabRefs.current[i] = el)}
                role="tab"
                id={`mode-tab-${m.id}`}
                aria-selected={on}
                aria-controls={`mode-panel-${m.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                className={`group relative shrink-0 px-4 pb-4 pt-2 text-left transition-colors sm:flex-1 sm:px-5 ${on ? "text-fg" : "text-fg-subtle hover:text-fg-muted"}`}
              >
                <span className="block font-mono text-[10px] tracking-[0.2em]">0{i + 1}</span>
                <span className="block font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">{m.label}</span>
                <span className="block text-xs">{m.th}</span>
                {on && <motion.span layoutId="mode-underline" className="absolute inset-x-0 -bottom-px h-0.5 bg-brand" />}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode.id}
            id={`mode-panel-${mode.id}`}
            role="tabpanel"
            aria-labelledby={`mode-tab-${mode.id}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] sm:aspect-[16/10] lg:aspect-[4/5]">
              <Image src={mode.image} alt={mode.alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-tr ${mode.tint} via-transparent to-transparent mix-blend-screen`} aria-hidden />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
              <p
                className="absolute -bottom-3 left-4 font-display text-[clamp(4rem,12vw,9rem)] font-bold uppercase leading-none tracking-tighter text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.75)]"
                aria-hidden
              >
                {mode.label}
              </p>
            </div>

            <div className="flex flex-col">
              <h3 className="font-display text-3xl font-bold leading-tight text-fg sm:text-4xl">{mode.title}</h3>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted">{mode.text}</p>

              <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
                {list.status === "loading"
                  ? [0, 1, 2].map((i) => (
                      <li key={i} className={i === 2 ? "hidden sm:block" : ""}>
                        <ProductTileSkeleton />
                      </li>
                    ))
                  : list.products.map((p, i) => (
                      <li key={p.id} className={i === 2 ? "hidden sm:block" : ""}>
                        <ProductTile product={p} onQuickView={onQuickView} size="sm" />
                      </li>
                    ))}
              </ul>
              {list.status === "done" && list.products.length === 0 && (
                <p className="mt-2 text-sm text-fg-muted">ยังไม่มีสินค้าในกลุ่มนี้</p>
              )}
              {list.status === "error" && <p className="mt-2 text-sm text-fg-muted">โหลดสินค้าไม่สำเร็จ</p>}

              <Link
                href={targetHref(mode, categories)}
                className="group mt-8 inline-flex items-center gap-1.5 self-start rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-brand hover:text-brand"
              >
                ดูทั้งหมดสำหรับ {mode.label}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
