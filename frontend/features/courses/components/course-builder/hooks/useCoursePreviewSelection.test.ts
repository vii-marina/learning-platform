import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCoursePreviewSelection } from "./useCoursePreviewSelection";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";

/**
 * Behaviour tests for the selection hook pulled out of `CoursePreviewPage`.
 *
 * The point of these is the pair of handlers the type checker cannot tell apart:
 * `handleToggleModule` and `handleSelectModule` have identical signatures and opposite
 * behaviour on an already-open module. Swapping them compiles, so only an assertion catches it.
 */

const moduleOne: Module = {
  id: "module-1",
  course_id: "course-1",
  title: "Модуль 1",
  order: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const moduleTwo: Module = {
  ...moduleOne,
  id: "module-2",
  title: "Модуль 2",
  order: 2,
};

function makeLesson(id: string, moduleId: string, order: number): Lesson {
  return {
    id,
    module_id: moduleId,
    title: `Урок ${order}`,
    content: "<p>Текст</p>",
    video_url: null,
    content_type: "rich_text",
    order,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

const lessonsByModule: Record<string, Lesson[]> = {
  "module-1": [makeLesson("lesson-1", "module-1", 1), makeLesson("lesson-2", "module-1", 2)],
  "module-2": [makeLesson("lesson-3", "module-2", 1)],
};

const test: CourseTest = {
  id: "test-1",
  title: "Перевірка",
  afterLessonId: "lesson-2",
  order: 1,
  isGraded: false,
  questions: [],
};

const exercise: CourseExercise = {
  id: "exercise-1",
  title: "Завдання",
  description: null,
  afterLessonId: "lesson-1",
  type: "write_code",
  content: {
    type: "write_code",
    question: "Оголосіть змінну",
    initial_code: "{{answer}}",
    expected_answer: "x = 1",
  },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const testsByModule: Record<string, CourseTest[]> = { "module-1": [test] };
const exercisesByModule: Record<string, CourseExercise[]> = { "module-1": [exercise] };

type SelectionOverrides = Partial<Parameters<typeof useCoursePreviewSelection>[0]>;

function renderSelection(initialOverrides: SelectionOverrides = {}) {
  const onCourseChange = vi.fn();
  const onHydrateProgress = vi.fn();

  const view = renderHook(
    (overrides: SelectionOverrides) =>
      useCoursePreviewSelection({
        modules: [moduleOne, moduleTwo],
        lessonsByModule,
        testsByModule,
        exercisesByModule,
        progressStorageKey: "course-preview:course-1",
        onCourseChange,
        onHydrateProgress,
        ...overrides,
      }),
    { initialProps: initialOverrides }
  );

  return { ...view, onCourseChange, onHydrateProgress };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("useCoursePreviewSelection", () => {
  it("opens on the first lesson of the first module", () => {
    const { result } = renderSelection();

    expect(result.current.expandedModuleId).toBe("module-1");
    expect(result.current.activeLesson?.id).toBe("lesson-1");
    expect(result.current.activeContentType).toBe("lesson");
  });

  it("collapses an already-open module when it is toggled", () => {
    const { result } = renderSelection();

    expect(result.current.expandedModuleId).toBe("module-1");

    act(() => {
      result.current.handleToggleModule("module-1");
    });

    expect(result.current.expandedModuleId).toBeNull();
  });

  it("keeps an already-open module open when it is selected", () => {
    const { result } = renderSelection();

    expect(result.current.expandedModuleId).toBe("module-1");

    act(() => {
      result.current.handleSelectModule("module-1");
    });

    // The distinction that a signature match hides: select never collapses.
    expect(result.current.expandedModuleId).toBe("module-1");
    expect(result.current.activeLesson?.id).toBe("lesson-1");
  });

  it("jumps to the first lesson of another module on select", () => {
    const { result } = renderSelection();

    act(() => {
      result.current.handleSelectModule("module-2");
    });

    expect(result.current.expandedModuleId).toBe("module-2");
    expect(result.current.activeLesson?.id).toBe("lesson-3");
  });

  it("activates an exercise and reports it as the active content", () => {
    const { result } = renderSelection();

    act(() => {
      result.current.handleSelectExercise("module-1", "lesson-1", "exercise-1");
    });

    expect(result.current.activeContentType).toBe("exercise");
    expect(result.current.activeExerciseId).toBe("exercise-1");
    expect(result.current.activeTestId).toBeNull();
  });

  it("activates a test and clears any active exercise", () => {
    const { result } = renderSelection();

    act(() => {
      result.current.handleSelectExercise("module-1", "lesson-1", "exercise-1");
    });
    act(() => {
      result.current.handleSelectTest("module-1", "lesson-2", "test-1");
    });

    expect(result.current.activeContentType).toBe("test");
    expect(result.current.activeTestId).toBe("test-1");
    expect(result.current.activeExerciseId).toBeNull();
    expect(result.current.activeLesson?.id).toBe("lesson-2");
  });

  it("closes the mobile drawer only on the mobile select handlers", () => {
    const { result } = renderSelection();

    act(() => {
      result.current.setIsMobileNavigationOpen(true);
    });
    act(() => {
      result.current.handleToggleModule("module-2");
    });

    expect(result.current.isMobileNavigationOpen).toBe(true);

    act(() => {
      result.current.handleMobileSelectLesson("module-2", "lesson-3");
    });

    expect(result.current.isMobileNavigationOpen).toBe(false);
  });

  it("switches content type to the lesson's first exercise", () => {
    const { result } = renderSelection();

    act(() => {
      result.current.handleChangeContentType("exercise");
    });

    expect(result.current.activeContentType).toBe("exercise");
    expect(result.current.activeExerciseId).toBe("exercise-1");
  });

  it("walks the sequence in order: lesson, exercise, lesson, test", () => {
    const { result } = renderSelection();

    expect(result.current.previewSequence.map((item) => item.type)).toEqual([
      "lesson",
      "exercise",
      "lesson",
      "test",
      "lesson",
    ]);
    expect(result.current.previousSequenceItem).toBeNull();
    expect(result.current.nextSequenceItem?.type).toBe("exercise");
  });

  it("hands stored progress to the caller on first hydration", () => {
    window.localStorage.setItem(
      "course-preview:course-1",
      JSON.stringify({
        moduleId: "module-2",
        lessonId: "lesson-3",
        completedLessonIds: ["lesson-1"],
        completedExerciseIds: [],
        completedTestIds: [],
      })
    );

    const { result, onHydrateProgress } = renderSelection();

    expect(result.current.activeLesson?.id).toBe("lesson-3");
    expect(result.current.expandedModuleId).toBe("module-2");
    expect(onHydrateProgress).toHaveBeenCalledTimes(1);
    expect(onHydrateProgress.mock.calls[0][0]).toMatchObject({
      completedLessonIds: ["lesson-1"],
    });
  });

  it("resets the view and notifies the caller when the course changes", () => {
    const { result, rerender, onCourseChange } = renderSelection();

    act(() => {
      result.current.handleSelectExercise("module-1", "lesson-1", "exercise-1");
    });
    expect(result.current.activeContentType).toBe("exercise");

    onCourseChange.mockClear();
    rerender({ progressStorageKey: "course-preview:course-2" });

    expect(result.current.activeContentType).toBe("lesson");
    expect(result.current.activeExerciseId).toBeNull();
  });

  it("drops the active exercise when it disappears from the course", () => {
    const { result, rerender } = renderSelection();

    act(() => {
      result.current.handleSelectExercise("module-1", "lesson-1", "exercise-1");
    });
    expect(result.current.activeExerciseId).toBe("exercise-1");

    rerender({ exercisesByModule: {} });

    expect(result.current.activeExerciseId).toBeNull();
  });
});
