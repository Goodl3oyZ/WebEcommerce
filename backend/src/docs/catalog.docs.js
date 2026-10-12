import { z } from "zod";
import { documentRoutes } from "./registry.js";
import { productDto } from "../dtos/product.dto.js";
import { categoryDto } from "../dtos/category.dto.js";
import { brandDto } from "../dtos/brand.dto.js";
import { collectionDto } from "../dtos/collection.dto.js";

const hiddenNote = "Hidden (inactive) items are returned only to admins.";
const listNote = `Each product includes \`stock\` (sum of its variants), \`rating\` and \`reviewCount\`. ${hiddenNote}`;

documentRoutes("Products", [
  { method: "get", path: "/api/products", summary: "Browse products", description: listNote, auth: "public", query: productDto.listQuery, responses: { 200: "Products and pagination" } },
  { method: "get", path: "/api/products/search", summary: "Search products by name/description", description: listNote, auth: "public", query: productDto.searchQuery, responses: { 200: "Products and pagination" } },
  {
    method: "get",
    path: "/api/products/category/:categoryId",
    summary: "Products in a category",
    description: listNote,
    auth: "public",
    query: productDto.listQuery,
    responses: { 200: "Products and pagination", 404: "Category not found (malformed id)" },
  },
  {
    method: "get",
    path: "/api/products/:id",
    summary: "Product details with variants, attributes and reviews",
    description: hiddenNote,
    auth: "public",
    responses: { 200: "Product", 404: "Product not found" },
  },
  { method: "get", path: "/api/products/:id/variants", summary: "A product's variants", description: hiddenNote, auth: "public", responses: { 200: "Variants", 404: "Product not found" } },
  { method: "get", path: "/api/products/:id/reviews", summary: "A product's reviews and average rating", auth: "public", query: productDto.pageQuery, responses: { 200: "Reviews and pagination", 404: "Product not found" } },
  {
    method: "post",
    path: "/api/products/:id/review",
    summary: "Review a product",
    description: "One review per customer per product.",
    auth: "user",
    body: productDto.createReview,
    responses: { 201: "Review", 404: "Product not found", 409: "Already reviewed" },
  },
  {
    method: "put",
    path: "/api/products/:id/review/:reviewId",
    summary: "Edit your review",
    auth: "user",
    body: productDto.updateReview,
    responses: { 200: "Review", 403: "Not your review", 404: "Review not found" },
  },
  {
    method: "delete",
    path: "/api/products/:id/review/:reviewId",
    summary: "Delete a review",
    description: "Authors can delete their own review; moderators and admins can delete any.",
    auth: "user",
    responses: { 204: "Deleted", 403: "Not your review", 404: "Review not found" },
  },
  {
    method: "post",
    path: "/api/products",
    summary: "Create a product",
    description: "Stock and prices per size/colour are managed with the variant endpoints.",
    auth: "admin",
    body: productDto.createProduct,
    responses: { 201: "Product" },
  },
  ...["put", "patch"].map((method) => ({
    method,
    path: "/api/products/:id",
    summary: "Update a product",
    description: "Image URLs from /api/uploads/product are stored as keys. `attributes` replaces all attributes.",
    auth: "admin",
    body: productDto.updateProduct,
    responses: { 200: "Product", 404: "Product not found" },
  })),
  { method: "delete", path: "/api/products/:id", summary: "Hide a product (soft delete)", auth: "admin", responses: { 200: "Hidden", 404: "Product not found" } },
  {
    method: "post",
    path: "/api/products/:id/variants",
    summary: "Add a variant",
    auth: "admin",
    body: productDto.createVariant,
    responses: { 201: "Variant", 404: "Product not found", 409: "SKU already exists" },
  },
  ...["put", "patch"].map((method) => ({
    method,
    path: "/api/products/:id/variants/:variantId",
    summary: "Update a variant",
    auth: "admin",
    body: productDto.updateVariant,
    responses: { 200: "Variant", 404: "Variant not found", 409: "SKU already exists" },
  })),
  {
    method: "delete",
    path: "/api/products/:id/variants/:variantId",
    summary: "Delete a variant",
    description: "Variants that appear on orders cannot be deleted; set their stock to 0 instead.",
    auth: "admin",
    responses: { 204: "Deleted", 400: "Variant is referenced by orders", 404: "Variant not found" },
  },
]);

documentRoutes("Categories", [
  { method: "get", path: "/api/categories", summary: "All categories with active product counts", auth: "public", responses: { 200: "Categories" } },
  { method: "get", path: "/api/categories/:id", summary: "Get a category", auth: "public", responses: { 200: "Category", 404: "Category not found" } },
  { method: "get", path: "/api/categories/:id/products", summary: "Products in a category", description: listNote, auth: "public", query: productDto.listQuery, responses: { 200: "Products and pagination", 404: "Category not found" } },
  { method: "post", path: "/api/categories", summary: "Create a category", auth: "admin", body: categoryDto.createCategory, responses: { 201: "Category", 409: "Name already exists" } },
  ...["put", "patch"].map((method) => ({
    method,
    path: "/api/categories/:id",
    summary: "Update a category",
    auth: "admin",
    body: categoryDto.updateCategory,
    responses: { 200: "Category", 404: "Category not found", 409: "Name already exists" },
  })),
  { method: "delete", path: "/api/categories/:id", summary: "Delete an empty category", auth: "admin", responses: { 200: "Deleted", 400: "Category still has products", 404: "Category not found" } },
]);

