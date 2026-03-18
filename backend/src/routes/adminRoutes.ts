import { Router } from "express";
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

router.get("/users", requireAdmin, listUsersHandler);
router.get("/teachers", requireAdmin, listTeachersHandler);
router.get("/students", requireAdmin, listStudentsHandler);
router.patch("/users/:id", requireSuperAdmin, updateUserHandler);

export { router as adminRoutes };
