import { jest } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recordedRequests } from "./helpers/recorder.js";
import { closeApp, isAppLoaded } from "./helpers/app.js";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// --- External services are mocked in every test file ---------------------
// Omise: charges succeed by default; tests can override per call.
jest.unstable_mockModule("../services/omiseService.js", () => ({
  omiseService: {
    createCharge: jest.fn(async ({ amount, currency, source, card, metadata }) => ({
      id: `chrg_test_${Math.random().toString(36).slice(2, 10)}`,
      object: "charge",
      status: "successful",
      paid: true,
      amount,
      currency,
      metadata,
      source: source ? { id: source, scannable_code: { image: { download_uri: "https://example.test/qr.png" } } } : null,
      card: card ? { id: "card_test" } : null,
    })),
    createSource: jest.fn(async ({ type, amount, currency }) => ({
      id: `src_test_${Math.random().toString(36).slice(2, 10)}`,
      type,
      amount,
      currency,
    })),
    createRefund: jest.fn(async (chargeId, amount) => ({
      id: `rfnd_test_${Math.random().toString(36).slice(2, 10)}`,
      charge: chargeId,
      amount,
    })),
    getCharge: jest.fn(async (chargeId) => ({ id: chargeId, status: "successful", paid: true })),
    createToken: jest.fn(async () => ({ id: "tokn_test" })),
  },
}));

// Email: captured instead of sent. Tests read `sentEmails` to get links/tokens.
jest.unstable_mockModule("../utils/email.js", () => ({
  sendEmail: jest.fn(async (message) => {
    globalThis.sentEmails = [...(globalThis.sentEmails ?? []), message];
    return { messageId: "test" };
  }),
}));

// --- Route coverage --------------------------------------------------------
// After each test file, map the requests it made onto route patterns and
// save them; globalTeardown merges the files and enforces the baseline.
afterAll(async () => {
  if (isAppLoaded()) await closeApp();
  if (recordedRequests.length === 0) return;
  const { routeModules } = await import("../routes/index.js");
  const { listRoutes, matchRoute } = await import("../utils/routeRegistry.js");
  const routes = listRoutes(routeModules);
  const hit = new Set();
  for (const { method, url } of recordedRequests) {
    const route = matchRoute(routes, method, url);
    if (route) hit.add(`${route.method} ${route.path}`);
  }
  const dir = path.join(backendRoot, "coverage", "route-hits");
  fs.mkdirSync(dir, { recursive: true });
  const testFile = path.basename(expect.getState().testPath ?? "unknown");
  fs.writeFileSync(path.join(dir, `${testFile}.json`), JSON.stringify([...hit]));
});
