import { AppError, toServiceError } from "../lib/appError";
import { supabaseAdmin } from "../lib/supabase";
import type { AuthenticatedRequestContext, UserProfileRow } from "../types/auth";

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string;
  status: "draft" | "published" | "archived";
  access_type: "public" | "private" | "invite";
  slug: string;
  thumbnail_path: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ModuleRow = {
  id: string;
  course_id: string;
};

type LessonRow = {
  id: string;
  module_id: string;
};

type CourseProgressRow = {
  id: string;
  user_id: string;
  course_id: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

type LessonProgressRow = {
  user_id: string;
  lesson_id: string;
  is_completed: boolean;
};

type TestRow = {
  id: string;
  module_id: string;
};

type ExerciseRow = {
  id: string;
  module_id: string;
};

type UserTestResultRow = Record<string, unknown> & {
  user_id?: string | null;
  test_id?: string | null;
};

export type TeacherDashboardCourseSummary = CourseRow & {
  modulesCount: number;
  lessonsCount: number;
};

export type TeacherDashboardStudentCourseProgress = Pick<
  CourseRow,
  "id" | "title" | "slug" | "status" | "access_type" | "thumbnail_path"
> & {
  started_at: string | null;
  finished_at: string | null;
  last_activity_at: string | null;
  completed_lessons_count: number;
  total_lessons_count: number;
  progress_percent: number;
  test_count: number;
  exercise_count: number;
  test_results_count: number;
  best_test_score: number | null;
  latest_test_result_at: string | null;
};

export type TeacherDashboardStudent = {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string | null;
  courses: TeacherDashboardStudentCourseProgress[];
  enrolled_courses_count: number;
  completed_courses_count: number;
  average_progress_percent: number;
};

export type TeacherDashboardStudentsCourse = Pick<
  CourseRow,
  "id" | "title" | "slug" | "status" | "access_type" | "thumbnail_path"
> & {
  students_count: number;
  average_progress_percent: number;
  completed_students_count: number;
  test_count: number;
  exercise_count: number;
  students: Array<
    Pick<TeacherDashboardStudent, "id" | "full_name" | "email"> &
      TeacherDashboardStudentCourseProgress
  >;
};

export type TeacherDashboardStudentsSummary = {
  students: TeacherDashboardStudent[];
  courses: TeacherDashboardStudentsCourse[];
  total_students_count: number;
  total_course_views_count: number;
  completed_course_views_count: number;
};

function ensureTeacherAccess(auth: AuthenticatedRequestContext) {
  if (auth.isAdmin || auth.role === "teacher") {
    return;
  }

  throw new AppError(403, "Teacher access is required.", "TEACHER_REQUIRED");
}

function chunkValues<TValue>(values: TValue[], size = 50) {
  const chunks: TValue[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function groupCounts<TItem>(items: TItem[], getKey: (item: TItem) => string) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function groupBy<TItem>(items: TItem[], getKey: (item: TItem) => string) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    const currentItems = groups.get(key) ?? [];
    currentItems.push(item);
    groups.set(key, currentItems);
    return groups;
  }, new Map<string, TItem[]>());
}

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

async function listTeacherCourses(teacherId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("teacher_id", teacherId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to load teacher courses", error);
  }

  return (data ?? []) as CourseRow[];
}

async function listModules(courseIds: string[]) {
  if (courseIds.length === 0) {
    return [] as ModuleRow[];
  }

  const modules: ModuleRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("modules")
      .select("id,course_id")
      .in("course_id", chunk);

    if (error) {
      throw toServiceError(500, "MODULES_LIST_FAILED", "Unable to load modules", error);
    }

    modules.push(...((data ?? []) as ModuleRow[]));
  }

  return modules;
}

async function listLessons(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as LessonRow[];
  }

  const lessons: LessonRow[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("lessons")
      .select("id,module_id")
      .in("module_id", chunk);

    if (error) {
      throw toServiceError(500, "LESSONS_LIST_FAILED", "Unable to load lessons", error);
    }

    lessons.push(...((data ?? []) as LessonRow[]));
  }

  return lessons;
}

async function listCourseProgressByCourseIds(courseIds: string[]) {
  if (courseIds.length === 0) {
    return [] as CourseProgressRow[];
  }

  const progressRows: CourseProgressRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("course_progress")
      .select("*")
      .in("course_id", chunk)
      .order("updated_at", { ascending: false });

    if (error) {
      throw toServiceError(
        500,
        "COURSE_PROGRESS_LIST_FAILED",
        "Unable to load course progress",
        error
      );
    }

    progressRows.push(...((data ?? []) as CourseProgressRow[]));
  }

  return progressRows;
}

