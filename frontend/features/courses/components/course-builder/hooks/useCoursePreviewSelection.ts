/**
 * Owns "what is the viewer looking at": the expanded module, the active lesson, whether the
 * pane is showing the lesson body / an exercise / a test, and the two navigation surfaces
 * (the overview modal and the mobile drawer) that open and close alongside it.
 *
 * It also owns the two course-change effects, because both of them write selection state:
 * one resets the view when the course changes, the other restores the remembered position.
 * Completion state is not ours — the caller passes `onHydrateProgress` and `onCourseChange`
 * so the progress hook can be created independently of this one.
 *
 * ⚠️ `handleToggleModule` and `handleSelectModule` have the same signature and are NOT
 * interchangeable. Toggling collapses a module that is already open; selecting always expands
 * it and jumps to its first lesson. Swapping them type-checks and passes the tests.
 */

import { useEffect, useRef, useState } from "react";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import type { CoursePreviewOverviewTab } from "../components/CoursePreviewOverviewModal";
import {
  readStoredProgress,
  resolveInitialSelection,
} from "../components/coursePreviewProgressStorage";
import type {
  ActiveContentType,
  CoursePreviewSequenceItem,
  StoredPreviewProgress,
} from "../components/coursePreviewSequence";
import type { CoursePreviewInitialProgress } from "./useCoursePreviewProgress";
import { useCoursePreviewSequence } from "./useCoursePreviewSequence";

