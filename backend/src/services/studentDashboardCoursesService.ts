import { AppError } from "../lib/appError";
import { supabaseAdmin } from "../lib/supabase";
import type { AuthenticatedRequestContext, UserProfileRow } from "../types/auth";
import { getLandingPageSettings } from "./landingPageSettingsService";

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

type LessonProgressRecord = LessonProgressRow & {
  id: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TeacherProfileRow = {
  id: string;
  headline: string | null;
  bio: string | null;
  specialization: string | null;
  experience_years: number | null;
  education: string | null;
  gender: string | null;
  birth_date?: string | null;
  avatar_path: string | null;
  linkedin_url: string | null;
  github_url: string | null;
} & Record<string, unknown>;

type StudentCourseLessonBlock = {
  id: string;
  lesson_id: string;
  block_type: string;
  content: Record<string, unknown>;
  order: number;
  created_at: string;
  updated_at: string;
};

type StudentCourseTestEntity = {
  id: string;
  after_lesson_id: string | null;
  module_id: string;
  title: string;
  order: number;
  created_at: string;
  updated_at: string;
};

type StudentTestResultRow = {
  user_id: string;
  test_id: string;
  score: number | null;
  passed: boolean | null;
  updated_at: string;
};

type StudentCourseTestQuestion = {
  id: string;
  test_id: string;
  type: "true_false" | "single_choice" | "multiple_choice";
  question_text: string;
  order: number;
  hint: string | null;
  created_at: string;
};

type StudentCourseTestAnswer = {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  created_at: string;
};

type StudentCourseExerciseBase = {
  id: string;
  module_id: string;
  after_lesson_id: string | null;
  type: "drag_drop_code" | "write_code";
  title: string;
  position: number | null;
  created_at: string;
};

type StudentCourseExerciseContent = {
  id: string;
  exercise_id: string;
  content: Record<string, unknown>;
  created_at: string;
};

type StudentCourseExercise = {
  id: string;
  module_id: string;
  after_lesson_id: string | null;
  type: "drag_drop_code" | "write_code";
  title: string;
  description: string | null;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type StudentExerciseResultRow = {
  user_id: string;
  exercise_id: string;
  is_completed: boolean;
  attempts: number;
  completed_at: string | null;
  updated_at: string;
};

type HydratedStudentCourseTestQuestion = StudentCourseTestQuestion & {
  answers: StudentCourseTestAnswer[];
};

type HydratedStudentCourseTest = StudentCourseTestEntity & {
  questions: HydratedStudentCourseTestQuestion[];
};

export type StudentDashboardCourseSummary = {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string | null;
  teacher_name: string;
  slug: string;
  thumbnail_path: string | null;
  access_type: "public" | "private" | "invite";
  status: "draft" | "published" | "archived";
  is_published: boolean;
  module_count: number;
  lesson_count: number;
  test_count: number;
  exercise_count: number;
  completed_tests_count: number;
  test_progress_percent: number;
  completed_exercises_count: number;
  exercise_progress_percent: number;
  completed_lessons_count: number;
  total_lessons_count: number;
  progress_percent: number;
  started_at: string | null;
  finished_at: string | null;
  teacher_headline: string | null;
  teacher_bio: string | null;
  teacher_specialization: string | null;
  teacher_experience_years: number | null;
  teacher_education: string | null;
  teacher_gender: string | null;
  teacher_birth_date: string | null;
  teacher_avatar_path: string | null;
  teacher_linkedin_url: string | null;
  teacher_github_url: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentCourseDetails = {
  course: StudentDashboardCourseSummary;
  modules: ModuleRow[];
  lessons_by_module: Record<string, LessonRow[]>;
  lesson_blocks_by_lesson: Record<string, StudentCourseLessonBlock[]>;
  tests_by_module: Record<string, HydratedStudentCourseTest[]>;
  exercises_by_module: Record<string, StudentCourseExercise[]>;
  completed_lesson_ids: string[];
  completed_exercise_ids: string[];
};

export type PublicLandingLessonPreviewQuery = {
  courseId?: string;
  lessonId?: string;
  lessonTitle?: string;
  allowAnySelectedCourse?: boolean;
};

export type PublicLandingLessonPreview = {
  course: Pick<CourseRow, "id" | "title" | "description" | "slug" | "thumbnail_path">;
  module: ModuleRow;
  lesson: LessonRow;
  module_lessons: LessonRow[];
  test: HydratedStudentCourseTest | null;
  exercise: StudentCourseExercise | null;
};

export type StudentLessonCompletionResult = {
  course: StudentDashboardCourseSummary;
  completed_lesson_ids: string[];
};

export type StudentTestCompletionResult = {
  test_result: {
    test_id: string;
    score: number;
    passed: boolean;
    updated_at: string;
  };
};

export type StudentExerciseCompletionResult = {
  course: StudentDashboardCourseSummary;
  completed_exercise_ids: string[];
};

const profileSelect = "id,full_name,email";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toServiceError(
  statusCode: number,
  code: string,
  fallbackMessage: string,
  error: { message: string }
) {
  return new AppError(statusCode, `${fallbackMessage}: ${error.message}`, code);
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

function groupCounts<TItem>(
  items: TItem[],
  getKey: (item: TItem) => string
) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

async function listPublishedPublicCourses() {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .is("deleted_at", null)
    .eq("access_type", "public")
    .or("status.eq.published,is_published.eq.true")
    .order("updated_at", { ascending: false });

  if (error) {
    throw toServiceError(
      500,
      "PUBLIC_COURSES_LIST_FAILED",
      "Unable to load public courses",
      error
    );
  }

  return (data ?? []) as CourseRow[];
}

async function listCourseProgressByUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("course_progress")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw toServiceError(
      500,
      "COURSE_PROGRESS_LIST_FAILED",
      "Unable to load course progress",
      error
    );
  }

  return (data ?? []) as CourseProgressRow[];
}

async function getPublishedPublicCourse(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .is("deleted_at", null)
    .eq("access_type", "public")
    .or("status.eq.published,is_published.eq.true")
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "COURSE_FETCH_FAILED", "Unable to load course", error);
  }

  if (!data) {
    throw new AppError(
      404,
      "Published public course was not found.",
      "COURSE_NOT_FOUND"
    );
  }

  return data as CourseRow;
}

