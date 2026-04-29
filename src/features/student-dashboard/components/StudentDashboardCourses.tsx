import type { StudentDashboardCourseCatalogItem } from "../api/studentDashboardApi";

type StudentDashboardCoursesProps = {
  courses: StudentDashboardCourseCatalogItem[];
  isLoadingCourses: boolean;
  coursesMessage: string | null;
};

export function StudentDashboardCourses(
  _props: StudentDashboardCoursesProps
) {
  return null;
}
