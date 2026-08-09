/** Mapping between persisted test rows, AI output, and editor drafts. */

import type { Exercise, GeneratedTestQuestion, HydratedTestEntityResponse, TestAnswer, TestQuestion } from "../../../api/index";
import type { CourseExercise, CourseTest, CourseTestQuestion } from "../types/courseBuilderUiTypes";
import {
  createId,
  FALSE_ANSWER_LABELS,
  TRUE_FALSE_OPTIONS,
  type TestEditorDraft,
} from "./courseBuilderDrafts";

export const mapGeneratedQuestionToCourseTestQuestion = (
  question: GeneratedTestQuestion
): CourseTestQuestion => {
  if (question.type === "true_false") {
    const normalizedOptions = (question.options ?? []).reduce<
      Array<{ text: string; correct: boolean }>
    >((options, option) => {
      const text = option.text.trim().toLowerCase();

      if (text !== "true" && text !== "false") {
        return options;
      }

      options.push({
        text,
        correct: Boolean(option.correct),
      });

      return options;
    }, []);

    const correctTrue = normalizedOptions.find(
      (option) => option.text === "true" && option.correct
    );
    const correctFalse = normalizedOptions.find(
      (option) => option.text === "false" && option.correct
    );

    return {
      id: createId(),
      type: "true_false",
      questionText: question.question_text.trim(),
      options: [...TRUE_FALSE_OPTIONS],
      correctOptionIndexes: correctTrue ? [0] : correctFalse ? [1] : [],
      hint: null,
    };
  }

  const normalizedOptions = (question.options ?? []).reduce<
    Array<{ text: string; correct: boolean }>
  >((options, option) => {
    const text = option.text.trim();

    if (!text) {
      return options;
    }

    options.push({
      text,
      correct: Boolean(option.correct),
    });

    return options;
  }, []);

  const options =
    normalizedOptions.length >= 2
      ? normalizedOptions.map((option) => option.text)
      : ["Варіант 1", "Варіант 2"];
  const correctOptionIndexes = normalizedOptions.reduce<number[]>(
    (indexes, option, index) => {
      if (option.correct) {
        indexes.push(index);
      }

      return indexes;
    },
    []
  );

  return {
    id: createId(),
    type:
      question.type === "multiple_choice" || correctOptionIndexes.length > 1
        ? "multiple_choice"
        : "single_choice",
    questionText: question.question_text.trim(),
    options,
    correctOptionIndexes:
      correctOptionIndexes.length > 0 && correctOptionIndexes.every((index) => index < options.length)
        ? correctOptionIndexes
        : [0],
    hint: null,
  };
};

export const mapGeneratedQuestionsToCourseTestQuestions = (
  questions: GeneratedTestQuestion[]
) => questions.map(mapGeneratedQuestionToCourseTestQuestion);

export const cloneTestQuestion = (
  question: CourseTestQuestion
): CourseTestQuestion => ({
  ...question,
  options: [...question.options],
  correctOptionIndexes: [...question.correctOptionIndexes],
  hint: question.hint ?? null,
});

const areQuestionArraysEqual = (
  leftQuestions: CourseTestQuestion[],
  rightQuestions: CourseTestQuestion[]
) => {
  if (leftQuestions.length !== rightQuestions.length) {
    return false;
  }

  return leftQuestions.every((leftQuestion, index) => {
    const rightQuestion = rightQuestions[index];

    if (!rightQuestion) {
      return false;
    }

    if (
      leftQuestion.type !== rightQuestion.type ||
      leftQuestion.questionText !== rightQuestion.questionText ||
      (leftQuestion.hint ?? null) !== (rightQuestion.hint ?? null)
    ) {
      return false;
    }

    if (leftQuestion.options.length !== rightQuestion.options.length) {
      return false;
    }

    if (
      leftQuestion.options.some((option, optionIndex) => option !== rightQuestion.options[optionIndex])
    ) {
      return false;
    }

    if (leftQuestion.correctOptionIndexes.length !== rightQuestion.correctOptionIndexes.length) {
      return false;
    }

    return leftQuestion.correctOptionIndexes.every(
      (optionIndex, correctIndex) =>
        optionIndex === rightQuestion.correctOptionIndexes[correctIndex]
    );
  });
};

export const areTestDraftsEqual = (
  leftDraft: TestEditorDraft,
  rightDraft: TestEditorDraft
) =>
  leftDraft.afterLessonId === rightDraft.afterLessonId &&
  leftDraft.isGraded === rightDraft.isGraded &&
  areQuestionArraysEqual(leftDraft.questions, rightDraft.questions);

const hasMeaningfulQuestionDraft = (question: CourseTestQuestion) => {
  if (question.questionText.trim().length > 0) {
    return true;
  }

  if (question.correctOptionIndexes.length > 0) {
    return true;
  }

  return question.options.some((option, index) => {
    const trimmedOption = option.trim();

    if (!trimmedOption) {
      return false;
    }

    return trimmedOption !== `Варіант ${index + 1}`;
  });
};

export const hasMeaningfulTestQuestionDraft = (questions: CourseTestQuestion[]) =>
  questions.length > 1 || questions.some(hasMeaningfulQuestionDraft);

const buildQuestionOptions = (question: TestQuestion, answers: TestAnswer[]) => {
  if (question.type === "true_false") {
    return [...TRUE_FALSE_OPTIONS];
  }

  return answers.map((answer) => answer.answer_text);
};

const buildCorrectOptionIndexes = (
  question: TestQuestion,
  answers: TestAnswer[]
) => {
  if (question.type === "true_false") {
    const correctAnswer = answers.find((answer) => answer.is_correct);

    if (!correctAnswer) {
      return [];
    }

    return FALSE_ANSWER_LABELS.has(correctAnswer.answer_text.trim().toLowerCase())
      ? [1]
      : [0];
  }

  return answers.reduce<number[]>((indexes, answer, index) => {
    if (answer.is_correct) {
      indexes.push(index);
    }

    return indexes;
  }, []);
};

export const mapQuestionToCourseTestQuestion = (
  question: TestQuestion,
  answers: TestAnswer[]
): CourseTestQuestion => ({
  id: question.id,
  type: question.type,
  questionText: question.question_text,
  options: buildQuestionOptions(question, answers),
  correctOptionIndexes: buildCorrectOptionIndexes(question, answers),
  hint: question.hint,
});

// Persisted models → editor drafts (shared by the builder, dashboards, and previews).
export const mapExerciseToCourseExercise = (exercise: Exercise): CourseExercise => ({
  id: exercise.id,
  title: exercise.title,
  description: exercise.description,
  afterLessonId: exercise.after_lesson_id,
  type: exercise.type,
  content: exercise.content,
  createdAt: exercise.created_at,
  updatedAt: exercise.updated_at,
});

export const mapHydratedTestsToCourseTests = (
  tests: HydratedTestEntityResponse[]
): CourseTest[] =>
  tests.map((test) => ({
    id: test.id,
    title: test.title,
    afterLessonId: test.after_lesson_id,
    order: test.order,
    isGraded: test.is_graded,
    questions: test.questions.map((question) =>
      mapQuestionToCourseTestQuestion(question, question.answers)
    ),
  }));