async function getAnyLandingPreviewCourse(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "COURSE_FETCH_FAILED", "Unable to load course", error);
  }

  if (!data) {
    throw new AppError(404, "Landing course was not found.", "COURSE_NOT_FOUND");
  }

  return data as CourseRow;
}

async function getPublishedCourse(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .is("deleted_at", null)
    .or("status.eq.published,is_published.eq.true")
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "COURSE_FETCH_FAILED", "Unable to load course", error);
  }

  if (!data) {
    throw new AppError(404, "Published course was not found.", "COURSE_NOT_FOUND");
  }

  return data as CourseRow;
}

async function ensureStudentCourseAccess(userId: string, course: CourseRow) {
  if (course.access_type === "public") {
    return null;
  }

  const progress = await getCourseProgressByUserAndCourse(userId, course.id);

  if (progress) {
    return progress;
  }

  throw new AppError(403, "You do not have access to this course.", "COURSE_ACCESS_DENIED");
}

async function listPublishedCoursesByIds(courseIds: string[]) {
  if (courseIds.length === 0) {
    return [] as CourseRow[];
  }

  const courses: CourseRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("*")
      .in("id", chunk)
      .is("deleted_at", null)
      .or("status.eq.published,is_published.eq.true");

    if (error) {
      throw toServiceError(
        500,
        "COURSES_LIST_FAILED",
        "Unable to load enrolled courses",
        error
      );
    }

    courses.push(...((data ?? []) as CourseRow[]));
  }

  const courseById = new Map(courses.map((course) => [course.id, course]));
  return courseIds.flatMap((courseId) => {
    const course = courseById.get(courseId);
    return course ? [course] : [];
  });
}

async function getCourseProgressByUserAndCourse(userId: string, courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("course_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toServiceError(
      500,
      "COURSE_PROGRESS_FETCH_FAILED",
      "Unable to load course progress",
      error
    );
  }

  return (data as CourseProgressRow | null) ?? null;
}

async function createCourseProgress(userId: string, courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("course_progress")
    .insert({
      user_id: userId,
      course_id: courseId,
      started_at: new Date().toISOString(),
      finished_at: null,
    })
    .select("*")
    .single();

  if (error) {
    if ("code" in error && error.code === "23505") {
      const existingProgress = await getCourseProgressByUserAndCourse(userId, courseId);

      if (existingProgress) {
        return existingProgress;
      }
    }

    throw toServiceError(
      500,
      "COURSE_PROGRESS_CREATE_FAILED",
      "Unable to start course",
      error
    );
  }

  return data as CourseProgressRow;
}

