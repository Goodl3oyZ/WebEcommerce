import { z } from "zod";
import { documentRoutes } from "./registry.js";
import { addressDto } from "../dtos/address.dto.js";
import { shippingDto } from "../dtos/shipping.dto.js";
import { storeDto } from "../dtos/store.dto.js";

documentRoutes("Addresses", [
  { method: "get", path: "/api/addresses", summary: "Your addresses (default first)", auth: "user", responses: { 200: "Addresses" } },
  {
    method: "post",
    path: "/api/addresses",
    summary: "Add an address",
    description: "The first address becomes the default; isDefault=true makes this one the only default. The shipping zone is derived from the province.",
    auth: "user",
    body: addressDto.createAddress,
    responses: { 201: "Address" },
  },
  {
    method: "put",
    path: "/api/addresses/:id",
    summary: "Update your address",
    description: "Changing the province updates the shipping zone. To change the default, set another address as default.",
    auth: "user",
    body: addressDto.updateAddress,
    responses: { 200: "Address", 404: "Address not found" },
  },
  { method: "put", path: "/api/addresses/:id/default", summary: "Make an address your default", auth: "user", responses: { 200: "Address", 404: "Address not found" } },
  {
    method: "delete",
    path: "/api/addresses/:id",
    summary: "Delete your address",
    description: "Deleting the default promotes the next address. Addresses used by orders are kept.",
    auth: "user",
    responses: { 204: "Deleted", 400: "Used by an order", 404: "Address not found" },
  },
  { method: "get", path: "/api/addresses/admin/all", summary: "All addresses with their owner", auth: "admin", query: addressDto.adminListQuery, responses: { 200: "Addresses and pagination" } },
  { method: "get", path: "/api/addresses/admin/user/:userId", summary: "A user's addresses", auth: "admin", responses: { 200: "Addresses", 404: "User not found" } },
  { method: "get", path: "/api/addresses/admin/:id", summary: "Any address by id", auth: "admin", responses: { 200: "Address", 404: "Address not found" } },
]);

documentRoutes("Address data", [
  { method: "get", path: "/api/addressData/provinces", summary: "Thai provinces", auth: "public", responses: { 200: "Provinces (cacheable)" } },
  {
    method: "get",
    path: "/api/addressData/districts",
    summary: "Districts of a province",
    auth: "public",
    query: z.object({ province: z.string().describe("Province name (Thai)") }),
    responses: { 200: "Districts (empty when unknown)" },
  },
  {
    method: "get",
    path: "/api/addressData/subdistricts",
    summary: "Subdistricts (with zipcode) of a district",
    description: "District names repeat across provinces; pass the province to get the right one.",
    auth: "public",
    query: z.object({
      district: z.string().describe("District name (Thai)"),
      province: z.string().optional().describe("Province name (Thai), recommended"),
    }),
    responses: { 200: "Subdistricts (empty when unknown)" },
  },
]);

const hiddenNote = "Disabled entries are returned to admins only.";
const ownNote = "Customers can only see their own orders' shipments; admins can see all.";

