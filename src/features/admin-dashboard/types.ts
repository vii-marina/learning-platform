import type { CurrentUser, UpdateCurrentUserProfileInput } from "../auth/types";
import type {
  Course,
  Lesson,
  LessonBlock,
  Module,
  TestAnswer,
  TestEntity,
  TestQuestion,
} from "../courses/api";

export type AdminDashboardSectionId =
  | "overview"
  | "teachers"
  | "students"
  | "courses"
  | "settings";

export type AdminDashboardTestQuestion = TestQuestion & {
  answers: TestAnswer[];
};

export type AdminDashboardTest = TestEntity & {
  questions: AdminDashboardTestQuestion[];
};

export type AdminDashboardLesson = Lesson & {
  blocks: LessonBlock[];
  linkedTests: AdminDashboardTest[];
};

export type AdminDashboardModule = Module & {
  lessons: AdminDashboardLesson[];
  tests: AdminDashboardTest[];
};

export type AdminDashboardCourseSummary = Course & {
  teacher: CurrentUser | null;
  moduleCount: number;
};

export type AdminDashboardCourse = AdminDashboardCourseSummary & {
  modules: AdminDashboardModule[];
  totalLessons: number;
  totalBlocks: number;
  totalTests: number;
  totalQuestions: number;
  totalAnswers: number;
};

export type AdminDashboardTotals = {
  users: number;
  teachers: number;
  students: number;
  courses: number;
  modules: number;
  lessons: number;
  blocks: number;
  tests: number;
  questions: number;
  answers: number;
};

export type AdminDashboardOverviewData = {
  totals: AdminDashboardTotals;
  courseStatuses: {
    total: number;
    draft: number;
    published: number;
    archived: number;
  };
};

export type AdminTeacher = CurrentUser & {
  assignedStudents: CurrentUser[];
  courseCount: number;
  publishedCourseCount: number;
  draftCourseCount: number;
};

export type AdminDashboardStudent = CurrentUser & {
  avatarUrl: string | null;
  age: number | null;
  enrolledCourses: string[];
  completedCourses: string[];
};

export type AdminTeacherProfileInput = UpdateCurrentUserProfileInput;

export type AdminStudentProfileInput = UpdateCurrentUserProfileInput;

export type AdminDashboardSettingsData = {
  users: CurrentUser[];
};

export type AdminDashboardData = {
  currentUser: CurrentUser;
  users: CurrentUser[];
  teachers: CurrentUser[];
  students: CurrentUser[];
  courses: AdminDashboardCourse[];
  totals: AdminDashboardTotals;
};
