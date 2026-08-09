/**
 * The teacher dashboard API.
 *
 * Reads live in `teacherDashboard/repository`; the scoring helpers in
 * `teacherDashboard/resultScores`. What remains here is the join: turning per-course rows
 * into the per-student view the dashboard renders.
 */

import { AppError } from "../lib/appError";
import { groupByToMap as groupBy, groupCounts } from "../lib/collections";
import type { AuthenticatedRequestContext } from "../types/auth";
import {
  listCompletedLessonProgressByUsers,
  listCourseProgressByCourseIds,
  listExercises,
  listLessons,
  listModules,
  listOptionalUserTestResults,
  listStudentProfiles,
  listTeacherCourses,
  listTests,
} from "./teacherDashboard/repository";
import {
  getLatestCourseProgressRows,
  getLatestIsoDate,
  getNumericTestScore,
  getResultDate,
} from "./teacherDashboard/resultScores";
import type {
  TeacherDashboardCourseSummary,
  TeacherDashboardStudentCourseProgress,
  TeacherDashboardStudentsSummary,
  UserTestResultRow,
} from "./teacherDashboard/types";

export { getNumericTestScore } from "./teacherDashboard/resultScores";
export type {
  TeacherDashboardCourseSummary,
  TeacherDashboardStudent,
  TeacherDashboardStudentCourseProgress,
  TeacherDashboardStudentsCourse,
  TeacherDashboardStudentsSummary,
} from "./teacherDashboard/types";

function ensureTeacherAccess(auth: AuthenticatedRequestContext) {
  if (auth.isAdmin || auth.role === "teacher") {
    return;
  }

  throw new AppError(403, "Teacher access is required.", "TEACHER_REQUIRED");
}

