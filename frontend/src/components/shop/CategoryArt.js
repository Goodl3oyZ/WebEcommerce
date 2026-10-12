"use client";

import Image from "next/image";
import {
  Activity,
  Backpack,
  Bike,
  Dumbbell,
  Footprints,
  GlassWater,
  Glasses,
  Headphones,
  HeartPulse,
  Mountain,
  Shirt,
  ShoppingBag,
  Smartphone,
  Tent,
  Trophy,
  Watch,
  Waves,
} from "lucide-react";

// Keyword → icon (Thai and English). First match wins, so specific words come first.
const RULES = [
  [/run|วิ่ง|marathon|มาราธอน|trail|เทรล/i, Footprints],
  [/shoe|sneaker|รองเท้า|footwear/i, Footprints],
  [/gym|fitness|ฟิตเนส|ยิม|strength|weight|dumbbell|ดัมเบล|ยกน้ำหนัก|training|เทรน/i, Dumbbell],
  [/yoga|โยคะ|pilates|พิลาทิส|recovery|ฟื้นฟู|massage|นวด/i, HeartPulse],
  [/watch|นาฬิกา|tracker|wearable/i, Watch],
  [/electronic|อิเล็กทรอนิกส์|gadget|แกดเจ็ต|phone|มือถือ|smart/i, Smartphone],
  [/audio|headphone|หูฟัง|earbud/i, Headphones],
  [/hydration|water|bottle|ขวด|น้ำ|drink/i, GlassWater],
  [/bag|กระเป๋า|backpack|เป้/i, Backpack],
  [/cloth|apparel|เสื้อ|กางเกง|wear|ชุด|jersey|shirt|short/i, Shirt],
  [/outdoor|เดินป่า|hiking|camp|แคมป์/i, Mountain],
  [/tent|เต็นท์/i, Tent],
  [/cycl|bike|จักรยาน/i, Bike],
  [/swim|ว่ายน้ำ|aqua/i, Waves],
  [/eyewear|sunglass|แว่น/i, Glasses],
  [/supplement|nutrition|อาหารเสริม|เวย์|protein/i, Activity],
  [/team|sport|กีฬา|ball|ลูกบอล/i, Trophy],
  [/accessor|อุปกรณ์เสริม|เครื่องประดับ/i, Watch],
];

export function categoryIcon(name = "", description = "") {
  const text = `${name} ${description}`;
  return RULES.find(([re]) => re.test(text))?.[1] ?? ShoppingBag;
}

/**
 * Cover for a category: the uploaded image when there is one, otherwise an
 * icon chosen from the category's name on a neutral panel.
 */
export default function CategoryArt({ category, sizes = "(max-width: 1024px) 50vw, 25vw", className = "" }) {
  if (category?.imageUrl) {
    return (
      <Image
        src={category.imageUrl}
        alt=""
        fill
        sizes={sizes}
        unoptimized
        className={`object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] ${className}`}
      />
    );
  }
  const Icon = categoryIcon(category?.name, category?.description);
  return (
    <div className={`absolute inset-0 flex items-center justify-center bg-surface-muted ${className}`} aria-hidden>
      <span className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-brand/25" />
      <Icon className="relative h-14 w-14 text-fg transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16" strokeWidth={1.4} />
    </div>
  );
}
