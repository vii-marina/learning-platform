export type CourseStatus = "draft" | "published" | "archived";
export type CourseAccessType = "public" | "private" | "invite";

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
  is_locked: boolean;
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
  lesson_id: string | null;
  module_id: string | null;
  passing_percentage: number | null;
};

export type TestQuestion = {
  id: string;
  test_id: string;
  type: string;
  question_text: string;
  order: number;
};

export type TestAnswer = {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
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

export type UpdateCourseInput = Partial<
  Omit<CreateCourseInput, "teacher_id"> & {
    deleted_at: string | null;
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
  is_locked?: boolean;
};

export type UpdateLessonInput = Partial<
  Pick<Lesson, "title" | "content" | "video_url" | "content_type" | "order" | "is_locked">
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
  lesson_id?: string;
  module_id?: string;
  passing_percentage?: number | null;
};

export type UpdateTestEntityInput = Partial<Pick<TestEntity, "passing_percentage">>;

export type CreateTestQuestionInput = {
  test_id: string;
  type: string;
  question_text: string;
  order?: number;
};

export type UpdateTestQuestionInput = Partial<
  Pick<TestQuestion, "type" | "question_text" | "order">
>;

export type CreateTestAnswerInput = {
  question_id: string;
  answer_text: string;
  is_correct?: boolean;
};

export type UpdateTestAnswerInput = Partial<Pick<TestAnswer, "answer_text" | "is_correct">>;
