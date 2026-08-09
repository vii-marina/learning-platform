/**
 * Presentation rules for the course-preview content pane.
 *
 * The answer-mode helpers exist because a question that accepts several answers has to say
 * so before the student picks one — otherwise a multiple-choice question looks identical to
 * a single-choice one and they only discover the difference after being marked wrong.
 */

import type { CourseTest } from "../types/courseBuilderUiTypes";

export type ActiveContentType = "lesson" | "exercise" | "test";
export type NavigationTone = "lesson" | "exercise" | "test" | null;

export function getNavigationButtonClassName(tone: NavigationTone, alignment: "start" | "end") {
  const baseClassName =
    alignment === "start" ? "min-w-[11rem] justify-start" : "min-w-[11rem] justify-end";

  if (tone === "exercise") {
    return `${baseClassName} border-orange-200 text-orange-800 hover:border-orange-300 hover:bg-orange-50`;
  }

  if (tone === "test") {
    return `${baseClassName} border-violet-200 text-violet-800 hover:border-violet-300 hover:bg-violet-50`;
  }

  return baseClassName;
}

export function getQuestionOptions(question: CourseTest["questions"][number]) {
  if (question.type === "true_false" && question.options.length === 0) {
    return ["Правда", "Неправда"];
  }

  return question.options;
}

export function isMultipleAnswerQuestion(question: CourseTest["questions"][number]) {
  return question.type === "multiple_choice";
}

export function getAnswerModeLabel(question: CourseTest["questions"][number]) {
  return isMultipleAnswerQuestion(question)
    ? "Кілька правильних відповідей"
    : "Одна правильна відповідь";
}

export function getAnswerModeHint(question: CourseTest["questions"][number]) {
  return isMultipleAnswerQuestion(question)
    ? "Можна обрати кілька варіантів"
    : "Оберіть один варіант";
}

