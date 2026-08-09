/** What makes a question answerable, and the default titles for generated tests. */

import { TRUE_FALSE_OPTIONS } from "./courseBuilderDrafts";
import type { Lesson } from "../../../api/index";
import type { CourseTestQuestion } from "../types/courseBuilderUiTypes";

export const buildAnswerPayloads = (question: CourseTestQuestion) => {
  const options =
    question.type === "true_false"
      ? [...TRUE_FALSE_OPTIONS]
      : question.options.map((option) => option.trim());

  return options.map((answerText, index) => ({
    answer_text: answerText,
    is_correct: question.correctOptionIndexes.includes(index),
  }));
};

export const isQuestionValid = (question: CourseTestQuestion) => {
  if (!question.questionText.trim()) {
    return false;
  }

  if (question.type === "true_false") {
    return (
      question.correctOptionIndexes.length === 1 &&
      (question.correctOptionIndexes[0] === 0 || question.correctOptionIndexes[0] === 1)
    );
  }

  if (question.options.length < 2 || question.options.some((option) => !option.trim())) {
    return false;
  }

  if (question.correctOptionIndexes.length === 0) {
    return false;
  }

  if (
    question.correctOptionIndexes.some(
      (optionIndex) => optionIndex < 0 || optionIndex >= question.options.length
    )
  ) {
    return false;
  }

  if (question.type === "single_choice" && question.correctOptionIndexes.length !== 1) {
    return false;
  }

  return true;
};

export const canSaveTestDraft = (questions: CourseTestQuestion[]) => {
  if (questions.length === 0) {
    return false;
  }

  return questions.every(isQuestionValid);
};

type GeneratedCourseTestTitleArgs = {
  moduleOrder: number;
  lessons: Lesson[];
  afterLessonId: string | null;
  fallbackTitle?: string | null;
};

export const getGeneratedCourseTestTitle = ({
  moduleOrder,
  lessons,
  afterLessonId,
  fallbackTitle = null,
}: GeneratedCourseTestTitleArgs) => {
  if (afterLessonId) {
    const linkedLesson = lessons.find((lesson) => lesson.id === afterLessonId);

    if (linkedLesson?.title.trim()) {
      return linkedLesson.title.trim();
    }

    if (linkedLesson) {
      return `Урок ${moduleOrder}.${linkedLesson.order}`;
    }
  }

  if (fallbackTitle?.trim()) {
    return fallbackTitle.trim();
  }

  return `Модуль ${moduleOrder}`;
};
