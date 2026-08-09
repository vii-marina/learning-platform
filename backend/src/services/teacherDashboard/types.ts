/** Row and response shapes for the teacher dashboard. */

export type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string;
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
};

export type LessonRow = {
  id: string;
  module_id: string;
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

export type TestRow = {
  id: string;
  module_id: string;
};

export type ExerciseRow = {
  id: string;
  module_id: string;
};

export type UserTestResultRow = Record<string, unknown> & {
  user_id?: string | null;
  test_id?: string | null;
};

export type TeacherDashboardCourseSummary = CourseRow & {
  modulesCount: number;
  lessonsCount: number;
};

export type TeacherDashboardStudentCourseProgress = Pick<
  CourseRow,
  "id" | "title" | "slug" | "status" | "access_type" | "thumbnail_path"
> & {
  started_at: string | null;
  finished_at: string | null;
  last_activity_at: string | null;
  completed_lessons_count: number;
  total_lessons_count: number;
  progress_percent: number;
  test_count: number;
  exercise_count: number;
  test_results_count: number;
  best_test_score: number | null;
  latest_test_result_at: string | null;
};

export type TeacherDashboardStudent = {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string | null;
  courses: TeacherDashboardStudentCourseProgress[];
  enrolled_courses_count: number;
  completed_courses_count: number;
  average_progress_percent: number;
};

export type TeacherDashboardStudentsCourse = Pick<
  CourseRow,
  "id" | "title" | "slug" | "status" | "access_type" | "thumbnail_path"
> & {
  students_count: number;
  average_progress_percent: number;
  completed_students_count: number;
  test_count: number;
  exercise_count: number;
  students: Array<
    Pick<TeacherDashboardStudent, "id" | "full_name" | "email"> &
      TeacherDashboardStudentCourseProgress
  >;
};

export type TeacherDashboardStudentsSummary = {
  students: TeacherDashboardStudent[];
  courses: TeacherDashboardStudentsCourse[];
  total_students_count: number;
  total_course_views_count: number;
  completed_course_views_count: number;
};
