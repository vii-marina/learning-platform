export type UserRole = "student" | "teacher" | "admin" | "super-admin";

export type PublicRegistrationRole = "student" | "teacher";

export type TeacherProfileGender = "male" | "female" | "other";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  headline?: string | null;
  bio?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  education?: string | null;
  educationPlace?: string | null;
  gender?: TeacherProfileGender | null;
  birthDate?: string | null;
  avatarPath?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  createdAt: string | null;
};

export type PendingRegistration = {
  email: string;
  fullName: string;
  role: PublicRegistrationRole;
};

export type UpdateAdminUserInput = {
  fullName?: string | null;
  role?: UserRole;
};

export type UpdateCurrentUserProfileInput = {
  email?: string;
  fullName?: string;
  headline?: string | null;
  bio?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  education?: string | null;
  educationPlace?: string | null;
  gender?: TeacherProfileGender | null;
  birthDate?: string | null;
  avatarPath?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
};
