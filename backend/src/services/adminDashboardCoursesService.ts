/**
 * The admin's course management API.
 *
 * Reads live in `adminDashboardCourses/contentRepository`; this file hydrates what they
 * return into the nested shape the UI expects, and owns the lifecycle actions.
 */

import { AppError, toServiceError } from "../lib/appError";
import { chunkValues, groupByToMap as groupBy } from "../lib/collections";
import { isUuidValue } from "../lib/identifiers";
import { supabaseAdmin } from "../lib/supabase";
import {
  buildCourseEnrollmentStats,
  getCourseById,
  getCourseByIdIncludingDeleted,
  listAnswers,
  listCourseProgress,
  listCourses,
  listExercisesByModuleIds,
  listLessonBlocks,
  listLessons,
  listModules,
  listProfilesByIds,
  listQuestions,
  listTests,
  updateCourseById,
} from "./adminDashboardCourses/contentRepository";
import type {
  AdminCourseAction,
  CourseRow,
  LessonBlockRow,
  TestAnswerRow,
  UpdateCoursePayload,
} from "./adminDashboardCourses/types";
import { clearLandingPreviewSnapshotForCourse } from "./landingPageSettingsService";

export type { AdminCourseAction } from "./adminDashboardCourses/types";


function isMissingOptionalRelationError(error: { message: string; code?: string }) {
  const message = error.message.toLowerCase();

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("could not find")
  );
}

async function deleteRowsByValues(
  tableName: string,
  columnName: string,
  values: string[],
  options: {
    optional?: boolean;
    errorCode: string;
    errorMessage: string;
  }
) {
  if (values.length === 0) {
    return;
  }

  for (const chunk of chunkValues(values)) {
    const { error } = await supabaseAdmin.from(tableName).delete().in(columnName, chunk);

    if (error) {
      if (options.optional && isMissingOptionalRelationError(error)) {
        return;
      }

      throw toServiceError(500, options.errorCode, options.errorMessage, error);
    }
  }
}

async function clearLandingSettingsForDeletedCourse(courseId: string, lessonIds: string[]) {
  const { error } = await supabaseAdmin
    .from("landing_page_settings")
    .update({
      course_id: null,
      lesson_id: null,
      updated_at: new Date().toISOString(),
    })
    .or(`course_id.eq.${courseId}${lessonIds.length > 0 ? `,lesson_id.in.(${lessonIds.join(",")})` : ""}`);

  if (error && !isMissingOptionalRelationError(error)) {
    throw toServiceError(
      500,
      "LANDING_SETTINGS_CLEAR_FAILED",
      "Unable to clear landing settings for deleted course",
      error
    );
  }
}

function computeCourseTotals(modules: Array<{ lessons: Array<{ blocks: LessonBlockRow[] }>; tests: Array<{ questions: Array<{ answers: TestAnswerRow[] }> }> }>) {
  return modules.reduce(
    (totals, module) => {
      totals.lessons += module.lessons.length;
      totals.blocks += module.lessons.reduce((sum, lesson) => sum + lesson.blocks.length, 0);
      totals.tests += module.tests.length;
      totals.questions += module.tests.reduce((sum, test) => sum + test.questions.length, 0);
      totals.answers += module.tests.reduce(
        (sum, test) =>
          sum +
          test.questions.reduce((questionSum, question) => questionSum + question.answers.length, 0),
        0
      );

      return totals;
    },
    {
      lessons: 0,
      blocks: 0,
      tests: 0,
      questions: 0,
      answers: 0,
    }
  );
}

