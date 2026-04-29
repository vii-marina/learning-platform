import { Router } from "express";
import {
  createLessonBlockHandler,
  createModuleLessonHandler,
  deleteLessonBlockHandler,
  deleteLessonHandler,
  listLessonBlocksHandler,
  listModuleContentHandler,
  listModuleLessonsHandler,
  updateLessonBlockHandler,
  updateLessonHandler,
} from "../controllers/courseBuilderController";
import {
  getMeHandler as getMeProfileHandler,
  registerProfileHandler,
  updateMeHandler,
} from "../controllers/authController";
import {
  listStudentDashboardCoursesHandler,
  listStudentDashboardPublicCoursesHandler,
} from "../controllers/studentDashboardCoursesController";
import { listTeacherDashboardCoursesHandler } from "../controllers/teacherDashboardCoursesController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/register-profile", requireAuth, registerProfileHandler);
router.get("/me", requireAuth, getMeProfileHandler);
router.patch("/me", requireAuth, updateMeHandler);
router.get("/student/dashboard/courses", requireAuth, listStudentDashboardCoursesHandler);
router.get("/student/dashboard/public-courses", requireAuth, listStudentDashboardPublicCoursesHandler);
router.get("/teacher/dashboard/courses", requireAuth, listTeacherDashboardCoursesHandler);
router.get("/course-builder/modules/:moduleId/content", requireAuth, listModuleContentHandler);
router.get("/course-builder/modules/:moduleId/lessons", requireAuth, listModuleLessonsHandler);
router.post("/course-builder/modules/:moduleId/lessons", requireAuth, createModuleLessonHandler);
router.patch("/course-builder/lessons/:lessonId", requireAuth, updateLessonHandler);
router.delete("/course-builder/lessons/:lessonId", requireAuth, deleteLessonHandler);
router.get("/course-builder/lessons/:lessonId/blocks", requireAuth, listLessonBlocksHandler);
router.post("/course-builder/lessons/:lessonId/blocks", requireAuth, createLessonBlockHandler);
router.patch("/course-builder/lesson-blocks/:lessonBlockId", requireAuth, updateLessonBlockHandler);
router.delete("/course-builder/lesson-blocks/:lessonBlockId", requireAuth, deleteLessonBlockHandler);

export { router as authRoutes };