export async function listTeacherDashboardCourses(
  auth: AuthenticatedRequestContext
): Promise<TeacherDashboardCourseSummary[]> {
  ensureTeacherAccess(auth);

  const courses = await listTeacherCourses(auth.userId);
  const courseIds = courses.map((course) => course.id);
  const modules = await listModules(courseIds);
  const moduleIds = modules.map((module) => module.id);
  const lessons = await listLessons(moduleIds);

  const moduleCountByCourseId = groupCounts(modules, (module) => module.course_id);
  const courseIdByModuleId = new Map(modules.map((module) => [module.id, module.course_id]));
  const lessonCountByCourseId = lessons.reduce((counts, lesson) => {
    const courseId = courseIdByModuleId.get(lesson.module_id);

    if (!courseId) {
      return counts;
    }

    counts.set(courseId, (counts.get(courseId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  return courses.map((course) => ({
    ...course,
    modulesCount: moduleCountByCourseId.get(course.id) ?? 0,
    lessonsCount: lessonCountByCourseId.get(course.id) ?? 0,
  }));
}

export async function listTeacherDashboardStudents(
  auth: AuthenticatedRequestContext
): Promise<TeacherDashboardStudentsSummary> {
  ensureTeacherAccess(auth);

  const courses = await listTeacherCourses(auth.userId);
  const courseIds = courses.map((course) => course.id);

  if (courseIds.length === 0) {
    return {
      students: [],
      courses: [],
      total_students_count: 0,
      total_course_views_count: 0,
      completed_course_views_count: 0,
    };
  }

  const [modules, rawCourseProgressRows] = await Promise.all([
    listModules(courseIds),
    listCourseProgressByCourseIds(courseIds),
  ]);
  const courseProgressRows = getLatestCourseProgressRows(rawCourseProgressRows);
  const studentIds = [...new Set(courseProgressRows.map((progress) => progress.user_id))];
  const moduleIds = modules.map((module) => module.id);
  const [lessons, tests, exercises, profilesById] = await Promise.all([
    listLessons(moduleIds),
    listTests(moduleIds),
    listExercises(moduleIds),
    listStudentProfiles(studentIds),
  ]);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const [lessonProgressRows, testResults] = await Promise.all([
    listCompletedLessonProgressByUsers(studentIds, lessonIds),
    listOptionalUserTestResults(
      studentIds,
      tests.map((test) => test.id)
    ),
  ]);

  const courseById = new Map(courses.map((course) => [course.id, course]));
  const courseIdByModuleId = new Map(modules.map((module) => [module.id, module.course_id]));
  const courseIdByLessonId = new Map(
    lessons.flatMap((lesson) => {
      const courseId = courseIdByModuleId.get(lesson.module_id);
      return courseId ? [[lesson.id, courseId] as const] : [];
    })
  );
  const courseIdByTestId = new Map(
    tests.flatMap((test) => {
      const courseId = courseIdByModuleId.get(test.module_id);
      return courseId ? [[test.id, courseId] as const] : [];
    })
  );
  const lessonsByCourseId = groupBy(lessons, (lesson) => {
    return courseIdByModuleId.get(lesson.module_id) ?? "";
  });
  lessonsByCourseId.delete("");
  const testCountByCourseId = groupCounts(tests, (test) => {
    return courseIdByModuleId.get(test.module_id) ?? "";
  });
  testCountByCourseId.delete("");
  const exerciseCountByCourseId = groupCounts(exercises, (exercise) => {
    return courseIdByModuleId.get(exercise.module_id) ?? "";
  });
  exerciseCountByCourseId.delete("");

  const completedLessonsByUserAndCourse = new Map<string, Set<string>>();

  for (const lessonProgress of lessonProgressRows) {
    const courseId = courseIdByLessonId.get(lessonProgress.lesson_id);

    if (!courseId) {
      continue;
    }

    const key = `${lessonProgress.user_id}:${courseId}`;
    const lessonIdsSet = completedLessonsByUserAndCourse.get(key) ?? new Set<string>();
    lessonIdsSet.add(lessonProgress.lesson_id);
    completedLessonsByUserAndCourse.set(key, lessonIdsSet);
  }

  const testResultsByUserAndCourse = new Map<string, UserTestResultRow[]>();

  for (const testResult of testResults) {
    if (!testResult.user_id || !testResult.test_id) {
      continue;
    }

    const courseId = courseIdByTestId.get(testResult.test_id);

    if (!courseId) {
      continue;
    }

    const key = `${testResult.user_id}:${courseId}`;
    const currentResults = testResultsByUserAndCourse.get(key) ?? [];
    currentResults.push(testResult);
    testResultsByUserAndCourse.set(key, currentResults);
  }

  const studentCoursesByStudentId = new Map<string, TeacherDashboardStudentCourseProgress[]>();

  for (const progressRow of courseProgressRows) {
    const course = courseById.get(progressRow.course_id);

    if (!course) {
      continue;
    }

    const userCourseKey = `${progressRow.user_id}:${course.id}`;
    const totalLessons = lessonsByCourseId.get(course.id)?.length ?? 0;
    const completedLessons =
      completedLessonsByUserAndCourse.get(userCourseKey)?.size ?? 0;
    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const courseTestResults = testResultsByUserAndCourse.get(userCourseKey) ?? [];
    const scores = courseTestResults
      .map(getNumericTestScore)
      .filter((score): score is number => score !== null);

    const studentCourse: TeacherDashboardStudentCourseProgress = {
      id: course.id,
      title: course.title,
      slug: course.slug,
      status: course.status,
      access_type: course.access_type,
      thumbnail_path: course.thumbnail_path,
      started_at: progressRow.started_at,
      finished_at: progressRow.finished_at,
      last_activity_at: getLatestIsoDate([
        progressRow.updated_at,
        progressRow.finished_at,
        progressRow.started_at,
      ]),
      completed_lessons_count: completedLessons,
      total_lessons_count: totalLessons,
      progress_percent: progressPercent,
      test_count: testCountByCourseId.get(course.id) ?? 0,
      exercise_count: exerciseCountByCourseId.get(course.id) ?? 0,
      test_results_count: courseTestResults.length,
      best_test_score: scores.length > 0 ? Math.max(...scores) : null,
      latest_test_result_at: getLatestIsoDate(courseTestResults.map(getResultDate)),
    };

    const currentCourses = studentCoursesByStudentId.get(progressRow.user_id) ?? [];
    currentCourses.push(studentCourse);
    studentCoursesByStudentId.set(progressRow.user_id, currentCourses);
  }

  const students = [...studentCoursesByStudentId.entries()]
    .map(([studentId, studentCourses]) => {
      const profile = profilesById.get(studentId);
      const sortedStudentCourses = [...studentCourses].sort((left, right) => {
        return (
          new Date(right.last_activity_at ?? right.started_at ?? 0).getTime() -
          new Date(left.last_activity_at ?? left.started_at ?? 0).getTime()
        );
      });
      const averageProgress =
        sortedStudentCourses.length > 0
          ? Math.round(
              sortedStudentCourses.reduce(
                (sum, course) => sum + course.progress_percent,
                0
              ) / sortedStudentCourses.length
            )
          : 0;

      return {
        id: studentId,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? "Student",
        created_at: profile?.created_at ?? null,
        courses: sortedStudentCourses,
        enrolled_courses_count: sortedStudentCourses.length,
        completed_courses_count: sortedStudentCourses.filter(
          (course) => course.finished_at !== null || course.progress_percent >= 100
        ).length,
        average_progress_percent: averageProgress,
      };
    })
    .sort((left, right) => {
      return right.average_progress_percent - left.average_progress_percent;
    });

  const coursesWithStudents = courses
    .map((course) => {
      const courseStudents = students.flatMap((student) => {
        const studentCourse = student.courses.find(
          (courseProgress) => courseProgress.id === course.id
        );

        return studentCourse
          ? [
              {
                ...studentCourse,
                id: student.id,
                full_name: student.full_name,
                email: student.email,
              },
            ]
          : [];
      });
      const averageProgress =
        courseStudents.length > 0
          ? Math.round(
              courseStudents.reduce((sum, student) => sum + student.progress_percent, 0) /
                courseStudents.length
            )
          : 0;

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        status: course.status,
        access_type: course.access_type,
        thumbnail_path: course.thumbnail_path,
        students_count: courseStudents.length,
        average_progress_percent: averageProgress,
        completed_students_count: courseStudents.filter(
          (student) => student.finished_at !== null || student.progress_percent >= 100
        ).length,
        test_count: testCountByCourseId.get(course.id) ?? 0,
        exercise_count: exerciseCountByCourseId.get(course.id) ?? 0,
        students: courseStudents.sort((left, right) => {
          return (
            new Date(right.last_activity_at ?? right.started_at ?? 0).getTime() -
            new Date(left.last_activity_at ?? left.started_at ?? 0).getTime()
          );
        }),
      };
    })
    .filter((course) => course.students_count > 0)
    .sort((left, right) => right.students_count - left.students_count);

  return {
    students,
    courses: coursesWithStudents,
    total_students_count: students.length,
    total_course_views_count: courseProgressRows.length,
    completed_course_views_count: courseProgressRows.filter(
      (progressRow) => progressRow.finished_at !== null
    ).length,
  };
}
