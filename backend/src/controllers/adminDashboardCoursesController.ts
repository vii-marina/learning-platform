import type { Request, Response } from "express";
import { updateAdminCourseSchema, updateUserParamsSchema } from "../validators/adminSchemas";
import {
  deleteAdminDashboardCourse,
  getAdminDashboardCourse,
  listAdminDashboardCourses,
  updateAdminDashboardCourse,
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

export async function updateAdminDashboardCourseHandler(req: Request, res: Response) {
  const params = updateUserParamsSchema.parse(req.params);
  const input = updateAdminCourseSchema.parse(req.body);
  const course = await updateAdminDashboardCourse(params.id, input.action);
  res.status(200).json({ course });
}

export async function deleteAdminDashboardCourseHandler(req: Request, res: Response) {
  const params = updateUserParamsSchema.parse(req.params);
  await deleteAdminDashboardCourse(params.id);
  res.status(200).json({ deletedId: params.id });
}
