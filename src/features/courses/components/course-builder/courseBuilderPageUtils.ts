import type {
  Lesson,
  Module,
  TestAnswer,
  TestQuestion,
  TestQuestionType,
} from "../../api";
import type { CourseTest, CourseTestQuestion } from "./courseBuilderUiTypes";

export type BuilderStep = 1 | 2 | 3;

export const courseBuilderSteps = [
  { id: 1 as const, label: "Course Info", helper: "Title, description & media" },
  { id: 2 as const, label: "Course content", helper: "Modules, lessons & tests" },
  { id: 3 as const, label: "Publish", helper: "Review & launch" },
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

const TRUE_FALSE_OPTIONS = ["True", "False"] as const;

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createEmptyTestQuestion = (): CourseTestQuestion => ({
  id: createId(),
  type: "single_choice",
  questionText: "",
  options: ["Option 1", "Option 2"],
  correctOptionIndexes: [],
  hint: null,
});

export const cloneTestQuestion = (
  question: CourseTestQuestion
): CourseTestQuestion => ({
  ...question,
  options: [...question.options],
  correctOptionIndexes: [...question.correctOptionIndexes],
  hint: question.hint ?? null,
});

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
      return `Lesson ${moduleOrder}.${linkedLesson.order}`;
    }
  }

  if (fallbackTitle?.trim()) {
    return fallbackTitle.trim();
  }

  return `Module ${moduleOrder}`;
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
  true_false: "True / False",
  single_choice: "One correct answer",
  multiple_choice: "Multiple correct answers",
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