async function getLessonProgressByUserAndLesson(userId: string, lessonId: string) {
  const { data, error } = await supabaseAdmin
    .from("lesson_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) {
    throw toServiceError(
      500,
      "LESSON_PROGRESS_FETCH_FAILED",
      "Unable to load lesson progress",
      error
    );
  }

  return (data as LessonProgressRecord | null) ?? null;
}

async function markLessonProgressCompleted(userId: string, lessonId: string) {
  const now = new Date().toISOString();
  const existingProgress = await getLessonProgressByUserAndLesson(userId, lessonId);

  if (existingProgress) {
    const { error } = await supabaseAdmin
      .from("lesson_progress")
      .update({
        is_completed: true,
        completed_at: existingProgress.completed_at ?? now,
        updated_at: now,
      })
      .eq("id", existingProgress.id);

    if (error) {
      throw toServiceError(
        500,
        "LESSON_PROGRESS_UPDATE_FAILED",
        "Unable to complete lesson",
        error
      );
    }

    return;
  }

  const { error } = await supabaseAdmin
    .from("lesson_progress")
    .insert({
      user_id: userId,
      lesson_id: lessonId,
      is_completed: true,
      completed_at: now,
      updated_at: now,
    });

  if (error) {
    if ("code" in error && error.code === "23505") {
      await markLessonProgressCompleted(userId, lessonId);
      return;
    }

    throw toServiceError(
      500,
      "LESSON_PROGRESS_CREATE_FAILED",
      "Unable to complete lesson",
      error
    );
  }
}

async function updateCourseProgressAfterLessonCompletion(
  courseProgress: CourseProgressRow,
  isCourseCompleted: boolean
) {
  const now = new Date().toISOString();
  const payload: Record<string, string> = {
    updated_at: now,
  };

  if (isCourseCompleted && !courseProgress.finished_at) {
    payload.finished_at = now;
  }

  const { data, error } = await supabaseAdmin
    .from("course_progress")
    .update(payload)
    .eq("id", courseProgress.id)
    .select("*")
    .single();

  if (error) {
    throw toServiceError(
      500,
      "COURSE_PROGRESS_UPDATE_FAILED",
      "Unable to update course progress",
      error
    );
  }

  return data as CourseProgressRow;
}

// ---------------------------------------------------------------------------
// Server-side test grading (R15): the score is computed here from the student's
// selected option indexes vs. the stored answers — never trusted from the client.
// Mirrors the client's scoring rule exactly (CoursePreviewTestModal /
// CoursePreviewLessonContent) so a submission grades identically:
//   - option index order = answers sorted by created_at asc (same as the
//     student-details endpoint that rendered the options);
//   - true_false → [0] for the correct "true" answer, [1] for "false";
//   - a question is correct iff the selected index set equals the correct set.
// ---------------------------------------------------------------------------
type GradingQuestionRow = { id: string; type: string };
type GradingAnswerRow = {
  question_id: string;
  answer_text: string;
  is_correct: boolean;
};

