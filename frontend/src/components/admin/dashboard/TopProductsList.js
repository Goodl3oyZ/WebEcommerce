"use client";

import Image from "next/image";
import EmptyState from "@/components/EmptyState";
import { resolveProductImageUrl, PRODUCT_PLACEHOLDER } from "@/lib/images";
import { FiPackage } from "react-icons/fi";

export default function TopProductsList({ products = [], onAddProduct }) {
  if (!products.length) {
    return (
      <EmptyState
        icon={FiPackage}
        title="ยังไม่มีสินค้าขายดี"
        description="เพิ่มสินค้าและรอการขายเพื่อดูอันดับที่นี่"
        actionLabel="เพิ่มสินค้าแรกของคุณ"
        onAction={onAddProduct}
      />
    );
  }

  const maxSold = Math.max(...products.map((p) => Number(p.totalSold) || 0), 1);

  return (
    <ul className="space-y-3">
      {products.slice(0, 5).map((product) => {
        const sold = Number(product.totalSold) || 0;
        const width = `${Math.max(8, (sold / maxSold) * 100)}%`;
        const src =
          resolveProductImageUrl(product.imageUrl || product.image) ||
          PRODUCT_PLACEHOLDER;
        return (
          <li key={product.id || product.name} className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-surface-muted">
                <Image
                  src={src}
                  alt={product.name || "สินค้า"}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">
                  {product.name}
                </p>
                <p className="text-xs text-fg-muted">
                  ขายได้ {sold.toLocaleString("th-TH")} ชิ้น
                  {product.revenue != null
                    ? ` · ฿${Number(product.revenue).toLocaleString("th-TH")}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-200"
                style={{ width }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
