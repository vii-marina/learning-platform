import { AppError } from "../lib/appError";
import { supabaseAdmin } from "../lib/supabase";
import type { AuthenticatedRequestContext, UserProfileRow } from "../types/auth";

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string | null;
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

export type StudentDashboardCourseSummary = {
  id: string;
  title: string;
  description: string | null;
  teacher_name: string;
  slug: string;
  thumbnail_path: string | null;
  access_type: "public" | "private" | "invite";
  status: "draft" | "published" | "archived";
  is_published: boolean;
  module_count: number;
  lesson_count: number;
  created_at: string;
  updated_at: string;
};

const profileSelect = "id,full_name,email";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toServiceError(
  statusCode: number,
  code: string,
  fallbackMessage: string,
  error: { message: string }
) {
  return new AppError(statusCode, `${fallbackMessage}: ${error.message}`, code);
}

function chunkValues<TValue>(values: TValue[], size = 50) {
  const chunks: TValue[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function isUuidValue(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function ensureStudentAccess(auth: AuthenticatedRequestContext) {
  if (auth.isAdmin || auth.role === "student") {
    return;
  }

  throw new AppError(403, "Student access is required.", "STUDENT_REQUIRED");
}

function groupCounts<TItem>(
  items: TItem[],
  getKey: (item: TItem) => string
) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

async function listPublishedCourses() {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .is("deleted_at", null)
    .eq("access_type", "public")
    .or("status.eq.published,is_published.eq.true")
    .order("updated_at", { ascending: false });

  if (error) {
    throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to load published courses", error);
  }

  return (data ?? []) as CourseRow[];
}

async function listTeacherNamesById(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const profiles: UserProfileRow[] = [];

  for (const chunk of chunkValues(ids)) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(profileSelect)
      .in("id", chunk);

    if (error) {
      throw toServiceError(500, "TEACHERS_FETCH_FAILED", "Unable to load teachers", error);
    }

    profiles.push(...((data ?? []) as UserProfileRow[]));
  }

  return new Map(
    profiles.map((profile) => [
      profile.id,
      profile.full_name?.trim() || profile.email || "Platform instructor",
    ])
  );
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

export async function listStudentDashboardCourses(
  auth: AuthenticatedRequestContext
): Promise<StudentDashboardCourseSummary[]> {
  ensureStudentAccess(auth);

  const courses = await listPublishedCourses();
  const courseIds = courses.map((course) => course.id);
  const teacherIds = [...new Set(courses.map((course) => course.teacher_id).filter(isUuidValue))];
  const [teacherNamesById, modules] = await Promise.all([
    listTeacherNamesById(teacherIds),
    listModules(courseIds),
  ]);
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
    id: course.id,
    title: course.title,
    description: course.description,
    teacher_name:
      course.teacher_id && isUuidValue(course.teacher_id)
        ? teacherNamesById.get(course.teacher_id) ?? "Platform instructor"
        : "Platform instructor",
    slug: course.slug,
    thumbnail_path: course.thumbnail_path,
    access_type: course.access_type,
    status: course.status,
    is_published: course.is_published,
    module_count: moduleCountByCourseId.get(course.id) ?? 0,
    lesson_count: lessonCountByCourseId.get(course.id) ?? 0,
    created_at: course.created_at,
    updated_at: course.updated_at,
  }));
}
