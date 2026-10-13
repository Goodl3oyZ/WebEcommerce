import { newAgent } from "./helpers/app.js";

describe("GET /api/health", () => {
  test("reports database, Redis and storage as ok", async () => {
    const agent = await newAgent();
    const res = await agent.get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "ok", redis: "ok", minio: "ok" });
  });
});

describe("CORS", () => {
  // The storefront runs on another origin in development: every header it
  // sends must pass the browser's preflight, or the request never leaves.
  test("checkout's preflight allows the Idempotency-Key header", async () => {
    const res = await (await newAgent())
      .options("/api/orders/checkout")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,idempotency-key");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-headers"].toLowerCase()).toContain("idempotency-key");
  });
});
