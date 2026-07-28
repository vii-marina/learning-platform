import type { UserRole } from "../types";

export type DashboardRole = "admin" | "teacher" | "student";

const dashboardRouteByRole: Record<DashboardRole, string> = {
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

export function getDefaultRouteForRole(role: UserRole) {
  if (role === "admin" || role === "super-admin") {
    return dashboardRouteByRole.admin;
  }

  if (role === "teacher") {
    return dashboardRouteByRole.teacher;
  }

  return dashboardRouteByRole.student;
}

export function canAccessDashboardRole(userRole: UserRole, dashboardRole: DashboardRole) {
  if (dashboardRole === "admin") {
    return userRole === "admin" || userRole === "super-admin";
  }

  return userRole === dashboardRole;
}
