import express from "express";
import supertest from "supertest";
import { recordedRequests } from "./recorder.js";

let wrapped;

export const isAppLoaded = () => Boolean(wrapped);

/**
 * Load the real app once per test file (after mocks are registered) and wrap
 * it with a recorder for route coverage.
 */
export async function getApp() {
  if (!wrapped) {
    const { app } = await import("../../app.js");
    wrapped = express();
    wrapped.use((req, res, next) => {
      recordedRequests.push({ method: req.method, url: req.originalUrl });
      next();
    });
    wrapped.use(app);
  }
  return wrapped;
}

let ipCounter = 0;
const nextIp = () => {
  ipCounter += 1;
  const workerId = Number(process.env.JEST_WORKER_ID ?? 1);
  return `10.${workerId}.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
};

/**
 * A cookie-keeping agent with its own client IP (isolated rate limits).
 * Every request is sent with the X-Forwarded-For header for that IP.
 */
export async function newAgent() {
  const app = await getApp();
  const agent = supertest.agent(app);
  agent.set("X-Forwarded-For", nextIp());
  return agent;
}

/** Close connections opened by the app so Jest can exit cleanly. */
export async function closeApp() {
  const { redisClient, io } = await import("../../app.js");
  const { redis } = await import("../../config/redis.js");
  const { db } = await import("../../config/db.js");
  io.close();
  await Promise.allSettled([
    redisClient.isOpen && redisClient.quit(),
    redis.isOpen && redis.quit(),
    db.$client?.end(),
  ]);
}
