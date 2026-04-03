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
    return "border border-slate-300 bg-slate-200 text-slate-700";
  }

  return isPublishedCourse(course)
    ? "border border-violet-200 bg-violet-200 text-violet-800"
    : "border border-amber-200 bg-amber-100 text-amber-800";
}

export function getCourseStatusThumbnailClassName(course: TeacherCourseSummary) {
  if (isArchivedCourse(course)) {
    return "border border-slate-300/90 bg-slate-100/95 text-slate-700";
  }

  return isPublishedCourse(course)
    ? "border border-violet-200/90 bg-violet-100/95 text-violet-800"
    : "border border-amber-200/90 bg-amber-100/95 text-amber-800";
}

export function getCourseStatusDotClassName(course: TeacherCourseSummary) {
  if (isArchivedCourse(course)) {
    return "bg-slate-500";
  }

  return isPublishedCourse(course) ? "bg-violet-600" : "bg-amber-500";
}

export function getCourseCardClassName(course: TeacherCourseSummary) {
  if (isArchivedCourse(course)) {
    return "border-slate-300 bg-[linear-gradient(180deg,#f1f5f9_0%,#ffffff_72%)] hover:border-slate-400";
  }

  return isPublishedCourse(course)
    ? "border-violet-200 bg-[linear-gradient(180deg,#f7f3ff_0%,#ffffff_72%)] hover:border-violet-400"
    : "border-amber-200 bg-[linear-gradient(180deg,#fff6e8_0%,#ffffff_72%)] hover:border-amber-400";
}
