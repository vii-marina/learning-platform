import type { UserRole } from "../types";

export function getDefaultRouteForRole(role: UserRole) {
  return role === "admin" || role === "super-admin" ? "/admin" : "/dashboard";
}