documentRoutes("Brands", [
  { method: "get", path: "/api/brands", summary: "Brands", description: hiddenNote, auth: "public", query: brandDto.listQuery, responses: { 200: "Brands and pagination" } },
  { method: "get", path: "/api/brands/:id", summary: "Get a brand", description: hiddenNote, auth: "public", responses: { 200: "Brand", 404: "Brand not found" } },
  { method: "get", path: "/api/brands/:id/products", summary: "A brand's products", description: listNote, auth: "public", query: brandDto.listQuery, responses: { 200: "Products and pagination", 404: "Brand not found" } },
  { method: "post", path: "/api/brands", summary: "Create a brand", auth: "admin", body: brandDto.createBrand, responses: { 201: "Brand", 409: "Name already exists" } },
  ...["put", "patch"].map((method) => ({
    method,
    path: "/api/brands/:id",
    summary: "Update a brand",
    auth: "admin",
    body: brandDto.updateBrand,
    responses: { 200: "Brand", 404: "Brand not found", 409: "Name already exists" },
  })),
  { method: "delete", path: "/api/brands/:id", summary: "Disable a brand", auth: "admin", responses: { 200: "Disabled brand", 400: "Brand still has active products", 404: "Brand not found" } },
]);

documentRoutes("Collections", [
  { method: "get", path: "/api/collections", summary: "Collections with product counts", description: hiddenNote, auth: "public", query: collectionDto.listQuery, responses: { 200: "Collections and pagination" } },
  { method: "get", path: "/api/collections/:id", summary: "A collection with its products", description: hiddenNote, auth: "public", responses: { 200: "Collection", 404: "Collection not found" } },
  { method: "get", path: "/api/collections/:id/products", summary: "A collection's products (paginated)", description: listNote, auth: "public", query: collectionDto.listQuery, responses: { 200: "Products and pagination", 404: "Collection not found" } },
  { method: "post", path: "/api/collections", summary: "Create a collection", auth: "admin", body: collectionDto.createCollection, responses: { 201: "Collection", 404: "Product not found", 409: "Name already exists" } },
  { method: "put", path: "/api/collections/:id", summary: "Update a collection", auth: "admin", body: collectionDto.updateCollection, responses: { 200: "Collection", 404: "Collection not found" } },
  { method: "delete", path: "/api/collections/:id", summary: "Delete a collection (products are kept)", auth: "admin", responses: { 200: "Deleted", 404: "Collection not found" } },
  { method: "post", path: "/api/collections/:id/products", summary: "Add products (duplicates are skipped)", auth: "admin", body: collectionDto.addProducts, responses: { 200: "Collection", 404: "Collection or product not found" } },
  { method: "delete", path: "/api/collections/:id/products", summary: "Remove products", auth: "admin", body: collectionDto.removeProducts, responses: { 200: "Collection", 404: "Collection not found" } },
]);

// --- Uploads -------------------------------------------------------------------
const imageNote =
  'multipart/form-data with the file in the "image" field. JPEG, PNG, GIF or WebP only (checked by content, not just the declared type); SVG is never accepted.';
const fileBody = (extra = {}) => z.object(extra);
const deleteBody = z.object({ fileName: z.string().describe("Storage key or public URL returned by the upload") });

const uploadDocs = [
  ["avatar", "Profile picture", "user", null, "Sets the current user's avatar (same as PUT /api/users/profile with only an avatar)."],
  ["review", "Review photo", "user", null, "Stored under the uploader's folder; customers can only replace or delete their own files."],
  ["product", "Product image", "admin", "productId", "Optional productId groups the file; use the returned url/fileName in the product's imageUrl."],
  ["brand", "Brand logo", "admin", "brandId", "Optional brandId groups the file; use the returned url in the brand's logo."],
  ["store", "Store image", "admin", "storeId", "Optional storeId groups the file."],
];

documentRoutes(
  "Uploads",
  uploadDocs.flatMap(([path, label, auth, idField, note]) => {
    const idFields = idField ? { [idField]: z.string().uuid().optional() } : {};
    const bodyFor = (withOld) =>
      fileBody({
        ...idFields,
        ...(withOld && path !== "avatar" && { oldFileName: z.string().optional().describe("File to delete after the new one is stored") }),
      });
    return [
      {
        method: "post",
        path: `/api/uploads/${path}`,
        summary: `Upload a ${label.toLowerCase()}`,
        description: `${imageNote} ${note}`,
        auth,
        body: bodyFor(false),
        bodyType: "multipart",
        fileField: "image",
        responses: { [path === "avatar" ? 200 : 201]: "{ url, fileName }", 413: "File is too large" },
      },
      {
        method: "put",
        path: `/api/uploads/${path}`,
        summary: `Replace a ${label.toLowerCase()}`,
        description: `${imageNote} ${note}`,
        auth,
        body: bodyFor(true),
        bodyType: "multipart",
        fileField: "image",
        responses: { 200: "{ url, fileName }", 413: "File is too large" },
      },
      {
        method: "delete",
        path: `/api/uploads/${path}`,
        summary: `Delete a ${label.toLowerCase()}`,
        description: path === "avatar" ? "Removes the current user's avatar." : note,
        auth,
        ...(path !== "avatar" && { body: deleteBody }),
        responses: { 200: "Deleted", 404: "Nothing to delete" },
      },
    ];
  })
);
