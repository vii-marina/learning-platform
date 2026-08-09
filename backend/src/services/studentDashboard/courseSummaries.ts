/**
 * Builds the course cards the student dashboard renders.
 *
 * This is the fan-out point of the whole surface: one call resolves teachers, modules,
 * lessons, tests, exercises and the student's results for every course in the list, then
 * folds them into a flat summary. It is kept together because the batching order is the
 * thing that matters — each stage feeds the next stage's id list.
 */

import { toServiceError } from "../../lib/appError";
import { chunkValues, groupCounts } from "../../lib/collections";
import { supabaseAdmin } from "../../lib/supabase";
import { isUuidValue } from "../../lib/identifiers";
import {
  listExerciseRowsByModuleIds,
  listLessons,
  listModules,
  listTestRowsByModuleIds,
  listUserExerciseResults,
  listUserTestResults,
} from "./contentRepository";
import { listTeacherNamesById, listTeacherProfilesById } from "./teacherRepository";
import type {
  CourseProgressRow,
  CourseRow,
  LessonProgressRow,
  StudentDashboardCourseSummary,
} from "./types";

export async function listCompletedLessonProgress(userId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) {
    return [] as LessonProgressRow[];
  }

  const progressRows: LessonProgressRow[] = [];

  for (const chunk of chunkValues(lessonIds)) {
    const { data, error } = await supabaseAdmin
      .from("lesson_progress")
      .select("user_id,lesson_id,is_completed")
      .eq("user_id", userId)
      .eq("is_completed", true)
      .in("lesson_id", chunk);

    if (error) {
      throw toServiceError(
        500,
        "LESSON_PROGRESS_LIST_FAILED",
        "Unable to load lesson progress",
        error
      );
    }

    progressRows.push(...((data ?? []) as LessonProgressRow[]));
  }

  return progressRows;
}

export function getLatestCourseProgressByCourseId(progressRows: CourseProgressRow[]) {
  const progressByCourseId = new Map<string, CourseProgressRow>();

  for (const progressRow of progressRows) {
    if (!progressByCourseId.has(progressRow.course_id)) {
      progressByCourseId.set(progressRow.course_id, progressRow);
    }
  }

  return progressByCourseId;
}