function computeCorrectIndexes(type: string, answers: GradingAnswerRow[]): number[] {
  if (type === "true_false") {
    const correctAnswer = answers.find((answer) => answer.is_correct);
    if (!correctAnswer) {
      return [];
    }
    return correctAnswer.answer_text.trim().toLowerCase() === "false" ? [1] : [0];
  }

  return answers.reduce<number[]>((indexes, answer, index) => {
    if (answer.is_correct) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

function isQuestionAnsweredCorrectly(correctIndexes: number[], selectedRaw: number[]): boolean {
  const selected = Array.from(new Set(selectedRaw));
  return (
    selected.length === correctIndexes.length &&
    selected.every((index) => correctIndexes.includes(index))
  );
}

async function gradeTestSubmission(
  testId: string,
  submittedAnswers: Record<string, number[]>
): Promise<number> {
  const { data: questions, error: questionsError } = await supabaseAdmin
    .from("test_questions")
    .select("id,type")
    .eq("test_id", testId)
    .order("order", { ascending: true });

  if (questionsError) {
    throw toServiceError(
      500,
      "TEST_QUESTIONS_FETCH_FAILED",
      "Unable to load test questions",
      questionsError
    );
  }

  const questionRows = (questions ?? []) as GradingQuestionRow[];
  if (questionRows.length === 0) {
    return 0;
  }

  const questionIds = questionRows.map((question) => question.id);
  const { data: answers, error: answersError } = await supabaseAdmin
    .from("test_answers")
    .select("question_id,answer_text,is_correct")
    .in("question_id", questionIds)
    .order("created_at", { ascending: true });

  if (answersError) {
    throw toServiceError(
      500,
      "TEST_ANSWERS_FETCH_FAILED",
      "Unable to load test answers",
      answersError
    );
  }

  const answersByQuestionId = new Map<string, GradingAnswerRow[]>();
  for (const answer of (answers ?? []) as GradingAnswerRow[]) {
    const list = answersByQuestionId.get(answer.question_id) ?? [];
    list.push(answer);
    answersByQuestionId.set(answer.question_id, list);
  }

  const correctCount = questionRows.reduce((count, question) => {
    const correctIndexes = computeCorrectIndexes(
      question.type,
      answersByQuestionId.get(question.id) ?? []
    );
    const selected = submittedAnswers[question.id] ?? [];
    return isQuestionAnsweredCorrectly(correctIndexes, selected) ? count + 1 : count;
  }, 0);

  return Math.round((correctCount / questionRows.length) * 100);
}

async function upsertUserTestResult(
  userId: string,
  testId: string,
  scorePercent: number
) {
  const now = new Date().toISOString();
  const passed = scorePercent >= 70;
  const payload = {
    user_id: userId,
    test_id: testId,
    score: scorePercent,
    passed,
    updated_at: now,
  };

  const { data: existingResult, error: existingError } = await supabaseAdmin
    .from("user_test_results")
    .select("id")
    .eq("user_id", userId)
    .eq("test_id", testId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw toServiceError(
      500,
      "TEST_RESULT_FETCH_FAILED",
      "Unable to load test result",
      existingError
    );
  }

  const resultId =
    existingResult &&
    typeof existingResult === "object" &&
    "id" in existingResult &&
    typeof existingResult.id === "string"
      ? existingResult.id
      : null;
  const { error } = resultId
    ? await supabaseAdmin
        .from("user_test_results")
        .update(payload)
        .eq("id", resultId)
    : await supabaseAdmin
        .from("user_test_results")
        .insert(payload);

  if (error) {
    throw toServiceError(
      500,
      "TEST_RESULT_SAVE_FAILED",
      "Unable to save test result",
      error
    );
  }

  return {
    test_id: testId,
    score: scorePercent,
    passed,
    updated_at: now,
  };
}

async function upsertUserExerciseResult(userId: string, exerciseId: string) {
  const now = new Date().toISOString();
  const { data: existingResult, error: existingError } = await supabaseAdmin
    .from("user_exercise_results")
    .select("id,attempts,completed_at")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw toServiceError(
      500,
      "EXERCISE_RESULT_FETCH_FAILED",
      "Unable to load exercise result",
      existingError
    );
  }

  const result =
    existingResult && typeof existingResult === "object"
      ? (existingResult as { id?: unknown; attempts?: unknown; completed_at?: unknown })
      : null;
  const resultId = typeof result?.id === "string" ? result.id : null;
  const attempts =
    typeof result?.attempts === "number" && Number.isFinite(result.attempts)
      ? result.attempts + 1
      : 1;
  const completedAt = typeof result?.completed_at === "string" ? result.completed_at : now;
  const payload = {
    user_id: userId,
    exercise_id: exerciseId,
    is_completed: true,
    attempts,
    completed_at: completedAt,
    updated_at: now,
  };
  const { error } = resultId
    ? await supabaseAdmin
        .from("user_exercise_results")
        .update(payload)
        .eq("id", resultId)
    : await supabaseAdmin
        .from("user_exercise_results")
        .insert(payload);

  if (error) {
    throw toServiceError(
      500,
      "EXERCISE_RESULT_SAVE_FAILED",
      "Unable to save exercise result",
      error
    );
  }
}

async function listTeacherNamesById(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const profiles: UserProfileRow[] = [];

  for (const chunk of chunkValues(ids)) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(profileSelect)
      .in("id", chunk);

    if (error) {
      throw toServiceError(500, "TEACHERS_FETCH_FAILED", "Unable to load teachers", error);
    }

    profiles.push(...((data ?? []) as UserProfileRow[]));
  }

  return new Map(
    profiles.map((profile) => [
      profile.id,
      profile.full_name?.trim() || profile.email || "Platform instructor",
    ])
  );
}

async function listTeacherProfilesById(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, TeacherProfileRow>();
  }

  const profiles: TeacherProfileRow[] = [];

  for (const chunk of chunkValues(ids)) {
    const { data, error } = await supabaseAdmin
      .from("teacher_profiles")
      .select(
        "id,headline,bio,specialization,experience_years,education,gender,birth_date,avatar_path,linkedin_url,github_url"
      )
      .in("id", chunk);

    if (error) {
      const message = error.message.toLowerCase();
      const isMissingRelation =
        "code" in error &&
        (error.code === "PGRST205" ||
          error.code === "42P01" ||
          (message.includes("teacher_profiles") &&
            (message.includes("does not exist") ||
              message.includes("could not find the table"))));

      if (isMissingRelation) {
        return new Map<string, TeacherProfileRow>();
      }

      throw toServiceError(
        500,
        "TEACHER_PROFILES_FETCH_FAILED",
        "Unable to load teacher profiles",
        error
      );
    }

    profiles.push(...((data ?? []) as TeacherProfileRow[]));
  }

  return new Map(profiles.map((profile) => [profile.id, profile]));
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

async function listFullLessons(moduleIds: string[]) {
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
      throw toServiceError(500, "LESSONS_LIST_FAILED", "Unable to load lessons", error);
    }

    lessons.push(...((data ?? []) as LessonRow[]));
  }

  return lessons;
}

