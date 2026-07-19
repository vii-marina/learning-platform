import { Router } from "express";
import {
  generateExerciseDraft,
  generateTestQuestions,
  getExerciseGenerationLimit,
} from "../controllers/aiController";
import { requireAuth } from "../middleware/auth";
import { requireTeacherOrAdmin } from "../middleware/requireRole";

const router = Router();

router.use(requireAuth);
router.use(requireTeacherOrAdmin);

router.post("/generate-test-questions", generateTestQuestions);
router.post("/generate-exercise", generateExerciseDraft);
router.post("/exercise-generation-limit", getExerciseGenerationLimit);

export default router;
