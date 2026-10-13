import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { loginAs } from "./helpers/factories.js";
import { checkoutSetup, createProduct, getVariantStock } from "./helpers/fixtures.js";

const { db } = await import("../config/db.js");
const schema = await import("../models/schema.js");
const { eq } = await import("drizzle-orm");

const add = (agent, { product, variant }, quantity = 1) =>
  agent.post("/api/cart/items").send({ productId: product.id, variantId: variant.id, quantity });

describe("cart", () => {
  test("GET /api/cart creates an empty cart on first use", async () => {
    const { agent } = await loginAs("user");
    const res = await agent.get("/api/cart");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], subtotal: 0 });
  });

  test("POST /items adds and merges lines, checking stock", async () => {
    const { agent } = await loginAs("user");
    const item = await createProduct({ price: "120.50", stock: 3 });

    expect((await add(agent, item, 2)).status).toBe(200);
    const merged = await add(agent, item, 1);
    expect(merged.body.items).toHaveLength(1);
    expect(merged.body.items[0]).toMatchObject({ quantity: 3, price: "120.50", inStock: true });
    expect(merged.body.subtotal).toBe(361.5);

    const over = await add(agent, item, 1);
    expect(over.status).toBe(409);
    expect(over.body.code).toBe("INSUFFICIENT_STOCK");
  });

  test("POST /items rejects missing variants, inactive products and bad quantities", async () => {
    const { agent } = await loginAs("user");
    const item = await createProduct();
    const inactive = await createProduct({ isActive: false });

    expect((await agent.post("/api/cart/items").send({ productId: item.product.id, variantId: null, quantity: 1 })).status).toBe(400);
    expect((await add(agent, inactive)).status).toBe(404);
    expect((await add(agent, item, 0)).status).toBe(400);
    expect((await add(agent, item, 1.5)).status).toBe(400);
    expect(
      (await agent.post("/api/cart/items").send({ productId: randomUUID(), variantId: item.variant.id, quantity: 1 })).status
    ).toBe(404);
  });

  test("prices always come from the catalogue, and changes are flagged", async () => {
    const { agent } = await loginAs("user");
    const item = await createProduct({ price: "100.00" });
    await add(agent, item, 2);
    await db.update(schema.productVariants).set({ price: "80.00" }).where(eq(schema.productVariants.id, item.variant.id));

    const res = await agent.get("/api/cart");
    expect(res.body.items[0]).toMatchObject({ price: "80.00", priceChanged: true });
    expect(res.body.subtotal).toBe(160);
  });

  test("PUT /items/:itemId updates quantity within stock; other users' items are 404", async () => {
    const { agent } = await loginAs("user");
    const { agent: stranger } = await loginAs("user");
    const item = await createProduct({ stock: 5 });
    const itemId = (await add(agent, item)).body.items[0].id;

    expect((await agent.put(`/api/cart/items/${itemId}`).send({ quantity: 4 })).body.items[0].quantity).toBe(4);
    expect((await agent.put(`/api/cart/items/${itemId}`).send({ quantity: 6 })).status).toBe(409);
    expect((await stranger.put(`/api/cart/items/${itemId}`).send({ quantity: 1 })).status).toBe(404);
    expect((await agent.put("/api/cart/items/nope").send({ quantity: 1 })).status).toBe(404);
  });

  test("DELETE /items/:itemId removes one line; DELETE /items clears (idempotently)", async () => {
    const { agent } = await loginAs("user");
    const a = await createProduct();
    const b = await createProduct();
    await add(agent, a);
    const cart = (await add(agent, b)).body;

    const removed = await agent.delete(`/api/cart/items/${cart.items[0].id}`);
    expect(removed.body.items).toHaveLength(1);
    expect((await agent.delete(`/api/cart/items/${cart.items[0].id}`)).status).toBe(404);

    expect((await agent.delete("/api/cart/items")).status).toBe(204);
    expect((await agent.delete("/api/cart/items")).status).toBe(204);
    expect((await agent.get("/api/cart")).body.items).toHaveLength(0);
  });

  test("POST /merge ignores client prices and caps quantities at stock", async () => {
    const { agent } = await loginAs("user");
    const item = await createProduct({ price: "300.00", stock: 2 });
    const gone = await createProduct({ stock: 0 });

    const res = await agent.post("/api/cart/merge").send({
      items: [
        { productId: item.product.id, variantId: item.variant.id, quantity: 5, price: 1 },
        { productId: gone.product.id, variantId: gone.variant.id, quantity: 1, price: 1 },
        { productId: randomUUID(), variantId: randomUUID(), quantity: 1, price: 1 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ quantity: 2, price: "300.00" });
    expect(res.body.skipped).toHaveLength(2);
    expect(res.body.limited).toEqual([
      { productId: item.product.id, variantId: item.variant.id, requested: 5, quantity: 2 },
    ]);
  });

  test("POST /merge keeps the larger quantity of a product already in the cart, so it never doubles", async () => {
    const { agent } = await loginAs("user");
    const shoe = await createProduct({ stock: 10 });
    const sock = await createProduct({ stock: 10 });
    await add(agent, shoe, 2);
    const line = (p, quantity) => ({ productId: p.product.id, variantId: p.variant.id, quantity });

    const once = await agent.post("/api/cart/merge").send({ items: [line(shoe, 1), line(sock, 3)] });
    const quantities = (body) => Object.fromEntries(body.items.map((i) => [i.variantId, i.quantity]));
    expect(quantities(once.body)).toEqual({ [shoe.variant.id]: 2, [sock.variant.id]: 3 });

    const again = await agent.post("/api/cart/merge").send({ items: [line(shoe, 1), line(sock, 3)] });
    expect(quantities(again.body)).toEqual(quantities(once.body));
  });

  test("POST /checkout places an order for the whole cart", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { price: "100.00", stock: 5 });
    await add(agent, setup, 2);

    const { shippingAddressId, shippingMethodId, paymentMethodId, omiseToken } = setup.body();
    const res = await agent
      .post("/api/cart/checkout")
      .send({ shippingAddressId, shippingMethodId, paymentMethodId, omiseToken });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ subtotal: "200.00", status: "paid" });
    expect(await getVariantStock(setup.variant.id)).toBe(3);
    expect((await agent.get("/api/cart")).body.items).toHaveLength(0);

    const empty = await agent
      .post("/api/cart/checkout")
      .send({ shippingAddressId, shippingMethodId, paymentMethodId, omiseToken });
    expect(empty.status).toBe(400);
  });

  test("cart routes require authentication", async () => {
    const agent = await newAgent();
    for (const [method, path] of [
      ["get", "/api/cart"],
      ["post", "/api/cart/items"],
      ["delete", "/api/cart/items"],
      ["post", "/api/cart/checkout"],
      ["post", "/api/cart/merge"],
    ]) {
      expect((await agent[method](path)).status).toBe(401);
    }
  });
});
