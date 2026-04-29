import { authorizedBackendRequest } from "../../auth/api/backendClient";
import type { TeacherCourseSummary } from "../components/teacherCourseDashboard.types";

type TeacherDashboardCoursesResponse = {
  courses: TeacherCourseSummary[];
};

export async function listTeacherDashboardCourses() {
  const response = await authorizedBackendRequest<TeacherDashboardCoursesResponse>(
    "/auth/teacher/dashboard/courses"
  );

  return response.courses;
}
