import { Router } from "express";
import {
  getAdminDashboardOverviewHandler,
  getAdminDashboardTeacherHandler,
  listAdminDashboardStudentsHandler,
  listAdminDashboardTeachersHandler,
} from "../controllers/adminDashboardController";
import {
  getAdminDashboardCourseHandler,
  listAdminDashboardCoursesHandler,
} from "../controllers/adminDashboardCoursesController";
import {
  listStudentsHandler,
  listTeachersHandler,
  listUsersHandler,
  updateUserHandler,
} from "../controllers/adminController";
import { requireAuth } from "../middleware/auth";
import { requireAdmin, requireSuperAdmin } from "../middleware/requireRole";

const router = Router();

router.use(requireAuth);

router.get("/dashboard/overview", requireAdmin, getAdminDashboardOverviewHandler);
router.get("/dashboard/courses", requireAdmin, listAdminDashboardCoursesHandler);
router.get("/dashboard/courses/:id", requireAdmin, getAdminDashboardCourseHandler);
router.get("/dashboard/students", requireAdmin, listAdminDashboardStudentsHandler);
router.get("/dashboard/teachers", requireAdmin, listAdminDashboardTeachersHandler);
router.get("/dashboard/teachers/:id", requireAdmin, getAdminDashboardTeacherHandler);
router.get("/users", requireAdmin, listUsersHandler);
router.get("/teachers", requireAdmin, listTeachersHandler);
router.get("/students", requireAdmin, listStudentsHandler);
router.patch("/users/:id", requireSuperAdmin, updateUserHandler);

export { router as adminRoutes };
