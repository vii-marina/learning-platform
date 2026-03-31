import { Router } from "express";
import { generateExerciseDraft, generateTestQuestions } from "../controllers/aiController";

const router = Router();

router.post("/generate-test-questions", generateTestQuestions);
router.post("/generate-exercise", generateExerciseDraft);

export default router;
