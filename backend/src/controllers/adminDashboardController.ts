import type { Request, Response } from "express";
import { updateUserParamsSchema } from "../validators/adminSchemas";
import {
  getAdminDashboardOverview,
  getAdminDashboardTeacher,
  listAdminDashboardTeachers,
} from "../services/adminDashboardService";
import { listAdminDashboardStudents } from "../services/adminDashboardStudentsService";

export async function getAdminDashboardOverviewHandler(_req: Request, res: Response) {
  const overview = await getAdminDashboardOverview();
  res.status(200).json({ overview });
}

export async function listAdminDashboardTeachersHandler(_req: Request, res: Response) {
  const teachers = await listAdminDashboardTeachers();
  res.status(200).json({ teachers });
}

export async function listAdminDashboardStudentsHandler(_req: Request, res: Response) {
  const students = await listAdminDashboardStudents();
  res.status(200).json({ students });
}

export async function getAdminDashboardTeacherHandler(req: Request, res: Response) {
  const params = updateUserParamsSchema.parse(req.params);
  const teacher = await getAdminDashboardTeacher(params.id);
  res.status(200).json({ teacher });
}
