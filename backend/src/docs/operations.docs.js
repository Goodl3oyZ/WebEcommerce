import { documentRoutes } from "./registry.js";
import { wishlistDto } from "../dtos/wishlist.dto.js";
import { loyaltyDto } from "../dtos/loyalty.dto.js";
import { notificationDto } from "../dtos/notification.dto.js";
import { inventoryDto } from "../dtos/inventory.dto.js";
import { supplierDto } from "../dtos/supplier.dto.js";
import { reportDto } from "../dtos/report.dto.js";
import { settingsDto } from "../dtos/settings.dto.js";
import { seedDto, demoRemoveDto } from "../routes/adminRoutes.js";

documentRoutes("Wishlist", [
  { method: "get", path: "/api/wishlist", summary: "Your wishlist (products include stock)", auth: "user", responses: { 200: "Items" } },
  { method: "post", path: "/api/wishlist", summary: "Add a product (idempotent)", auth: "user", body: wishlistDto.addToWishlist, responses: { 201: "Added", 200: "Already in the wishlist", 404: "Product or variant not found" } },
  { method: "put", path: "/api/wishlist/:id", summary: "Change or clear the chosen variant", auth: "user", body: wishlistDto.updateWishlistItem, responses: { 200: "Item", 404: "Item or variant not found" } },
  { method: "delete", path: "/api/wishlist/:id", summary: "Remove an item", auth: "user", responses: { 204: "Removed", 404: "Item not found" } },
  { method: "post", path: "/api/wishlist/:id/move-to-cart", summary: "Move an item to the cart", auth: "user", body: wishlistDto.moveToCart, bodyOptional: true, responses: { 200: "Updated cart", 404: "Item not found", 409: "Not enough stock" } },
  { method: "get", path: "/api/wishlist/admin/all", summary: "All wishlist items", auth: "admin", query: wishlistDto.adminListQuery, responses: { 200: "Items and pagination" } },
  { method: "get", path: "/api/wishlist/admin/user/:userId", summary: "A user's wishlist", auth: "admin", responses: { 200: "Items", 404: "User not found" } },
  { method: "get", path: "/api/wishlist/admin/product/:productId", summary: "Who wishlisted a product", auth: "admin", responses: { 200: "Count and items" } },
]);

const loyaltyNote = "Earn 1 point per ฿10 of a paid order × tier multiplier (bronze 1, silver 1.25, gold 1.5); points from a fully refunded order are taken back.";
const notSupported = { 501: "Not supported: tiers and rewards are fixed in code" };

documentRoutes("Loyalty", [
  { method: "get", path: "/api/loyalty/points", summary: "Your points, tier and next tier", description: loyaltyNote, auth: "user", responses: { 200: "Balance" } },
  { method: "get", path: "/api/loyalty/history", summary: "Your points history", auth: "user", query: loyaltyDto.historyQuery, responses: { 200: "History and pagination" } },
  { method: "get", path: "/api/loyalty/rewards", summary: "Rewards you can redeem", auth: "user", responses: { 200: "Rewards" } },
  {
    method: "post",
    path: "/api/loyalty/rewards/redeem/:id",
    summary: "Redeem a reward for a single-use coupon",
    description: "Deducts points atomically and returns a coupon code valid for 30 days.",
    auth: "user",
    responses: { 201: "Redemption with coupon", 400: "Insufficient points", 404: "Reward not found" },
  },
  { method: "get", path: "/api/loyalty/statistics", summary: "Points earned/redeemed, outstanding balance, tiers", auth: "admin", query: loyaltyDto.statisticsQuery, responses: { 200: "Statistics" } },
  { method: "get", path: "/api/loyalty/tiers", summary: "Tier thresholds and multipliers", auth: "admin", responses: { 200: "Tiers" } },
  { method: "post", path: "/api/loyalty/tiers", summary: "Create a tier (not supported)", auth: "admin", body: loyaltyDto.tier, bodyOptional: true, responses: notSupported },
  { method: "put", path: "/api/loyalty/tiers/:id", summary: "Update a tier (not supported)", auth: "admin", body: loyaltyDto.tier, bodyOptional: true, responses: notSupported },
  { method: "post", path: "/api/loyalty/rewards", summary: "Create a reward (not supported)", auth: "admin", body: loyaltyDto.reward, bodyOptional: true, responses: notSupported },
  { method: "put", path: "/api/loyalty/rewards/:id", summary: "Update a reward (not supported)", auth: "admin", body: loyaltyDto.reward, bodyOptional: true, responses: notSupported },
  { method: "delete", path: "/api/loyalty/rewards/:id", summary: "Delete a reward (not supported)", auth: "admin", responses: notSupported },
]);

