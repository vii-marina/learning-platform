/**
 * Grading and result persistence.
 *
 * The scoring rule itself lives in `testGrading.ts`, which is pure and unit-tested; this
 * module is only the database half of it.
 */

import { toServiceError } from "../../lib/appError";
import { supabaseAdmin } from "../../lib/supabase";
import {
  groupAnswersByQuestionId,
  isPassingScore,
  scoreSubmission,
  type GradingAnswerRow,
  type GradingQuestionRow,
  type TestGradeResult,
} from "../testGrading";

// Server-side test grading (R15): the score is computed here from the student's
// selected option indexes vs. the stored answers — never trusted from the client.
// The scoring rule itself lives in `testGrading.ts` (pure, unit-tested).
export async function gradeTestSubmission(
  testId: string,
  submittedAnswers: Record<string, number[]>
): Promise<TestGradeResult> {
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
    return { scorePercent: 0, correctCount: 0, totalQuestions: 0, perQuestion: {} };
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

  const answersByQuestionId = groupAnswersByQuestionId((answers ?? []) as GradingAnswerRow[]);

  return scoreSubmission(questionRows, answersByQuestionId, submittedAnswers);
}

export async function upsertUserTestResult(
  userId: string,
  testId: string,
  scorePercent: number
) {
  const now = new Date().toISOString();
  const passed = isPassingScore(scorePercent);
  const payload = {
    user_id: userId,
    test_id: testId,
    score: scorePercent,
    passed,
    updated_at: now,
  };

  // One statement instead of select-then-insert (the R7 race): two concurrent submissions used to
  // both read "no row" and both insert. `user_test_results_user_id_test_id_key` is the unique
  // constraint this conflicts on — verified present in the DB on 09-08-2026.
  const { error } = await supabaseAdmin
    .from("user_test_results")
    .upsert(payload, { onConflict: "user_id,test_id" });

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

export async function upsertUserExerciseResult(userId: string, exerciseId: string) {
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
  // Upsert rather than branch on the read: `user_exercise_results_user_id_exercise_id_key` already
  // enforces one row per (user, exercise), so the old select-then-insert did not create duplicates —
  // it made a concurrent second submission fail the insert with 23505 and surface as a 500.
  //
  // `attempts` is deliberately best-effort: PostgREST cannot express `attempts = attempts + 1`, so
  // two genuinely simultaneous submissions can still collapse into one increment. Making it exact
  // needs a Postgres function, which is not worth a migration for a display-only counter.
  const { error } = await supabaseAdmin
    .from("user_exercise_results")
    .upsert(payload, { onConflict: "user_id,exercise_id" });

  if (error) {
    throw toServiceError(
      500,
      "EXERCISE_RESULT_SAVE_FAILED",
      "Unable to save exercise result",
      error
    );
  }
}

