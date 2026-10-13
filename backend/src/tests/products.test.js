import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { loginAs } from "./helpers/factories.js";
import { createBrand, createCategory, createOrder, createProduct } from "./helpers/fixtures.js";

const { db } = await import("../config/db.js");
const schema = await import("../models/schema.js");
const { eq } = await import("drizzle-orm");

const tag = () => `T${randomUUID().slice(0, 8)}`;

describe("public catalogue", () => {
  test("GET /api/products hides inactive products from everyone but admins", async () => {
    const name = tag();
    await createProduct({ name: `${name} visible` });
    await createProduct({ name: `${name} hidden`, isActive: false });
    const anon = await newAgent();
    const { agent: customer } = await loginAs("user");
    const { agent: admin } = await loginAs("admin");

    const names = async (agent, query = {}) =>
      (await agent.get("/api/products").query({ search: name, ...query })).body.products.map((p) => p.name).sort();

    expect(await names(anon, { includeInactive: "true" })).toEqual([`${name} visible`]);
    expect(await names(customer, { includeInactive: "true" })).toEqual([`${name} visible`]);
    expect(await names(admin)).toEqual([`${name} hidden`, `${name} visible`]);
    expect(await names(admin, { includeInactive: "false" })).toEqual([`${name} visible`]);
  });

  test("filters by category, brand, price and stock; sorts; returns stock and rating", async () => {
    const category = await createCategory();
    const brand = await createBrand();
    const cheap = await createProduct({ price: "50.00", stock: 3, categoryId: category.id, brandId: brand.id });
    const pricey = await createProduct({ price: "500.00", stock: 0, categoryId: category.id });
    await db.insert(schema.productReviews).values({ productId: cheap.product.id, userId: (await loginAs("user")).user.id, rating: 4 });

    const agent = await newAgent();
    const byCategory = await agent.get("/api/products").query({ category: category.id, sort: "price_desc" });
    expect(byCategory.body.products.map((p) => p.id)).toEqual([pricey.product.id, cheap.product.id]);
    expect(byCategory.body.products[1]).toMatchObject({ stock: 3, rating: 4, reviewCount: 1 });

    const filtered = await agent.get("/api/products").query({ category: category.id, maxPrice: 100 });
    expect(filtered.body.products.map((p) => p.id)).toEqual([cheap.product.id]);
    const inStock = await agent.get("/api/products").query({ category: category.id, inStock: "true" });
    expect(inStock.body.products.map((p) => p.id)).toEqual([cheap.product.id]);
    const byBrand = await agent.get("/api/products").query({ brand: brand.id });
    expect(byBrand.body.products.map((p) => p.id)).toEqual([cheap.product.id]);

    expect((await agent.get("/api/products").query({ category: "not-a-uuid" })).status).toBe(400);
    expect((await agent.get("/api/products").query({ sort: "random" })).status).toBe(400);
    expect((await agent.get("/api/products").query({ limit: 1000 })).body.pagination.limit).toBe(100);
  });

  test("accepts what the storefront sends: blank filters and column-style sort", async () => {
    const category = await createCategory();
    const cheap = await createProduct({ price: "10.00", categoryId: category.id });
    const dear = await createProduct({ price: "90.00", categoryId: category.id });
    const agent = await newAgent();

    // The exact query the products page sent on first load (was a 400).
    const firstLoad = await agent.get(
      "/api/products?page=1&limit=12&category=&minPrice=&maxPrice=&sort=createdAt&order=desc"
    );
    expect(firstLoad.status).toBe(200);

    const byPrice = await agent.get("/api/products").query({ category: category.id, sort: "price", order: "asc" });
    expect(byPrice.body.products.map((p) => p.id)).toEqual([cheap.product.id, dear.product.id]);
    const byPriceDesc = await agent.get("/api/products").query({ category: category.id, sort: "price" });
    expect(byPriceDesc.body.products.map((p) => p.id)).toEqual([dear.product.id, cheap.product.id]);

    // Blank values are ignored on every validated query, not just products.
    const { agent: admin } = await loginAs("admin");
    expect((await admin.get("/api/orders/admin/all").query({ status: "", search: "" })).status).toBe(200);
  });

  test("search tolerates typos, matches brands and ranks exact hits first", async () => {
    const tag = randomUUID().slice(0, 4);
    const brand = await createBrand({ name: `Hoverfoot ${tag}` });
    const { product: shoe } = await createProduct({ name: `Velocity Trainer ${tag}`, brandId: brand.id });
    const { product: exact } = await createProduct({ name: `Velocty ${tag}` });
    const agent = await newAgent();
    const ids = async (search) => (await agent.get("/api/products").query({ search, limit: 50 })).body.products.map((p) => p.id);

    expect(await ids(`velocty trainr ${tag}`)).toContain(shoe.id); // two typos
    expect(await ids(`hoverfot ${tag}`)).toContain(shoe.id); // brand name, misspelt
    const ranked = await ids(`Velocty ${tag}`);
    expect(ranked.indexOf(exact.id)).toBeLessThan(ranked.indexOf(shoe.id));

    // The user's text is literal: "%" is not a wildcard that matches everything.
    const percent = (await agent.get("/api/products").query({ search: "%", limit: 50 })).body.products;
    expect(percent.every((p) => `${p.name} ${p.description ?? ""}`.includes("%"))).toBe(true);
  });

  test("GET /search requires q and excludes inactive products", async () => {
    const name = tag();
    await createProduct({ name: `${name} shirt` });
    await createProduct({ name: `${name} hat`, isActive: false });
    const agent = await newAgent();
    expect((await agent.get("/api/products/search")).status).toBe(400);
    const res = await agent.get("/api/products/search").query({ q: name });
    expect(res.body.products.map((p) => p.name)).toEqual([`${name} shirt`]);
  });

  test("GET /category/:categoryId lists the category's active products", async () => {
    const category = await createCategory();
    const { product } = await createProduct({ categoryId: category.id });
    await createProduct({ categoryId: category.id, isActive: false });
    const res = await (await newAgent()).get(`/api/products/category/${category.id}`);
    expect(res.body.products.map((p) => p.id)).toEqual([product.id]);
    expect((await (await newAgent()).get("/api/products/category/nope")).status).toBe(404);
  });

  test("GET /:id and /:id/variants: 404 for hidden products unless admin", async () => {
    const { product, variant } = await createProduct({ stock: 7 });
    const hidden = await createProduct({ isActive: false });
    const anon = await newAgent();
    const { agent: admin } = await loginAs("admin");

    const res = await anon.get(`/api/products/${product.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: product.id, stock: 7, attributes: {}, reviews: [] });
    expect((await anon.get(`/api/products/${product.id}/variants`)).body.map((v) => v.id)).toEqual([variant.id]);

    expect((await anon.get(`/api/products/${hidden.product.id}`)).status).toBe(404);
    expect((await anon.get(`/api/products/${hidden.product.id}/variants`)).status).toBe(404);
    expect((await admin.get(`/api/products/${hidden.product.id}`)).status).toBe(200);
    expect((await anon.get(`/api/products/${randomUUID()}`)).body.code).toBe("PRODUCT_NOT_FOUND");
    expect((await anon.get("/api/products/abc")).status).toBe(404);
  });
});

describe("reviews", () => {
  test("one review per customer, shown with the reviewer's name", async () => {
    const { product } = await createProduct();
    const { agent, user } = await loginAs("user");

    const created = await agent.post(`/api/products/${product.id}/review`).send({ rating: 5, comment: "Great" });
    expect(created.status).toBe(201);
    const again = await agent.post(`/api/products/${product.id}/review`).send({ rating: 1 });
    expect(again.status).toBe(409);

    const list = await (await newAgent()).get(`/api/products/${product.id}/reviews`);
    expect(list.body.averageRating).toBe(5);
    expect(list.body.reviews[0].user).toMatchObject({ id: user.id, name: user.name });
    expect(list.body.reviews[0].user.email).toBeUndefined();
  });

  test("validation and authentication", async () => {
    const { product } = await createProduct();
    const { agent } = await loginAs("user");
    expect((await agent.post(`/api/products/${product.id}/review`).send({ rating: 6 })).status).toBe(400);
    expect((await agent.post(`/api/products/${product.id}/review`).send({ rating: 3, userId: randomUUID() })).status).toBe(400);
    expect((await (await newAgent()).post(`/api/products/${product.id}/review`).send({ rating: 3 })).status).toBe(401);
    const hidden = await createProduct({ isActive: false });
    expect((await agent.post(`/api/products/${hidden.product.id}/review`).send({ rating: 3 })).status).toBe(404);
  });

  test("authors edit their own reviews; moderators may delete any", async () => {
    const { product } = await createProduct();
    const { agent: author } = await loginAs("user");
    const { agent: other } = await loginAs("user");
    const { agent: moderator } = await loginAs("moderator");
    const review = (await author.post(`/api/products/${product.id}/review`).send({ rating: 2 })).body;

    expect((await other.put(`/api/products/${product.id}/review/${review.id}`).send({ rating: 5 })).status).toBe(403);
    const edited = await author.put(`/api/products/${product.id}/review/${review.id}`).send({ rating: 4, comment: "Better" });
    expect(edited.body).toMatchObject({ rating: 4, comment: "Better" });

    expect((await other.delete(`/api/products/${product.id}/review/${review.id}`)).status).toBe(403);
    expect((await moderator.delete(`/api/products/${product.id}/review/${review.id}`)).status).toBe(204);
    expect((await author.delete(`/api/products/${product.id}/review/${review.id}`)).status).toBe(404);
  });
});

describe("admin product management", () => {
  test("customers cannot manage the catalogue", async () => {
    const { agent } = await loginAs("user");
    const { product, variant } = await createProduct();
    for (const [method, path] of [
      ["post", "/api/products"],
      ["put", `/api/products/${product.id}`],
      ["patch", `/api/products/${product.id}`],
      ["delete", `/api/products/${product.id}`],
      ["post", `/api/products/${product.id}/variants`],
      ["put", `/api/products/${product.id}/variants/${variant.id}`],
      ["patch", `/api/products/${product.id}/variants/${variant.id}`],
      ["delete", `/api/products/${product.id}/variants/${variant.id}`],
    ]) {
      expect((await agent[method](path).send({ name: "x" })).status).toBe(403);
    }
  });

  test("create, update (attributes, image URL stored as key), and soft delete", async () => {
    const { agent } = await loginAs("admin");
    const category = await createCategory();
    const created = await agent.post("/api/products").send({
      name: "  Linen Shirt ",
      price: 990,
      categoryId: category.id,
      brandId: "",
      stock: 50, // ignored: stock lives on variants
      attributes: { material: "Linen" },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Linen Shirt", price: "990.00", brandId: null, stock: 0 });

    const imageUrl = "http://localhost:58333/products/products-x/abc-shirt.png";
    const updated = await agent
      .patch(`/api/products/${created.body.id}`)
      .send({ imageUrl: [imageUrl], attributes: { material: "Cotton", fit: "Slim" } });
    expect(updated.status).toBe(200);
    expect(updated.body.imageUrl).toEqual([imageUrl]);
    expect(updated.body.attributes).toEqual({ material: "Cotton", fit: "Slim" });

    const [row] = await db.select().from(schema.products).where((await import("drizzle-orm")).eq(schema.products.id, created.body.id));
    expect(row.imageUrl).toEqual(["products-x/abc-shirt.png"]);

    expect((await agent.post("/api/products").send({ name: "No category", price: 1 })).status).toBe(400);
    expect((await agent.patch(`/api/products/${created.body.id}`).send({})).status).toBe(400);
    expect((await agent.delete(`/api/products/${created.body.id}`)).status).toBe(200);
    expect((await (await newAgent()).get(`/api/products/${created.body.id}`)).status).toBe(404);
    expect((await agent.put(`/api/products/${randomUUID()}`).send({ name: "x" })).status).toBe(404);
  });

  test("variant CRUD with unique SKU; ordered variants cannot be deleted", async () => {
    const { agent } = await loginAs("admin");
    const { product } = await createProduct();
    const sku = `SKU-${randomUUID().slice(0, 8)}`;

    const created = await agent
      .post(`/api/products/${product.id}/variants`)
      .send({ color: "Red", size: "L", sku, stock: 5, price: 120 });
    expect(created.status).toBe(201);
    expect((await agent.post(`/api/products/${product.id}/variants`).send({ color: "Red", size: "XL", sku, stock: 1, price: 1 })).status).toBe(409);

    const put = await agent.put(`/api/products/${product.id}/variants/${created.body.id}`).send({ stock: 9 });
    expect(put.body.stock).toBe(9);
    // Stock edits are audited as movements: +5 initial, +4 adjustment.
    const moves = await db.query.inventoryMovements.findMany({ where: eq(schema.inventoryMovements.variantId, created.body.id) });
    expect(moves.map((m) => [m.reason, m.change]).sort()).toEqual([["admin_adjust", 4], ["admin_initial", 5]]);
    expect(moves.every((m) => m.note?.startsWith("by user "))).toBe(true);
    const patch = await agent.patch(`/api/products/${product.id}/variants/${created.body.id}`).send({ price: 150 });
    expect(patch.body.price).toBe("150.00");
    expect((await agent.patch(`/api/products/${product.id}/variants/${randomUUID()}`).send({ stock: 1 })).status).toBe(404);

    expect((await agent.delete(`/api/products/${product.id}/variants/${created.body.id}`)).status).toBe(204);
    expect((await agent.delete(`/api/products/${product.id}/variants/${created.body.id}`)).status).toBe(404);

    // A variant that appears on an order is kept for order history.
    const sold = await createProduct();
    const { user } = await loginAs("user");
    const order = await createOrder(user.id);
    await db.insert(schema.orderItems).values({
      orderId: order.id,
      productId: sold.product.id,
      variantId: sold.variant.id,
      quantity: 1,
      price: "100.00",
      subtotal: "100.00",
    });
    const refused = await agent.delete(`/api/products/${sold.product.id}/variants/${sold.variant.id}`);
    expect(refused.status).toBe(400);
    expect(refused.body.code).toBe("FOREIGN_KEY_VIOLATION");
  });
});