documentRoutes("Notifications", [
  { method: "get", path: "/api/notifications", summary: "Your notifications and unread count", auth: "user", query: notificationDto.listQuery, responses: { 200: "Notifications and pagination" } },
  { method: "get", path: "/api/notifications/:id", summary: "One of your notifications", auth: "user", responses: { 200: "Notification", 404: "Not found" } },
  ...["put", "patch"].map((method) => ({ method, path: "/api/notifications/:id/read", summary: "Mark one as read", auth: "user", responses: { 200: "Notification", 404: "Not found" } })),
  ...["put", "patch"].map((method) => ({
    method,
    path: "/api/notifications/read-all",
    summary: "Mark all (or the given ids) as read",
    auth: "user",
    body: notificationDto.markAsRead,
    bodyOptional: true,
    responses: { 200: "{ updated }" },
  })),
  { method: "delete", path: "/api/notifications/:id", summary: "Delete one of your notifications", auth: "user", responses: { 204: "Deleted", 404: "Not found" } },
  {
    method: "post",
    path: "/api/notifications",
    summary: "Send a notification",
    description: "To userId/recipients (de-duplicated), or to every active user with broadcast: true.",
    auth: "admin",
    body: notificationDto.createNotification,
    responses: { 201: "{ sent, notifications }", 400: "No or unknown recipients" },
  },
  ...["put", "patch"].map((method) => ({ method, path: "/api/notifications/:id", summary: "Edit a notification", auth: "admin", body: notificationDto.updateNotification, responses: { 200: "Notification", 404: "Not found" } })),
  { method: "get", path: "/api/notifications/admin/all", summary: "All notifications", auth: "admin", query: notificationDto.adminListQuery, responses: { 200: "Notifications and pagination" } },
  { method: "get", path: "/api/notifications/admin/:id", summary: "Any notification", auth: "admin", responses: { 200: "Notification", 404: "Not found" } },
  { method: "delete", path: "/api/notifications/admin/:id", summary: "Delete any notification", auth: "admin", responses: { 204: "Deleted", 404: "Not found" } },
]);

const branchStock = "Per-branch stock (store_inventory). Online stock is on product variants.";

documentRoutes("Inventory", [
  { method: "get", path: "/api/inventory", summary: "All branch stock", description: branchStock, auth: "admin", query: inventoryDto.listQuery, responses: { 200: "Items and pagination" } },
  { method: "get", path: "/api/inventory/low-stock", summary: "Branch stock at or below a threshold", auth: "admin", query: inventoryDto.lowStockQuery, responses: { 200: "Items and pagination" } },
  { method: "get", path: "/api/inventory/product/:productId", summary: "A product's stock per branch", auth: "admin", query: inventoryDto.listQuery, responses: { 200: "Items and pagination", 404: "Product not found" } },
  { method: "get", path: "/api/inventory/location/:location", summary: "A branch's stock (:location is the store id)", auth: "admin", query: inventoryDto.listQuery, responses: { 200: "Items and pagination", 400: "Store not found" } },
  { method: "get", path: "/api/inventory/:id", summary: "One stock record", auth: "admin", responses: { 200: "Item", 404: "Not found" } },
  { method: "post", path: "/api/inventory", summary: "Start tracking a variant at a branch", auth: "admin", body: inventoryDto.createInventoryItem, responses: { 201: "Item", 404: "Variant not found", 409: "Already tracked" } },
  { method: "put", path: "/api/inventory/:id", summary: "Set the counted quantity", auth: "admin", body: inventoryDto.updateInventoryItem, responses: { 200: "Item", 404: "Not found" } },
  { method: "post", path: "/api/inventory/:id/adjust", summary: "Add or remove stock (never below zero)", auth: "admin", body: inventoryDto.adjustInventory, responses: { 200: "Item", 400: "Not enough stock", 404: "Not found" } },
  { method: "post", path: "/api/inventory/:id/transfer", summary: "Move stock to another branch (atomic)", auth: "admin", body: inventoryDto.transferInventory, responses: { 200: "{ source, destination }", 400: "Same store, unknown store or not enough stock", 404: "Not found" } },
]);

documentRoutes("Suppliers", [
  { method: "get", path: "/api/suppliers", summary: "Suppliers", auth: "admin", query: supplierDto.listQuery, responses: { 200: "Suppliers and pagination" } },
  { method: "post", path: "/api/suppliers", summary: "Create a supplier", auth: "admin", body: supplierDto.createSupplier, responses: { 201: "Supplier" } },
  { method: "get", path: "/api/suppliers/:id", summary: "A supplier with its products", auth: "admin", responses: { 200: "Supplier", 404: "Not found" } },
  { method: "put", path: "/api/suppliers/:id", summary: "Update a supplier", auth: "admin", body: supplierDto.updateSupplier, responses: { 200: "Supplier", 404: "Not found" } },
  { method: "delete", path: "/api/suppliers/:id", summary: "Delete a supplier", auth: "admin", responses: { 200: "Deleted", 404: "Not found" } },
  { method: "get", path: "/api/suppliers/:id/products", summary: "Products a supplier provides", auth: "admin", responses: { 200: "Links with product details", 404: "Supplier not found" } },
  { method: "post", path: "/api/suppliers/:id/products", summary: "Link a product", auth: "admin", body: supplierDto.addSupplierProduct, responses: { 201: "Link", 404: "Supplier or product not found", 409: "Already linked" } },
  { method: "put", path: "/api/suppliers/:id/products/:productId", summary: "Update a product link", auth: "admin", body: supplierDto.updateSupplierProduct, responses: { 200: "Link", 404: "Not linked" } },
  { method: "delete", path: "/api/suppliers/:id/products/:productId", summary: "Unlink a product", auth: "admin", responses: { 200: "Unlinked", 404: "Not linked" } },
]);

