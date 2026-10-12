import { jest } from "@jest/globals";
import { newAgent } from "./helpers/app.js";
import { loginAs } from "./helpers/factories.js";
import { createOrder } from "./helpers/fixtures.js";

const { omiseService } = await import("../services/omiseService.js");

beforeEach(() => jest.clearAllMocks());

describe("POST /api/payments", () => {
  test("charges the server-side order total, ignoring the client amount", async () => {
    const { agent, user } = await loginAs("user");
    const order = await createOrder(user.id, { total: "1234.50" });

    const res = await agent.post("/api/payments").send({
      orderId: order.id,
      method: "promptpay",
      amount: 1, // tampered client value
      currency: "USD",
    });

    expect(res.status).toBe(201);
    expect(omiseService.createCharge).toHaveBeenCalledTimes(1);
    expect(omiseService.createCharge.mock.calls[0][0]).toMatchObject({
      amount: 123450,
      currency: "thb",
    });
    expect(Number(res.body.data.payment.amount)).toBe(1234.5);
  });

  test("works without amount/currency in the body", async () => {
    const { agent, user } = await loginAs("user");
    const order = await createOrder(user.id, { total: "99.99" });

    const res = await agent
      .post("/api/payments")
      .send({ orderId: order.id, method: "promptpay" });

    expect(res.status).toBe(201);
    expect(omiseService.createCharge.mock.calls[0][0].amount).toBe(9999);
  });

  test("returns 404 for another user's order and charges nothing", async () => {
    const { agent } = await loginAs("user");
    const { user: other } = await loginAs("user");
    const order = await createOrder(other.id);

    const res = await agent
      .post("/api/payments")
      .send({ orderId: order.id, method: "promptpay" });

    expect(res.status).toBe(404);
    expect(omiseService.createCharge).not.toHaveBeenCalled();
  });

  test("returns 409 for an order that is already paid", async () => {
    const { agent, user } = await loginAs("user");
    const order = await createOrder(user.id, { paymentStatus: "completed" });

    const res = await agent
      .post("/api/payments")
      .send({ orderId: order.id, method: "promptpay" });

    expect(res.status).toBe(409);
    expect(omiseService.createCharge).not.toHaveBeenCalled();
  });

  test("requires authentication", async () => {
    const agent = await newAgent();
    const res = await agent.post("/api/payments").send({});
    expect(res.status).toBe(401);
  });
});
