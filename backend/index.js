import { ENV } from "./src/config/loadENV.js";
import { app, httpServer, io, redisClient } from "./src/app.js";

const PORT = ENV.SERVER.PORT;
if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful shutdown so in-flight requests finish during deploys/restarts.
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down gracefully...`);

    const forceExit = setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    // Closes socket connections and the underlying HTTP server.
    io.close(async () => {
      try {
        await redisClient.quit();
      } catch (err) {
        console.error("Error closing Redis connection:", err);
      }
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

export { app };
