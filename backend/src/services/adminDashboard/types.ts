/** Row and response shapes for the admin overview and teacher screens. */

import type { NormalizedUser } from "../../types/auth";

export type CountedTable =
  | "modules"
  | "lessons"
  | "lesson_blocks"
  | "test_entities"
  | "test_questions"
  | "test_answers";

export type TeacherProfileRow = {
  id: string;
} & Record<string, unknown>;

export type CourseStatusRow = {
  teacher_id: string | null;
  status: string | null;
  is_published: boolean | null;
  deleted_at?: string | null;
};

export type AdminDashboardOverviewData = {
  totals: {
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
  courseStatuses: {
    total: number;
    draft: number;
    published: number;
    archived: number;
  };
};

export type AdminDashboardTeacher = NormalizedUser & {
  headline?: string | null;
  bio?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  education?: string | null;
  gender?: "male" | "female" | "other" | null;
  birthDate?: string | null;
  avatarPath?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  assignedStudents: NormalizedUser[];
  courseCount: number;
  publishedCourseCount: number;
  draftCourseCount: number;
};

export type AdminDashboardTeacherProfileInput = {
  email?: string;
  fullName?: string;
  headline?: string | null;
  bio?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  education?: string | null;
  educationPlace?: string | null;
  gender?: "male" | "female" | "other" | null;
  birthDate?: string | null;
  avatarPath?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
};
