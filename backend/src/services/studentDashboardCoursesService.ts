/**
 * The student-facing course API.
 *
 * This file is the use-case layer: it checks who is asking, orders the repository calls,
 * and shapes the response. Everything it calls lives in `studentDashboard/` — content
 * reads, progress, results, teacher lookups, the summary builder and the landing preview.
 */

import { AppError } from "../lib/appError";
import { groupByToRecord as groupBy } from "../lib/collections";
import type { AuthenticatedRequestContext } from "../types/auth";
import {
  listExercisesByModuleIds,
  listFullLessons,
  listLessonBlocks,
  listModules,
  listTestsByModuleIds,
  listUserExerciseResults,
} from "./studentDashboard/contentRepository";
import {
  ensureStudentCourseAccess,
  getPublishedCourse,
  getPublishedPublicCourse,
  listCourseProgressByUser,
  listPublishedCoursesByIds,
  listPublishedPublicCourses,
} from "./studentDashboard/courseRepository";
import {
  buildStudentDashboardCourseSummaries,
  getLatestCourseProgressByCourseId,
  listCompletedLessonProgress,
} from "./studentDashboard/courseSummaries";
import {
  createCourseProgress,
  getCourseProgressByUserAndCourse,
  markLessonProgressCompleted,
  updateCourseProgressAfterLessonCompletion,
} from "./studentDashboard/progressRepository";
import {
  gradeTestSubmission,
  upsertUserExerciseResult,
  upsertUserTestResult,
} from "./studentDashboard/resultsRepository";
import type {
  StudentCourseDetails,
  StudentDashboardCourseSummary,
  StudentExerciseCompletionResult,
  StudentLessonCompletionResult,
  StudentTestCompletionResult,
} from "./studentDashboard/types";

export { getPublicLandingLessonPreview } from "./studentDashboard/landingPreview";

// Re-exported so controllers and callers keep importing these from the service they
// already use, rather than reaching into its internals.
export type {
  PublicLandingLessonPreview,
  PublicLandingLessonPreviewQuery,
  StudentCourseDetails,
  StudentDashboardCourseSummary,
  StudentExerciseCompletionResult,
  StudentLessonCompletionResult,
  StudentTestCompletionResult,
} from "./studentDashboard/types";

function ensureStudentAccess(auth: AuthenticatedRequestContext) {
  if (auth.isAdmin || auth.role === "student") {
    return;
  }

  throw new AppError(403, "Student access is required.", "STUDENT_REQUIRED");
}

function ensureStudentRole(auth: AuthenticatedRequestContext) {
  if (auth.role === "student") {
    return;
  }

  throw new AppError(403, "Student access is required.", "STUDENT_REQUIRED");
}



export async function listStudentDashboardCourses(
  auth: AuthenticatedRequestContext
): Promise<StudentDashboardCourseSummary[]> {
  ensureStudentAccess(auth);

  const progressRows = await listCourseProgressByUser(auth.userId);
  const progressByCourseId = getLatestCourseProgressByCourseId(progressRows);
  const enrolledCourseIds = [...progressByCourseId.keys()];

  if (enrolledCourseIds.length === 0) {
    return [];
  }

  const courses = await listPublishedCoursesByIds(enrolledCourseIds);

  if (courses.length === 0) {
    return [];
  }

  return buildStudentDashboardCourseSummaries(courses, {
    userId: auth.userId,
    progressByCourseId,
  });
}

export async function listStudentDashboardPublicCourses(
  auth: AuthenticatedRequestContext
): Promise<StudentDashboardCourseSummary[]> {
  ensureStudentAccess(auth);

  const courses = await listPublishedPublicCourses();
  return buildStudentDashboardCourseSummaries(courses, { userId: auth.userId });
}


