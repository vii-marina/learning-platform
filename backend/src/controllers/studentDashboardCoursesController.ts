import type { Request, Response } from "express";
import {
  listStudentDashboardCourses,
  listStudentDashboardPublicCourses,
} from "../services/studentDashboardCoursesService";

export async function listStudentDashboardCoursesHandler(req: Request, res: Response) {
  const courses = await listStudentDashboardCourses(req.auth!);
  res.status(200).json({ courses });
}

export async function listStudentDashboardPublicCoursesHandler(req: Request, res: Response) {
  const courses = await listStudentDashboardPublicCourses(req.auth!);
  res.status(200).json({ courses });
}