export async function buildStudentDashboardCourseSummaries(
  courses: CourseRow[],
  options: {
    userId?: string;
    progressByCourseId?: Map<string, CourseProgressRow>;
  } = {}
) {
  if (courses.length === 0) {
    return [] as StudentDashboardCourseSummary[];
  }

  const courseIds = courses.map((course) => course.id);
  const teacherIds = [
    ...new Set(courses.map((course) => course.teacher_id).filter(isUuidValue)),
  ];
  const [teacherNamesById, teacherProfilesById, modules] = await Promise.all([
    listTeacherNamesById(teacherIds),
    listTeacherProfilesById(teacherIds),
    listModules(courseIds),
  ]);
  const moduleIds = modules.map((module) => module.id);
  const [lessons, testRows, exerciseRows] = await Promise.all([
    listLessons(moduleIds),
    listTestRowsByModuleIds(moduleIds),
    listExerciseRowsByModuleIds(moduleIds),
  ]);
  const [testResults, exerciseResults] = await Promise.all([
    listUserTestResults(
      options.userId,
      testRows.map((test) => test.id)
    ),
    listUserExerciseResults(
      options.userId,
      exerciseRows.map((exercise) => exercise.id)
    ),
  ]);
  const completedLessonProgress = options.userId
    ? await listCompletedLessonProgress(
        options.userId,
        lessons.map((lesson) => lesson.id)
      )
    : [];

  const moduleCountByCourseId = groupCounts(modules, (module) => module.course_id);
  const courseIdByModuleId = new Map(modules.map((module) => [module.id, module.course_id]));
  const testIdsByCourseId = testRows.reduce((testsByCourse, test) => {
    const courseId = courseIdByModuleId.get(test.module_id);

    if (!courseId) {
      return testsByCourse;
    }

    testsByCourse.set(courseId, [...(testsByCourse.get(courseId) ?? []), test.id]);
    return testsByCourse;
  }, new Map<string, string[]>());
  const courseIdByTestId = new Map(
    testRows.flatMap((test) => {
      const courseId = courseIdByModuleId.get(test.module_id);
      return courseId ? [[test.id, courseId] as const] : [];
    })
  );
  const completedTestIdsByCourseId = testResults.reduce((testsByCourse, result) => {
    const courseId = courseIdByTestId.get(result.test_id);

    if (!courseId) {
      return testsByCourse;
    }

    const testIds = testsByCourse.get(courseId) ?? new Set<string>();
    testIds.add(result.test_id);
    testsByCourse.set(courseId, testIds);
    return testsByCourse;
  }, new Map<string, Set<string>>());
  const exerciseIdsByCourseId = exerciseRows.reduce((exercisesByCourse, exercise) => {
    const courseId = courseIdByModuleId.get(exercise.module_id);

    if (!courseId) {
      return exercisesByCourse;
    }

    exercisesByCourse.set(courseId, [
      ...(exercisesByCourse.get(courseId) ?? []),
      exercise.id,
    ]);
    return exercisesByCourse;
  }, new Map<string, string[]>());
  const courseIdByExerciseId = new Map(
    exerciseRows.flatMap((exercise) => {
      const courseId = courseIdByModuleId.get(exercise.module_id);
      return courseId ? [[exercise.id, courseId] as const] : [];
    })
  );
  const completedExerciseIdsByCourseId = exerciseResults.reduce((exercisesByCourse, result) => {
    const courseId = courseIdByExerciseId.get(result.exercise_id);

    if (!courseId) {
      return exercisesByCourse;
    }

    const exerciseIds = exercisesByCourse.get(courseId) ?? new Set<string>();
    exerciseIds.add(result.exercise_id);
    exercisesByCourse.set(courseId, exerciseIds);
    return exercisesByCourse;
  }, new Map<string, Set<string>>());
  const courseIdByLessonId = new Map(
    lessons.flatMap((lesson) => {
      const courseId = courseIdByModuleId.get(lesson.module_id);
      return courseId ? [[lesson.id, courseId] as const] : [];
    })
  );
  const lessonCountByCourseId = lessons.reduce((counts, lesson) => {
    const courseId = courseIdByModuleId.get(lesson.module_id);

    if (!courseId) {
      return counts;
    }

    counts.set(courseId, (counts.get(courseId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const completedLessonIdsByCourseId = completedLessonProgress.reduce((lessonIdsByCourse, progressRow) => {
    const courseId = courseIdByLessonId.get(progressRow.lesson_id);

    if (!courseId) {
      return lessonIdsByCourse;
    }

    const lessonIds = lessonIdsByCourse.get(courseId) ?? new Set<string>();
    lessonIds.add(progressRow.lesson_id);
    lessonIdsByCourse.set(courseId, lessonIds);
    return lessonIdsByCourse;
  }, new Map<string, Set<string>>());

  return courses.map((course) => {
    const totalLessons = lessonCountByCourseId.get(course.id) ?? 0;
    const completedLessons = completedLessonIdsByCourseId.get(course.id)?.size ?? 0;
    const totalTests = testIdsByCourseId.get(course.id)?.length ?? 0;
    const completedTests = completedTestIdsByCourseId.get(course.id)?.size ?? 0;
    const testProgressPercent =
      totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;
    const totalExercises = exerciseIdsByCourseId.get(course.id)?.length ?? 0;
    const completedExercises = completedExerciseIdsByCourseId.get(course.id)?.size ?? 0;
    const exerciseProgressPercent =
      totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;
    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const courseProgress = options.progressByCourseId?.get(course.id) ?? null;
    const teacherProfile =
      course.teacher_id && isUuidValue(course.teacher_id)
        ? teacherProfilesById.get(course.teacher_id) ?? null
        : null;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      teacher_id: course.teacher_id,
      teacher_name:
        course.teacher_id && isUuidValue(course.teacher_id)
          ? teacherNamesById.get(course.teacher_id) ?? "Platform instructor"
          : "Platform instructor",
      slug: course.slug,
      thumbnail_path: course.thumbnail_path,
      access_type: course.access_type,
      status: course.status,
      is_published: course.is_published,
      module_count: moduleCountByCourseId.get(course.id) ?? 0,
      lesson_count: totalLessons,
      test_count: totalTests,
      exercise_count: totalExercises,
      completed_tests_count: completedTests,
      test_progress_percent: testProgressPercent,
      completed_exercises_count: completedExercises,
      exercise_progress_percent: exerciseProgressPercent,
      completed_lessons_count: completedLessons,
      total_lessons_count: totalLessons,
      progress_percent: progressPercent,
      started_at: courseProgress?.started_at ?? null,
      finished_at: courseProgress?.finished_at ?? null,
      teacher_headline: teacherProfile?.headline ?? null,
      teacher_bio: teacherProfile?.bio ?? null,
      teacher_specialization: teacherProfile?.specialization ?? null,
      teacher_experience_years:
        typeof teacherProfile?.experience_years === "number"
          ? teacherProfile.experience_years
          : typeof teacherProfile?.experienceYears === "number"
            ? teacherProfile.experienceYears
            : null,
      teacher_education: teacherProfile?.education ?? null,
      teacher_gender: teacherProfile?.gender ?? null,
      teacher_birth_date:
        typeof teacherProfile?.birth_date === "string"
          ? teacherProfile.birth_date
          : typeof teacherProfile?.birthDate === "string"
            ? teacherProfile.birthDate
            : null,
      teacher_avatar_path: teacherProfile?.avatar_path ?? null,
      teacher_linkedin_url: teacherProfile?.linkedin_url ?? null,
      teacher_github_url: teacherProfile?.github_url ?? null,
      created_at: course.created_at,
      updated_at: course.updated_at,
    };
  });
}
