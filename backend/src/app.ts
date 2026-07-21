import cors from "cors";
import express from "express";
import type { CorsOptions } from "cors";
import { env } from "./config/env";
import { AppError } from "./lib/appError";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFound";
import { globalRateLimiter } from "./middleware/rateLimit";
import { adminRoutes } from "./routes/adminRoutes";
import { authRoutes } from "./routes/authRoutes";
import { authoringRoutes } from "./routes/authoringRoutes";
import { exerciseRoutes } from "./routes/exerciseRoutes";
import { healthRoutes } from "./routes/healthRoutes";
import { publicRoutes } from "./routes/publicRoutes";
import aiRoutes from "./routes/aiRoutes";

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  return env.corsOrigins.includes("*") || env.corsOrigins.includes(origin);
}

export function createApp() {
  const app = express();
  // Behind Render/Vercel's single proxy — trust the first hop so `req.ip` is the
  // real client IP (required for correct IP-based rate limiting).
  app.set("trust proxy", 1);
  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(
        new AppError(
          403,
          `Origin ${origin ?? "unknown"} is not allowed by CORS.`,
          "CORS_ORIGIN_NOT_ALLOWED"
        )
      );
    },
  };

  app.use(cors(corsOptions));
  // 1mb (up from the 100kb default) headroom for bulk authoring payloads (whole-test save).
  app.use(express.json({ limit: "1mb" }));

  app.use(healthRoutes); // health checks stay unthrottled
  app.use(globalRateLimiter);
  app.use("/public", publicRoutes);
  app.use("/auth", authRoutes);
  app.use("/authoring", authoringRoutes);
  app.use("/admin", adminRoutes);
  app.use("/api", exerciseRoutes);
  app.use("/api/ai", aiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
