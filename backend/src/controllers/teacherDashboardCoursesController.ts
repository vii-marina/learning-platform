import type { Request, Response } from "express";
import {
  listTeacherDashboardCourses,
  listTeacherDashboardStudents,
} from "../services/teacherDashboardCoursesService";

export async function listTeacherDashboardCoursesHandler(req: Request, res: Response) {
  const courses = await listTeacherDashboardCourses(req.auth!);
  res.status(200).json({ courses });
}

export async function listTeacherDashboardStudentsHandler(req: Request, res: Response) {
  const summary = await listTeacherDashboardStudents(req.auth!);
  res.status(200).json(summary);
}
