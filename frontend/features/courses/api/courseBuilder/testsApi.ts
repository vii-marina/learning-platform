/** Tests, questions and answers. Reads via the anon client; writes via the backend. */

import { supabase } from "../../../../lib/supabase";
import { dedupeRequest } from "../../../../lib/requestDedup";
import { authorizedBackendRequest } from "../../../auth/api/backendClient";
import { toErrorMessage } from "./internal";
import type { TestResponse, QuestionResponse, AnswerResponse } from "./internal";
import type { CreateTestAnswerInput, CreateTestEntityInput, CreateTestQuestionInput, TestAnswer, TestEntity, TestQuestion, TestQuestionType, UpdateTestAnswerInput, UpdateTestEntityInput, UpdateTestQuestionInput } from "../types";

// TESTS / QUESTIONS / ANSWERS — reads via anon client; writes via backend (WP2).
export async function listTestsByModule(moduleId: string) {
  return dedupeRequest(`tests:module:${moduleId}`, async () => {
    const { data, error } = await supabase
      .from("test_entities")
      .select("*")
      .eq("module_id", moduleId)
      .order("order", { ascending: true });

    if (error) {
      throw new Error(toErrorMessage("Unable to list module tests", error.message));
    }

    return (data ?? []) as TestEntity[];
  });
}

export async function listTestsByLesson(lessonId: string) {
  return dedupeRequest(`tests:lesson:${lessonId}`, async () => {
    const { data, error } = await supabase
      .from("test_entities")
      .select("*")
      .eq("after_lesson_id", lessonId)
      .order("order", { ascending: true });

    if (error) {
      throw new Error(toErrorMessage("Unable to list lesson tests", error.message));
    }

    return (data ?? []) as TestEntity[];
  });
}

export async function createTestEntity(input: CreateTestEntityInput) {
  const response = await authorizedBackendRequest<TestResponse>("/authoring/tests", {
    method: "POST",
    body: input,
  });
  return response.test;
}

export async function updateTestEntity(testId: string, input: UpdateTestEntityInput) {
  const response = await authorizedBackendRequest<TestResponse>(`/authoring/tests/${testId}`, {
    method: "PATCH",
    body: input,
  });
  return response.test;
}

export async function deleteTestEntity(testId: string) {
  // Backend cascades: deletes questions, answers, and user_test_results.
  await authorizedBackendRequest<void>(`/authoring/tests/${testId}`, {
    method: "DELETE",
  });
}

export async function listTestQuestions(testId: string) {
  return dedupeRequest(`test-questions:${testId}`, async () => {
    const { data, error } = await supabase
      .from("test_questions")
      .select("*")
      .eq("test_id", testId)
      .order("order", { ascending: true });

    if (error) {
      throw new Error(toErrorMessage("Unable to list test questions", error.message));
    }

    return (data ?? []) as TestQuestion[];
  });
}

export async function createTestQuestion(input: CreateTestQuestionInput) {
  const response = await authorizedBackendRequest<QuestionResponse>("/authoring/questions", {
    method: "POST",
    body: input,
  });
  return response.question;
}

export async function updateTestQuestion(questionId: string, input: UpdateTestQuestionInput) {
  const response = await authorizedBackendRequest<QuestionResponse>(
    `/authoring/questions/${questionId}`,
    {
      method: "PATCH",
      body: input,
    }
  );
  return response.question;
}

export async function deleteTestQuestion(questionId: string) {
  // Backend cascades: deletes the question's answers.
  await authorizedBackendRequest<void>(`/authoring/questions/${questionId}`, {
    method: "DELETE",
  });
}

export type SaveTestQuestionInput = {
  type: TestQuestionType;
  question_text: string;
  order?: number;
  hint?: string | null;
  answers: Array<{ answer_text: string; is_correct?: boolean }>;
};

// Replace a test's entire question/answer set in a single request (bulk save).
// Backend clears the old content and recreates it in order; collapses the former
// per-question / per-answer N+1.
export async function saveTestQuestions(testId: string, questions: SaveTestQuestionInput[]) {
  await authorizedBackendRequest<void>(`/authoring/tests/${testId}/questions`, {
    method: "PUT",
    body: { questions },
  });
}

export async function listTestAnswers(questionId: string) {
  return dedupeRequest(`test-answers:${questionId}`, async () => {
    const { data, error } = await supabase
      .from("test_answers")
      .select("*")
      .eq("question_id", questionId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(toErrorMessage("Unable to list test answers", error.message));
    }

    return (data ?? []) as TestAnswer[];
  });
}

export async function createTestAnswer(input: CreateTestAnswerInput) {
  const response = await authorizedBackendRequest<AnswerResponse>("/authoring/answers", {
    method: "POST",
    body: input,
  });
  return response.answer;
}

export async function updateTestAnswer(answerId: string, input: UpdateTestAnswerInput) {
  const response = await authorizedBackendRequest<AnswerResponse>(`/authoring/answers/${answerId}`, {
    method: "PATCH",
    body: input,
  });
  return response.answer;
}

export async function deleteTestAnswer(answerId: string) {
  await authorizedBackendRequest<void>(`/authoring/answers/${answerId}`, {
    method: "DELETE",
  });
}
