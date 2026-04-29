import { AppError } from "../lib/appError";
import { supabaseAdmin } from "../lib/supabase";
import type { AuthenticatedRequestContext } from "../types/auth";

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string;
  status: "draft" | "published" | "archived";
  access_type: "public" | "private" | "invite";
  slug: string;
  thumbnail_path: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ModuleRow = {
  id: string;
  course_id: string;
};

type LessonRow = {
  id: string;
  module_id: string;
};

export type TeacherDashboardCourseSummary = CourseRow & {
  modulesCount: number;
  lessonsCount: number;
};

function toServiceError(
  statusCode: number,
  code: string,
  fallbackMessage: string,
  error: { message: string }
) {
  return new AppError(statusCode, `${fallbackMessage}: ${error.message}`, code);
}

function ensureTeacherAccess(auth: AuthenticatedRequestContext) {
  if (auth.isAdmin || auth.role === "teacher") {
    return;
  }

  throw new AppError(403, "Teacher access is required.", "TEACHER_REQUIRED");
}

function chunkValues<TValue>(values: TValue[], size = 50) {
  const chunks: TValue[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function groupCounts<TItem>(items: TItem[], getKey: (item: TItem) => string) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

async function listTeacherCourses(teacherId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("teacher_id", teacherId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to load teacher courses", error);
  }

  return (data ?? []) as CourseRow[];
}

async function listModules(courseIds: string[]) {
  if (courseIds.length === 0) {
    return [] as ModuleRow[];
  }

  const modules: ModuleRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("modules")
      .select("id,course_id")
      .in("course_id", chunk);

    if (error) {
      throw toServiceError(500, "MODULES_LIST_FAILED", "Unable to load modules", error);
    }

    modules.push(...((data ?? []) as ModuleRow[]));
  }

  return modules;
}

async function listLessons(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as LessonRow[];
  }

  const lessons: LessonRow[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("lessons")
      .select("id,module_id")
      .in("module_id", chunk);

    if (error) {
      throw toServiceError(500, "LESSONS_LIST_FAILED", "Unable to load lessons", error);
    }

    lessons.push(...((data ?? []) as LessonRow[]));
  }

  return lessons;
}

export async function listTeacherDashboardCourses(
  auth: AuthenticatedRequestContext
): Promise<TeacherDashboardCourseSummary[]> {
  ensureTeacherAccess(auth);

  const courses = await listTeacherCourses(auth.userId);
  const courseIds = courses.map((course) => course.id);
  const modules = await listModules(courseIds);
  const moduleIds = modules.map((module) => module.id);
  const lessons = await listLessons(moduleIds);

  const moduleCountByCourseId = groupCounts(modules, (module) => module.course_id);
  const courseIdByModuleId = new Map(modules.map((module) => [module.id, module.course_id]));
  const lessonCountByCourseId = lessons.reduce((counts, lesson) => {
    const courseId = courseIdByModuleId.get(lesson.module_id);

    if (!courseId) {
      return counts;
    }

    counts.set(courseId, (counts.get(courseId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  return courses.map((course) => ({
    ...course,
    modulesCount: moduleCountByCourseId.get(course.id) ?? 0,
    lessonsCount: lessonCountByCourseId.get(course.id) ?? 0,
  }));
}
