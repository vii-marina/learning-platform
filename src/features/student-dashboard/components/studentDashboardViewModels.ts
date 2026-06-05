import { getCourseMediaPublicUrl } from "../../courses/api/courseMediaStorage";
import type { StudentDashboardCourseCatalogItem } from "../api/studentDashboardApi";

export type StudentDashboardAccentTone = "cyan" | "emerald" | "amber" | "violet";

export type StudentDashboardCatalogCard = {
  rawCourse: StudentDashboardCourseCatalogItem;
  id: string;
  title: string;
  description: string | null;
  teacherName: string;
  thumbnailUrl: string | null;
  moduleCount: number;
  lessonCount: number;
  testCount: number;
  exerciseCount: number;
  completedTestsCount: number;
  testProgressPercent: number;
  completedExercisesCount: number;
  exerciseProgressPercent: number;
  accessLabel: string;
  updatedLabel: string;
  releaseLabel: string;
  progressPercent: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  isStarted: boolean;
  isCompleted: boolean;
  teacherHeadline: string | null;
  teacherBio: string | null;
  teacherBirthDate: string | null;
  teacherAvatarPath: string | null;
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

function getCourseAccentTone(
  accessType: StudentDashboardCourseCatalogItem["access_type"]
): StudentDashboardAccentTone {
  if (accessType === "invite") {
    return "violet";
  }

  if (accessType === "private") {
    return "amber";
  }

  return "emerald";
}

function formatShortDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Нещодавно оновлено";
  }

  return new Intl.DateTimeFormat("uk", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getReleaseLabel(value: string) {
  const createdAt = new Date(value);

  if (Number.isNaN(createdAt.getTime())) {
    return "Опублікований курс";
  }

  const diffDays = Math.max(
    0,
    Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (diffDays <= 7) {
    return "Нещодавно опубліковано";
  }

  return "Опублікований курс";
}

function getAccessLabel(accessType: StudentDashboardCourseCatalogItem["access_type"]) {
  if (accessType === "invite") {
    return "Лише за запрошенням";
  }

  if (accessType === "private") {
    return "Приватний курс";
  }

  return "Відкритий доступ";
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
  return courses.map((course) => ({
    rawCourse: course,
    id: course.id,
    title: course.title,
    description: normalizeDescription(course.description),
    teacherName: course.teacher_name || "Викладач платформи",
    thumbnailUrl: getCourseMediaPublicUrl(course.thumbnail_path),
    moduleCount: course.module_count,
    lessonCount: course.lesson_count,
    testCount: course.test_count,
    exerciseCount: course.exercise_count,
    completedTestsCount: course.completed_tests_count,
    testProgressPercent: course.test_progress_percent,
    completedExercisesCount: course.completed_exercises_count,
    exerciseProgressPercent: course.exercise_progress_percent,
    accessLabel: getAccessLabel(course.access_type),
    updatedLabel: formatShortDate(course.updated_at),
    releaseLabel: getReleaseLabel(course.created_at),
    progressPercent: course.progress_percent,
    completedLessonsCount: course.completed_lessons_count,
    totalLessonsCount: course.total_lessons_count,
    isStarted: course.started_at !== null,
    isCompleted: course.finished_at !== null || course.progress_percent >= 100,
    teacherHeadline: course.teacher_headline,
    teacherBio: normalizeDescription(course.teacher_bio),
    teacherBirthDate: course.teacher_birth_date,
    teacherAvatarPath: course.teacher_avatar_path,
    accentTone: getCourseAccentTone(course.access_type),
    highlights: [
      `${course.module_count} модулів`,
      `${course.lesson_count} уроків`,
      `${course.test_count} тестів`,
      `${course.exercise_count} вправ`,
    ],
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
    const teacherName = course.teacher_name || "Викладач платформи";
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
