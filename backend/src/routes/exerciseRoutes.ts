import { Router } from "express";
import {
  createExerciseHandler,
  deleteExerciseHandler,
  listModuleExercisesHandler,
  updateExerciseHandler,
} from "../controllers/exerciseController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/modules/:moduleId/exercises", requireAuth, listModuleExercisesHandler);
router.post("/exercises", requireAuth, createExerciseHandler);
router.patch("/exercises/:exerciseId", requireAuth, updateExerciseHandler);
router.delete("/exercises/:exerciseId", requireAuth, deleteExerciseHandler);

export { router as exerciseRoutes };
