"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { categoriesAPI } from "@/lib/api/categories";

const EASE = [0.22, 1, 0.36, 1];

/** Fades/slides children in once when they scroll into view. Reduced motion: fade only (MotionConfig). */
export function Reveal({ children, delay = 0, y = 28, className, as = "div" }) {
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

/** Small mono-style label with a leading tick, used above section titles. */
export function Eyebrow({ children, className = "" }) {
  return (
    <p className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand ${className}`}>
      <span className="h-px w-6 bg-brand" aria-hidden />
      {children}
    </p>
  );
}

/** Editorial section heading: eyebrow, oversized English title, Thai supporting line. */
export function SectionIntro({ id, eyebrow, title, children, align = "left", className = "" }) {
  return (
    <Reveal className={`${align === "center" ? "mx-auto text-center" : ""} max-w-3xl ${className}`}>
      <Eyebrow className={align === "center" ? "justify-center" : ""}>{eyebrow}</Eyebrow>
      <h2 id={id} className="mt-4 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-fg sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      {children && <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">{children}</p>}
    </Reveal>
  );
}

let categoriesPromise = null;
/** Top-level categories, fetched once per page load: null while loading, [] if unavailable. */
export function useCategories() {
  const [categories, setCategories] = useState(null);
  useEffect(() => {
    let alive = true;
    categoriesPromise ??= categoriesAPI
      .getAllCategories()
      .then((res) => {
        const list = res?.categories ?? res?.data ?? res;
        return Array.isArray(list) ? list.filter((c) => !c.parentId) : [];
      })
      .catch(() => {
        categoriesPromise = null;
        return [];
      });
    categoriesPromise.then((list) => alive && setCategories(list));
    return () => {
      alive = false;
    };
  }, []);
  return categories;
}
