import type { Request, Response } from "express";
import { listStudentDashboardCourses } from "../services/studentDashboardCoursesService";

export async function listStudentDashboardCoursesHandler(req: Request, res: Response) {
  const courses = await listStudentDashboardCourses(req.auth!);
  res.status(200).json({ courses });
}
