"use client";

import { useState } from "react";
import { MotionConfig } from "framer-motion";
import Hero from "@/components/landing/Hero";
import Collection from "@/components/landing/Collection";
import PerformanceModes from "@/components/landing/PerformanceModes";
import Technology from "@/components/landing/Technology";
import ProductStory from "@/components/landing/ProductStory";
import PerformanceLoop from "@/components/landing/PerformanceLoop";
import Closing from "@/components/landing/Closing";
import QuickView from "@/components/landing/QuickView";
import { useCategories } from "@/components/landing/kit";

/**
 * Landing page: always the dark brand look (the `dark` class scopes the
 * theme tokens), real products, prices and stock from the API.
 */
export default function HomePage() {
  const categories = useCategories();
  const [quickView, setQuickView] = useState(null);
  const list = categories ?? [];

  return (
    <MotionConfig reducedMotion="user">
      <div className="dark bg-[#090B0A] text-fg [color-scheme:dark]">
        <Hero />
        <Collection categories={list} onQuickView={setQuickView} />
        <PerformanceModes categories={list} ready={categories !== null} onQuickView={setQuickView} />
        <Technology />
        <ProductStory onQuickView={setQuickView} />
        <PerformanceLoop categories={list} />
        <Closing />
      </div>
      <QuickView product={quickView} onClose={() => setQuickView(null)} />
    </MotionConfig>
  );
}
