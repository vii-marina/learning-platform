import { Router } from "express";
import { generateTestQuestions } from "../controllers/aiController";

const router = Router();

router.post("/generate-test-questions", generateTestQuestions);

export default router;