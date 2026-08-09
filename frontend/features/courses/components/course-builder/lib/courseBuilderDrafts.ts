/** Builder step model and the empty-draft factories. */

import type { CourseTestQuestion, ExerciseEditorDraft } from "../types/courseBuilderUiTypes";

export type BuilderStep = 1 | 2 | 3;

export type SavedCourseSnapshot = {
  title: string;
  description: string;
  thumbnailPath: string | null;
};

export type TestEditorDraft = {
  afterLessonId: string | null;
  isGraded: boolean;
  questions: CourseTestQuestion[];
};

export type CreateContentMode = "manual" | "ai";

export const courseBuilderSteps = [
  { id: 1 as const, label: "Інформація про курс", helper: "Назва, опис і медіа" },
  { id: 2 as const, label: "Контент курсу", helper: "Модулі, уроки й тести" },
  { id: 3 as const, label: "Фінальний перегляд", helper: "Перевірка й запуск" },
];

/**
 * Heading shown above the active step. Step 1 is the only one that changes wording, because
 * "create" and "edit" are the same screen and only the presence of a course tells them apart.
 */
export const getCourseBuilderStepTitle = (
  activeStep: BuilderStep,
  isEditingExistingCourse: boolean
) => {
  if (activeStep === 1) {
    return isEditingExistingCourse ? "Редагування курсу" : "Створіть свій курс";
  }

  return activeStep === 2 ? "Зміст курсу" : "Огляд та публікація";
};

/** Sub-heading for the active step. Only the review step has one. */
export const getCourseBuilderStepDescription = (activeStep: BuilderStep) =>
  activeStep === 3
    ? "Виконайте фінальну перевірку структури та публікуйте, коли все буде готово."
    : "";

export type LessonEditorDraft = {
  title: string;
  content: string;
  videoUrl: string;
};

export const EMPTY_LESSON_EDITOR_DRAFT: LessonEditorDraft = {
  title: "",
  content: "",
  videoUrl: "",
};

export const TRUE_FALSE_OPTIONS = ["Правда", "Неправда"] as const;

export const FALSE_ANSWER_LABELS = new Set(["false", "неправда"]);

export const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createLocalEntityId = (prefix: string) => `${prefix}-${createId()}`;

export const createEmptyTestQuestion = (): CourseTestQuestion => ({
  id: createId(),
  type: "single_choice",
  questionText: "",
  options: ["Варіант 1", "Варіант 2"],
  correctOptionIndexes: [],
  hint: null,
});

export const createEmptyTestEditorDraft = (): TestEditorDraft => ({
  afterLessonId: null,
  isGraded: false,
  questions: [createEmptyTestQuestion()],
});

export const createEmptyExerciseDraft = (): ExerciseEditorDraft =>
  ({
    afterLessonId: null,
    type: "drag_drop_code",
    title: "Заповнити пропуски в коді",
    description: "",
    content: {
      type: "drag_drop_code",
      question: "",
      code_template: "",
      tokens: [],
      correct_answer: [],
      blanks: [],
    },
  }) as ExerciseEditorDraft;