async function hydrateCourseSummaries(courses: CourseRow[]) {
  const courseIds = courses.map((course) => course.id);
  const teacherIds = [...new Set(courses.map((course) => course.teacher_id).filter(isUuidValue))];
  const [teachersById, modules, courseProgress] = await Promise.all([
    listProfilesByIds(teacherIds),
    listModules(courseIds),
    listCourseProgress(courseIds),
  ]);
  const moduleIds = modules.map((module) => module.id);
  const lessons = await listLessons(moduleIds);
  const modulesByCourseId = groupBy(modules, (module) => module.course_id);
  const courseIdByModuleId = new Map(modules.map((module) => [module.id, module.course_id]));
  const lessonCountByCourseId = lessons.reduce((counts, lesson) => {
    const courseId = courseIdByModuleId.get(lesson.module_id);

    if (!courseId) {
      return counts;
    }

    counts.set(courseId, (counts.get(courseId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const enrollmentStatsByCourseId = buildCourseEnrollmentStats(courseProgress);

  return courses.map((course) => ({
    ...course,
    teacher:
      course.teacher_id && isUuidValue(course.teacher_id)
        ? teachersById.get(course.teacher_id) ?? null
        : null,
    moduleCount: modulesByCourseId.get(course.id)?.length ?? 0,
    lessonCount: lessonCountByCourseId.get(course.id) ?? 0,
    enrolledStudentCount:
      enrollmentStatsByCourseId.get(course.id)?.enrolledStudentCount ?? 0,
    completedStudentCount:
      enrollmentStatsByCourseId.get(course.id)?.completedStudentCount ?? 0,
  }));
}

export async function listAdminDashboardCourses() {
  const courses = await listCourses();
  return hydrateCourseSummaries(courses);
}

async function hydrateCourses(courses: CourseRow[]) {
  const courseIds = courses.map((course) => course.id);
  const teacherIds = [...new Set(courses.map((course) => course.teacher_id).filter(isUuidValue))];
  const [teachersById, modules, courseProgress] = await Promise.all([
    listProfilesByIds(teacherIds),
    listModules(courseIds),
    listCourseProgress(courseIds),
  ]);
  const moduleIds = modules.map((module) => module.id);
  const lessons = await listLessons(moduleIds);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const tests = await listTests(moduleIds);
  const testIds = tests.map((test) => test.id);
  const [blocks, questions] = await Promise.all([
    listLessonBlocks(lessonIds),
    listQuestions(testIds),
  ]);
  const questionIds = questions.map((question) => question.id);
  const answers = await listAnswers(questionIds);

  const answersByQuestionId = groupBy(answers, (answer) => answer.question_id);
  const hydratedQuestions = questions.map((question) => ({
    ...question,
    answers: answersByQuestionId.get(question.id) ?? [],
  }));
  const questionsByTestId = groupBy(hydratedQuestions, (question) => question.test_id);
  const hydratedTests = tests.map((test) => ({
    ...test,
    questions: questionsByTestId.get(test.id) ?? [],
  }));
  const testsByModuleId = groupBy(hydratedTests, (test) => test.module_id);
  const testsByLessonId = groupBy(hydratedTests, (test) => test.after_lesson_id);
  const blocksByLessonId = groupBy(blocks, (block) => block.lesson_id);
  const hydratedLessons = lessons.map((lesson) => ({
    ...lesson,
    blocks: blocksByLessonId.get(lesson.id) ?? [],
    linkedTests: testsByLessonId.get(lesson.id) ?? [],
  }));
  const lessonsByModuleId = groupBy(hydratedLessons, (lesson) => lesson.module_id);
  const hydratedModules = modules.map((module) => ({
    ...module,
    lessons: lessonsByModuleId.get(module.id) ?? [],
    tests: testsByModuleId.get(module.id) ?? [],
  }));
  const modulesByCourseId = groupBy(hydratedModules, (module) => module.course_id);
  const enrollmentStatsByCourseId = buildCourseEnrollmentStats(courseProgress);

  return courses.map((course) => {
    const courseModules = modulesByCourseId.get(course.id) ?? [];
    const totals = computeCourseTotals(courseModules);
    const teacher =
      course.teacher_id && isUuidValue(course.teacher_id)
        ? teachersById.get(course.teacher_id) ?? null
        : null;

    return {
      ...course,
      teacher,
      moduleCount: courseModules.length,
      lessonCount: totals.lessons,
      enrolledStudentCount:
        enrollmentStatsByCourseId.get(course.id)?.enrolledStudentCount ?? 0,
      completedStudentCount:
        enrollmentStatsByCourseId.get(course.id)?.completedStudentCount ?? 0,
      modules: courseModules,
      totalLessons: totals.lessons,
      totalBlocks: totals.blocks,
      totalTests: totals.tests,
      totalQuestions: totals.questions,
      totalAnswers: totals.answers,
    };
  });
}

export async function getAdminDashboardCourse(courseId: string) {
  const course = await getCourseById(courseId);

  if (!course) {
    throw new AppError(404, "Course not found.", "COURSE_NOT_FOUND");
  }

  const [hydratedCourse] = await hydrateCourses([course]);
  return hydratedCourse;
}

export async function updateAdminDashboardCourse(
  courseId: string,
  action: AdminCourseAction
) {
  const payload: UpdateCoursePayload =
    action === "publish"
      ? {
          status: "published",
          is_published: true,
          deleted_at: null,
        }
      : action === "unpublish"
        ? {
            status: "draft",
            is_published: false,
            deleted_at: null,
          }
        : {
            status: "archived",
            is_published: false,
          };

  const updatedCourse = await updateCourseById(courseId, payload);

  if (!updatedCourse) {
    throw new AppError(404, "Course not found.", "COURSE_NOT_FOUND");
  }

  // Taking a course off the public site must also drop its cached landing preview, or the
  // unpublished content keeps rendering on the homepage.
  if (action !== "publish") {
    await clearLandingPreviewSnapshotForCourse(courseId);
  }

  const [hydratedCourse] = await hydrateCourseSummaries([updatedCourse]);
  return hydratedCourse;
}

export async function deleteAdminDashboardCourse(courseId: string) {
  const deletedCourse = await updateCourseById(courseId, {
    deleted_at: new Date().toISOString(),
    status: "archived",
    is_published: false,
  });

  if (!deletedCourse) {
    throw new AppError(404, "Course not found.", "COURSE_NOT_FOUND");
  }

  await clearLandingPreviewSnapshotForCourse(courseId);

  const [hydratedCourse] = await hydrateCourseSummaries([deletedCourse]);
  return hydratedCourse;
}

export async function permanentlyDeleteAdminDashboardCourse(courseId: string) {
  const course = await getCourseByIdIncludingDeleted(courseId);

  if (!course) {
    throw new AppError(404, "Course not found.", "COURSE_NOT_FOUND");
  }

  const modules = await listModules([course.id]);
  const moduleIds = modules.map((module) => module.id);
  const lessons = await listLessons(moduleIds);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const tests = await listTests(moduleIds);
  const testIds = tests.map((test) => test.id);
  const questions = await listQuestions(testIds);
  const questionIds = questions.map((question) => question.id);
  const exercises = await listExercisesByModuleIds(moduleIds);
  const exerciseIds = exercises.map((exercise) => exercise.id);

  await clearLandingSettingsForDeletedCourse(course.id, lessonIds);
  // The settings row above points the landing at a course; the snapshot is the cached render of
  // it. Clearing only the settings left the deleted course's content live on the public page.
  await clearLandingPreviewSnapshotForCourse(course.id);
  await deleteRowsByValues("user_test_results", "test_id", testIds, {
    optional: true,
    errorCode: "USER_TEST_RESULTS_DELETE_FAILED",
    errorMessage: "Unable to delete test results",
  });
  await deleteRowsByValues("user_exercise_results", "exercise_id", exerciseIds, {
    optional: true,
    errorCode: "USER_EXERCISE_RESULTS_DELETE_FAILED",
    errorMessage: "Unable to delete exercise results",
  });
  await deleteRowsByValues("test_answers", "question_id", questionIds, {
    errorCode: "TEST_ANSWERS_DELETE_FAILED",
    errorMessage: "Unable to delete test answers",
  });
  await deleteRowsByValues("test_questions", "test_id", testIds, {
    errorCode: "TEST_QUESTIONS_DELETE_FAILED",
    errorMessage: "Unable to delete test questions",
  });
  await deleteRowsByValues("test_entities", "module_id", moduleIds, {
    errorCode: "TESTS_DELETE_FAILED",
    errorMessage: "Unable to delete tests",
  });
  await deleteRowsByValues("exercise_content", "exercise_id", exerciseIds, {
    errorCode: "EXERCISE_CONTENT_DELETE_FAILED",
    errorMessage: "Unable to delete exercise content",
  });
  await deleteRowsByValues("exercises", "id", exerciseIds, {
    errorCode: "EXERCISES_DELETE_FAILED",
    errorMessage: "Unable to delete exercises",
  });
  await deleteRowsByValues("lesson_progress", "lesson_id", lessonIds, {
    errorCode: "LESSON_PROGRESS_DELETE_FAILED",
    errorMessage: "Unable to delete lesson progress",
  });
  await deleteRowsByValues("lesson_blocks", "lesson_id", lessonIds, {
    errorCode: "LESSON_BLOCKS_DELETE_FAILED",
    errorMessage: "Unable to delete lesson blocks",
  });
  await deleteRowsByValues("lessons", "id", lessonIds, {
    errorCode: "LESSONS_DELETE_FAILED",
    errorMessage: "Unable to delete lessons",
  });
  await deleteRowsByValues("modules", "id", moduleIds, {
    errorCode: "MODULES_DELETE_FAILED",
    errorMessage: "Unable to delete modules",
  });
  await deleteRowsByValues("course_progress", "course_id", [course.id], {
    errorCode: "COURSE_PROGRESS_DELETE_FAILED",
    errorMessage: "Unable to delete course progress",
  });

  const { error } = await supabaseAdmin.from("courses").delete().eq("id", course.id);

  if (error) {
    throw toServiceError(
      500,
      "COURSE_PERMANENT_DELETE_FAILED",
      "Unable to permanently delete course",
      error
    );
  }
}
