/**
 * Row and response shapes for the student-facing course surface.
 *
 * Split out of `studentDashboardCoursesService` so the repositories and the summary
 * builder can share them without importing each other.
 */

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

export type CourseProgressRow = {
  id: string;
  user_id: string;
  course_id: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonProgressRow = {
  user_id: string;
  lesson_id: string;
  is_completed: boolean;
};

export type LessonProgressRecord = LessonProgressRow & {
  id: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TeacherProfileRow = {
  id: string;
  headline: string | null;
  bio: string | null;
  specialization: string | null;
  experience_years: number | null;
  education: string | null;
  gender: string | null;
  birth_date?: string | null;
  avatar_path: string | null;
  linkedin_url: string | null;
  github_url: string | null;
} & Record<string, unknown>;

export type StudentCourseLessonBlock = {
  id: string;
  lesson_id: string;
  block_type: string;
  content: Record<string, unknown>;
  order: number;
  created_at: string;
  updated_at: string;
};

export type StudentCourseTestEntity = {
  id: string;
  after_lesson_id: string | null;
  module_id: string;
  title: string;
  order: number;
  is_graded: boolean;
  created_at: string;
  updated_at: string;
};

export type StudentTestResultRow = {
  user_id: string;
  test_id: string;
  score: number | null;
  passed: boolean | null;
  updated_at: string;
};

export type StudentCourseTestQuestion = {
  id: string;
  test_id: string;
  type: "true_false" | "single_choice" | "multiple_choice";
  question_text: string;
  order: number;
  hint: string | null;
  created_at: string;
};

export type StudentCourseTestAnswer = {
  id: string;
  question_id: string;
  answer_text: string;
  // Present only for practice tests. Graded tests never ship the answer key to the client.
  is_correct?: boolean;
  created_at: string;
};

export type StudentCourseExerciseBase = {
  id: string;
  module_id: string;
  after_lesson_id: string | null;
  type: "drag_drop_code" | "write_code";
  title: string;
  position: number | null;
  created_at: string;
};

export type StudentCourseExerciseContent = {
  id: string;
  exercise_id: string;
  content: Record<string, unknown>;
  created_at: string;
};

export type StudentCourseExercise = {
  id: string;
  module_id: string;
  after_lesson_id: string | null;
  type: "drag_drop_code" | "write_code";
  title: string;
  description: string | null;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StudentExerciseResultRow = {
  user_id: string;
  exercise_id: string;
  is_completed: boolean;
  attempts: number;
  completed_at: string | null;
  updated_at: string;
};

export type HydratedStudentCourseTestQuestion = StudentCourseTestQuestion & {
  answers: StudentCourseTestAnswer[];
};

export type HydratedStudentCourseTest = StudentCourseTestEntity & {
  questions: HydratedStudentCourseTestQuestion[];
};

export type StudentDashboardCourseSummary = {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string | null;
  teacher_name: string;
  slug: string;
  thumbnail_path: string | null;
  access_type: "public" | "private" | "invite";
  status: "draft" | "published" | "archived";
  is_published: boolean;
  module_count: number;
  lesson_count: number;
  test_count: number;
  exercise_count: number;
  completed_tests_count: number;
  test_progress_percent: number;
  completed_exercises_count: number;
  exercise_progress_percent: number;
  completed_lessons_count: number;
  total_lessons_count: number;
  progress_percent: number;
  started_at: string | null;
  finished_at: string | null;
  teacher_headline: string | null;
  teacher_bio: string | null;
  teacher_specialization: string | null;
  teacher_experience_years: number | null;
  teacher_education: string | null;
  teacher_gender: string | null;
  teacher_birth_date: string | null;
  teacher_avatar_path: string | null;
  teacher_linkedin_url: string | null;
  teacher_github_url: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentCourseDetails = {
  course: StudentDashboardCourseSummary;
  modules: ModuleRow[];
  lessons_by_module: Record<string, LessonRow[]>;
  lesson_blocks_by_lesson: Record<string, StudentCourseLessonBlock[]>;
  tests_by_module: Record<string, HydratedStudentCourseTest[]>;
  exercises_by_module: Record<string, StudentCourseExercise[]>;
  completed_lesson_ids: string[];
  completed_exercise_ids: string[];
};

export type PublicLandingLessonPreviewQuery = {
  courseId?: string;
  lessonId?: string;
  lessonTitle?: string;
  allowAnySelectedCourse?: boolean;
};

export type PublicLandingLessonPreview = {
  course: Pick<CourseRow, "id" | "title" | "description" | "slug" | "thumbnail_path">;
  module: ModuleRow;
  lesson: LessonRow;
  module_lessons: LessonRow[];
  test: HydratedStudentCourseTest | null;
  exercise: StudentCourseExercise | null;
};

export type StudentLessonCompletionResult = {
  course: StudentDashboardCourseSummary;
  completed_lesson_ids: string[];
};

export type StudentTestCompletionResult = {
  test_result: {
    test_id: string;
    score: number;
    passed: boolean;
    updated_at: string;
  };
  // Server-graded summary for the results screen. per_question maps question id ->
  // whether the student's submitted answer was correct (never the correct answer itself).
  correct_count: number;
  total_questions: number;
  per_question: Record<string, boolean>;
};

export type StudentExerciseCompletionResult = {
  course: StudentDashboardCourseSummary;
  completed_exercise_ids: string[];
};
