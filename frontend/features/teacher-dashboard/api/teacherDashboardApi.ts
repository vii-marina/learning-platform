import { authorizedBackendRequest } from "../../auth/api/backendClient";
import { dedupeRequest } from "../../../lib/requestDedup";
import type { TeacherCourseSummary } from "../components/teacherCourseDashboard.types";

type TeacherDashboardCoursesResponse = {
  courses: TeacherCourseSummary[];
};

export type TeacherDashboardStudentCourseProgress = {
  id: string;
  title: string;
  slug: string;
  status: TeacherCourseSummary["status"];
  access_type: TeacherCourseSummary["access_type"];
  thumbnail_path: string | null;
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

export type TeacherDashboardStudentsCourse = {
  id: string;
  title: string;
  slug: string;
  status: TeacherCourseSummary["status"];
  access_type: TeacherCourseSummary["access_type"];
  thumbnail_path: string | null;
  students_count: number;
  average_progress_percent: number;
  completed_students_count: number;
  test_count: number;
  exercise_count: number;
  students: Array<
    {
      id: string;
      full_name: string | null;
      email: string;
    } & Omit<TeacherDashboardStudentCourseProgress, "id">
  >;
};

export type TeacherDashboardStudentsSummary = {
  students: TeacherDashboardStudent[];
  courses: TeacherDashboardStudentsCourse[];
  total_students_count: number;
  total_course_views_count: number;
  completed_course_views_count: number;
};

export async function listTeacherDashboardCourses() {
  return dedupeRequest("teacher:dashboard:courses", async () => {
    const response = await authorizedBackendRequest<TeacherDashboardCoursesResponse>(
      "/auth/teacher/dashboard/courses"
    );

    return response.courses;
  });
}

export async function listTeacherDashboardStudents() {
  return dedupeRequest("teacher:dashboard:students", () =>
    authorizedBackendRequest<TeacherDashboardStudentsSummary>(
      "/auth/teacher/dashboard/students"
    )
  );
}
