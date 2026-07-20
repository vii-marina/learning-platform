import { Router } from "express";
import {
  createAnswerHandler,
  createCourseHandler,
  createModuleHandler,
  createQuestionHandler,
  createTestHandler,
  deleteAnswerHandler,
  deleteCourseHandler,
  deleteModuleHandler,
  deleteQuestionHandler,
  deleteTestHandler,
  reorderLessonBlocksHandler,
  reorderLessonsHandler,
  reorderModulesHandler,
  saveTestQuestionsHandler,
  updateAnswerHandler,
  updateCourseHandler,
  updateModuleHandler,
  updateQuestionHandler,
  updateTestHandler,
} from "../controllers/courseAuthoringController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// courses
router.post("/courses", createCourseHandler);
router.patch("/courses/:courseId", updateCourseHandler);
router.delete("/courses/:courseId", deleteCourseHandler);

// modules
router.post("/modules", createModuleHandler);
router.patch("/modules/:moduleId", updateModuleHandler);
router.delete("/modules/:moduleId", deleteModuleHandler);

// tests
router.post("/tests", createTestHandler);
router.patch("/tests/:testId", updateTestHandler);
router.delete("/tests/:testId", deleteTestHandler);
router.put("/tests/:testId/questions", saveTestQuestionsHandler);

// questions
router.post("/questions", createQuestionHandler);
router.patch("/questions/:questionId", updateQuestionHandler);
router.delete("/questions/:questionId", deleteQuestionHandler);

// answers
router.post("/answers", createAnswerHandler);
router.patch("/answers/:answerId", updateAnswerHandler);
router.delete("/answers/:answerId", deleteAnswerHandler);

// reorder
router.post("/reorder/modules", reorderModulesHandler);
router.post("/reorder/lessons", reorderLessonsHandler);
router.post("/reorder/lesson-blocks", reorderLessonBlocksHandler);

export { router as authoringRoutes };
