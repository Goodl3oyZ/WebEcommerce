"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { productsAPI } from "@/lib/api/products";
import ProductTile, { ProductTileSkeleton } from "./ProductTile";
import { SectionIntro } from "./kit";

/** Newest products, filterable by category, with quick view. */
export default function Collection({ categories, onQuickView }) {
  const [filter, setFilter] = useState("");
  const [state, setState] = useState({ status: "loading", products: [] });
  const tabs = categories.filter((c) => (c.productCount ?? 1) > 0).slice(0, 6);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const res = await productsAPI.getAllProducts({ limit: 8, sort: "newest", ...(filter && { category: filter }) });
      setState({ status: "done", products: res.products ?? [] });
    } catch {
      setState({ status: "error", products: [] });
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const chip = (on) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
      on ? "border-brand bg-brand font-semibold text-brand-ink" : "border-white/15 text-fg-muted hover:border-white/50 hover:text-fg"
    }`;

  return (
    <section id="collection" aria-labelledby="collection-title" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionIntro id="collection-title" eyebrow="The collection" title="Built to perform">
            สินค้าล่าสุดในร้าน ราคาและจำนวนคงเหลือตามจริง กด “ดูด่วน” เพื่อเลือกตัวเลือกและเพิ่มลงตะกร้าได้ทันที
          </SectionIntro>
          <Link href="/products" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-fg hover:text-brand">
            ดูสินค้าทั้งหมด <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>

        {tabs.length > 0 && (
          <div className="-mx-4 mt-10 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="กรองตามหมวดหมู่">
            <button type="button" className={chip(!filter)} aria-pressed={!filter} onClick={() => setFilter("")}>
              ทั้งหมด
            </button>
            {tabs.map((c) => (
              <button key={c.id} type="button" className={chip(filter === c.id)} aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8" aria-live="polite" aria-busy={state.status === "loading"}>
          {state.status === "error" ? (
            <div className="rounded-2xl border border-white/10 p-10 text-center">
              <p className="text-fg-muted">โหลดสินค้าไม่สำเร็จ</p>
              <button type="button" onClick={load} className="mt-4 rounded-full border border-white/25 px-5 py-2 text-sm hover:border-white">
                ลองอีกครั้ง
              </button>
            </div>
          ) : state.status === "done" && state.products.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-fg-muted">ยังไม่มีสินค้าในหมวดนี้</p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
              {state.status === "loading" && state.products.length === 0
                ? Array.from({ length: 8 }).map((_, i) => (
                    <li key={i}>
                      <ProductTileSkeleton />
                    </li>
                  ))
                : (
                  <AnimatePresence mode="popLayout" initial={false}>
                    {state.products.map((p, i) => (
                      <motion.li
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: state.status === "loading" ? 0.5 : 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45, delay: Math.min(i, 7) * 0.04 }}
                      >
                        <ProductTile product={p} onQuickView={onQuickView} priority={i < 2} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                )}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
