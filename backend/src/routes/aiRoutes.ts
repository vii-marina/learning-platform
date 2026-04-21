import { Router } from "express";
import {
  generateExerciseDraft,
  generateTestQuestions,
  getExerciseGenerationLimit,
} from "../controllers/aiController";

const router = Router();

router.post("/generate-test-questions", generateTestQuestions);
router.post("/generate-exercise", generateExerciseDraft);
router.post("/exercise-generation-limit", getExerciseGenerationLimit);

export default router;
