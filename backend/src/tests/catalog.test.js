import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { loginAs } from "./helpers/factories.js";
import { createBrand, createCategory, createProduct } from "./helpers/fixtures.js";

const name = (prefix) => `${prefix} ${randomUUID().slice(0, 8)}`;

describe("categories", () => {
  test("public reads: list with active product counts, by id, products", async () => {
    const category = await createCategory();
    const { product } = await createProduct({ categoryId: category.id });
    await createProduct({ categoryId: category.id, isActive: false });
    const agent = await newAgent();

    const list = await agent.get("/api/categories");
    expect(list.body.categories.find((c) => c.id === category.id)).toMatchObject({ productCount: 1 });
    expect((await agent.get(`/api/categories/${category.id}`)).body.name).toBe(category.name);
    const products = await agent.get(`/api/categories/${category.id}/products`);
    expect(products.body.products.map((p) => p.id)).toEqual([product.id]);

    expect((await agent.get(`/api/categories/${randomUUID()}`)).status).toBe(404);
    expect((await agent.get(`/api/categories/${randomUUID()}/products`)).status).toBe(404);
    expect((await agent.get("/api/categories/x")).status).toBe(404);
  });

  test("admin create/update/delete with duplicate-name and in-use checks", async () => {
    const { agent } = await loginAs("admin");
    const { agent: customer } = await loginAs("user");
    const first = name("Shoes");

    expect((await customer.post("/api/categories").send({ name: first })).status).toBe(403);
    const created = await agent.post("/api/categories").send({ name: first, description: "All shoes" });
    expect(created.status).toBe(201);
    expect((await agent.post("/api/categories").send({ name: first })).status).toBe(409);

    const other = (await agent.post("/api/categories").send({ name: name("Bags") })).body;
    expect((await agent.put(`/api/categories/${other.id}`).send({ name: first })).status).toBe(409);
    expect((await agent.patch(`/api/categories/${other.id}`).send({ description: "Bags" })).body.description).toBe("Bags");
    expect((await agent.put(`/api/categories/${other.id}`).send({})).status).toBe(400);

    await createProduct({ categoryId: created.body.id });
    expect((await agent.delete(`/api/categories/${created.body.id}`)).status).toBe(400);
    expect((await agent.delete(`/api/categories/${other.id}`)).status).toBe(200);
    expect((await agent.delete(`/api/categories/${other.id}`)).status).toBe(404);
  });
});

describe("brands", () => {
  test("disabled brands are hidden from the public but visible to admins", async () => {
    const active = await createBrand({ name: name("Visible") });
    const disabled = await createBrand({ name: name("Disabled"), isActive: false });
    const anon = await newAgent();
    const { agent: admin } = await loginAs("admin");

    const publicIds = (await anon.get("/api/brands").query({ limit: 100 })).body.brands.map((b) => b.id);
    expect(publicIds).toContain(active.id);
    expect(publicIds).not.toContain(disabled.id);
    expect((await anon.get(`/api/brands/${disabled.id}`)).status).toBe(404);
    expect((await admin.get(`/api/brands/${disabled.id}`)).status).toBe(200);
    expect((await admin.get("/api/brands").query({ search: disabled.name })).body.brands).toHaveLength(1);
  });

  test("GET /:id/products lists the brand's active products", async () => {
    const brand = await createBrand();
    const { product } = await createProduct({ brandId: brand.id });
    await createProduct({ brandId: brand.id, isActive: false });
    const res = await (await newAgent()).get(`/api/brands/${brand.id}/products`);
    expect(res.body.products.map((p) => p.id)).toEqual([product.id]);
  });

  test("admin create/update/delete; logo URLs become storage keys", async () => {
    const { agent } = await loginAs("admin");
    const { agent: customer } = await loginAs("user");
    const brandName = name("Acme");

    expect((await customer.post("/api/brands").send({ name: brandName })).status).toBe(403);
    const created = await agent.post("/api/brands").send({
      name: brandName,
      website: "https://acme.example",
      logo: "http://localhost:58333/brands/brands-x/logo.png",
    });
    expect(created.status).toBe(201);
    expect(created.body.logo).toBe("http://localhost:58333/brands/brands-x/logo.png");
    expect((await agent.post("/api/brands").send({ name: brandName })).status).toBe(409);
    expect((await agent.post("/api/brands").send({ name: name("Bad"), website: "not a url" })).status).toBe(400);

    expect((await agent.put(`/api/brands/${created.body.id}`).send({ description: "Tools" })).body.description).toBe("Tools");
    expect((await agent.patch(`/api/brands/${created.body.id}`).send({ isActive: false })).body.isActive).toBe(false);
    expect((await agent.patch(`/api/brands/${created.body.id}`).send({})).status).toBe(400);

    const inUse = await createBrand();
    await createProduct({ brandId: inUse.id });
    expect((await agent.delete(`/api/brands/${inUse.id}`)).status).toBe(400);
    const deleted = await agent.delete(`/api/brands/${created.body.id}`);
    expect(deleted.body.data.isActive).toBe(false);
    expect((await agent.delete(`/api/brands/${randomUUID()}`)).status).toBe(404);
  });
});

