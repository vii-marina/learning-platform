import { Router } from "express";
import {
  createLessonBlockHandler,
  createModuleLessonHandler,
  deleteLessonBlockHandler,
  deleteLessonHandler,
  listLessonBlocksHandler,
  listModuleLessonsHandler,
  updateLessonBlockHandler,
  updateLessonHandler,
} from "../controllers/courseBuilderController";
import {
  getMeHandler as getMeProfileHandler,
  registerProfileHandler,
  updateMeHandler,
} from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/register-profile", requireAuth, registerProfileHandler);
router.get("/me", requireAuth, getMeProfileHandler);
router.patch("/me", requireAuth, updateMeHandler);
router.get("/course-builder/modules/:moduleId/lessons", requireAuth, listModuleLessonsHandler);
router.post("/course-builder/modules/:moduleId/lessons", requireAuth, createModuleLessonHandler);
router.patch("/course-builder/lessons/:lessonId", requireAuth, updateLessonHandler);
router.delete("/course-builder/lessons/:lessonId", requireAuth, deleteLessonHandler);
router.get("/course-builder/lessons/:lessonId/blocks", requireAuth, listLessonBlocksHandler);
router.post("/course-builder/lessons/:lessonId/blocks", requireAuth, createLessonBlockHandler);
router.patch("/course-builder/lesson-blocks/:lessonBlockId", requireAuth, updateLessonBlockHandler);
router.delete("/course-builder/lesson-blocks/:lessonBlockId", requireAuth, deleteLessonBlockHandler);

export { router as authRoutes };
