export type UserRole = "student" | "teacher" | "admin" | "super-admin";

export type PublicRegistrationRole = "student" | "teacher";

export type UserProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

export type AdminRow = {
  id: string;
  is_super_admin: boolean;
  created_at: string | null;
};

export type NormalizedUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  createdAt: string | null;
};

export type AuthenticatedRequestContext = {
  userId: string;
  email: string;
  fullName: string | null;
  role: UserRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  createdAt: string | null;
  profileExists: boolean;
};
