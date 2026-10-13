import express from "express";
import { sql } from "drizzle-orm";
import { ENV } from "./config/loadENV.js";
import { db } from "./config/db.js";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import compression from "compression";
import errorHandler from "./middlewares/errorHandler.js";
import session from "express-session";
import passport from "./config/passport.js";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import cookieParser from "cookie-parser";
// import { initializeBuckets } from "./config/minio.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupRealtime } from "./realtime/index.js";

import swaggerUi from "swagger-ui-express";
import { routeModules } from "./routes/index.js";
import { swaggerSpec } from "./config/swagger.js";

const isProduction = ENV.SERVER.NODE_ENV === "production";

// In production only the configured origins may make credentialed requests;
// in development any origin is reflected for convenience.
const corsOrigin = isProduction ? ENV.SERVER.ALLOWED_ORIGINS : true;

const app = express();
app.disable("x-powered-by");
if (ENV.SERVER.TRUST_PROXY > 0) {
  // Required behind a reverse proxy so req.secure / req.ip are correct
  // (secure session cookies and per-IP rate limiting depend on it).
  app.set("trust proxy", ENV.SERVER.TRUST_PROXY);
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
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
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      // Sent by checkout so a retried request cannot create a second order.
      "Idempotency-Key",
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
    const { default: minioClient } = await import("./config/minio.js");
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

if (ENV.SERVER.NODE_ENV !== "test") {
  app.use(morgan(isProduction ? "combined" : "dev"));
}
// Articles carry editor HTML; everything else keeps the small default limit.
app.use("/api/content/admin", express.json({ limit: "300kb" }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(compression());

// Swagger API Documentation UI.
// In production it is disabled unless SWAGGER_ENABLED=true, and then requires
// SWAGGER_USER / SWAGGER_PASS basic auth (no default credentials).
const swaggerEnabled = !isProduction || process.env.SWAGGER_ENABLED === "true";
if (swaggerEnabled) {
  if (isProduction) {
    const swaggerUser = process.env.SWAGGER_USER;
    const swaggerPass = process.env.SWAGGER_PASS;
    if (!swaggerUser || !swaggerPass) {
      throw new Error(
        "SWAGGER_USER and SWAGGER_PASS are required when SWAGGER_ENABLED=true in production"
      );
    }
    app.use("/api-docs", (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Basic ")) {
        const credentials = Buffer.from(authHeader.split(" ")[1], "base64").toString("utf-8");
        const separator = credentials.indexOf(":");
        const user = credentials.slice(0, separator);
        const pass = credentials.slice(separator + 1);
        if (separator !== -1 && user === swaggerUser && pass === swaggerPass) {
          return next();
        }
      }
      res.setHeader("WWW-Authenticate", 'Basic realm="Swagger Docs"');
      return res.status(401).send("Authentication required");
    });
  }

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "WebEcommerce API Documentation",
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );
}


for (const [mountPath, router] of routeModules) {
  app.use(mountPath, router);
}

// WebSockets: authenticated, used to push support-chat updates.
setupRealtime(io);

app.use(errorHandler);

export { app, httpServer, io, redisClient };
