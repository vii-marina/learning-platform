export type UserRole = "student" | "teacher" | "admin" | "super-admin";

export type PublicRegistrationRole = "student" | "teacher";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
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
