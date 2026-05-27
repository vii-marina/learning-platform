import { AppError } from "../lib/appError";
import { isAdminRole } from "../lib/roles";
import { supabaseAdmin } from "../lib/supabase";
import type { NormalizedUser, UserProfileRow } from "../types/auth";

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string | null;
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
  title: string;
  order: number;
  created_at: string;
  updated_at: string;
};

type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  content_type: string | null;
  order: number;
  created_at: string;
  updated_at: string;
};

type LessonBlockRow = {
  id: string;
  lesson_id: string;
  block_type: string;
  content: Record<string, unknown>;
  order: number;
  created_at: string;
  updated_at: string;
};

type TestEntityRow = {
  id: string;
  after_lesson_id: string | null;
  module_id: string;
  title: string;
  order: number;
  created_at: string;
  updated_at: string;
};

type TestQuestionRow = {
  id: string;
  test_id: string;
  type: string;
  question_text: string;
  order: number;
  hint: string | null;
  created_at: string;
};

type TestAnswerRow = {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  created_at: string;
};

type CourseProgressRow = {
  course_id: string;
  user_id: string;
  finished_at: string | null;
};

type UpdateCoursePayload = Partial<
  Pick<CourseRow, "status" | "is_published" | "deleted_at">
>;

export type AdminCourseAction = "publish" | "unpublish" | "archive";

const profileSelect = "id,email,full_name,role,created_at";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toServiceError(statusCode: number, code: string, fallbackMessage: string, error: { message: string }) {
  return new AppError(statusCode, `${fallbackMessage}: ${error.message}`, code);
}

function toNormalizedUser(profile: UserProfileRow): NormalizedUser {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    isAdmin: isAdminRole(profile.role),
    isSuperAdmin: profile.role === "super-admin",
    createdAt: profile.created_at,
  };
}

function groupBy<TItem>(items: TItem[], getKey: (item: TItem) => string | null) {
  const map = new Map<string, TItem[]>();

  for (const item of items) {
    const key = getKey(item);

    if (!key) {
      continue;
    }

    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }

  return map;
}

function chunkValues<TValue>(values: TValue[], size = 50) {
  const chunks: TValue[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function isUuidValue(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

async function listCourses() {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to list courses", error);
  }

  return (data ?? []) as CourseRow[];
}

async function getCourseById(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "COURSE_FETCH_FAILED", "Unable to load course", error);
  }

  return (data as CourseRow | null) ?? null;
}

async function updateCourseById(courseId: string, payload: UpdateCoursePayload) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .update(payload)
    .eq("id", courseId)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "COURSE_UPDATE_FAILED", "Unable to update course", error);
  }

  return (data as CourseRow | null) ?? null;
}

async function listProfilesByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, NormalizedUser>();
  }

  const profiles: UserProfileRow[] = [];

  for (const chunk of chunkValues(ids)) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(profileSelect)
      .in("id", chunk);

    if (error) {
      throw toServiceError(500, "COURSE_TEACHERS_FETCH_FAILED", "Unable to load course teachers", error);
    }

    profiles.push(...((data ?? []) as UserProfileRow[]));
  }

  const users = profiles.map(toNormalizedUser);
  return new Map(users.map((user) => [user.id, user]));
}

async function listModules(courseIds: string[]) {
  if (courseIds.length === 0) {
    return [] as ModuleRow[];
  }

  const modules: ModuleRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("modules")
      .select("*")
      .in("course_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(500, "MODULES_LIST_FAILED", "Unable to list modules", error);
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
      .select("*")
      .in("module_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(500, "LESSONS_LIST_FAILED", "Unable to list lessons", error);
    }

    lessons.push(...((data ?? []) as LessonRow[]));
  }

  return lessons;
}

async function listCourseProgress(courseIds: string[]) {
  if (courseIds.length === 0) {
    return [] as CourseProgressRow[];
  }

  const progressRows: CourseProgressRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("course_progress")
      .select("course_id,user_id,finished_at")
      .in("course_id", chunk);

    if (error) {
      throw toServiceError(
        500,
        "COURSE_PROGRESS_LIST_FAILED",
        "Unable to list course enrollments",
        error
      );
    }

    progressRows.push(...((data ?? []) as CourseProgressRow[]));
  }

  return progressRows;
}

function buildCourseEnrollmentStats(progressRows: CourseProgressRow[]) {
  const statsByCourseId = new Map<
    string,
    { enrolledStudentCount: number; completedStudentCount: number }
  >();
  const seenStudentCoursePairs = new Set<string>();

  for (const row of progressRows) {
    const key = `${row.course_id}:${row.user_id}`;

    if (seenStudentCoursePairs.has(key)) {
      continue;
    }

    seenStudentCoursePairs.add(key);
    const stats = statsByCourseId.get(row.course_id) ?? {
      enrolledStudentCount: 0,
      completedStudentCount: 0,
    };

    stats.enrolledStudentCount += 1;

    if (row.finished_at) {
      stats.completedStudentCount += 1;
    }

    statsByCourseId.set(row.course_id, stats);
  }

  return statsByCourseId;
}

async function listLessonBlocks(lessonIds: string[]) {
  if (lessonIds.length === 0) {
    return [] as LessonBlockRow[];
  }

  const blocks: LessonBlockRow[] = [];

  for (const chunk of chunkValues(lessonIds)) {
    const { data, error } = await supabaseAdmin
      .from("lesson_blocks")
      .select("*")
      .in("lesson_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(500, "LESSON_BLOCKS_LIST_FAILED", "Unable to list lesson blocks", error);
    }

    blocks.push(...((data ?? []) as LessonBlockRow[]));
  }

  return blocks;
}

async function listTests(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as TestEntityRow[];
  }

  const tests: TestEntityRow[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_entities")
      .select("*")
      .in("module_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(500, "TESTS_LIST_FAILED", "Unable to list module tests", error);
    }

    tests.push(...((data ?? []) as TestEntityRow[]));
  }

  return tests;
}

async function listQuestions(testIds: string[]) {
  if (testIds.length === 0) {
    return [] as TestQuestionRow[];
  }

  const questions: TestQuestionRow[] = [];

  for (const chunk of chunkValues(testIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_questions")
      .select("*")
      .in("test_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(500, "QUESTIONS_LIST_FAILED", "Unable to list test questions", error);
    }

    questions.push(...((data ?? []) as TestQuestionRow[]));
  }

  return questions;
}

async function listAnswers(questionIds: string[]) {
  if (questionIds.length === 0) {
    return [] as TestAnswerRow[];
  }

  const answers: TestAnswerRow[] = [];

  for (const chunk of chunkValues(questionIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_answers")
      .select("*")
      .in("question_id", chunk);

    if (error) {
      throw toServiceError(500, "ANSWERS_LIST_FAILED", "Unable to list test answers", error);
    }

    answers.push(...((data ?? []) as TestAnswerRow[]));
  }

  return answers;
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
}
