import { getCourseMediaPublicUrl } from "../../courses/api/courseMediaStorage";
import type { StudentDashboardCourseCatalogItem } from "../api/studentDashboardApi";

export type StudentDashboardAccentTone = "cyan" | "emerald" | "amber" | "violet";

export type StudentDashboardCatalogCard = {
  id: string;
  title: string;
  description: string | null;
  teacherName: string;
  thumbnailUrl: string | null;
  moduleCount: number;
  lessonCount: number;
  accessLabel: string;
  updatedLabel: string;
  releaseLabel: string;
  accentTone: StudentDashboardAccentTone;
  highlights: string[];
};

export type StudentDashboardTeacherDirectoryItem = {
  id: string;
  name: string;
  courseCount: number;
  courseTitles: string[];
  accentTone: StudentDashboardAccentTone;
};

const accentTones: StudentDashboardAccentTone[] = [
  "cyan",
  "emerald",
  "amber",
  "violet",
];

function getAccentTone(index: number) {
  return accentTones[index % accentTones.length];
}

function formatShortDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getReleaseLabel(value: string) {
  const createdAt = new Date(value);

  if (Number.isNaN(createdAt.getTime())) {
    return "Published course";
  }

  const diffDays = Math.max(
    0,
    Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (diffDays <= 7) {
    return "Recently published";
  }

  return "Published course";
}

function getAccessLabel(accessType: StudentDashboardCourseCatalogItem["access_type"]) {
  if (accessType === "invite") {
    return "Invite only";
  }

  if (accessType === "private") {
    return "Private course";
  }

  return "Open access";
}

function normalizeDescription(value: string | null) {
  const normalizedValue = value
    ?.split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

  return normalizedValue || null;
}

export function buildStudentDashboardCatalogCards(
  courses: StudentDashboardCourseCatalogItem[]
) {
  return courses.map((course, index) => ({
    id: course.id,
    title: course.title,
    description: normalizeDescription(course.description),
    teacherName: course.teacher_name,
    thumbnailUrl: getCourseMediaPublicUrl(course.thumbnail_path),
    moduleCount: course.module_count,
    lessonCount: course.lesson_count,
    accessLabel: getAccessLabel(course.access_type),
    updatedLabel: `Updated ${formatShortDate(course.updated_at)}`,
    releaseLabel: getReleaseLabel(course.created_at),
    accentTone: getAccentTone(index),
    highlights: [`${course.module_count} modules`, `${course.lesson_count} lessons`],
  }));
}

export function buildStudentDashboardTeacherDirectory(
  courses: StudentDashboardCourseCatalogItem[]
) {
  const teachersByName = new Map<
    string,
    {
      name: string;
      courseCount: number;
      courseTitles: string[];
    }
  >();

  courses.forEach((course) => {
    const teacherName = course.teacher_name || "Platform instructor";
    const existingTeacher = teachersByName.get(teacherName);

    if (existingTeacher) {
      existingTeacher.courseCount += 1;

      if (!existingTeacher.courseTitles.includes(course.title)) {
        existingTeacher.courseTitles.push(course.title);
      }

      return;
    }

    teachersByName.set(teacherName, {
      name: teacherName,
      courseCount: 1,
      courseTitles: [course.title],
    });
  });

  return [...teachersByName.values()]
    .sort((left, right) => right.courseCount - left.courseCount)
    .map((teacher, index) => ({
      id: `teacher-${teacher.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: teacher.name,
      courseCount: teacher.courseCount,
      courseTitles: teacher.courseTitles.slice(0, 3),
      accentTone: getAccentTone(index),
    }));
}
