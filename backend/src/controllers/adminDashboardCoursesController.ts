import type { Request, Response } from "express";
import { updateUserParamsSchema } from "../validators/adminSchemas";
import {
  getAdminDashboardCourse,
  listAdminDashboardCourses,
} from "../services/adminDashboardCoursesService";

export async function listAdminDashboardCoursesHandler(_req: Request, res: Response) {
  const courses = await listAdminDashboardCourses();
  res.status(200).json({ courses });
}

export async function getAdminDashboardCourseHandler(req: Request, res: Response) {
  const params = updateUserParamsSchema.parse(req.params);
  const course = await getAdminDashboardCourse(params.id);
  res.status(200).json({ course });
}
