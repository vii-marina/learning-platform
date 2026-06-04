import { Router } from "express";
import {
  clearAdminDashboardStudentCourseHandler,
  deleteAdminDashboardStudentHandler,
  deleteAdminDashboardTeacherHandler,
  getAdminDashboardOverviewHandler,
  getAdminDashboardStudentHandler,
  getAdminDashboardTeacherHandler,
  listAdminDashboardStudentsHandler,
  listAdminDashboardTeachersHandler,
  updateAdminDashboardStudentHandler,
  updateAdminDashboardTeacherHandler,
} from "../controllers/adminDashboardController";
import {
  deleteAdminDashboardCourseHandler,
  getAdminDashboardCourseHandler,
  listAdminDashboardCoursesHandler,
  permanentlyDeleteAdminDashboardCourseHandler,
  updateAdminDashboardCourseHandler,
} from "../controllers/adminDashboardCoursesController";
import {
  createManagedUserHandler,
  listStudentsHandler,
  listTeachersHandler,
  listUsersHandler,
  updateUserHandler,
} from "../controllers/adminController";
import {
  getAdminLandingSettingsHandler,
  updateAdminLandingSettingsHandler,
} from "../controllers/adminLandingController";
import { requireAuth } from "../middleware/auth";
import { requireAdmin, requireSuperAdmin } from "../middleware/requireRole";

const router = Router();

router.use(requireAuth);

router.get("/dashboard/overview", requireAdmin, getAdminDashboardOverviewHandler);
router.get("/dashboard/courses", requireAdmin, listAdminDashboardCoursesHandler);
router.get("/dashboard/courses/:id", requireAdmin, getAdminDashboardCourseHandler);
router.patch("/dashboard/courses/:id", requireAdmin, updateAdminDashboardCourseHandler);
router.delete(
  "/dashboard/courses/:id/permanent",
  requireAdmin,
  permanentlyDeleteAdminDashboardCourseHandler
);
router.delete("/dashboard/courses/:id", requireAdmin, deleteAdminDashboardCourseHandler);
router.get("/dashboard/landing", requireAdmin, getAdminLandingSettingsHandler);
router.put("/dashboard/landing", requireAdmin, updateAdminLandingSettingsHandler);
router.get("/dashboard/students", requireAdmin, listAdminDashboardStudentsHandler);
router.get("/dashboard/students/:id", requireAdmin, getAdminDashboardStudentHandler);
router.patch("/dashboard/students/:id", requireAdmin, updateAdminDashboardStudentHandler);
router.delete(
  "/dashboard/students/:id/courses/:courseId",
  requireAdmin,
  clearAdminDashboardStudentCourseHandler
);
router.delete("/dashboard/students/:id", requireAdmin, deleteAdminDashboardStudentHandler);
router.post("/users", requireAdmin, createManagedUserHandler);
router.get("/dashboard/teachers", requireAdmin, listAdminDashboardTeachersHandler);
router.get("/dashboard/teachers/:id", requireAdmin, getAdminDashboardTeacherHandler);
router.patch("/dashboard/teachers/:id", requireAdmin, updateAdminDashboardTeacherHandler);
router.delete("/dashboard/teachers/:id", requireAdmin, deleteAdminDashboardTeacherHandler);
router.get("/users", requireAdmin, listUsersHandler);
router.get("/teachers", requireAdmin, listTeachersHandler);
router.get("/students", requireAdmin, listStudentsHandler);
router.patch("/users/:id", requireSuperAdmin, updateUserHandler);

export { router as adminRoutes };
