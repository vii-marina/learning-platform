import { Router } from "express";
import {
  getMeHandler,
  registerProfileHandler,
  updateMeHandler,
} from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/register-profile", requireAuth, registerProfileHandler);
router.get("/me", requireAuth, getMeHandler);
router.patch("/me", requireAuth, updateMeHandler);

export { router as authRoutes };
