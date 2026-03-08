export type TestQuestionType = "true_false" | "single_choice" | "multiple_choice";

export type CourseTestQuestion = {
  id: string;
  type: TestQuestionType;
  questionText: string;
  options: string[];
  correctOptionIndexes: number[];
};

export type CourseTest = {
  id: string;
  title: string;
  description: string;
  minScore: string;
  questions: CourseTestQuestion[];
};
