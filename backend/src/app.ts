import cors from "cors";
import express from "express";
import type { CorsOptions } from "cors";
import { env } from "./config/env";
import { AppError } from "./lib/appError";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFound";
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
  app.use(express.json());

  app.use(healthRoutes);
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
