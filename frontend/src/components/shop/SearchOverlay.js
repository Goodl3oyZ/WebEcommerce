"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { ArrowRight, CornerDownLeft, Loader2, Search, X } from "lucide-react";
import { productsAPI } from "@/lib/api/products";
import { categoriesAPI } from "@/lib/api/categories";
import useUiStore from "@/store/uiStore";
import ProductImage from "@/components/ui/ProductImage";
import { priceRange, productImages } from "@/components/shop/productData";
import { formatTHB } from "@/lib/format";

const listOf = (res) => {
  const list = res?.categories ?? res?.data ?? res;
  return Array.isArray(list) ? list : [];
};

/**
 * Site search: live results from the products API (typo-tolerant on the
 * server), arrow keys to move, Enter to open, Escape to close. Opens with the
 * header button, "/" or Ctrl/⌘+K.
 */
export default function SearchOverlay() {
  const router = useRouter();
  const open = useUiStore((s) => s.searchOpen);
  const openSearch = useUiStore((s) => s.openSearch);
  const close = useUiStore((s) => s.closeSearch);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [active, setActive] = useState(-1);
  const [categories, setCategories] = useState([]);
  const inputRef = useRef(null);
  const requestId = useRef(0);

  // Keyboard shortcut, ignored while typing in a field.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  useEffect(() => {
    if (!open || categories.length) return;
    categoriesAPI
      .getAllCategories()
      .then((res) => setCategories(listOf(res).filter((c) => !c.parentId && (c.productCount ?? 1) > 0).slice(0, 8)))
      .catch(() => {});
  }, [open, categories.length]);

  // Debounced live search; stale responses are dropped.
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setState("idle");
      return;
    }
    setState("loading");
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await productsAPI.getAllProducts({ search: term, limit: 6 });
        if (id !== requestId.current) return;
        setResults(res.products ?? []);
        setState("done");
        setActive(-1);
      } catch {
        if (id === requestId.current) setState("error");
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [q]);

  const reset = () => {
    setQ("");
    setResults([]);
    setState("idle");
    setActive(-1);
  };
  const go = (href) => {
    close();
    reset();
    router.push(href);
  };
  const allResults = `/products?search=${encodeURIComponent(q.trim())}`;

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && results[active]) go(`/products/${results[active].id}`);
      else if (q.trim()) go(allResults);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        close();
        reset();
      }}
      initialFocus={inputRef}
      className="relative z-[130]"
    >
      <DialogBackdrop transition className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-[closed]:opacity-0" />
      <div className="fixed inset-0 overflow-y-auto px-3 pt-3 sm:px-6 sm:pt-[10vh]">
        <DialogPanel
          transition
          className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface text-fg shadow-2xl transition duration-200 data-[closed]:-translate-y-2 data-[closed]:opacity-0 motion-reduce:transition-none"
        >
          <div className="flex items-center gap-3 border-b border-border px-4">
            {state === "loading" ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-fg-subtle" aria-hidden />
            ) : (
              <Search className="h-5 w-5 shrink-0 text-fg-subtle" aria-hidden />
            )}
            <label htmlFor="search-overlay-input" className="sr-only">
              ค้นหาสินค้า
            </label>
            <input
              ref={inputRef}
              id="search-overlay-input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="ค้นหา สมาร์ทวอทช์ รองเท้าวิ่ง เครื่องนวด..."
              autoComplete="off"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-overlay-results"
              aria-activedescendant={active >= 0 ? `search-result-${active}` : undefined}
              className="h-16 w-full border-0 bg-transparent p-0 text-base text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              onClick={() => {
                close();
                reset();
              }}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border px-2 text-xs text-fg-muted hover:text-fg"
              aria-label="ปิดการค้นหา"
            >
              <span className="hidden sm:inline">Esc</span>
              <X className="h-4 w-4 sm:hidden" aria-hidden />
            </button>
          </div>

          <div className="max-h-[65vh] overflow-y-auto p-2" aria-live="polite">
            {!q.trim() ? (
              categories.length > 0 && (
                <div className="p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">หมวดหมู่</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => go(`/products?category=${c.id}`)}
                        className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-fg"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : state === "error" ? (
              <p className="p-6 text-center text-sm text-fg-muted">ค้นหาไม่สำเร็จ ลองอีกครั้ง</p>
            ) : state === "done" && results.length === 0 ? (
              <p className="p-6 text-center text-sm text-fg-muted">ไม่พบสินค้าที่ตรงกับ “{q.trim()}”</p>
            ) : (
              <ul id="search-overlay-results" role="listbox" aria-label="ผลการค้นหา">
                {results.map((p, i) => {
                  const { min } = priceRange(p);
                  return (
                    <li key={p.id} id={`search-result-${i}`} role="option" aria-selected={i === active}>
                      <Link
                        href={`/products/${p.id}`}
                        onClick={() => {
                          close();
                          reset();
                        }}
                        onMouseEnter={() => setActive(i)}
                        className={`flex items-center gap-3 rounded-xl p-2 ${i === active ? "bg-surface-muted" : ""}`}
                      >
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                          <ProductImage imageUrl={productImages(p)[0]} alt="" fill sizes="48px" className="object-cover" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="block truncate text-xs text-fg-muted">{p.category?.name ?? p.brand?.name ?? ""}</span>
                        </span>
                        <span className="shrink-0 text-sm tabular-nums">{min != null ? formatTHB(min) : ""}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {q.trim() && (
            <button
              type="button"
              onClick={() => go(allResults)}
              className="flex w-full items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm font-medium hover:bg-surface-muted"
            >
              <span>ดูผลลัพธ์ทั้งหมดของ “{q.trim()}”</span>
              <span className="flex items-center gap-2 text-fg-subtle">
                <CornerDownLeft className="hidden h-4 w-4 sm:block" aria-hidden />
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
