/**
 * End-to-end payment check against the real Omise API in TEST mode.
 *
 *   npm run test:infra:up   (once; the test database, Redis and storage)
 *   npm run omise:check
 *
 * Runs the real app against the test database (never the dev one), with the
 * Omise test keys from backend/.env. Cards are tokenized like Omise.js does,
 * PromptPay charges are settled with Omise's test-mode mark_as_paid /
 * mark_as_failed, and the webhook is called locally with the event Omise
 * would send (the handler re-reads the charge from Omise, so it is real).
 * Refuses to run with live keys.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { OMISE_PUBLIC_KEY: pk, OMISE_SECRET_KEY: sk } = dotenv.parse(fs.readFileSync(path.join(root, ".env")));
if (!pk?.startsWith("pkey_test_") || !sk?.startsWith("skey_test_")) {
  console.error("Put Omise TEST keys (pkey_test_… / skey_test_…) in backend/.env. Live keys are refused.");
  process.exit(1);
}

const { applyTestEnv } = await import("../src/tests/testEnv.js");
applyTestEnv();
Object.assign(process.env, { OMISE_PUBLIC_KEY: pk, OMISE_SECRET_KEY: sk });

const { default: supertest } = await import("supertest");
const { app } = await import("../src/app.js");
const { createUser, DEFAULT_PASSWORD } = await import("../src/tests/helpers/factories.js");
const { checkoutSetup, getVariantStock } = await import("../src/tests/helpers/fixtures.js");
const { db } = await import("../src/config/db.js");
const schema = await import("../src/models/schema.js");
const { eq } = await import("drizzle-orm");

const omise = async (url, key, body) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body && JSON.stringify(body),
  });
  return res.json();
};
const cardToken = async (number) => {
  const t = await omise("https://vault.omise.co/tokens", pk, {
    card: { name: "QA TEST", number, expiration_month: 12, expiration_year: new Date().getFullYear() + 3, security_code: "123" },
  });
  if (t.object === "error") throw new Error(`token: ${t.message}`);
  return t.id;
};

let ip = 0;
async function signIn(role = "user") {
  const user = await createUser({ role });
  const agent = supertest.agent(app);
  agent.set("X-Forwarded-For", `10.250.0.${++ip}`);
  const res = await agent.post("/api/auth/login").send({ email: user.email, password: DEFAULT_PASSWORD });
  if (res.status !== 200) throw new Error(`login ${res.status}`);
  return { agent, user };
}
const orderRow = (id) => db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
const paymentOf = async (orderId) =>
  (await db.select().from(schema.paymentTransactions).where(eq(schema.paymentTransactions.orderId, orderId)))[0];
const webhook = (agent, chargeId) =>
  agent.post("/api/payments/webhook/omise").send({ object: "event", key: "charge.complete", data: { object: "charge", id: chargeId } });

const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
  } catch (error) {
    results.push({ name, ok: false, detail: error.message });
  }
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const { agent: admin } = await signIn("admin");

await check("card 4242: checkout pays the order", async () => {
  const { agent, user } = await signIn();
  const setup = await checkoutSetup(user, { price: "100.00" });
  const res = await agent.post("/api/orders/checkout").send(setup.body({ omiseToken: await cardToken("4242424242424242") }));
  expect(res.status === 201, `checkout ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
  const order = await orderRow(res.body.data.id);
  expect(order.status === "paid" && order.paymentStatus === "completed", `order ${order.status}/${order.paymentStatus}`);
  const payment = await paymentOf(order.id);
  expect(payment.transactionId?.startsWith("chrg_test_"), "no Omise charge id");

  const refund = await admin.post(`/api/payments/${payment.id}/refund`).send({ reason: "omise live check" });
  expect(refund.status < 300, `refund ${refund.status} ${JSON.stringify(refund.body).slice(0, 200)}`);
  const after = await orderRow(order.id);
  expect(after.status === "refunded", `after refund ${after.status}/${after.paymentStatus}`);
  return `${payment.transactionId} paid ฿${order.total}, refunded`;
});

await check("card 4111…0011: insufficient funds is declined, stock comes back", async () => {
  const { agent, user } = await signIn();
  const setup = await checkoutSetup(user, { stock: 3 });
  const res = await agent.post("/api/orders/checkout").send(setup.body({ omiseToken: await cardToken("4111111111140011") }));
  expect(res.status === 402 && res.body.code === "PAYMENT_DECLINED", `got ${res.status} ${res.body.code}`);
  expect((await getVariantStock(setup.variant.id)) === 3, "stock not released");
  return res.body.message;
});

await check("PromptPay: real QR, paid in Omise, webhook marks the order paid", async () => {
  const { agent, user } = await signIn();
  const setup = await checkoutSetup(user, { paymentCode: "promptpay" });
  const res = await agent.post("/api/orders/checkout").send(setup.body());
  expect(res.status === 201, `checkout ${res.status}`);
  const qr = res.body.data.charge?.qrCodeUrl;
  expect(qr?.startsWith("https://"), "no QR url");
  const payment = await paymentOf(res.body.data.id);
  const paid = await omise(`https://api.omise.co/charges/${payment.transactionId}/mark_as_paid`, sk);
  expect(paid.status === "successful", `mark_as_paid: ${paid.message ?? paid.status}`);
  const hook = await webhook(agent, payment.transactionId);
  expect(hook.body.handled === true, `webhook ${JSON.stringify(hook.body)}`);
  const order = await orderRow(res.body.data.id);
  expect(order.status === "paid", `order ${order.status}/${order.paymentStatus}`);
  return `${payment.transactionId} QR ok, paid via webhook`;
});

await check("PromptPay: failed in Omise, the status check sees it and the order stays payable", async () => {
  const { agent, user } = await signIn();
  const setup = await checkoutSetup(user, { paymentCode: "promptpay", stock: 2 });
  const res = await agent.post("/api/orders/checkout").send(setup.body());
  const payment = await paymentOf(res.body.data.id);
  const failed = await omise(`https://api.omise.co/charges/${payment.transactionId}/mark_as_failed`, sk);
  expect(failed.status === "failed", `mark_as_failed: ${failed.message ?? failed.status}`);
  // No webhook this time: the page's status check asks Omise itself.
  const status = await agent.get(`/api/payments/${payment.id}/status`);
  expect(status.body.status === "failed", `payment ${status.body.status}`);
  // Like a declined card: the customer may pay again until the deadline,
  // when the payment worker cancels it and returns the stock.
  const order = await orderRow(res.body.data.id);
  expect(order.status === "pending" && order.paymentStatus === "failed", `order ${order.status}/${order.paymentStatus}`);
  return `payment failed, order still payable until its deadline`;
});

await check("retry by card from the order page (cardToken reaches the API)", async () => {
  const { agent, user } = await signIn();
  const setup = await checkoutSetup(user, { paymentCode: "promptpay" });
  const res = await agent.post("/api/orders/checkout").send(setup.body());
  const pay = await agent
    .post("/api/payments")
    .send({ orderId: res.body.data.id, method: "credit_card", cardToken: await cardToken("4242424242424242") });
  expect(pay.status === 201, `pay ${pay.status} ${JSON.stringify(pay.body).slice(0, 200)}`);
  const order = await orderRow(res.body.data.id);
  expect(order.paymentStatus === "completed", `order ${order.status}/${order.paymentStatus}`);
  return `paid by card after choosing PromptPay`;
});

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}\n      ${r.detail}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} failed` : "\nAll Omise checks passed");
process.exit(failed ? 1 : 0);
