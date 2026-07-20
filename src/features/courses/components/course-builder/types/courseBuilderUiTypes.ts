import type {
  DragDropCodeExerciseContent,
  ExerciseContent,
  ExerciseDifficulty,
  ExerciseType,
  TestQuestionType,
  WriteCodeExerciseContent,
} from "../../../api/index";

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
  isGraded: boolean;
  questions: CourseTestQuestion[];
};

export type CourseExercise = {
  id: string;
  title: string;
  description: string | null;
  afterLessonId: string | null;
  type: ExerciseType;
  content: ExerciseContent;
  createdAt: string;
  updatedAt: string;
};

type ExerciseDraftBase = {
  afterLessonId: string | null;
  title: string;
  description: string;
};

export type ExerciseEditorDraft =
  | (ExerciseDraftBase & {
      type: "drag_drop_code";
      content: DragDropCodeExerciseContent;
    })
  | (ExerciseDraftBase & {
      type: "write_code";
      content: WriteCodeExerciseContent;
    });

export type GeneratedExerciseAiDraft = {
  id: string;
  difficulty: ExerciseDifficulty;
  draft: ExerciseEditorDraft;
};
