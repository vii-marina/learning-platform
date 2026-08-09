/** Row and response shapes for the admin's student management screens. */

import type { NormalizedUser, UserRole } from "../../types/auth";

export type StudentProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string | null;
} & Record<string, unknown>;

export type StudentExtraProfileRow = {
  id: string;
} & Record<string, unknown>;

export type CourseRow = {
  id: string;
  title: string | null;
  status: "draft" | "published" | "archived";
  thumbnail_path: string | null;
  is_published: boolean;
  deleted_at: string | null;
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

export type ModuleRow = {
  id: string;
  course_id: string;
};

export type LessonRow = {
  id: string;
  module_id: string;
};

export type LessonProgressRow = {
  user_id: string;
  lesson_id: string;
};

export type BackendError = {
  message: string;
  code?: string;
};

export type AdminDashboardStudent = NormalizedUser & {
  avatarPath?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  educationPlace?: string | null;
  bio?: string | null;
  birthDate?: string | null;
  avatarUrl: string | null;
  age: number | null;
  enrolledCourses: string[];
  completedCourses: string[];
  enrolledCourseDetails: AdminStudentCourseEnrollment[];
};

export type AdminStudentCourseEnrollment = {
  progressId: string;
  courseId: string;
  title: string;
  status: "draft" | "published" | "archived";
  thumbnailPath: string | null;
  isPublished: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  completedLessonsCount: number;
  totalLessonsCount: number;
  progressPercent: number;
};

export type AdminDashboardStudentProfileInput = {
  email?: string;
  fullName?: string;
  bio?: string | null;
  educationPlace?: string | null;
  birthDate?: string | null;
  avatarPath?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
};
