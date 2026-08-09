import type { Request, Response } from "express";
import { getPublicLandingLessonPreview } from "../services/studentDashboardCoursesService";

// This is the only unauthenticated route in the app. It takes NO caller input on purpose:
// the preview is pinned to the admin's stored landing selection. Accepting a courseId/lessonId
// here let anyone read any published course's lesson content, answer key (`is_correct`) and
// exercise solutions without an account, bypassing the enrolment checks the student path enforces.
// The parameterised service signature is still used by adminLandingController, behind requireAdmin.
export async function getPublicLandingPreviewHandler(_req: Request, res: Response) {
  const preview = await getPublicLandingLessonPreview();

  res.status(200).json(preview);
}