async function listTestRowsByModuleIds(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as Array<Pick<StudentCourseTestEntity, "id" | "module_id">>;
  }

  const tests: Array<Pick<StudentCourseTestEntity, "id" | "module_id">> = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_entities")
      .select("id,module_id")
      .in("module_id", chunk);

    if (error) {
      throw toServiceError(500, "TESTS_LIST_FAILED", "Unable to load tests", error);
    }

    tests.push(...((data ?? []) as Array<Pick<StudentCourseTestEntity, "id" | "module_id">>));
  }

  return tests;
}

async function listUserTestResults(userId: string | undefined, testIds: string[]) {
  if (!userId || testIds.length === 0) {
    return [] as StudentTestResultRow[];
  }

  const results: StudentTestResultRow[] = [];

  for (const chunk of chunkValues(testIds)) {
    const { data, error } = await supabaseAdmin
      .from("user_test_results")
      .select("user_id,test_id,score,passed,updated_at")
      .eq("user_id", userId)
      .in("test_id", chunk);

    if (error) {
      throw toServiceError(
        500,
        "TEST_RESULTS_LIST_FAILED",
        "Unable to load test progress",
        error
      );
    }

    results.push(...((data ?? []) as StudentTestResultRow[]));
  }

  return results;
}

async function listExerciseRowsByModuleIds(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as Array<Pick<StudentCourseExercise, "id" | "module_id">>;
  }

  const exercises: Array<Pick<StudentCourseExercise, "id" | "module_id">> = [];

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

    exercises.push(...((data ?? []) as Array<Pick<StudentCourseExercise, "id" | "module_id">>));
  }

  return exercises;
}

async function listUserExerciseResults(
  userId: string | undefined,
  exerciseIds: string[]
) {
  if (!userId || exerciseIds.length === 0) {
    return [] as StudentExerciseResultRow[];
  }

  const results: StudentExerciseResultRow[] = [];

  for (const chunk of chunkValues(exerciseIds)) {
    const { data, error } = await supabaseAdmin
      .from("user_exercise_results")
      .select("user_id,exercise_id,is_completed,attempts,completed_at,updated_at")
      .eq("user_id", userId)
      .eq("is_completed", true)
      .in("exercise_id", chunk);

    if (error) {
      throw toServiceError(
        500,
        "EXERCISE_RESULTS_LIST_FAILED",
        "Unable to load exercise progress",
        error
      );
    }

    results.push(...((data ?? []) as StudentExerciseResultRow[]));
  }

  return results;
}

async function listLessonBlocks(lessonIds: string[]) {
  if (lessonIds.length === 0) {
    return [] as StudentCourseLessonBlock[];
  }

  const lessonBlocks: StudentCourseLessonBlock[] = [];

  for (const chunk of chunkValues(lessonIds)) {
    const { data, error } = await supabaseAdmin
      .from("lesson_blocks")
      .select("*")
      .in("lesson_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(
        500,
        "LESSON_BLOCKS_LIST_FAILED",
        "Unable to load lesson blocks",
        error
      );
    }

    lessonBlocks.push(...((data ?? []) as StudentCourseLessonBlock[]));
  }

  return lessonBlocks;
}