async function listStudentProfiles(studentIds: string[]) {
  if (studentIds.length === 0) {
    return new Map<string, UserProfileRow>();
  }

  const profiles: UserProfileRow[] = [];

  for (const chunk of chunkValues(studentIds)) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,role,created_at")
      .in("id", chunk);

    if (error) {
      throw toServiceError(500, "STUDENTS_LIST_FAILED", "Unable to load students", error);
    }

    profiles.push(...((data ?? []) as UserProfileRow[]));
  }

  return new Map(profiles.map((profile) => [profile.id, profile]));
}

async function listCompletedLessonProgressByUsers(
  userIds: string[],
  lessonIds: string[]
) {
  if (userIds.length === 0 || lessonIds.length === 0) {
    return [] as LessonProgressRow[];
  }

  const progressRows: LessonProgressRow[] = [];

  for (const lessonChunk of chunkValues(lessonIds)) {
    for (const userChunk of chunkValues(userIds)) {
      const { data, error } = await supabaseAdmin
        .from("lesson_progress")
        .select("user_id,lesson_id,is_completed")
        .eq("is_completed", true)
        .in("lesson_id", lessonChunk)
        .in("user_id", userChunk);

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
  }

  return progressRows;
}

async function listTests(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as TestRow[];
  }

  const tests: TestRow[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_entities")
      .select("id,module_id")
      .in("module_id", chunk);

    if (error) {
      throw toServiceError(500, "TESTS_LIST_FAILED", "Unable to load tests", error);
    }

    tests.push(...((data ?? []) as TestRow[]));
  }

  return tests;
}

async function listExercises(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as ExerciseRow[];
  }

  const exercises: ExerciseRow[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("exercises")
      .select("id,module_id")
      .in("module_id", chunk);

    if (error) {
      throw toServiceError(
        500,
        "EXERCISES_LIST_FAILED",
        "Unable to load exercises",
        error
      );
    }

    exercises.push(...((data ?? []) as ExerciseRow[]));
  }

  return exercises;
}

async function listOptionalUserTestResults(userIds: string[], testIds: string[]) {
  if (userIds.length === 0 || testIds.length === 0) {
    return [] as UserTestResultRow[];
  }

  const results: UserTestResultRow[] = [];

  for (const userChunk of chunkValues(userIds)) {
    for (const testChunk of chunkValues(testIds)) {
      const { data, error } = await supabaseAdmin
        .from("user_test_results")
        .select("*")
        .in("user_id", userChunk)
        .in("test_id", testChunk);

      if (error) {
        if (isMissingOptionalRelationError(error)) {
          return [];
        }

        console.warn("[teacher-dashboard] Unable to load user test results", error);
        return [];
      }

      results.push(...((data ?? []) as UserTestResultRow[]));
    }
  }

  return results;
}

function getLatestCourseProgressRows(progressRows: CourseProgressRow[]) {
  const progressByUserAndCourse = new Map<string, CourseProgressRow>();

  for (const progressRow of progressRows) {
    const key = `${progressRow.user_id}:${progressRow.course_id}`;
    const currentProgress = progressByUserAndCourse.get(key);

    if (
      !currentProgress ||
      new Date(progressRow.updated_at).getTime() >
        new Date(currentProgress.updated_at).getTime()
    ) {
      progressByUserAndCourse.set(key, progressRow);
    }
  }

  return [...progressByUserAndCourse.values()];
}

export function getNumericTestScore(result: UserTestResultRow) {
  const rawValue =
    result.score_percent ??
    result.percentage ??
    result.percent ??
    result.score ??
    result.result;

  if (typeof rawValue !== "number" || Number.isNaN(rawValue)) {
    return null;
  }

  // Scores are written as an integer percentage (scoreSubmission rounds correct/total * 100), but
  // older rows may hold a 0-1 fraction. Only a NON-integer in that range can be a fraction: an
  // integer 1 is a legitimate 1%, and treating it as 0.01 rendered the worst possible non-zero
  // score as a perfect 100.
  const isFraction = rawValue > 0 && rawValue < 1 && !Number.isInteger(rawValue);

  return isFraction ? Math.round(rawValue * 100) : Math.round(rawValue);
}

function getResultDate(result: UserTestResultRow) {
  const rawValue =
    result.completed_at ?? result.submitted_at ?? result.created_at ?? result.updated_at;

  return typeof rawValue === "string" ? rawValue : null;
}

function getLatestIsoDate(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
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
