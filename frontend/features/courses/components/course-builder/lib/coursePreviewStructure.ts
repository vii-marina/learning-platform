/** Ordering a module's children for display, and the review-preview selection model. */

import type { Lesson, Module, TestQuestionType } from "../../../api/index";
import type { CourseTest } from "../types/courseBuilderUiTypes";

export type OrderedModuleItem =
  | { type: "lesson"; lesson: Lesson }
  | { type: "test"; test: CourseTest };

export const buildOrderedModuleItems = (
  lessons: Lesson[],
  tests: CourseTest[]
): OrderedModuleItem[] => {
  const items: OrderedModuleItem[] = [];

  lessons.forEach((lesson) => {
    items.push({ type: "lesson", lesson });

    tests
      .filter((test) => test.afterLessonId === lesson.id)
      .forEach((test) => {
        items.push({ type: "test", test });
      });
  });

  tests
    .filter(
      (test) =>
        !test.afterLessonId || !lessons.some((lesson) => lesson.id === test.afterLessonId)
    )
    .forEach((test) => {
      items.push({ type: "test", test });
    });

  return items;
};

export const studentQuestionTypeLabels: Record<TestQuestionType, string> = {
  true_false: "Правда / Неправда",
  single_choice: "Одна правильна відповідь",
  multiple_choice: "Кілька правильних відповідей",
};

export type ReviewPreviewMode = "instructor" | "student";

export type ReviewPreviewSelection = {
  moduleId: string;
  itemType: "lesson" | "test";
  itemId: string;
};

export type ReviewPreviewData =
  | {
      module: Module;
      lessons: Lesson[];
      tests: CourseTest[];
      orderedItems: OrderedModuleItem[];
      itemType: "lesson";
      lesson: Lesson;
    }
  | {
      module: Module;
      lessons: Lesson[];
      tests: CourseTest[];
      orderedItems: OrderedModuleItem[];
      itemType: "test";
      test: CourseTest;
    };

export const hasLessonContent = (content: string | null) =>
  Boolean(content?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim());

export const getPlainTextFromHtml = (content: string | null) =>
  (content ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
