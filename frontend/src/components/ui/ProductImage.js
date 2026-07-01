"use client";

import { useState } from "react";
import Image from "next/image";
import { FaImage } from "react-icons/fa";
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
  containerClassName = "",
}) {
  const resolved = resolveProductImageUrl(imageUrl);
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !resolved || failed;

  const placeholder = (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gray-100 text-gray-400 ${containerClassName}`}
      aria-label={alt}
    >
      <FaImage className="mb-1 text-2xl" />
      <span className="text-[10px] font-medium">No image</span>
    </div>
  );

  if (showPlaceholder) {
    if (fill) {
      return (
        <div className={`relative h-full w-full ${containerClassName}`}>
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
      onError={() => setFailed(true)}
      unoptimized={!isLocal}
    />
  );

  if (fill) {
    return (
      <div className={`relative h-full w-full ${containerClassName}`}>{img}</div>
    );
  }

  return img;
}