documentRoutes("Admin", [
  { method: "get", path: "/api/admin/dashboard", summary: "Dashboard figures (paid orders only) and alerts", auth: "admin", responses: { 200: "Dashboard" } },
  {
    method: "get",
    path: "/api/admin/seed/preview",
    summary: "What each seed would delete and create",
    description: "Live counts of the rows each seed deletes, the records it creates (from src/seed/data.js), notes, and `blocked` when it cannot run (e.g. orders reference the data).",
    auth: "super_admin",
    responses: { 200: "{ address, shipping, main, all }" },
  },
  {
    method: "post",
    path: "/api/admin/seed",
    summary: "Load seed data",
    description:
      'Super admins only. Disabled in production unless ALLOW_ADMIN_SEED=true. "main", "shipping" and "all" DELETE existing data and need confirm: "DELETE EXISTING DATA".',
    auth: "super_admin",
    body: seedDto,
    responses: { 200: "Seeded", 400: "Unknown seed or missing confirmation" },
  },
  {
    method: "get",
    path: "/api/admin/demo-data",
    summary: "Demo catalogue status and what removal would take out",
    description: "catalog: the demo products (installed or not). removal.groups: demo and old seed rows with action delete | hide (kept for order history) | keep.",
    auth: "super_admin",
    responses: { 200: "{ catalog, removal }" },
  },
  {
    method: "post",
    path: "/api/admin/demo-data",
    summary: "Install the demo catalogue (with photos)",
    description: "Adds categories, brands and products with photos without deleting anything. Products already installed are skipped. Works in production.",
    auth: "super_admin",
    responses: { 201: "{ created: { categories, brands, products, skipped } }" },
  },
  {
    method: "post",
    path: "/api/admin/demo-data/remove",
    summary: "Remove demo and seed data",
    description:
      "Deletes the demo catalogue and the rows the main seed created (fixed SKUs, coupon codes, demo admin). Rows referenced by orders are hidden/deactivated instead; categories and brands your products use are kept.",
    auth: "super_admin",
    body: demoRemoveDto,
    responses: { 200: "{ removed: per group deleted/hidden/kept }", 400: "Missing confirmation" },
  },
]);

const paidNote = "Money figures count paid orders (minus refunds).";
documentRoutes("Reports", [
  { method: "get", path: "/api/reports/sales", summary: "Sales by period, top products and categories", description: paidNote, auth: "admin", query: reportDto.salesQuery, responses: { 200: "Sales report" } },
  { method: "get", path: "/api/reports/orders", summary: "All orders by status, payment status and period", auth: "admin", query: reportDto.ordersQuery, responses: { 200: "Orders report" } },
  { method: "get", path: "/api/reports/inventory", summary: "Stock levels (online, or one branch with storeId)", auth: "admin", query: reportDto.inventoryQuery, responses: { 200: "Inventory report" } },
  { method: "get", path: "/api/reports/customer", summary: "Customers: new, returning, top spenders", description: paidNote, auth: "admin", query: reportDto.customerQuery, responses: { 200: "Customer report" } },
  { method: "get", path: "/api/reports/supplier", summary: "Suppliers with product counts, cost and lead time", auth: "admin", query: reportDto.supplierQuery, responses: { 200: "Supplier report" } },
  ...["sales", "orders", "inventory", "customer", "supplier"].map((name) => ({
    method: "get",
    path: `/api/report/${name}`,
    summary: `Alias of /api/reports/${name}`,
    deprecated: true,
    auth: "admin",
    responses: { 200: "Report" },
  })),
]);

documentRoutes("Settings", [
  { method: "get", path: "/api/settings/public", summary: "Public site settings", auth: "public", responses: { 200: "{ siteName, maintenance, theme, currency }" } },
  { method: "get", path: "/api/settings", summary: "All site settings", auth: "admin", responses: { 200: "Settings" } },
  ...["put", "patch"].map((method) => ({
    method,
    path: "/api/settings",
    summary: "Update site settings (persisted)",
    auth: "admin",
    body: settingsDto.updateSettings,
    responses: { 200: "Settings" },
  })),
]);

// Health check (outside the route modules)
documentRoutes("System", [
  {
    method: "get",
    path: "/api/health",
    summary: "Health of the database, Redis and storage",
    auth: "public",
    responses: { 200: "All ok", 503: "A dependency is down" },
  },
]);

