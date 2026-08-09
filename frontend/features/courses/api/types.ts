export type CourseStatus = "draft" | "published" | "archived";
export type CourseAccessType = "public" | "private" | "invite";
export type TestQuestionType = "true_false" | "single_choice" | "multiple_choice";
export type AiQuestionGenerationMode = TestQuestionType | "mixed";
export type ExerciseType = "drag_drop_code" | "write_code";
export type ExerciseDifficulty = "easy" | "medium" | "hard";
export type ExerciseMatchMode = "strict" | "flexible";

export type Course = {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string;
  status: CourseStatus;
  access_type: CourseAccessType;
  slug: string;
  thumbnail_path: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  order: number;
  created_at: string;
  updated_at: string;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  content_type: string | null;
  order: number;
  created_at: string;
  updated_at: string;
};

export type LessonBlock = {
  id: string;
  lesson_id: string;
  block_type: string;
  content: Record<string, unknown>;
  order: number;
  created_at: string;
  updated_at: string;
};

export type TestEntity = {
  id: string;
  after_lesson_id: string | null;
  module_id: string;
  title: string;
  order: number;
  is_graded: boolean;
  created_at: string;
  updated_at: string;
};

export type TestQuestion = {
  id: string;
  test_id: string;
  type: TestQuestionType;
  question_text: string;
  order: number;
  hint: string | null;
  created_at: string;
};

export type TestAnswer = {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct?: boolean;
  created_at: string;
};

export type DragDropCodeExerciseBlank = {
  id: string;
  correct: string;
  distractors: string[];
};

export type DragDropCodeExerciseContent = {
  type: "drag_drop_code";
  question: string;
  code_template: string;
  tokens: string[];
  correct_answer: string[];
  blanks?: DragDropCodeExerciseBlank[];
};

export type WriteCodeExerciseContent = {
  type: "write_code";
  question: string;
  initial_code: string;
  expected_answer: string;
  match_mode?: ExerciseMatchMode;
};

export type ExerciseContent =
  | DragDropCodeExerciseContent
  | WriteCodeExerciseContent;

export type Exercise = {
  id: string;
  module_id: string;
  after_lesson_id: string | null;
  type: ExerciseType;
  title: string;
  description: string | null;
  content: ExerciseContent;
  created_at: string;
  updated_at: string;
};

export type CreateCourseInput = {
  title: string;
  description?: string | null;
  teacher_id: string;
  status?: CourseStatus;
  access_type?: CourseAccessType;
  slug?: string;
  thumbnail_path?: string | null;
  is_published?: boolean;
};

// `deleted_at` is set-only: the backend accepts a soft-delete timestamp but rejects null, so a
// teacher cannot restore a course an admin archived.
export type UpdateCourseInput = Partial<
  Omit<CreateCourseInput, "teacher_id"> & {
    deleted_at: string;
  }
>;

export type CreateModuleInput = {
  course_id: string;
  title: string;
  order?: number;
};

export type UpdateModuleInput = Partial<Pick<Module, "title" | "order">>;

export type CreateLessonInput = {
  module_id: string;
  title: string;
  content?: string | null;
  video_url?: string | null;
  content_type?: string | null;
  order?: number;
};

export type UpdateLessonInput = Partial<
  Pick<Lesson, "title" | "content" | "video_url" | "content_type" | "order">
>;

export type CreateLessonBlockInput = {
  lesson_id: string;
  block_type: string;
  content: Record<string, unknown>;
  order?: number;
};

export type UpdateLessonBlockInput = Partial<
  Pick<LessonBlock, "block_type" | "content" | "order">
>;

export type CreateTestEntityInput = {
  module_id: string;
  after_lesson_id?: string | null;
  title: string;
  order?: number;
  is_graded?: boolean;
};

export type UpdateTestEntityInput = Partial<
  Pick<TestEntity, "after_lesson_id" | "title" | "order" | "is_graded">
>;

export type CreateTestQuestionInput = {
  test_id: string;
  type: TestQuestionType;
  question_text: string;
  order?: number;
  hint?: string | null;
};

export type UpdateTestQuestionInput = Partial<
  Pick<TestQuestion, "type" | "question_text" | "order" | "hint">
>;

export type CreateTestAnswerInput = {
  question_id: string;
  answer_text: string;
  is_correct?: boolean;
};

export type UpdateTestAnswerInput = Partial<Pick<TestAnswer, "answer_text" | "is_correct">>;

export type CreateExerciseInput = {
  afterLessonId?: string;
  moduleId?: string;
  type: ExerciseType;
  title: string;
  description?: string | null;
  content: ExerciseContent;
};

export type UpdateExerciseInput = Partial<{
  afterLessonId: string | null;
  moduleId: string;
  type: ExerciseType;
  title: string;
  description: string | null;
  content: ExerciseContent;
}>;
