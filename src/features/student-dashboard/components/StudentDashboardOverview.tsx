import type { StudentDashboardCourseCatalogItem } from "../api/studentDashboardApi";

type StudentDashboardOverviewProps = {
  courses: StudentDashboardCourseCatalogItem[];
  isLoadingCourses: boolean;
  coursesMessage: string | null;
  onOpenCourses: () => void;
};

export function StudentDashboardOverview(
  _props: StudentDashboardOverviewProps
) {
  return null;
}
