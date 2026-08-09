/**
 * Read-only access to published course content for the student surface.
 *
 * Every function here batches its ids through `chunkValues`, because PostgREST puts an
 * `in (...)` filter in the query string and an unbounded list eventually exceeds the
 * accepted URL length.
 */

import { toServiceError } from "../../lib/appError";
import { chunkValues, groupByToRecord as groupBy } from "../../lib/collections";
import { supabaseAdmin } from "../../lib/supabase";
import type {
  HydratedStudentCourseTest,
  LessonRow,
  ModuleRow,
  StudentCourseExercise,
  StudentCourseExerciseBase,
  StudentCourseExerciseContent,
  StudentCourseLessonBlock,
  StudentCourseTestAnswer,
  StudentCourseTestEntity,
  StudentCourseTestQuestion,
  StudentExerciseResultRow,
  StudentTestResultRow,
} from "./types";

export async function listModules(courseIds: string[]) {
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

export async function listLessons(moduleIds: string[]) {
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

export async function listFullLessons(moduleIds: string[]) {
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

export async function listTestRowsByModuleIds(moduleIds: string[]) {
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

export async function listUserTestResults(userId: string | undefined, testIds: string[]) {
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

export async function listExerciseRowsByModuleIds(moduleIds: string[]) {
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

export async function listUserExerciseResults(
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

export async function listLessonBlocks(lessonIds: string[]) {
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

export async function listTestsByModuleIds(moduleIds: string[]) {
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

  type FetchedTestAnswer = StudentCourseTestAnswer & { is_correct: boolean };
  const answers: FetchedTestAnswer[] = [];
  const questionIds = questions.map((question) => question.id);

  for (const chunk of chunkValues(questionIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_answers")
      .select("id,question_id,answer_text,is_correct,created_at")
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

    answers.push(...((data ?? []) as FetchedTestAnswer[]));
  }

  // Graded tests never ship is_correct to the client; practice tests keep it so the
  // client can check/reveal answers locally.
  const gradedByTestId = new Map(tests.map((test) => [test.id, test.is_graded]));
  const answersByQuestionId = groupBy(answers, (answer) => answer.question_id);
  const questionsByTestId = groupBy(
    questions.map((question) => {
      const isGraded = gradedByTestId.get(question.test_id) ?? false;
      const questionAnswers = (answersByQuestionId[question.id] ?? []).map(
        (answer): StudentCourseTestAnswer =>
          isGraded
            ? {
                id: answer.id,
                question_id: answer.question_id,
                answer_text: answer.answer_text,
                created_at: answer.created_at,
              }
            : answer
      );

      return { ...question, answers: questionAnswers };
    }),
    (question) => question.test_id
  );

  return tests.map((test) => ({
    ...test,
    questions: questionsByTestId[test.id] ?? [],
  }));
}

export async function listExercisesByModuleIds(moduleIds: string[]) {
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
