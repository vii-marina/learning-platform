import type { AdminRow, UserRole } from "../types/auth";

const VALID_ROLES = new Set<UserRole>(["student", "teacher", "admin", "super-admin"]);

export function coerceUserRole(value: unknown): UserRole | null {
  if (typeof value !== "string") {
    return null;
  }

  return VALID_ROLES.has(value as UserRole) ? (value as UserRole) : null;
}

export function normalizeUserRole(profileRole: unknown, adminRecord: AdminRow | null): UserRole | null {
  if (adminRecord?.is_super_admin) {
    return "super-admin";
  }

  if (adminRecord) {
    return "admin";
  }

  return coerceUserRole(profileRole);
}

export function isAdminRole(role: UserRole | null): boolean {
  return role === "admin" || role === "super-admin";
}
