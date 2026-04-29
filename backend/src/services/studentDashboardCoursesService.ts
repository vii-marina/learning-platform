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

type ProfileRecord = {
  id: string;
} & Record<string, unknown>;

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

function pickStringValue(
  records: Array<Record<string, unknown> | null | undefined>,
  keys: string[]
) {
  for (const record of records) {
    if (!record) {
      continue;
    }

    for (const key of keys) {
      const value = record[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

function toArrayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [] as unknown[];
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return [] as unknown[];
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as unknown[];
    }
  }

  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [trimmed];
}

function pickArrayValue(
  records: Array<Record<string, unknown> | null | undefined>,
  keys: string[]
) {
  for (const record of records) {
    if (!record) {
      continue;
    }

    for (const key of keys) {
      const values = toArrayValue(record[key]);

      if (values.length > 0) {
        return values;
      }
    }
  }

  return [] as unknown[];
}

function getEnrolledCourseMatchers(
  records: Array<Record<string, unknown> | null | undefined>
) {
  const ids = new Set<string>();
  const labels = new Set<string>();
  const values = pickArrayValue(records, [
    "enrolled_course_titles",
    "enrolledCourseTitles",
    "enrolled_courses",
    "enrolledCourses",
    "active_courses",
    "activeCourses",
    "current_courses",
    "currentCourses",
    "course_titles",
    "courseTitles",
    "course_ids",
    "courseIds",
    "enrolled_course_ids",
    "enrolledCourseIds",
  ]);

  values.forEach((value) => {
    if (typeof value === "string") {
      const normalizedValue = value.trim();

      if (!normalizedValue) {
        return;
      }

      if (isUuidValue(normalizedValue)) {
        ids.add(normalizedValue);
        return;
      }

      labels.add(normalizedValue.toLowerCase());
      return;
    }

    if (typeof value !== "object" || value === null) {
      return;
    }

    const record = value as Record<string, unknown>;
    const courseId = pickStringValue([record], ["id", "course_id", "courseId"]);
    const courseTitle = pickStringValue([record], [
      "title",
      "name",
      "label",
      "course_title",
      "courseTitle",
    ]);

    if (courseId) {
      if (isUuidValue(courseId)) {
        ids.add(courseId);
      } else {
        labels.add(courseId.toLowerCase());
      }
    }

    if (courseTitle) {
      labels.add(courseTitle.toLowerCase());
    }
  });

  return { ids, labels };
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
    .or("status.eq.published,is_published.eq.true")
    .order("updated_at", { ascending: false });

  if (error) {
    throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to load published courses", error);
  }

  return (data ?? []) as CourseRow[];
}

async function listPublishedPublicCourses() {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .is("deleted_at", null)
    .eq("access_type", "public")
    .or("status.eq.published,is_published.eq.true")
    .order("updated_at", { ascending: false });

  if (error) {
    throw toServiceError(
      500,
      "PUBLIC_COURSES_LIST_FAILED",
      "Unable to load public courses",
      error
    );
  }

  return (data ?? []) as CourseRow[];
}

async function getProfileRecord(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "PROFILE_FETCH_FAILED", "Unable to load student profile", error);
  }

  return (data as ProfileRecord | null) ?? null;
}

async function getOptionalStudentProfileRecord(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("student_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    const message = error.message.toLowerCase();
    const isMissingRelation =
      error.code === "PGRST205" ||
      error.code === "42P01" ||
      (message.includes("student_profiles") &&
        (message.includes("does not exist") ||
          message.includes("could not find the table")));

    if (isMissingRelation) {
      return null;
    }

    throw toServiceError(
      500,
      "STUDENT_PROFILE_FETCH_FAILED",
      "Unable to load student profile details",
      error
    );
  }

  return (data as ProfileRecord | null) ?? null;
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

async function buildStudentDashboardCourseSummaries(courses: CourseRow[]) {
  if (courses.length === 0) {
    return [] as StudentDashboardCourseSummary[];
  }

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

export async function listStudentDashboardCourses(
  auth: AuthenticatedRequestContext
): Promise<StudentDashboardCourseSummary[]> {
  ensureStudentAccess(auth);

  const [profileRecord, extraProfile] = await Promise.all([
    getProfileRecord(auth.userId),
    getOptionalStudentProfileRecord(auth.userId),
  ]);
  const { ids: enrolledCourseIds, labels: enrolledCourseLabels } =
    getEnrolledCourseMatchers([extraProfile, profileRecord]);

  if (enrolledCourseIds.size === 0 && enrolledCourseLabels.size === 0) {
    return [];
  }

  const courses = (await listPublishedCourses()).filter((course) => {
    if (enrolledCourseIds.has(course.id)) {
      return true;
    }

    const normalizedTitle = course.title.trim().toLowerCase();
    const normalizedSlug = course.slug.trim().toLowerCase();

    return (
      enrolledCourseLabels.has(normalizedTitle) || enrolledCourseLabels.has(normalizedSlug)
    );
  });

  if (courses.length === 0) {
    return [];
  }

  return buildStudentDashboardCourseSummaries(courses);
}

export async function listStudentDashboardPublicCourses(
  auth: AuthenticatedRequestContext
): Promise<StudentDashboardCourseSummary[]> {
  ensureStudentAccess(auth);

  const courses = await listPublishedPublicCourses();
  return buildStudentDashboardCourseSummaries(courses);
}
