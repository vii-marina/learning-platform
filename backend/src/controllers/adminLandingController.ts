import type { Request, Response } from "express";
import { updateLandingPageSettingsSchema } from "../validators/adminSchemas";
import {
  getLandingPageSettings,
  saveLandingPageSettings,
} from "../services/landingPageSettingsService";
import { getPublicLandingLessonPreview } from "../services/studentDashboardCoursesService";

async function buildLandingSettingsResponse() {
  const settings = await getLandingPageSettings();
  const preview =
    settings?.course_id && settings.lesson_id
      ? await getPublicLandingLessonPreview({
          courseId: settings.course_id,
          lessonId: settings.lesson_id,
          allowAnySelectedCourse: true,
        })
      : null;

  return {
    settings,
    preview,
  };
}

export async function getAdminLandingSettingsHandler(_req: Request, res: Response) {
  res.status(200).json(await buildLandingSettingsResponse());
}

export async function updateAdminLandingSettingsHandler(req: Request, res: Response) {
  const input = updateLandingPageSettingsSchema.parse(req.body);
  await getPublicLandingLessonPreview({
    courseId: input.courseId,
    lessonId: input.lessonId,
    allowAnySelectedCourse: true,
  });
  const settings = await saveLandingPageSettings(input);
  const preview = await getPublicLandingLessonPreview({
    courseId: settings.course_id ?? input.courseId,
    lessonId: settings.lesson_id ?? input.lessonId,
    allowAnySelectedCourse: true,
  });

  res.status(200).json({
    settings,
    preview,
  });
}
