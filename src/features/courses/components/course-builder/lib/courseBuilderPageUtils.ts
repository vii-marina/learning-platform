import type {
  GeneratedTestQuestion,
  Lesson,
  Module,
  TestAnswer,
  TestQuestion,
  TestQuestionType,
} from "../../../api/index";
import type {
  CourseTest,
  CourseTestQuestion,
  ExerciseEditorDraft,
} from "../types/courseBuilderUiTypes";

export type BuilderStep = 1 | 2 | 3;

export type SavedCourseSnapshot = {
  title: string;
  description: string;
  thumbnailPath: string | null;
};

export type TestEditorDraft = {
  afterLessonId: string | null;
  questions: CourseTestQuestion[];
};

export type CreateContentMode = "manual" | "ai";

export const courseBuilderSteps = [
  { id: 1 as const, label: "Інформація про курс", helper: "Назва, опис і медіа" },
  { id: 2 as const, label: "Контент курсу", helper: "Модулі, уроки й тести" },
  { id: 3 as const, label: "Фінальний перегляд", helper: "Перевірка й запуск" },
];

export type LessonEditorDraft = {
  title: string;
  content: string;
  videoUrl: string;
};

export const EMPTY_LESSON_EDITOR_DRAFT: LessonEditorDraft = {
  title: "",
  content: "",
  videoUrl: "",
};

const TRUE_FALSE_OPTIONS = ["Правда", "Неправда"] as const;

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createLocalEntityId = (prefix: string) => `${prefix}-${createId()}`;

export const createEmptyTestQuestion = (): CourseTestQuestion => ({
  id: createId(),
  type: "single_choice",
  questionText: "",
  options: ["Варіант 1", "Варіант 2"],
  correctOptionIndexes: [],
  hint: null,
});

export const createEmptyTestEditorDraft = (): TestEditorDraft => ({
  afterLessonId: null,
  questions: [createEmptyTestQuestion()],
});

export const createEmptyExerciseDraft = (): ExerciseEditorDraft =>
  ({
    afterLessonId: null,
    type: "drag_drop_code",
    title: "Заповнити пропуски в коді",
    description: "",
    content: {
      type: "drag_drop_code",
      question: "",
      code_template: "",
      tokens: [],
      correct_answer: [],
      blanks: [],
    },
  }) as ExerciseEditorDraft;

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

    return correctAnswer.answer_text.trim().toLowerCase() === "false" ? [1] : [0];
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

export const buildAnswerPayloads = (question: CourseTestQuestion) => {
  const options =
    question.type === "true_false"
      ? [...TRUE_FALSE_OPTIONS]
      : question.options.map((option) => option.trim());

  return options.map((answerText, index) => ({
    answer_text: answerText,
    is_correct: question.correctOptionIndexes.includes(index),
  }));
};

export const isQuestionValid = (question: CourseTestQuestion) => {
  if (!question.questionText.trim()) {
    return false;
  }

  if (question.type === "true_false") {
    return (
      question.correctOptionIndexes.length === 1 &&
      (question.correctOptionIndexes[0] === 0 || question.correctOptionIndexes[0] === 1)
    );
  }

  if (question.options.length < 2 || question.options.some((option) => !option.trim())) {
    return false;
  }

  if (question.correctOptionIndexes.length === 0) {
    return false;
  }

  if (
    question.correctOptionIndexes.some(
      (optionIndex) => optionIndex < 0 || optionIndex >= question.options.length
    )
  ) {
    return false;
  }

  if (question.type === "single_choice" && question.correctOptionIndexes.length !== 1) {
    return false;
  }

  return true;
};

export const canSaveTestDraft = (questions: CourseTestQuestion[]) => {
  if (questions.length === 0) {
    return false;
  }

  return questions.every(isQuestionValid);
};

type GeneratedCourseTestTitleArgs = {
  moduleOrder: number;
  lessons: Lesson[];
  afterLessonId: string | null;
  fallbackTitle?: string | null;
};

export const getGeneratedCourseTestTitle = ({
  moduleOrder,
  lessons,
  afterLessonId,
  fallbackTitle = null,
}: GeneratedCourseTestTitleArgs) => {
  if (afterLessonId) {
    const linkedLesson = lessons.find((lesson) => lesson.id === afterLessonId);

    if (linkedLesson?.title.trim()) {
      return linkedLesson.title.trim();
    }

    if (linkedLesson) {
      return `Урок ${moduleOrder}.${linkedLesson.order}`;
    }
  }

  if (fallbackTitle?.trim()) {
    return fallbackTitle.trim();
  }

  return `Модуль ${moduleOrder}`;
};

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
