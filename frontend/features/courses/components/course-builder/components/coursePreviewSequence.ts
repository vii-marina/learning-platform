/**
 * The linear walk-through order of a course preview, and the labels for moving along it.
 *
 * A course is a tree — modules hold lessons, lessons carry exercises and tests — but a
 * student moves through it as one sequence. `CoursePreviewSequenceItem` is that flattened
 * view, and the label helpers are what make "Next" say the right thing depending on whether
 * the next step is another lesson or the exercises attached to the current one.
 */

import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";

export type StoredPreviewProgress = {
  moduleId?: string | null;
  lessonId?: string | null;
  completedLessonIds?: string[];
  completedExerciseIds?: string[];
  completedTestIds?: string[];
};

export type ActiveContentType = "lesson" | "exercise" | "test";
export type NavigationTone = "lesson" | "exercise" | "test" | null;
export type CoursePreviewSequenceItem =
  | {
      type: "lesson";
      module: Module;
      lesson: Lesson;
    }
  | {
      type: "exercise";
      module: Module;
      lesson: Lesson;
      exercise: CourseExercise;
    }
  | {
      type: "test";
      module: Module;
      lesson: Lesson;
      test: CourseTest;
    };

export function toRecord(ids: string[] | undefined) {
  return Object.fromEntries((ids ?? []).map((id) => [id, true])) as Record<string, boolean>;
}

export function getNavigationButtonTone(item: CoursePreviewSequenceItem | null): NavigationTone {
  return item?.type ?? null;
}

export function getNavigationButtonLabel(
  item: CoursePreviewSequenceItem | null,
  direction: "previous" | "next",
  currentType: ActiveContentType
) {
  if (!item) {
    return direction === "previous" ? "Попередній урок" : "Наступний урок";
  }

  if (item.type === "lesson") {
    if (direction === "previous") {
      return currentType === "lesson" ? "Попередній урок" : "Назад до уроку";
    }

    return "Наступний урок";
  }

  if (item.type === "exercise") {
    if (direction === "previous") {
      return currentType === "exercise" ? "Попередня вправа" : "Назад до вправ";
    }

    return currentType === "exercise" ? "Наступна вправа" : "Відкрити вправи";
  }

  if (direction === "previous") {
    return currentType === "test" ? "Попередній тест" : "Назад до тесту";
  }

  return currentType === "test" ? "Наступний тест" : "Відкрити тест";
}