export async function startStudentCourse(
  auth: AuthenticatedRequestContext,
  courseId: string
): Promise<StudentDashboardCourseSummary> {
  ensureStudentRole(auth);

  const course = await getPublishedPublicCourse(courseId);
  const existingProgress = await getCourseProgressByUserAndCourse(auth.userId, course.id);
  const courseProgress =
    existingProgress ?? (await createCourseProgress(auth.userId, course.id));
  const [courseSummary] = await buildStudentDashboardCourseSummaries([course], {
    userId: auth.userId,
    progressByCourseId: new Map([[course.id, courseProgress]]),
  });

  if (!courseSummary) {
    throw new AppError(
      500,
      "Unable to build started course summary.",
      "COURSE_SUMMARY_FAILED"
    );
  }

  return courseSummary;
}

export async function getStudentCourseDetails(
  auth: AuthenticatedRequestContext,
  courseId: string
): Promise<StudentCourseDetails> {
  ensureStudentRole(auth);

  const course = await getPublishedCourse(courseId);
  const accessProgress = await ensureStudentCourseAccess(auth.userId, course);
  const progress =
    accessProgress ?? (await getCourseProgressByUserAndCourse(auth.userId, course.id));
  const modules = await listModules([course.id]);
  const moduleIds = modules.map((module) => module.id);
  const [lessons, tests, exercises] = await Promise.all([
    listFullLessons(moduleIds),
    listTestsByModuleIds(moduleIds),
    listExercisesByModuleIds(moduleIds),
  ]);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const [lessonBlocks, completedLessonProgress, completedExerciseResults] = await Promise.all([
    listLessonBlocks(lessonIds),
    listCompletedLessonProgress(auth.userId, lessonIds),
    listUserExerciseResults(
      auth.userId,
      exercises.map((exercise) => exercise.id)
    ),
  ]);
  const [courseSummary] = await buildStudentDashboardCourseSummaries([course], {
    userId: auth.userId,
    progressByCourseId: progress ? new Map([[course.id, progress]]) : undefined,
  });

  if (!courseSummary) {
    throw new AppError(
      500,
      "Unable to build course details.",
      "COURSE_DETAILS_FAILED"
    );
  }

  return {
    course: courseSummary,
    modules,
    lessons_by_module: groupBy(lessons, (lesson) => lesson.module_id),
    lesson_blocks_by_lesson: groupBy(lessonBlocks, (block) => block.lesson_id),
    tests_by_module: groupBy(tests, (test) => test.module_id),
    exercises_by_module: groupBy(exercises, (exercise) => exercise.module_id),
    completed_lesson_ids: [
      ...new Set(completedLessonProgress.map((progressRow) => progressRow.lesson_id)),
    ],
    completed_exercise_ids: [
      ...new Set(completedExerciseResults.map((result) => result.exercise_id)),
    ],
  };
}

export async function completeStudentCourseLesson(
  auth: AuthenticatedRequestContext,
  courseId: string,
  lessonId: string
): Promise<StudentLessonCompletionResult> {
  ensureStudentRole(auth);

  const course = await getPublishedCourse(courseId);
  const courseProgress = await getCourseProgressByUserAndCourse(auth.userId, course.id);

  if (!courseProgress) {
    throw new AppError(
      403,
      "Start this course before completing lessons.",
      "COURSE_NOT_STARTED"
    );
  }

  const modules = await listModules([course.id]);
  const lessons = await listFullLessons(modules.map((module) => module.id));
  const lessonBelongsToCourse = lessons.some((lesson) => lesson.id === lessonId);

  if (!lessonBelongsToCourse) {
    throw new AppError(
      404,
      "Lesson was not found in this course.",
      "LESSON_NOT_FOUND"
    );
  }

  await markLessonProgressCompleted(auth.userId, lessonId);

  const completedLessonProgress = await listCompletedLessonProgress(
    auth.userId,
    lessons.map((lesson) => lesson.id)
  );
  const completedLessonIds = [
    ...new Set(completedLessonProgress.map((progressRow) => progressRow.lesson_id)),
  ];
  const isCourseCompleted =
    lessons.length > 0 && completedLessonIds.length >= lessons.length;
  const updatedCourseProgress = await updateCourseProgressAfterLessonCompletion(
    courseProgress,
    isCourseCompleted
  );
  const [courseSummary] = await buildStudentDashboardCourseSummaries([course], {
    userId: auth.userId,
    progressByCourseId: new Map([[course.id, updatedCourseProgress]]),
  });

  if (!courseSummary) {
    throw new AppError(
      500,
      "Unable to build completed lesson summary.",
      "LESSON_COMPLETION_SUMMARY_FAILED"
    );
  }

  return {
    course: courseSummary,
    completed_lesson_ids: completedLessonIds,
  };
}

