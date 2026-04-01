import type { TeacherCourseFilterId, TeacherCourseSummary } from "./teacherCourseDashboard.types";

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
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

export function isPublishedCourse(course: TeacherCourseSummary) {
  return course.status === "published" || course.is_published;
}

export function isArchivedCourse(course: TeacherCourseSummary) {
  return course.status === "archived";
}

export function matchesCourseFilter(
  course: TeacherCourseSummary,
  filter: TeacherCourseFilterId
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "drafts") {
    return !isPublishedCourse(course) && !isArchivedCourse(course);
  }

  if (filter === "published") {
    return isPublishedCourse(course) && !isArchivedCourse(course);
  }

  return isArchivedCourse(course);
}

export function sortCoursesByRecent(
  leftCourse: TeacherCourseSummary,
  rightCourse: TeacherCourseSummary
) {
  return (
    new Date(rightCourse.updated_at).getTime() - new Date(leftCourse.updated_at).getTime()
  );
}

export function formatCourseRelativeTime(updatedAt: string) {
  const relativeTimeParts = getRelativeTimeParts(updatedAt);

  if (!relativeTimeParts) {
    return "recently";
  }

  return relativeTimeFormatter.format(relativeTimeParts.value, relativeTimeParts.unit);
}

export function getCourseStatusLabel(course: TeacherCourseSummary) {
  if (isArchivedCourse(course)) {
    return "Archived";
  }

  return isPublishedCourse(course) ? "Published" : "Draft";
}

export function getCourseStatusClassName(course: TeacherCourseSummary) {
  if (isArchivedCourse(course)) {
    return "border border-slate-200 bg-slate-100 text-slate-600";
  }

  return isPublishedCourse(course)
    ? "border border-slate-900 bg-slate-900 text-white"
    : "border border-slate-200 bg-slate-50 text-slate-600";
}
