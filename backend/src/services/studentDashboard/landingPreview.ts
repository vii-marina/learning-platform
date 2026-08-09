/**
 * The interactive course preview on the public landing page.
 *
 * This is the only unauthenticated read of course content in the system, so what it will
 * serve is deliberately narrow: the course the admin selected in the landing settings, and
 * nothing else. Caller-supplied ids are honoured only when the caller is already an admin
 * (`allowAnySelectedCourse`), because the payload includes a test with its answer key.
 */

import { AppError } from "../../lib/appError";
import { groupByToRecord as groupBy } from "../../lib/collections";
import { getLandingPageSettings } from "../landingPageSettingsService";
import {
  listExercisesByModuleIds,
  listFullLessons,
  listModules,
  listTestsByModuleIds,
} from "./contentRepository";
import {
  getAnyLandingPreviewCourse,
  getPublishedPublicCourse,
  listPublishedPublicCourses,
} from "./courseRepository";
import type {
  CourseRow,
  LessonRow,
  ModuleRow,
  PublicLandingLessonPreview,
  PublicLandingLessonPreviewQuery,
} from "./types";

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function isLessonTitleMatch(lesson: LessonRow, lessonTitle: string) {
  return normalizeSearchValue(lesson.title) === normalizeSearchValue(lessonTitle);
}

export async function getPublicLandingLessonPreview({
  courseId,
  lessonId,
  lessonTitle = "Arithmetic operators",
  allowAnySelectedCourse = false,
}: PublicLandingLessonPreviewQuery = {}): Promise<PublicLandingLessonPreview> {
  let resolvedCourseId = courseId;
  let resolvedLessonId = lessonId;

  if (!resolvedCourseId && !resolvedLessonId) {
    const landingSettings = await getLandingPageSettings();

    if (landingSettings?.course_id && landingSettings.lesson_id) {
      resolvedCourseId = landingSettings.course_id;
      resolvedLessonId = landingSettings.lesson_id;
      allowAnySelectedCourse = true;
    }
  }

  const courses = resolvedCourseId
    ? [
        allowAnySelectedCourse
          ? await getAnyLandingPreviewCourse(resolvedCourseId)
          : await getPublishedPublicCourse(resolvedCourseId),
      ]
    : await listPublishedPublicCourses();

  if (courses.length === 0) {
    throw new AppError(404, "No published public courses were found.", "PUBLIC_COURSE_NOT_FOUND");
  }

  const modules = await listModules(courses.map((course) => course.id));
  const moduleIds = modules.map((module) => module.id);
  const lessons = await listFullLessons(moduleIds);
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const modulesByCourseId = groupBy(modules, (module) => module.course_id);
  const lessonsByModuleId = groupBy(lessons, (lesson) => lesson.module_id);

  let selectedCourse: CourseRow | null = null;
  let selectedModule: ModuleRow | null = null;
  let selectedLesson: LessonRow | null = null;

  if (resolvedLessonId) {
    selectedLesson = lessons.find((lesson) => lesson.id === resolvedLessonId) ?? null;
    selectedModule = selectedLesson ? moduleById.get(selectedLesson.module_id) ?? null : null;
    selectedCourse = selectedModule ? courseById.get(selectedModule.course_id) ?? null : null;
  } else {
    for (const course of courses) {
      const courseModules = [...(modulesByCourseId[course.id] ?? [])].sort(
        (left, right) => left.order - right.order
      );

      for (const module of courseModules) {
        const moduleLessons = [...(lessonsByModuleId[module.id] ?? [])].sort(
          (left, right) => left.order - right.order
        );
        const matchingLesson = moduleLessons.find((lesson) =>
          isLessonTitleMatch(lesson, lessonTitle)
        );

        if (matchingLesson) {
          selectedCourse = course;
          selectedModule = module;
          selectedLesson = matchingLesson;
          break;
        }
      }

      if (selectedLesson) {
        break;
      }
    }
  }

  if (!selectedCourse || !selectedModule || !selectedLesson) {
    throw new AppError(404, "Landing preview lesson was not found.", "LANDING_LESSON_NOT_FOUND");
  }

  const moduleLessons = [...(lessonsByModuleId[selectedModule.id] ?? [])].sort(
    (left, right) => left.order - right.order
  );
  const [tests, exercises] = await Promise.all([
    listTestsByModuleIds([selectedModule.id]),
    listExercisesByModuleIds([selectedModule.id]),
  ]);
  const relatedTest =
    tests.find((test) => test.after_lesson_id === selectedLesson.id) ?? tests[0] ?? null;
  const relatedExercise =
    exercises.find((exercise) => exercise.after_lesson_id === selectedLesson.id) ??
    exercises[0] ??
    null;

  return {
    course: {
      id: selectedCourse.id,
      title: selectedCourse.title,
      description: selectedCourse.description,
      slug: selectedCourse.slug,
      thumbnail_path: selectedCourse.thumbnail_path,
    },
    module: selectedModule,
    lesson: selectedLesson,
    module_lessons: moduleLessons,
    test: relatedTest,
    exercise: relatedExercise,
  };
}