async function listTestsByModuleIds(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as HydratedStudentCourseTest[];
  }

  const tests: StudentCourseTestEntity[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_entities")
      .select("*")
      .in("module_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(500, "TESTS_LIST_FAILED", "Unable to load tests", error);
    }

    tests.push(...((data ?? []) as StudentCourseTestEntity[]));
  }

  if (tests.length === 0) {
    return [];
  }

  const questions: StudentCourseTestQuestion[] = [];
  const testIds = tests.map((test) => test.id);

  for (const chunk of chunkValues(testIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_questions")
      .select("*")
      .in("test_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(
        500,
        "TEST_QUESTIONS_LIST_FAILED",
        "Unable to load test questions",
        error
      );
    }

    questions.push(...((data ?? []) as StudentCourseTestQuestion[]));
  }

  const answers: StudentCourseTestAnswer[] = [];
  const questionIds = questions.map((question) => question.id);

  for (const chunk of chunkValues(questionIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_answers")
      .select("*")
      .in("question_id", chunk)
      .order("created_at", { ascending: true });

    if (error) {
      throw toServiceError(
        500,
        "TEST_ANSWERS_LIST_FAILED",
        "Unable to load test answers",
        error
      );
    }

    answers.push(...((data ?? []) as StudentCourseTestAnswer[]));
  }

  const answersByQuestionId = groupBy(answers, (answer) => answer.question_id);
  const questionsByTestId = groupBy(
    questions.map((question) => ({
      ...question,
      answers: answersByQuestionId[question.id] ?? [],
    })),
    (question) => question.test_id
  );

  return tests.map((test) => ({
    ...test,
    questions: questionsByTestId[test.id] ?? [],
  }));
}

async function listExercisesByModuleIds(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as StudentCourseExercise[];
  }

  const exercises: StudentCourseExerciseBase[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("exercises")
      .select("id,module_id,after_lesson_id,type,title,position,created_at")
      .in("module_id", chunk)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throw toServiceError(500, "EXERCISES_LIST_FAILED", "Unable to load exercises", error);
    }

    exercises.push(...((data ?? []) as StudentCourseExerciseBase[]));
  }

  if (exercises.length === 0) {
    return [];
  }

  const exerciseContentRows: StudentCourseExerciseContent[] = [];

  for (const chunk of chunkValues(exercises.map((exercise) => exercise.id))) {
    const { data, error } = await supabaseAdmin
      .from("exercise_content")
      .select("id,exercise_id,content,created_at")
      .in("exercise_id", chunk)
      .order("created_at", { ascending: false });

    if (error) {
      throw toServiceError(
        500,
        "EXERCISE_CONTENT_LIST_FAILED",
        "Unable to load exercise content",
        error
      );
    }

    exerciseContentRows.push(...((data ?? []) as StudentCourseExerciseContent[]));
  }

  const latestContentByExerciseId = new Map<string, StudentCourseExerciseContent>();

  for (const contentRow of exerciseContentRows) {
    if (!latestContentByExerciseId.has(contentRow.exercise_id)) {
      latestContentByExerciseId.set(contentRow.exercise_id, contentRow);
    }
  }

  return exercises.map((exercise) => {
    const contentRow = latestContentByExerciseId.get(exercise.id) ?? null;

    return {
      id: exercise.id,
      module_id: exercise.module_id,
      after_lesson_id: exercise.after_lesson_id,
      type: exercise.type,
      title: exercise.title,
      description: null,
      content: contentRow?.content ?? { type: exercise.type },
      created_at: exercise.created_at,
      updated_at: contentRow?.created_at ?? exercise.created_at,
    };
  });
}

function groupBy<TItem>(
  items: TItem[],
  getKey: (item: TItem) => string
) {
  return items.reduce<Record<string, TItem[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] = [...(groups[key] ?? []), item];
    return groups;
  }, {});
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function isLessonTitleMatch(lesson: LessonRow, lessonTitle: string) {
  return normalizeSearchValue(lesson.title) === normalizeSearchValue(lessonTitle);
}

async function listCompletedLessonProgress(userId: string, lessonIds: string[]) {
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

function getLatestCourseProgressByCourseId(progressRows: CourseProgressRow[]) {
  const progressByCourseId = new Map<string, CourseProgressRow>();

  for (const progressRow of progressRows) {
    if (!progressByCourseId.has(progressRow.course_id)) {
      progressByCourseId.set(progressRow.course_id, progressRow);
    }
  }

  return progressByCourseId;
}

async function buildStudentDashboardCourseSummaries(
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
  const scorePercent = await gradeTestSubmission(testId, submittedAnswers);
  const testResult = await upsertUserTestResult(auth.userId, testId, scorePercent);
  await updateCourseProgressAfterLessonCompletion(courseProgress, false);

  return {
    test_result: testResult,
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
