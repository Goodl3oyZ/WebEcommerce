"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { resolveProductImageUrl } from "@/lib/images";

/**
 * Product image with empty-state placeholder (avoids 404/400 from bad URLs).
 */
export default function ProductImage({
  imageUrl,
  alt = "Product",
  fill = false,
  width,
  height,
  className = "object-cover",
  sizes,
  priority = false,
  containerClassName = "",
}) {
  const resolved = resolveProductImageUrl(imageUrl);
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !resolved || failed;

  const placeholder = (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-1.5 bg-surface-muted text-fg-subtle ${containerClassName}`}
      role="img"
      aria-label={alt ? `${alt} (ไม่มีรูปภาพ)` : "ไม่มีรูปภาพ"}
    >
      <ImageOff className="h-6 w-6" aria-hidden />
      <span className="text-[11px] font-medium">ไม่มีรูปภาพ</span>
    </div>
  );

  if (showPlaceholder) {
    if (fill) {
      return (
        <div className={`absolute inset-0 ${containerClassName}`}>
          {placeholder}
        </div>
      );
    }
    return placeholder;
  }

  const isLocal = resolved.startsWith("/");

  const img = (
    <Image
      src={resolved}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      className={className}
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      unoptimized={!isLocal}
    />
  );

  if (fill) {
    return (
      <div className={`absolute inset-0 ${containerClassName}`}>{img}</div>
    );
  }

  return img;
}
