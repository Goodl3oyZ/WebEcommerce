import { newAgent } from "./helpers/app.js";

describe("GET /api/health", () => {
  test("reports database, Redis and storage as ok", async () => {
    const agent = await newAgent();
    const res = await agent.get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "ok", redis: "ok", minio: "ok" });
  });
});