documentRoutes("Shipping", [
  {
    method: "get",
    path: "/api/shipping/methods",
    summary: "Shipping methods",
    description: `With addressId (login required, your address): methods available there. ${hiddenNote}`,
    auth: "public",
    query: shippingDto.methodsQuery,
    responses: { 200: "Methods", 400: "Address not found / not yours", 401: "Login required for addressId" },
  },
  { method: "get", path: "/api/shipping/zones", summary: "Shipping zones", description: hiddenNote, auth: "public", responses: { 200: "Zones" } },
  {
    method: "post",
    path: "/api/shipping/calculate",
    summary: "Shipping options and prices for one of your addresses",
    description: "The price depends on the address's zone (resolved from the province if missing).",
    auth: "user",
    body: shippingDto.calculate,
    responses: { 200: "[{ methodId, methodName, cost }]", 400: "Address not found or no shipping to it" },
  },
  { method: "get", path: "/api/shipping/tracking/:trackingNumber", summary: "Track a shipment", description: ownNote, auth: "user", responses: { 200: "Status and history", 404: "Shipment not found" } },
  { method: "get", path: "/api/shipping/order/:orderId", summary: "An order's shipment", description: ownNote, auth: "user", responses: { 200: "Shipment and history", 404: "Shipment not found" } },
  { method: "get", path: "/api/shipping/stats", summary: "Shipment counts per status", auth: "admin", responses: { 200: "Statistics" } },
  { method: "get", path: "/api/shipping", summary: "All shipments", auth: "admin", query: shippingDto.listQuery, responses: { 200: "Shipments and pagination" } },
  { method: "post", path: "/api/shipping", summary: "Create a shipment for an order", description: "One shipment per order (checkout normally creates it).", auth: "admin", body: shippingDto.createShipment, responses: { 201: "Shipment", 404: "Order not found", 409: "Order already has a shipment" } },
  { method: "get", path: "/api/shipping/:id", summary: "A shipment with its history", auth: "admin", responses: { 200: "Shipment", 404: "Shipment not found" } },
  {
    method: "put",
    path: "/api/shipping/:id",
    summary: "Update a shipment",
    description: "Recorded in the tracking history. shipped/in_transit/out_for_delivery moves a paid order to shipped; delivered moves a shipped order to delivered.",
    auth: "admin",
    body: shippingDto.updateShipment,
    responses: { 200: "Shipment", 404: "Shipment not found" },
  },
  { method: "post", path: "/api/shipping/:id/label", summary: "Generate label data (assigns a tracking number if missing)", auth: "admin", responses: { 201: "Label", 404: "Shipment not found" } },
  { method: "get", path: "/api/shipping/:id/label", summary: "Label data for printing", auth: "admin", responses: { 200: "Label", 404: "Shipment or label not found" } },
  { method: "post", path: "/api/shipping/methods", summary: "Create a shipping method", auth: "admin", body: shippingDto.createShippingMethod, responses: { 201: "Method", 400: "Zone not found", 409: "Code already exists" } },
  { method: "put", path: "/api/shipping/methods/:id", summary: "Update a shipping method", auth: "admin", body: shippingDto.updateShippingMethod, responses: { 200: "Method", 404: "Method not found", 409: "Code already exists" } },
  { method: "delete", path: "/api/shipping/methods/:id", summary: "Disable a shipping method", auth: "admin", responses: { 200: "Disabled method", 404: "Method not found" } },
  {
    method: "post",
    path: "/api/shipping/zones",
    summary: "Create a shipping zone",
    description: "provinces lists the Thai provinces served; listing a province moves it from its current zone (and its customers' addresses).",
    auth: "admin",
    body: shippingDto.createShippingZone,
    responses: { 201: "Zone", 409: "Name already exists" },
  },
  { method: "put", path: "/api/shipping/zones/:id", summary: "Update a shipping zone", auth: "admin", body: shippingDto.updateShippingZone, responses: { 200: "Zone", 404: "Zone not found", 409: "Name already exists" } },
  { method: "delete", path: "/api/shipping/zones/:id", summary: "Disable a shipping zone", auth: "admin", responses: { 200: "Disabled zone", 404: "Zone not found" } },
]);

const branchNote = "Stores are physical branches (pickup points with their own stock).";

documentRoutes("Stores", [
  { method: "get", path: "/api/stores", summary: "Branches", description: `${branchNote} Inactive branches are returned to admins only.`, auth: "public", query: storeDto.listQuery, responses: { 200: "Branches and pagination" } },
  { method: "get", path: "/api/stores/:id", summary: "A branch", auth: "public", responses: { 200: "Branch", 404: "Store not found" } },
  { method: "get", path: "/api/stores/:id/products", summary: "Products in stock at a branch", auth: "public", query: storeDto.listQuery, responses: { 200: "Products and pagination", 404: "Store not found" } },
  { method: "get", path: "/api/stores/:id/reviews", summary: "A branch's reviews and average rating", auth: "public", query: storeDto.listQuery, responses: { 200: "Reviews and pagination", 404: "Store not found" } },
  { method: "post", path: "/api/stores", summary: "Create a branch", auth: "admin", body: storeDto.createStore, responses: { 201: "Branch" } },
  ...["put", "patch"].map((method) => ({
    method,
    path: "/api/stores/:id",
    summary: "Update a branch",
    auth: "admin",
    body: storeDto.updateStore,
    responses: { 200: "Branch", 404: "Store not found" },
  })),
  { method: "delete", path: "/api/stores/:id", summary: "Deactivate a branch", auth: "admin", responses: { 200: "Deactivated branch", 404: "Store not found" } },
  { method: "get", path: "/api/stores/:id/orders", summary: "Orders picked up at a branch", auth: "admin", query: storeDto.ordersQuery, responses: { 200: "Orders and pagination", 404: "Store not found" } },
  { method: "get", path: "/api/stores/:id/analytics", summary: "Paid pickup sales (default: last 30 days)", auth: "admin", query: storeDto.analyticsQuery, responses: { 200: "Analytics", 404: "Store not found" } },
  { method: "put", path: "/api/stores/:id/settings", summary: "Merge branch settings", auth: "admin", body: storeDto.updateSettings, responses: { 200: "Settings", 404: "Store not found" } },
]);
