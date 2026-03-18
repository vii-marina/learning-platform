import { Router } from "express";
import { getMeHandler, registerProfileHandler } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/register-profile", requireAuth, registerProfileHandler);
router.get("/me", requireAuth, getMeHandler);

export { router as authRoutes };
