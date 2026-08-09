import type { Lesson, Module } from "../../../api/index";
import type { StoredPreviewProgress } from "./coursePreviewSequence";

/**
 * Where the course preview remembers how far you got.
 *
 * This is `localStorage`, which means three things the callers should not have to think
 * about: it can be unavailable entirely (private mode, disabled storage), it can be full,
 * and whatever is in it was written by an older version of this code and may be any shape
 * at all. Every path here therefore degrades to "no stored progress" rather than throwing —
 * losing your place is a much smaller failure than a preview that will not open.
 */

export function readStoredProgress(storageKey: string): StoredPreviewProgress | null {
  try {
    const storedValue = window.localStorage.getItem(storageKey);
    return storedValue ? (JSON.parse(storedValue) as StoredPreviewProgress) : null;
  } catch {
    return null;
  }
}

export function writeStoredProgress(
  storageKey: string,
  payload: StoredPreviewProgress
): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable. The preview still works; it just will not resume.
  }
}

export type LessonRef = { module: Module; lesson: Lesson };

/**
 * Decides which module and lesson to open, preferring the stored position but only when it
 * still exists. A stored id can outlive the thing it points at — the teacher may have
 * deleted that lesson since — so it is validated against the current tree rather than
 * trusted, and the first lesson is the fallback.
 */
export function resolveInitialSelection(input: {
  storedProgress: StoredPreviewProgress | null;
  lessonRefById: Map<string, LessonRef>;
  lessonSequence: LessonRef[];
  modules: Module[];
}): { moduleId: string | null; lessonId: string | null } {
  const { storedProgress, lessonRefById, lessonSequence, modules } = input;
  const fallbackLesson = lessonSequence[0] ?? null;

  const storedLessonExists =
    storedProgress?.lessonId !== undefined && storedProgress.lessonId !== null
      ? lessonRefById.has(storedProgress.lessonId)
      : false;

  const lessonId = storedLessonExists
    ? storedProgress?.lessonId ?? null
    : fallbackLesson?.lesson.id ?? null;

  const moduleId =
    storedProgress?.moduleId && modules.some((module) => module.id === storedProgress?.moduleId)
      ? storedProgress.moduleId
      : lessonId
        ? lessonRefById.get(lessonId)?.module.id ?? fallbackLesson?.module.id ?? null
        : modules[0]?.id ?? null;

  return { moduleId, lessonId };
}
