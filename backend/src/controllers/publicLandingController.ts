import type { Request, Response } from "express";
import { getPublicLandingLessonPreview } from "../services/studentDashboardCoursesService";

function getStringQueryParam(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function getPublicLandingPreviewHandler(req: Request, res: Response) {
  const preview = await getPublicLandingLessonPreview({
    courseId: getStringQueryParam(req.query.courseId),
    lessonId: getStringQueryParam(req.query.lessonId),
    lessonTitle: getStringQueryParam(req.query.lessonTitle),
  });

  res.status(200).json(preview);
}