export function useCoursePreviewSelection({
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  progressStorageKey,
  initialCompletedLessonIds,
  initialCompletedExerciseIds,
  onCourseChange,
  onHydrateProgress,
}: {
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  progressStorageKey: string;
  initialCompletedLessonIds?: string[];
  initialCompletedExerciseIds?: string[];
  onCourseChange: () => void;
  onHydrateProgress: (
    storedProgress: StoredPreviewProgress | null,
    initialProgress: CoursePreviewInitialProgress
  ) => void;
}) {
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeContentType, setActiveContentType] = useState<ActiveContentType>("lesson");
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [overviewModalTab, setOverviewModalTab] = useState<CoursePreviewOverviewTab | null>(null);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const initializedProgressKeyRef = useRef<string | null>(null);

  // Latest-ref so the callbacks can be recreated every render without re-triggering either
  // course-change effect — those dependency arrays must stay exactly as they are.
  const onCourseChangeRef = useRef(onCourseChange);
  const onHydrateProgressRef = useRef(onHydrateProgress);

  // Declared before its two consumers on purpose: effects run in declaration order, so both
  // refs already hold this render's callbacks by the time the effects below read them.
  useEffect(() => {
    onCourseChangeRef.current = onCourseChange;
    onHydrateProgressRef.current = onHydrateProgress;
  });

  const sequence = useCoursePreviewSequence({
    modules,
    lessonsByModule,
    testsByModule,
    exercisesByModule,
    activeLessonId,
    activeExerciseId,
    activeTestId,
    activeContentType,
  });
  const {
    lessonSequence,
    lessonRefById,
    previewSequence,
    activeModule,
    activeLesson,
    activeLessonExercises,
    activeLessonTests,
  } = sequence;

  useEffect(() => {
    // Reset-on-prop-change: the course identity changed, so every piece of view state below is
    // stale. The rule's preferred fix is a `key` on the component, which the callers do not control.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset-on-prop-change, see above
    setActiveExerciseId(null);
    setActiveTestId(null);
    setActiveContentType("lesson");
    setOverviewModalTab(null);
    setIsMobileNavigationOpen(false);
    onCourseChangeRef.current();
    initializedProgressKeyRef.current = null;
    // Reset-on-course-change only. Going through the ref is what keeps `onCourseChange` — a new
    // closure every render — out of this dependency array.
  }, [progressStorageKey]);

  useEffect(() => {
    if (initializedProgressKeyRef.current === progressStorageKey) {
      if (activeLessonId && lessonRefById.has(activeLessonId)) {
        return;
      }

      const fallbackLesson = lessonSequence[0] ?? null;

      // Syncing from an external system (localStorage), which is the sanctioned use for an
      // effect; the rule cannot tell because the read is synchronous, not a subscription.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external-store sync, see above
      setActiveLessonId(fallbackLesson?.lesson.id ?? null);
      setExpandedModuleId(fallbackLesson?.module.id ?? modules[0]?.id ?? null);
      setActiveExerciseId(null);
      setActiveTestId(null);
      setActiveContentType("lesson");
      return;
    }

    initializedProgressKeyRef.current = progressStorageKey;

    const storedProgress = readStoredProgress(progressStorageKey);
    const { moduleId: resolvedModuleId, lessonId: resolvedLessonId } =
      resolveInitialSelection({
        storedProgress,
        lessonRefById,
        lessonSequence,
        modules,
      });

    setExpandedModuleId(resolvedModuleId);
    setActiveLessonId(resolvedLessonId);
    setActiveExerciseId(null);
    setActiveTestId(null);
    setActiveContentType("lesson");
    onHydrateProgressRef.current(storedProgress, {
      initialCompletedLessonIds,
      initialCompletedExerciseIds,
    });
  }, [
    activeLessonId,
    initialCompletedExerciseIds,
    initialCompletedLessonIds,
    lessonRefById,
    lessonSequence,
    modules,
    progressStorageKey,
  ]);

  useEffect(() => {
    if (!activeExerciseId) {
      return;
    }

    const hasActiveExercise = activeLessonExercises.some(
      (exercise) => exercise.id === activeExerciseId
    );

    if (!hasActiveExercise) {
      // The selected exercise was deleted from the course while it was open; nothing but the
      // arriving data can tell us that.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- stale-id guard, see above
      setActiveExerciseId(null);
    }
  }, [activeExerciseId, activeLessonExercises]);

  useEffect(() => {
    if (!activeTestId) {
      return;
    }

    const hasActiveTest = activeLessonTests.some((test) => test.id === activeTestId);

    if (!hasActiveTest) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- stale-id guard, for a test deleted out from under the open selection
      setActiveTestId(null);
    }
  }, [activeLessonTests, activeTestId]);

  function activateSequenceItem(item: CoursePreviewSequenceItem) {
    setExpandedModuleId(item.module.id);
    setActiveLessonId(item.lesson.id);
    setActiveExerciseId(null);
    setActiveTestId(null);
    setOverviewModalTab(null);

    if (item.type === "exercise") {
      setActiveContentType("exercise");
      setActiveExerciseId(item.exercise.id);
      return;
    }

    if (item.type === "test") {
      setActiveContentType("test");
      setActiveTestId(item.test.id);
      return;
    }

    setActiveContentType("lesson");
  }

  /**
   * Collapses the module if it is already open, otherwise opens it — and either way moves the
   * pane to that module's first lesson. This is the sidebar's chevron, not "go to module".
   */
  function handleToggleModule(moduleId: string) {
    setExpandedModuleId((currentModuleId) =>
      currentModuleId === moduleId ? null : moduleId
    );
    setActiveExerciseId(null);
    setActiveTestId(null);
    setActiveContentType("lesson");

    const nextLesson = (lessonsByModule[moduleId] ?? [])[0] ?? null;

    if (nextLesson) {
      setActiveLessonId(nextLesson.id);
    }
  }

  function handleSelectModule(moduleId: string) {
    const firstLessonItem =
      previewSequence.find(
        (item) => item.type === "lesson" && item.module.id === moduleId
      ) ?? null;

    if (!firstLessonItem) {
      setExpandedModuleId(moduleId);
      setActiveExerciseId(null);
      setActiveTestId(null);
      setActiveContentType("lesson");
      setOverviewModalTab(null);
      return;
    }

    activateSequenceItem(firstLessonItem);
  }

  function handleSelectLesson(moduleId: string, lessonId: string) {
    const lessonItem =
      previewSequence.find(
        (item) =>
          item.type === "lesson" &&
          item.module.id === moduleId &&
          item.lesson.id === lessonId
      ) ?? null;

    if (!lessonItem) {
      return;
    }

    activateSequenceItem(lessonItem);
  }

  function handleMobileSelectLesson(moduleId: string, lessonId: string) {
    handleSelectLesson(moduleId, lessonId);
    setIsMobileNavigationOpen(false);
  }

  function handleSelectExercise(moduleId: string, lessonId: string, exerciseId: string) {
    const exerciseItem =
      previewSequence.find(
        (item) =>
          item.type === "exercise" &&
          item.module.id === moduleId &&
          item.lesson.id === lessonId &&
          item.exercise.id === exerciseId
      ) ?? null;

    if (!exerciseItem) {
      return;
    }

    activateSequenceItem(exerciseItem);
  }

  function handleMobileSelectExercise(moduleId: string, lessonId: string, exerciseId: string) {
    handleSelectExercise(moduleId, lessonId, exerciseId);
    setIsMobileNavigationOpen(false);
  }

  function handleSelectTest(moduleId: string, lessonId: string | null, testId: string) {
    const testItem =
      previewSequence.find(
        (item) =>
          item.type === "test" &&
          item.module.id === moduleId &&
          item.test.id === testId &&
          (lessonId === null || item.lesson.id === lessonId)
      ) ??
      previewSequence.find(
        (item) =>
          item.type === "test" &&
          item.module.id === moduleId &&
          item.test.id === testId
      ) ??
      null;

    if (!testItem) {
      return;
    }

    activateSequenceItem(testItem);
  }

  function handleMobileSelectTest(moduleId: string, lessonId: string | null, testId: string) {
    handleSelectTest(moduleId, lessonId, testId);
    setIsMobileNavigationOpen(false);
  }

  function handleNavigateToItem(item: CoursePreviewSequenceItem | null) {
    if (!item) {
      return;
    }

    activateSequenceItem(item);
  }

  function handleChangeContentType(nextContentType: ActiveContentType) {
    if (!activeModule || !activeLesson) {
      return;
    }

    setActiveContentType(nextContentType);
    setExpandedModuleId(activeModule.id);

    if (nextContentType === "lesson") {
      setActiveExerciseId(null);
      setActiveTestId(null);
      return;
    }

    if (nextContentType === "exercise") {
      const firstExercise = activeLessonExercises[0] ?? null;
      setActiveExerciseId(firstExercise?.id ?? null);
      setActiveTestId(null);
      return;
    }

    const firstTest = activeLessonTests[0] ?? null;
    setActiveTestId(firstTest?.id ?? null);
    setActiveExerciseId(null);
  }

  return {
    ...sequence,
    expandedModuleId,
    activeContentType,
    activeExerciseId,
    activeTestId,
    overviewModalTab,
    isMobileNavigationOpen,
    setOverviewModalTab,
    setIsMobileNavigationOpen,
    activateSequenceItem,
    handleToggleModule,
    handleSelectModule,
    handleSelectLesson,
    handleSelectExercise,
    handleSelectTest,
    handleMobileSelectLesson,
    handleMobileSelectExercise,
    handleMobileSelectTest,
    handleNavigateToItem,
    handleChangeContentType,
  };
}
