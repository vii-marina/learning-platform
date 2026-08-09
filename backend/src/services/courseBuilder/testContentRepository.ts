/** Test rows read alongside a module's lessons, so the builder can show the whole tree. */

import { toServiceError } from "../../lib/appError";
import { supabaseAdmin } from "../../lib/supabase";
import type { TestAnswerRow, TestEntityRow, TestQuestionRow } from "./access";

export async function listModuleTestEntities(moduleId: string) {
  const { data, error } = await supabaseAdmin
    .from("test_entities")
    .select("*")
    .eq("module_id", moduleId)
    .order("order", { ascending: true });

  if (error) {
    throw toServiceError(500, "TESTS_LIST_FAILED", "Unable to list tests", error);
  }

  return (data ?? []) as TestEntityRow[];
}

export async function listTestQuestionsByTestIds(testIds: string[]) {
  if (testIds.length === 0) {
    return [] as TestQuestionRow[];
  }

  const { data, error } = await supabaseAdmin
    .from("test_questions")
    .select("*")
    .in("test_id", testIds)
    .order("order", { ascending: true });

  if (error) {
    throw toServiceError(500, "TEST_QUESTIONS_LIST_FAILED", "Unable to list test questions", error);
  }

  return (data ?? []) as TestQuestionRow[];
}

export async function listTestAnswersByQuestionIds(questionIds: string[]) {
  if (questionIds.length === 0) {
    return [] as TestAnswerRow[];
  }

  const { data, error } = await supabaseAdmin
    .from("test_answers")
    .select("*")
    .in("question_id", questionIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw toServiceError(500, "TEST_ANSWERS_LIST_FAILED", "Unable to list test answers", error);
  }

  return (data ?? []) as TestAnswerRow[];
}
