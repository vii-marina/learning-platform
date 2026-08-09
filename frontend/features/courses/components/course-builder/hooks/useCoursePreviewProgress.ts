/**
 * Owns which lessons, exercises and tests the viewer has completed, and the writes that mark
 * them so.
 *
 * Deliberately knows nothing about the current selection: the page passes the id to complete.
 * That keeps this hook and `useCoursePreviewSelection` independent of each other, so the page
 * can create them in either order instead of threading one through the other.
 *
 * With no `onComplete*` callback (the teacher's own preview) completion is local-only — the
 * maps still update so the UI reads the same, nothing is persisted server-side.
 */

import { useState } from "react";
import type { TestCompletionSummary } from "../components/CoursePreviewLessonContent";
import {
  toRecord,
  type StoredPreviewProgress,
} from "../components/coursePreviewSequence";

export type CoursePreviewInitialProgress = {
  initialCompletedLessonIds?: string[];
  initialCompletedExerciseIds?: string[];
};

export function useCoursePreviewProgress({
  onCompleteLesson,
  onCompleteExercise,
  onCompleteTest,
}: {
  onCompleteLesson?: (lessonId: string) => Promise<string[] | void>;
  onCompleteExercise?: (exerciseId: string) => Promise<string[] | void>;
  onCompleteTest?: (
    testId: string,
    selectedAnswers: Record<string, number[]>
  ) => Promise<TestCompletionSummary | void> | TestCompletionSummary | void;
}) {
  const [completedLessonIds, setCompletedLessonIds] = useState<Record<string, boolean>>({});
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Record<string, boolean>>({});
  const [completedTestIds, setCompletedTestIds] = useState<Record<string, boolean>>({});
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);

  /**
   * Seeds the three maps when a course is first opened. Server-supplied ids win over whatever
   * localStorage remembers; the stored copy is the fallback for the unauthenticated preview.
   */
  function hydrateFromStoredProgress(
    storedProgress: StoredPreviewProgress | null,
    { initialCompletedLessonIds, initialCompletedExerciseIds }: CoursePreviewInitialProgress
  ) {
    setCompletedLessonIds(
      toRecord(initialCompletedLessonIds ?? storedProgress?.completedLessonIds)
    );
    setCompletedExerciseIds(
      toRecord(initialCompletedExerciseIds ?? storedProgress?.completedExerciseIds)
    );
    setCompletedTestIds(toRecord(storedProgress?.completedTestIds));
  }

  function handleCourseChange() {
    setIsCompletingLesson(false);
  }

  async function completeLesson(lessonId: string) {
    if (isCompletingLesson) {
      return;
    }

    if (!onCompleteLesson) {
      setCompletedLessonIds((currentMap) => ({
        ...currentMap,
        [lessonId]: true,
      }));
      return;
    }

    try {
      setIsCompletingLesson(true);
      const completedIds = await onCompleteLesson(lessonId);
      setCompletedLessonIds((currentMap) =>
        completedIds
          ? toRecord(completedIds)
          : {
              ...currentMap,
              [lessonId]: true,
            }
      );
    } finally {
      setIsCompletingLesson(false);
    }
  }

  async function completeExercise(exerciseId: string) {
    setCompletedExerciseIds((currentMap) => ({
      ...currentMap,
      [exerciseId]: true,
    }));

    const completedIds = await onCompleteExercise?.(exerciseId);

    if (completedIds) {
      setCompletedExerciseIds(toRecord(completedIds));
    }
  }

  async function completeTest(testId: string, selectedAnswers: Record<string, number[]>) {
    setCompletedTestIds((currentMap) => ({
      ...currentMap,
      [testId]: true,
    }));

    // Return the completion summary so the graded results screen can render it.
    return onCompleteTest?.(testId, selectedAnswers);
  }

  return {
    completedLessonIds,
    completedExerciseIds,
    completedTestIds,
    isCompletingLesson,
    hydrateFromStoredProgress,
    handleCourseChange,
    completeLesson,
    completeExercise,
    completeTest,
  };
}
