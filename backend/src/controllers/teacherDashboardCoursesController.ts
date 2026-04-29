import type { Request, Response } from "express";
import { listTeacherDashboardCourses } from "../services/teacherDashboardCoursesService";

export async function listTeacherDashboardCoursesHandler(req: Request, res: Response) {
  const courses = await listTeacherDashboardCourses(req.auth!);
  res.status(200).json({ courses });
}
