import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CoursePreviewLessonContent } from "./CoursePreviewLessonContent";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";

/**
 * Render tests for the content pane after its split into
 * `coursePreviewContentHelpers` + `CoursePreviewTestRunner`.
 *
 * A type checker will happily accept a decomposition that renders the wrong thing, so these
 * drive the component through all three of its modes and assert on what a student would
 * actually see.
 */

const module_: Module = {
  id: "module-1",
  course_id: "course-1",
  title: "Модуль 1",
  order: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const lesson: Lesson = {
  id: "lesson-1",
  module_id: "module-1",
  title: "Змінні в Python",
  content: "<p>Змінна зберігає значення.</p>",
  video_url: null,
  content_type: "rich_text",
  order: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const practiceTest: CourseTest = {
  id: "test-1",
  title: "Перевірка",
  afterLessonId: "lesson-1",
  order: 1,
  isGraded: false,
  questions: [
    {
      id: "question-1",
      type: "single_choice",
      questionText: "Що таке змінна?",
      options: ["Контейнер для значення", "Тип файлу"],
      correctOptionIndexes: [0],
      hint: null,
    },
  ],
};

const exercise: CourseExercise = {
  id: "exercise-1",
  title: "Напишіть код",
  description: null,
  afterLessonId: "lesson-1",
  type: "write_code",
  // `initial_code` carries the answer slot; the write_code renderer needs it to draw the input.
  content: {
    type: "write_code",
    question: "Оголосіть змінну",
    initial_code: "{{answer}}",
    expected_answer: "x = 1",
  },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function renderContent(
  overrides: Partial<Parameters<typeof CoursePreviewLessonContent>[0]> = {}
) {
  const props = {
    module: module_,
    lesson,
    lessons: [lesson],
    exercises: [] as CourseExercise[],
    tests: [] as CourseTest[],
    activeContentType: "lesson" as const,
    activeExerciseId: null,
    activeTestId: null,
    canGoToPreviousItem: false,
    canGoToNextItem: true,
    previousButtonLabel: "Попередній урок",
    nextButtonLabel: "Наступний урок",
    previousButtonTone: "lesson" as const,
    nextButtonTone: "lesson" as const,
    onGoToPreviousItem: vi.fn(),
    onGoToNextItem: vi.fn(),
    onAskTeacher: vi.fn(),
    onSelectExercise: vi.fn(),
    onResolveExercise: vi.fn(),
    onCompleteTest: vi.fn(),
    ...overrides,
  };

  return { props, ...render(<CoursePreviewLessonContent {...props} />) };
}

describe("lesson mode", () => {
  it("renders the lesson content", () => {
    renderContent();

    expect(screen.getByText("Змінна зберігає значення.")).toBeInTheDocument();
  });

  it("prompts for a selection when there is no lesson", () => {
    renderContent({ module: null, lesson: null });

    expect(screen.getByText(/Оберіть урок у сайдбарі/)).toBeInTheDocument();
  });

  it("renders the navigation labels it is given", () => {
    renderContent();

    expect(screen.getByRole("button", { name: /Наступний урок/ })).toBeInTheDocument();
  });
});

describe("exercise mode", () => {
  it("renders the exercise", () => {
    renderContent({
      activeContentType: "exercise",
      activeExerciseId: "exercise-1",
      exercises: [exercise],
    });

    expect(screen.getByText("Оголосіть змінну")).toBeInTheDocument();
  });

  it("says so when the lesson has no exercises", () => {
    renderContent({ activeContentType: "exercise", exercises: [] });

    expect(screen.getByText(/поки немає вправ/)).toBeInTheDocument();
  });
});

// The test runner is the part that moved into its own component, so it gets the most cover.
describe("test mode", () => {
  it("renders the question and its options", () => {
    renderContent({
      activeContentType: "test",
      activeTestId: "test-1",
      tests: [practiceTest],
    });

    expect(screen.getByText("Що таке змінна?")).toBeInTheDocument();
    expect(screen.getByText("Контейнер для значення")).toBeInTheDocument();
    expect(screen.getByText("Тип файлу")).toBeInTheDocument();
  });

  it("says so when the lesson has no test", () => {
    renderContent({ activeContentType: "test", tests: [] });

    expect(screen.getByText(/поки немає тесту/)).toBeInTheDocument();
  });

  // A practice test holds the answer key on the client and marks locally.
  it("marks a correct answer locally on a practice test", async () => {
    const user = userEvent.setup();
    renderContent({
      activeContentType: "test",
      activeTestId: "test-1",
      tests: [practiceTest],
    });

    await user.click(screen.getByText("Контейнер для значення"));
    await user.click(screen.getByRole("button", { name: /Перевірити/ }));

    expect(await screen.findByText("Правильна відповідь")).toBeInTheDocument();
  });

  it("marks a wrong answer as incorrect", async () => {
    const user = userEvent.setup();
    renderContent({
      activeContentType: "test",
      activeTestId: "test-1",
      tests: [practiceTest],
    });

    await user.click(screen.getByText("Тип файлу"));
    await user.click(screen.getByRole("button", { name: /Перевірити/ }));

    expect(await screen.findByText("Відповідь неправильна")).toBeInTheDocument();
  });

  // A graded test never receives the answer key, so it must not offer local checking.
  it("does not offer local checking on a graded test", () => {
    renderContent({
      activeContentType: "test",
      activeTestId: "test-1",
      tests: [{ ...practiceTest, isGraded: true }],
    });

    expect(screen.queryByRole("button", { name: /Перевірити/ })).not.toBeInTheDocument();
  });

  it("submits a graded test through the callback rather than marking locally", async () => {
    const user = userEvent.setup();
    const onCompleteTest = vi.fn().mockResolvedValue({
      scorePercent: 100,
      correctCount: 1,
      totalQuestions: 1,
      perQuestion: { "question-1": true },
    });

    renderContent({
      activeContentType: "test",
      activeTestId: "test-1",
      tests: [{ ...practiceTest, isGraded: true }],
      onCompleteTest,
    });

    await user.click(screen.getByText("Контейнер для значення"));
    await user.click(screen.getByRole("button", { name: /Завершити тест/ }));

    expect(onCompleteTest).toHaveBeenCalledWith("test-1", { "question-1": [0] });
  });
});
