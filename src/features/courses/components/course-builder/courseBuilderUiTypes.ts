import type { TestQuestionType } from "../../api";

export type CourseTestQuestion = {
  id: string;
  type: TestQuestionType;
  questionText: string;
  options: string[];
  correctOptionIndexes: number[];
  hint?: string | null;
};

export type CourseTest = {
  id: string;
  title: string;
  afterLessonId: string | null;
  order: number;
  questions: CourseTestQuestion[];
};
