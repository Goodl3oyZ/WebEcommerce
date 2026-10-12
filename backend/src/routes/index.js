import addressDataRoutes from "./addressDataRoutes.js";
import addressRoute from "./addressRoutes.js";
import authRoutes from "./authRoutes.js";
import oauthRoutes from "./oauthRoutes.js";
import userRoutes from "./userRoutes.js";
import productRoutes from "./productRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import brandRoutes from "./brandRoutes.js";
import collectionRoutes from "./collectionRoutes.js";
import couponRoutes from "./couponRoutes.js";
import cartRoutes from "./cartRoutes.js";
import wishlistRoutes from "./wishlistRoutes.js";
import orderRoutes from "./orderRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import shippingRoutes from "./shippingRoutes.js";
import storeRoutes from "./storeRoutes.js";
import loyaltyRoutes from "./loyaltyRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import adminRoutes from "./adminRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import reportRoutes from "./reportRoutes.js";
import supplierRoutes from "./supplierRoutes.js";
import inventoryRoutes from "./inventoryRoutes.js";
import notificationRoutes from "./notificationRoutes.js";

// Every API router and its mount path. This table is the single source of
// truth used to mount routes, audit them (scripts/audit-routes.js) and check
// that each one is documented and tested.
export const routeModules = [
  ["/api/auth", authRoutes],
  ["/oauth", oauthRoutes],
  ["/api/users", userRoutes],
  ["/api/products", productRoutes],
  ["/api/categories", categoryRoutes],
  ["/api/brands", brandRoutes],
  ["/api/collections", collectionRoutes],
  ["/api/cart", cartRoutes],
  ["/api/wishlist", wishlistRoutes],
  ["/api/orders", orderRoutes],
  ["/api/payments", paymentRoutes],
  ["/api/shipping", shippingRoutes],
  ["/api/stores", storeRoutes],
  ["/api/coupons", couponRoutes],
  ["/api/loyalty", loyaltyRoutes],
  ["/api/addresses", addressRoute],
  ["/api/uploads", uploadRoutes],
  ["/api/addressData", addressDataRoutes],
  ["/api/admin", adminRoutes],
  ["/api/settings", settingsRoutes],
  ["/api/reports", reportRoutes],
  /** @deprecated use /api/reports — kept for existing frontend clients */
  ["/api/report", reportRoutes],
  ["/api/suppliers", supplierRoutes],
  ["/api/inventory", inventoryRoutes],
  ["/api/notifications", notificationRoutes],
];

// Aliases kept only for backward compatibility; excluded from coverage checks.
export const deprecatedMountPaths = ["/api/report"];
