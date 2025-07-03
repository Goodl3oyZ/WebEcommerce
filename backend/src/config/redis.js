import { createClient } from "redis";
import { ENV } from "./loadENV.js";

const redisClient = createClient({
  url: ENV.REDIS.URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("Max Redis reconnection attempts reached");
        return new Error("Max Redis reconnection attempts reached");
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("Redis Client Connected");
});

redisClient.on("reconnecting", () => {
  console.log("Redis Client Reconnecting...");
});

const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err) {
    console.error("Redis Connection Error:", err);
  }
};

connectRedis();

export const getRedisClient = () => {
  if (!redisClient.isOpen) {
    throw new Error("Redis client is not connected");
  }
  return redisClient;
};

export const redis = redisClient;
