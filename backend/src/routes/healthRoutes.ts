import { Router } from "express";
import { getHealth, getMetrics, getReadiness } from "../controllers/healthController";
import { requireAuth } from "../middleware/auth";
import { globalRateLimiter } from "../middleware/rateLimit";
import { requireAdmin } from "../middleware/requireRole";

const router = Router();

router.get("/health", getHealth);
router.get("/health/ready", getReadiness);
// Unlike the two checks above, this one is not for the platform's prober — it describes
// traffic, so it is gated. It also carries the rate limiter explicitly: this router is
// mounted ahead of the global one so the probes stay unthrottled, and an unauthenticated
// caller must not be able to make this route hit Supabase in a loop just by failing auth.
router.get("/health/metrics", globalRateLimiter, requireAuth, requireAdmin, getMetrics);

export { router as healthRoutes };
