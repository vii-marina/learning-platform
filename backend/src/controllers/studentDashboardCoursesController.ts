import type { Request, Response } from "express";
import { AppError } from "../lib/appError";
import {
  completeStudentCourseLesson,
  getStudentCourseDetails,
  listStudentDashboardCourses,
  listStudentDashboardPublicCourses,
  startStudentCourse,
} from "../services/studentDashboardCoursesService";

function getStringRouteParam(value: string | string[] | undefined, paramName: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  throw new AppError(400, `Missing or invalid ${paramName}.`, "INVALID_ROUTE_PARAM");
}

export async function listStudentDashboardCoursesHandler(req: Request, res: Response) {
  const courses = await listStudentDashboardCourses(req.auth!);
  res.status(200).json({ courses });
}

export async function listStudentDashboardPublicCoursesHandler(req: Request, res: Response) {
  const courses = await listStudentDashboardPublicCourses(req.auth!);
  res.status(200).json({ courses });
}

export async function startStudentCourseHandler(req: Request, res: Response) {
  const courseId = getStringRouteParam(req.params.courseId, "courseId");
  const course = await startStudentCourse(req.auth!, courseId);
  res.status(201).json({ course });
}

export async function getStudentCourseDetailsHandler(req: Request, res: Response) {
  const courseId = getStringRouteParam(req.params.courseId, "courseId");
  const courseDetails = await getStudentCourseDetails(req.auth!, courseId);
  res.status(200).json(courseDetails);
}

export async function completeStudentCourseLessonHandler(req: Request, res: Response) {
  const courseId = getStringRouteParam(req.params.courseId, "courseId");
  const lessonId = getStringRouteParam(req.params.lessonId, "lessonId");
  const result = await completeStudentCourseLesson(req.auth!, courseId, lessonId);
  res.status(200).json(result);
}
