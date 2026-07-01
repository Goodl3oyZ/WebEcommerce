// ✅ FIXED: Fully compatible with Node.js ESM and connect-redis v7+

import express from "express";
import { sql } from "drizzle-orm";
import { ENV } from "./src/config/loadENV.js";
import { db } from "./src/config/db.js";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import compression from "compression";
import errorHandler from "./src/middlewares/errorHandler.js";
import session from "express-session";
import passport from "./src/config/passport.js";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import cookieParser from "cookie-parser";
// import { initializeBuckets } from "./src/config/minio.js";
import { createServer } from "http";
import { Server } from "socket.io";

// Import routes
import addressDataRoutes from "./src/routes/addressDataRoutes.js";
import addressRoute from "./src/routes/addressRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import oauthRoutes from "./src/routes/oauthRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import productRoutes from "./src/routes/productRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import brandRoutes from "./src/routes/brandRoutes.js";
import collectionRoutes from "./src/routes/collectionRoutes.js";
import couponRoutes from "./src/routes/couponRoutes.js";
import cartRoutes from "./src/routes/cartRoutes.js";
import wishlistRoutes from "./src/routes/wishlistRoutes.js";
import orderRoutes from "./src/routes/orderRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";
import shippingRoutes from "./src/routes/shippingRoutes.js";
import storeRoutes from "./src/routes/storeRoutes.js";
import loyaltyRoutes from "./src/routes/loyaltyRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import settingsRoutes from "./src/routes/settingsRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import supplierRoutes from "./src/routes/supplierRoutes.js";
import inventoryRoutes from "./src/routes/inventoryRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true, // allow all origins for dev
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Initialize MinIO buckets
// try {
//   await initializeBuckets();
//   console.log("MinIO buckets initialized successfully");
// } catch (error) {
//   console.error("Failed to initialize MinIO buckets:", error);
//   process.exit(1);
// }

const redisClient = createClient({ url: ENV.REDIS.URL });

redisClient.on("error", (err) => console.error("Redis error:", err));
await redisClient.connect(); // ต้อง await ใน top-level หรือใน async IIFE

// สร้าง Redis session store
const store = new RedisStore({
  client: redisClient,
  prefix: "sess:",
  ttl: 7 * 24 * 60 * 60, // Increased from 86400 (24 hours) to 7 days to match cookie maxAge
});

// ใช้งาน session middleware
app.use(
  session({
    store,
    secret: ENV.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // Increased from 24 hours to 7 days
    },
  })
);

// Add cookie parser middleware
app.use(cookieParser());

app.use(passport.initialize());
app.use(passport.session());

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginEmbedderPolicy: false,
  })
);

app.get("/", async (req, res) => {
  res.send("Hello World!");
});

app.get("/api/health", async (req, res) => {
  const health = {
    status: "ok",
    db: "unknown",
    redis: redisClient.isReady ? "ok" : "down",
    minio: "unknown",
  };

  try {
    await db.execute(sql`SELECT 1`);
    health.db = "ok";
  } catch {
    health.status = "degraded";
    health.db = "down";
  }

  try {
    const { default: minioClient } = await import("./src/config/minio.js");
    await minioClient.listBuckets();
    health.minio = "ok";
  } catch {
    health.status = "degraded";
    health.minio = "down";
  }

  if (health.db === "down" || health.redis === "down") {
    health.status = "error";
  }

  const code = health.status === "ok" ? 200 : 503;
  res.status(code).json(health);
});

if (ENV.SERVER.NODE_ENV !== "production") {
  app.get("/api/test-error", (req, res, next) => {
    const err = new Error("🔥 This is a test error");
    err.status = 418;
    next(err);
  });
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 requests per 15 minutes
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(compression());

app.use("/api/auth", authRoutes);
app.use("/oauth", oauthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/addresses", addressRoute);
app.use("/api/uploads", uploadRoutes);
app.use("/api/addressData", addressDataRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reports", reportRoutes);
/** @deprecated use /api/reports — kept for existing frontend clients */
app.use("/api/report", reportRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/notifications", notificationRoutes);

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join public chat
  socket.on("join_public", () => {
    socket.join("public");
  });

  // Join private chat
  socket.on("join_private", (roomId) => {
    socket.join(roomId);
  });

  // Handle public messages
  socket.on("public_message", (message) => {
    io.to("public").emit("new_message", {
      id: Date.now(),
      userId: message.userId,
      username: message.username,
      content: message.content,
      timestamp: new Date(),
    });
  });

  // Handle private messages
  socket.on("private_message", (message) => {
    io.to(message.roomId).emit("new_message", {
      id: Date.now(),
      userId: message.userId,
      username: message.username,
      content: message.content,
      timestamp: new Date(),
    });
  });

  // Handle typing status
  socket.on("typing", (data) => {
    socket.to(data.roomId).emit("user_typing", {
      userId: data.userId,
      username: data.username,
    });
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.use(errorHandler);

const PORT = ENV.SERVER.PORT;
if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
