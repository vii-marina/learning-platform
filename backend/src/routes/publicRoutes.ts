import { Router } from "express";
import { getPublicLandingPreviewHandler } from "../controllers/publicLandingController";

const router = Router();

router.get("/landing-preview", getPublicLandingPreviewHandler);

export { router as publicRoutes };
