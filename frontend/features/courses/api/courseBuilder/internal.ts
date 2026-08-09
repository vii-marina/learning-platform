/**
 * Shared internals for the course-builder API modules.
 *
 * The response envelopes and the two helpers below are used by every domain module, so
 * they live here rather than being duplicated or re-imported through the barrel.
 */

import type { AiQuestionGenerationMode, Course, Exercise, ExerciseContent, ExerciseDifficulty, ExerciseType, Lesson, LessonBlock, Module, TestAnswer, TestEntity, TestQuestion, TestQuestionType } from "../types";

export function toErrorMessage(scope: string, details: string) {
  return `${scope}: ${details}`;
}

export type LessonResponse = {
  lesson: Lesson;
};

export type LessonsResponse = {
  lessons: Lesson[];
};

export type LessonBlockResponse = {
  lessonBlock: LessonBlock;
};

export type LessonBlocksResponse = {
  lessonBlocks: LessonBlock[];
};

export type ExerciseResponse = {
  exercise: Exercise;
};

export type ExercisesResponse = {
  exercises: Exercise[];
};

// WP2: course-authoring write responses (backend-mediated)
export type CourseResponse = { course: Course };
export type ModuleResponse = { module: Module };
export type TestResponse = { test: TestEntity };
export type QuestionResponse = { question: TestQuestion };
export type AnswerResponse = { answer: TestAnswer };

export type HydratedTestQuestionResponse = TestQuestion & {
  answers: TestAnswer[];
};

export type HydratedTestEntityResponse = TestEntity & {
  questions: HydratedTestQuestionResponse[];
};

export type ModuleContentResponse = {
  lessons: Lesson[];
  tests: HydratedTestEntityResponse[];
  exercises: Exercise[];
};

export type GeneratedTestQuestionOption = {
  text: string;
  correct: boolean;
};

export type GeneratedTestQuestion = {
  type: TestQuestionType;
  question_text: string;
  options: GeneratedTestQuestionOption[];
};

export type GenerateTestQuestionsResponse = {
  questions: GeneratedTestQuestion[];
  requestedCount?: number;
  generatedCount?: number;
};

export type GenerateTestQuestionsInput = {
  afterLessonId?: string;
  moduleId?: string;
  questionCount?: number;
  generationMode?: AiQuestionGenerationMode;
};

export type GeneratedExerciseWithDifficulty = ExerciseContent & {
  difficulty: ExerciseDifficulty;
};

export type GenerateExerciseResponse = {
  content?: ExerciseContent;
  exercises?: GeneratedExerciseWithDifficulty[];
  maxDifficulty?: ExerciseDifficulty;
  requestedCount?: number;
  generatedCount?: number;
};

export type GenerateExerciseInput = {
  afterLessonId?: string;
  moduleId?: string;
  type: ExerciseType;
  difficulties?: ExerciseDifficulty[];
  count?: number;
};

export type ExerciseGenerationLimitInput = {
  afterLessonId?: string;
  moduleId?: string;
};

export type ExerciseGenerationLimitResponse = {
  maxCount: number;
  maxDifficulty?: ExerciseDifficulty;
};

export function buildDuplicateCourseTitle(title: string) {
  const normalizedTitle = title.trim() || "Untitled course";

  if (/\bcopy(?:\s+\d+)?$/i.test(normalizedTitle)) {
    return `${normalizedTitle} 2`;
  }

  return `${normalizedTitle} Copy`;
}
