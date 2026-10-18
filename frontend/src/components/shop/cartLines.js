import { variantLabel, variantStock } from "@/components/shop/productData";

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
      maxStock: item.variant ? variantStock(item.variant) : 99,
      inStock: item.inStock !== false,
      // In stock, but only a branch has enough: it has to be collected.
      pickupOnly: item.inStock !== false && item.deliverable === false,
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
    maxStock: item.variant ? variantStock(item.variant) : 99,
    inStock: true,
    pickupOnly: Boolean(item.variant) && item.quantity > (item.variant.stock || 0),
    priceChanged: false,
    available: true,
  };
}
