import { authorizedBackendRequest } from "../../auth/api/backendClient";
import type { CourseAccessType, CourseStatus } from "../../courses/api";

export type StudentDashboardCourseCatalogItem = {
  id: string;
  title: string;
  description: string | null;
  teacher_name: string;
  slug: string;
  thumbnail_path: string | null;
  access_type: CourseAccessType;
  status: CourseStatus;
  is_published: boolean;
  module_count: number;
  lesson_count: number;
  created_at: string;
  updated_at: string;
};

type StudentDashboardCoursesResponse = {
  courses: StudentDashboardCourseCatalogItem[];
};

export async function loadStudentDashboardCourses() {
  const response = await authorizedBackendRequest<StudentDashboardCoursesResponse>(
    "/auth/student/dashboard/courses"
  );

  return response.courses;
}

export async function loadStudentDashboardPublicCourses() {
  const response = await authorizedBackendRequest<StudentDashboardCoursesResponse>(
    "/auth/student/dashboard/public-courses"
  );

  return response.courses;
}
