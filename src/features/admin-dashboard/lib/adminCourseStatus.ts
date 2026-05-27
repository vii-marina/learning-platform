import type { AdminDashboardCourseSummary } from "../types";

const relativeTimeFormatter = new Intl.RelativeTimeFormat("uk", {
  numeric: "auto",
});

function getRelativeTimeParts(updatedAt: string) {
  const updatedAtDate = new Date(updatedAt);

  if (Number.isNaN(updatedAtDate.getTime())) {
    return null;
  }

  const elapsed = updatedAtDate.getTime() - Date.now();
  const absoluteElapsed = Math.abs(elapsed);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (absoluteElapsed < hour) {
    return {
      unit: "minute" as const,
      value: Math.round(elapsed / minute) || -1,
    };
  }

  if (absoluteElapsed < day) {
    return {
      unit: "hour" as const,
      value: Math.round(elapsed / hour),
    };
  }

  if (absoluteElapsed < week) {
    return {
      unit: "day" as const,
      value: Math.round(elapsed / day),
    };
  }

  if (absoluteElapsed < month) {
    return {
      unit: "week" as const,
      value: Math.round(elapsed / week),
    };
  }

  if (absoluteElapsed < year) {
    return {
      unit: "month" as const,
      value: Math.round(elapsed / month),
    };
  }

  return {
    unit: "year" as const,
    value: Math.round(elapsed / year),
  };
}

export function isPublishedAdminCourse(course: AdminDashboardCourseSummary) {
  return course.status === "published" || course.is_published;
}

export function isArchivedAdminCourse(course: AdminDashboardCourseSummary) {
  return course.status === "archived";
}

export function sortAdminCoursesByRecent(
  leftCourse: AdminDashboardCourseSummary,
  rightCourse: AdminDashboardCourseSummary
) {
  return (
    new Date(rightCourse.updated_at).getTime() - new Date(leftCourse.updated_at).getTime()
  );
}

export function formatAdminCourseRelativeTime(updatedAt: string) {
  const relativeTimeParts = getRelativeTimeParts(updatedAt);

  if (!relativeTimeParts) {
    return "нещодавно";
  }

  return relativeTimeFormatter.format(relativeTimeParts.value, relativeTimeParts.unit);
}

export function getAdminCourseStatusLabel(course: AdminDashboardCourseSummary) {
  if (isArchivedAdminCourse(course)) {
    return "Архів";
  }

  return isPublishedAdminCourse(course) ? "Опубліковано" : "Чернетка";
}

export function getAdminCourseStatusCardClassName(course: AdminDashboardCourseSummary) {
  if (isArchivedAdminCourse(course)) {
    return "border-slate-300 bg-[linear-gradient(180deg,#f1f5f9_0%,#ffffff_72%)] hover:border-slate-400";
  }

  return isPublishedAdminCourse(course)
    ? "border-violet-200 bg-[linear-gradient(180deg,#f7f3ff_0%,#ffffff_72%)] hover:border-violet-400"
    : "border-amber-200 bg-[linear-gradient(180deg,#fff6e8_0%,#ffffff_72%)] hover:border-amber-400";
}

export function getAdminCourseStatusThumbnailClassName(
  course: AdminDashboardCourseSummary
) {
  if (isArchivedAdminCourse(course)) {
    return "border border-slate-300/90 bg-slate-100/95 text-slate-700";
  }

  return isPublishedAdminCourse(course)
    ? "border border-violet-200/90 bg-violet-100/95 text-violet-800"
    : "border border-amber-200/90 bg-amber-100/95 text-amber-800";
}

export function getAdminCourseStatusDotClassName(course: AdminDashboardCourseSummary) {
  if (isArchivedAdminCourse(course)) {
    return "bg-slate-500";
  }

  return isPublishedAdminCourse(course) ? "bg-violet-600" : "bg-amber-500";
}
