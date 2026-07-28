import type { Course } from "../../courses/api";

export type TeacherCourseFilterId = "all" | "drafts" | "published" | "archived";

export type TeacherCourseSummary = Course & {
  modulesCount: number;
  lessonsCount: number;
};
