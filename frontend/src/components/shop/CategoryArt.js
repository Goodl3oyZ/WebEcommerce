"use client";

import Image from "next/image";

/**
 * Cover for a category, best source first:
 *  1. the image uploaded for the category,
 *  2. a photo of its newest product (on a light studio panel),
 *  3. a typographic poster: the name in large italic type on ink.
 */
export default function CategoryArt({ category, sizes = "(max-width: 1024px) 50vw, 25vw", compact = false }) {
  const name = category?.name || "";
  if (category?.imageUrl) {
    return (
      <Image
        src={category.imageUrl}
        alt=""
        fill
        sizes={sizes}
        unoptimized
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
    );
  }

  if (category?.coverImage) {
    return (
      <div className="absolute inset-0 bg-[#f3f3f1]">
        <Image
          src={category.coverImage}
          alt=""
          fill
          sizes={sizes}
          unoptimized
          className="object-cover mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      </div>
    );
  }

  // Typographic poster. The word is set large and allowed to bleed off the
  // edge, like sports-retail campaign graphics; the accent bar stays small.
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#121212]" aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 14px)",
        }}
      />
      <span
        className={`absolute -bottom-[0.18em] -left-[0.04em] whitespace-nowrap font-display font-bold italic uppercase leading-none tracking-tight text-white/90 transition-transform duration-500 ease-out group-hover:translate-x-1 ${
          compact ? "text-[2.1rem]" : "text-[clamp(2.6rem,7vw,4.5rem)]"
        }`}
      >
        {name}
      </span>
      <span className={`absolute left-3 top-3 h-1 rounded-full bg-brand ${compact ? "w-5" : "w-8 sm:left-4 sm:top-4"}`} />
    </div>
  );
}
