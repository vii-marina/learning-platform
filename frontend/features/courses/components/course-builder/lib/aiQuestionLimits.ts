/** How many questions a piece of lesson content can reasonably support. */

import type { Lesson, Module } from "../../../api/index";
import type { CourseTest } from "../types/courseBuilderUiTypes";
import { buildOrderedModuleItems, getPlainTextFromHtml, type ReviewPreviewSelection } from "./coursePreviewStructure";


const countWords = (text: string) =>
  text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

export const estimateMaxAiQuestionCount = (
  text: string,
  hardLimit: number
) => {
  const wordCount = countWords(text);

  if (wordCount === 0) {
    return 0;
  }

  if (wordCount <= 10) {
    return 1;
  }

  if (wordCount <= 40) {
    return Math.min(hardLimit, 2);
  }

  if (wordCount <= 90) {
    return Math.min(hardLimit, 3);
  }

  if (wordCount <= 160) {
    return Math.min(hardLimit, 5);
  }

  if (wordCount <= 280) {
    return Math.min(hardLimit, 8);
  }

  if (wordCount <= 450) {
    return Math.min(hardLimit, 10);
  }

  return hardLimit;
};

export const getLessonAiQuestionLimit = (content: string) =>
  estimateMaxAiQuestionCount(getPlainTextFromHtml(content), 5);

export const getModuleAiQuestionLimit = (lessons: Lesson[]) =>
  estimateMaxAiQuestionCount(
    lessons.map((lesson) => getPlainTextFromHtml(lesson.content)).filter(Boolean).join("\n\n"),
    15
  );

export const getDefaultAiQuestionCount = (maxQuestionCount: number) =>
  Math.max(1, Math.min(maxQuestionCount, 5));

export const getFirstReviewSelection = (
  modules: Module[],
  lessonsByModule: Record<string, Lesson[]>,
  testsByModule: Record<string, CourseTest[]>
): ReviewPreviewSelection | null => {
  for (const module of modules) {
    const orderedItems = buildOrderedModuleItems(
      lessonsByModule[module.id] || [],
      testsByModule[module.id] || []
    );
    const firstItem = orderedItems[0];

    if (!firstItem) {
      continue;
    }

    return firstItem.type === "lesson"
      ? {
          moduleId: module.id,
          itemType: "lesson",
          itemId: firstItem.lesson.id,
        }
      : {
          moduleId: module.id,
          itemType: "test",
          itemId: firstItem.test.id,
        };
  }

  return null;
};

export const getFirstModuleReviewSelection = (
  moduleId: string,
  lessonsByModule: Record<string, Lesson[]>,
  testsByModule: Record<string, CourseTest[]>
): ReviewPreviewSelection | null => {
  const orderedItems = buildOrderedModuleItems(
    lessonsByModule[moduleId] || [],
    testsByModule[moduleId] || []
  );
  const firstItem = orderedItems[0];

  if (!firstItem) {
    return null;
  }

  return firstItem.type === "lesson"
    ? {
        moduleId,
        itemType: "lesson",
        itemId: firstItem.lesson.id,
      }
    : {
        moduleId,
        itemType: "test",
        itemId: firstItem.test.id,
      };
};
