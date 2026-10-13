import { variantLabel } from "@/components/shop/productData";

/** One display shape for server cart lines (signed in) and local lines (guest). */
export function normalizeCartLine(item, signedIn) {
  if (signedIn) {
    return {
      key: item.id,
      storeId: item.id,
      productId: item.productId,
      variantId: item.variantId ?? null,
      name: item.product?.name ?? "สินค้า",
      image: item.variant?.images?.[0] || item.product?.imageUrl?.[0] || null,
      options: variantLabel(item.variant),
      price: Number(item.price),
      quantity: item.quantity,
      maxStock: item.variant?.stock ?? 99,
      inStock: item.inStock !== false,
      priceChanged: !!item.priceChanged,
      available: item.product?.isActive !== false,
    };
  }
  return {
    key: `${item.id}-${item.variantId ?? ""}`,
    storeId: item.id,
    productId: item.id,
    variantId: item.variantId ?? null,
    name: item.name ?? "สินค้า",
    image: Array.isArray(item.imageUrl) ? item.imageUrl[0] : item.imageUrl,
    options: item.variantName || variantLabel(item.variant),
    price: Number(item.price),
    quantity: item.quantity,
    maxStock: item.variant?.stock ?? 99,
    inStock: true,
    priceChanged: false,
    available: true,
  };
}
