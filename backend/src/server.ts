import { createApp } from "./app";
import { env } from "./config/env";
import { getLogLevel, logger } from "./lib/logger";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info("Backend started", {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    logLevel: getLogLevel(),
  });
});

/**
 * Without these two handlers a rejected promise that nobody awaited terminates the
 * process with output that never reaches the log format, so the restart looks
 * spontaneous. Logging first means the reason survives.
 *
 * `uncaughtException` still exits: the process is in an undefined state after one, and
 * pretending otherwise risks serving corrupted responses. The host restarts it.
 */
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { error: reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception, shutting down", { error });
  server.close(() => process.exit(1));
  // Do not wait indefinitely for in-flight requests when the process is already broken.
  setTimeout(() => process.exit(1), 5_000).unref();
});

/**
 * Render sends SIGTERM before replacing an instance. Closing the server first lets
 * in-flight requests finish instead of being cut off mid-response during a deploy.
 */
function shutdown(signal: string) {
  logger.info("Shutting down", { signal });

  server.close(() => {
    logger.info("Server closed cleanly");
    process.exit(0);
  });

  setTimeout(() => {
    logger.warn("Forcing shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
