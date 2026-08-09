/** Row and payload shapes for the admin's course management screens. */

export type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string | null;
  status: "draft" | "published" | "archived";
  access_type: "public" | "private" | "invite";
  slug: string;
  thumbnail_path: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  order: number;
  created_at: string;
  updated_at: string;
};

export type LessonRow = {
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

export type LessonBlockRow = {
  id: string;
  lesson_id: string;
  block_type: string;
  content: Record<string, unknown>;
  order: number;
  created_at: string;
  updated_at: string;
};

export type TestEntityRow = {
  id: string;
  after_lesson_id: string | null;
  module_id: string;
  title: string;
  order: number;
  created_at: string;
  updated_at: string;
};

export type TestQuestionRow = {
  id: string;
  test_id: string;
  type: string;
  question_text: string;
  order: number;
  hint: string | null;
  created_at: string;
};

export type TestAnswerRow = {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  created_at: string;
};

export type ExerciseIdRow = {
  id: string;
};

export type CourseProgressRow = {
  course_id: string;
  user_id: string;
  finished_at: string | null;
};

export type UpdateCoursePayload = Partial<
  Pick<CourseRow, "status" | "is_published" | "deleted_at">
>;

export type AdminCourseAction = "publish" | "unpublish" | "archive";