export async function completeStudentCourseTest(
  auth: AuthenticatedRequestContext,
  courseId: string,
  testId: string,
  submittedAnswers: Record<string, number[]>
): Promise<StudentTestCompletionResult> {
  ensureStudentRole(auth);

  const course = await getPublishedCourse(courseId);
  const courseProgress = await getCourseProgressByUserAndCourse(auth.userId, course.id);

  if (!courseProgress) {
    throw new AppError(
      403,
      "Start this course before completing tests.",
      "COURSE_NOT_STARTED"
    );
  }

  const modules = await listModules([course.id]);
  const tests = await listTestsByModuleIds(modules.map((module) => module.id));
  const testBelongsToCourse = tests.some((test) => test.id === testId);

  if (!testBelongsToCourse) {
    throw new AppError(404, "Test was not found in this course.", "TEST_NOT_FOUND");
  }

  // Grade server-side from the submitted answers — the client no longer sends a score.
  const grade = await gradeTestSubmission(testId, submittedAnswers);
  const testResult = await upsertUserTestResult(auth.userId, testId, grade.scorePercent);
  await updateCourseProgressAfterLessonCompletion(courseProgress, false);

  return {
    test_result: testResult,
    correct_count: grade.correctCount,
    total_questions: grade.totalQuestions,
    per_question: grade.perQuestion,
  };
}

export async function completeStudentCourseExercise(
  auth: AuthenticatedRequestContext,
  courseId: string,
  exerciseId: string
): Promise<StudentExerciseCompletionResult> {
  ensureStudentRole(auth);

  const course = await getPublishedCourse(courseId);
  const courseProgress = await getCourseProgressByUserAndCourse(auth.userId, course.id);

  if (!courseProgress) {
    throw new AppError(
      403,
      "Start this course before completing exercises.",
      "COURSE_NOT_STARTED"
    );
  }

  const modules = await listModules([course.id]);
  const exercises = await listExercisesByModuleIds(modules.map((module) => module.id));
  const exerciseBelongsToCourse = exercises.some((exercise) => exercise.id === exerciseId);

  if (!exerciseBelongsToCourse) {
    throw new AppError(
      404,
      "Exercise was not found in this course.",
      "EXERCISE_NOT_FOUND"
    );
  }

  await upsertUserExerciseResult(auth.userId, exerciseId);
  const updatedCourseProgress = await updateCourseProgressAfterLessonCompletion(
    courseProgress,
    false
  );

  const completedExerciseResults = await listUserExerciseResults(
    auth.userId,
    exercises.map((exercise) => exercise.id)
  );
  const [courseSummary] = await buildStudentDashboardCourseSummaries([course], {
    userId: auth.userId,
    progressByCourseId: new Map([[course.id, updatedCourseProgress]]),
  });

  if (!courseSummary) {
    throw new AppError(
      500,
      "Unable to build completed exercise summary.",
      "EXERCISE_COMPLETION_SUMMARY_FAILED"
    );
  }

  return {
    course: courseSummary,
    completed_exercise_ids: [
      ...new Set(completedExerciseResults.map((result) => result.exercise_id)),
    ],
  };
}
