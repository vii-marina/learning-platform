/**
 * Derives everything that follows from the current preview selection: the flattened
 * lesson/exercise/test sequence, the active module and lesson, that lesson's exercises and
 * tests, and the previous/next steps the footer navigation moves between.
 *
 * Holds no state — every value is a `useMemo` over its arguments. The selection hook owns the
 * ids and calls this, so the page can never end up with an id and a derived value that
 * disagree about which lesson is open.
 */

import { useMemo } from "react";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import type {
  ActiveContentType,
  CoursePreviewSequenceItem,
} from "../components/coursePreviewSequence";
import {
  buildCoursePreviewLessonSequence,
  buildCoursePreviewSidebarItems,
  getLessonExercises,
  getLessonTests,
  type CoursePreviewLessonRef,
} from "../lib/coursePreviewUtils";

export function useCoursePreviewSequence({
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  activeLessonId,
  activeExerciseId,
  activeTestId,
  activeContentType,
}: {
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  activeLessonId: string | null;
  activeExerciseId: string | null;
  activeTestId: string | null;
  activeContentType: ActiveContentType;
}) {
  const lessonSequence = useMemo(
    () => buildCoursePreviewLessonSequence(modules, lessonsByModule),
    [lessonsByModule, modules]
  );
  const lessonRefById = useMemo(
    () =>
      new Map(
        lessonSequence.map((lessonRef) => [lessonRef.lesson.id, lessonRef] satisfies [
          string,
          CoursePreviewLessonRef,
        ])
      ),
    [lessonSequence]
  );
  const previewSequence = useMemo<CoursePreviewSequenceItem[]>(
    () =>
      [...modules]
        .sort((left, right) => left.order - right.order)
        .flatMap((module) => {
          const lessons = lessonsByModule[module.id] ?? [];
          const exercises = exercisesByModule[module.id] ?? [];
          const tests = testsByModule[module.id] ?? [];

          return buildCoursePreviewSidebarItems({
            lessons,
            exercises,
            tests,
          }).map((item): CoursePreviewSequenceItem => {
            if (item.type === "lesson") {
              return {
                type: "lesson",
                module,
                lesson: item.lesson,
              };
            }

            if (item.type === "exercise") {
              return {
                type: "exercise",
                module,
                lesson: item.lesson,
                exercise: item.exercise,
              };
            }

            return {
              type: "test",
              module,
              lesson: item.lesson,
              test: item.test,
            };
          });
        }),
    [exercisesByModule, lessonsByModule, modules, testsByModule]
  );
  const activeLessonRef =
    (activeLessonId ? lessonRefById.get(activeLessonId) : null) ?? lessonSequence[0] ?? null;
  const activeModule = activeLessonRef?.module ?? modules[0] ?? null;
  const activeLesson = activeLessonRef?.lesson ?? null;
  const activeModuleLessons = useMemo(
    () => (activeModule ? lessonsByModule[activeModule.id] ?? [] : []),
    [activeModule, lessonsByModule]
  );
  const activeModuleTests = useMemo(
    () => (activeModule ? testsByModule[activeModule.id] ?? [] : []),
    [activeModule, testsByModule]
  );
  const activeModuleExercises = useMemo(
    () => (activeModule ? exercisesByModule[activeModule.id] ?? [] : []),
    [activeModule, exercisesByModule]
  );
  const activeLessonExercises = useMemo(
    () =>
      activeLesson && activeModule
        ? getLessonExercises(activeModuleLessons, activeModuleExercises, activeLesson.id)
        : [],
    [activeLesson, activeModule, activeModuleExercises, activeModuleLessons]
  );
  const activeLessonTests = useMemo(
    () =>
      activeLesson && activeModule
        ? getLessonTests(activeModuleLessons, activeModuleTests, activeLesson.id)
        : [],
    [activeLesson, activeModule, activeModuleLessons, activeModuleTests]
  );
  const activeSequenceIndex = previewSequence.findIndex((item) => {
    if (activeContentType === "lesson") {
      return item.type === "lesson" && item.lesson.id === activeLesson?.id;
    }

    if (activeContentType === "exercise") {
      return item.type === "exercise" && item.exercise.id === activeExerciseId;
    }

    return item.type === "test" && item.test.id === activeTestId;
  });
  const previousSequenceItem =
    activeSequenceIndex > 0 ? previewSequence[activeSequenceIndex - 1] : null;
  const nextSequenceItem =
    activeSequenceIndex >= 0 ? previewSequence[activeSequenceIndex + 1] ?? null : null;
  const totalLessons = useMemo(
    () => Object.values(lessonsByModule).reduce((sum, lessons) => sum + lessons.length, 0),
    [lessonsByModule]
  );
  const totalExercises = useMemo(
    () =>
      Object.values(exercisesByModule).reduce((sum, exercises) => sum + exercises.length, 0),
    [exercisesByModule]
  );
  const totalTests = useMemo(
    () => Object.values(testsByModule).reduce((sum, tests) => sum + tests.length, 0),
    [testsByModule]
  );

  return {
    lessonSequence,
    lessonRefById,
    previewSequence,
    activeModule,
    activeLesson,
    activeModuleLessons,
    activeModuleTests,
    activeModuleExercises,
    activeLessonExercises,
    activeLessonTests,
    previousSequenceItem,
    nextSequenceItem,
    totalLessons,
    totalExercises,
    totalTests,
  };
}