describe("collections", () => {
  test("create with products, read publicly, hide when inactive", async () => {
    const { agent: admin } = await loginAs("admin");
    const a = await createProduct();
    const b = await createProduct();
    const hiddenProduct = await createProduct({ isActive: false });
    const anon = await newAgent();

    const created = await admin.post("/api/collections").send({
      name: name("Summer"),
      products: [a.product.id, b.product.id, a.product.id, hiddenProduct.product.id],
    });
    expect(created.status).toBe(201);
    expect(created.body.products).toHaveLength(3);

    const publicView = await anon.get(`/api/collections/${created.body.id}`);
    expect(publicView.body.products.map((p) => p.id).sort()).toEqual([a.product.id, b.product.id].sort());
    const page = await anon.get(`/api/collections/${created.body.id}/products`).query({ limit: 1 });
    expect(page.body.pagination).toMatchObject({ total: 2, limit: 1 });
    expect((await anon.get("/api/collections").query({ search: created.body.name })).body.collections[0].productCount).toBe(3);

    await admin.put(`/api/collections/${created.body.id}`).send({ isActive: false });
    expect((await anon.get(`/api/collections/${created.body.id}`)).status).toBe(404);
    expect((await anon.get(`/api/collections/${created.body.id}/products`)).status).toBe(404);
    expect((await anon.get("/api/collections").query({ search: created.body.name })).body.collections).toHaveLength(0);
    expect((await admin.get(`/api/collections/${created.body.id}`)).status).toBe(200);
  });

  test("add/remove products without duplicates; update replaces the list; delete keeps products", async () => {
    const { agent } = await loginAs("admin");
    const a = await createProduct();
    const b = await createProduct();
    const collection = (await agent.post("/api/collections").send({ name: name("Sale") })).body;

    const added = await agent.post(`/api/collections/${collection.id}/products`).send({ productIds: [a.product.id, a.product.id] });
    expect(added.body.products).toHaveLength(1);
    const again = await agent.post(`/api/collections/${collection.id}/products`).send({ productIds: [a.product.id, b.product.id] });
    expect(again.body.products).toHaveLength(2);
    expect((await agent.post(`/api/collections/${collection.id}/products`).send({ productIds: [randomUUID()] })).status).toBe(404);

    const removed = await agent.delete(`/api/collections/${collection.id}/products`).send({ productIds: [a.product.id] });
    expect(removed.body.products.map((p) => p.id)).toEqual([b.product.id]);

    const replaced = await agent.put(`/api/collections/${collection.id}`).send({ products: [a.product.id] });
    expect(replaced.body.products.map((p) => p.id)).toEqual([a.product.id]);
    expect((await agent.put(`/api/collections/${collection.id}`).send({ image: "x" })).status).toBe(400);

    expect((await agent.delete(`/api/collections/${collection.id}`)).status).toBe(200);
    expect((await (await newAgent()).get(`/api/products/${a.product.id}`)).status).toBe(200);
    expect((await agent.delete(`/api/collections/${collection.id}`)).status).toBe(404);
  });

  test("management is admin-only", async () => {
    const { agent } = await loginAs("user");
    const id = randomUUID();
    for (const [method, path] of [
      ["post", "/api/collections"],
      ["put", `/api/collections/${id}`],
      ["delete", `/api/collections/${id}`],
      ["post", `/api/collections/${id}/products`],
      ["delete", `/api/collections/${id}/products`],
    ]) {
      expect((await agent[method](path).send({ name: "x", productIds: [id] })).status).toBe(403);
    }
  });
});
