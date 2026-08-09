import { AppError, toServiceError } from "../lib/appError";
import { supabaseAdmin } from "../lib/supabase";
import type { NormalizedUser, UserRole } from "../types/auth";
import { updateCurrentUserProfile } from "./authService";
import { deleteStudentAccount, getRequestAuthContext } from "./userService";

type StudentProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string | null;
} & Record<string, unknown>;

type StudentExtraProfileRow = {
  id: string;
} & Record<string, unknown>;

type CourseRow = {
  id: string;
  title: string | null;
  status: "draft" | "published" | "archived";
  thumbnail_path: string | null;
  is_published: boolean;
  deleted_at: string | null;
};

type CourseProgressRow = {
  id: string;
  user_id: string;
  course_id: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

type ModuleRow = {
  id: string;
  course_id: string;
};

type LessonRow = {
  id: string;
  module_id: string;
};

type LessonProgressRow = {
  user_id: string;
  lesson_id: string;
};

type BackendError = {
  message: string;
  code?: string;
};

export type AdminDashboardStudent = NormalizedUser & {
  avatarPath?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  educationPlace?: string | null;
  bio?: string | null;
  birthDate?: string | null;
  avatarUrl: string | null;
  age: number | null;
  enrolledCourses: string[];
  completedCourses: string[];
  enrolledCourseDetails: AdminStudentCourseEnrollment[];
};

export type AdminStudentCourseEnrollment = {
  progressId: string;
  courseId: string;
  title: string;
  status: "draft" | "published" | "archived";
  thumbnailPath: string | null;
  isPublished: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  completedLessonsCount: number;
  totalLessonsCount: number;
  progressPercent: number;
};

type AdminDashboardStudentProfileInput = {
  email?: string;
  fullName?: string;
  bio?: string | null;
  educationPlace?: string | null;
  birthDate?: string | null;
  avatarPath?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
};

function isMissingOptionalRelationError(error: BackendError, relationName: string) {
  const message = error.message.toLowerCase();
  const relation = relationName.toLowerCase();

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (message.includes(relation) &&
      (message.includes("does not exist") ||
        message.includes("could not find the table")))
  );
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

function pickNumberValue(
  records: Array<Record<string, unknown> | null | undefined>,
  keys: string[]
) {
  for (const record of records) {
    if (!record) {
      continue;
    }

    for (const key of keys) {
      const value = record[key];

      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
          return parsed;
        }
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

function calculateAge(dateValue: string) {
  const birthday = new Date(dateValue);

  if (Number.isNaN(birthday.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - birthday.getFullYear();
  const hasBirthdayPassed =
    now.getMonth() > birthday.getMonth() ||
    (now.getMonth() === birthday.getMonth() && now.getDate() >= birthday.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  if (age < 0 || age > 120) {
    return null;
  }

  return age;
}

function pickStudentAge(records: Array<Record<string, unknown> | null | undefined>) {
  const directAge = pickNumberValue(records, [
    "age",
    "student_age",
    "studentAge",
  ]);

  if (directAge !== null) {
    const normalizedAge = Math.floor(directAge);
    return normalizedAge >= 0 && normalizedAge <= 120 ? normalizedAge : null;
  }

  const birthDate = pickStringValue(records, [
    "date_of_birth",
    "dateOfBirth",
    "birth_date",
    "birthDate",
    "birthday",
  ]);

  if (!birthDate) {
    return null;
  }

  return calculateAge(birthDate);
}

function normalizeCourseValue(
  value: unknown,
  courseTitlesById: Map<string, string>
) {
  if (typeof value === "string") {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return null;
    }

    return courseTitlesById.get(normalizedValue) ?? normalizedValue;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const title = pickStringValue([record], [
    "title",
    "name",
    "label",
    "course_title",
    "courseTitle",
  ]);

  if (title) {
    return title;
  }

  const courseId = pickStringValue([record], ["id", "course_id", "courseId"]);

  if (!courseId) {
    return null;
  }

  return courseTitlesById.get(courseId) ?? courseId;
}

function normalizeCourseList(values: unknown[], courseTitlesById: Map<string, string>) {
  const titles: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const title = normalizeCourseValue(value, courseTitlesById);

    if (!title) {
      continue;
    }

    const normalizedTitle = title.toLowerCase();

    if (seen.has(normalizedTitle)) {
      continue;
    }

    seen.add(normalizedTitle);
    titles.push(title);
  }

  return titles;
}

function buildStudentRecord(
  profile: StudentProfileRow,
  extraProfile: StudentExtraProfileRow | null,
  courseTitlesById: Map<string, string>,
  enrollmentDetails: AdminStudentCourseEnrollment[] = []
): AdminDashboardStudent {
  const records = [extraProfile, profile];
  const enrolledCoursesFromProfile = normalizeCourseList(
    pickArrayValue(records, [
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
    ]),
    courseTitlesById
  );
  const completedCoursesFromProfile = normalizeCourseList(
    pickArrayValue(records, [
      "completed_course_titles",
      "completedCourseTitles",
      "completed_courses",
      "completedCourses",
      "finished_courses",
      "finishedCourses",
      "passed_courses",
      "passedCourses",
      "completed_course_ids",
      "completedCourseIds",
      "passed_course_ids",
      "passedCourseIds",
    ]),
    courseTitlesById
  );
  const enrolledCourses =
    enrollmentDetails.length > 0
      ? enrollmentDetails.map((course) => course.title)
      : enrolledCoursesFromProfile;
  const completedCourses =
    enrollmentDetails.length > 0
      ? enrollmentDetails
          .filter((course) => course.finishedAt !== null)
          .map((course) => course.title)
      : completedCoursesFromProfile;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: "student",
    isAdmin: false,
    isSuperAdmin: false,
    createdAt: profile.created_at,
    avatarPath: pickStringValue(records, ["avatar_path", "avatarPath"]),
    githubUrl: pickStringValue(records, ["github_url", "githubUrl"]),
    linkedinUrl: pickStringValue(records, ["linkedin_url", "linkedinUrl"]),
    educationPlace: pickStringValue(records, [
      "education_place",
      "educationPlace",
    ]),
    bio: pickStringValue(records, ["bio"]),
    birthDate: pickStringValue(records, ["birth_date", "birthDate"]),
    avatarUrl: pickStringValue(records, [
      "avatar_url",
      "avatarUrl",
      "photo_url",
      "photoUrl",
      "profile_image_url",
      "profileImageUrl",
      "image_url",
      "imageUrl",
      "avatar",
      "photo",
    ]),
    age: pickStudentAge(records),
    enrolledCourses,
    completedCourses,
    enrolledCourseDetails: enrollmentDetails,
  };
}

async function listStudentProfiles() {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  if (error) {
    throw toServiceError(500, "STUDENTS_LIST_FAILED", "Unable to load students", error);
  }

  return (data ?? []) as StudentProfileRow[];
}

async function listOptionalStudentProfiles(studentIds: string[]) {
  if (studentIds.length === 0) {
    return new Map<string, StudentExtraProfileRow>();
  }

  const { data, error } = await supabaseAdmin
    .from("student_profiles")
    .select("*")
    .in("id", studentIds);

  if (error) {
    if (isMissingOptionalRelationError(error, "student_profiles")) {
      return new Map<string, StudentExtraProfileRow>();
    }

    throw toServiceError(
      500,
      "STUDENT_PROFILES_LIST_FAILED",
      "Unable to load student profiles",
      error
    );
  }

  const rows = (data ?? []) as StudentExtraProfileRow[];
  return new Map(rows.map((row) => [row.id, row]));
}

async function getOptionalStudentProfile(studentId: string) {
  const { data, error } = await supabaseAdmin
    .from("student_profiles")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    if (isMissingOptionalRelationError(error, "student_profiles")) {
      return null;
    }

    throw toServiceError(
      500,
      "STUDENT_PROFILE_FETCH_FAILED",
      "Unable to load student profile",
      error
    );
  }

  return (data as StudentExtraProfileRow | null) ?? null;
}

async function listCourseTitlesById() {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id,title,status,thumbnail_path,is_published,deleted_at")
    .is("deleted_at", null);

  if (error) {
    throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to load courses", error);
  }

  const courses = (data ?? []) as CourseRow[];
  return new Map(
    courses.map((course) => [course.id, course.title?.trim() || "Untitled course"])
  );
}

function groupBy<TItem>(items: TItem[], getKey: (item: TItem) => string | null) {
  const map = new Map<string, TItem[]>();

  for (const item of items) {
    const key = getKey(item);

    if (!key) {
      continue;
    }

    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }

  return map;
}

function chunkValues<TValue>(values: TValue[], size = 50) {
  const chunks: TValue[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function listCourseProgressByStudentIds(studentIds: string[]) {
  if (studentIds.length === 0) {
    return [] as CourseProgressRow[];
  }

  const rows: CourseProgressRow[] = [];

  for (const chunk of chunkValues(studentIds)) {
    const { data, error } = await supabaseAdmin
      .from("course_progress")
      .select("*")
      .in("user_id", chunk)
      .order("updated_at", { ascending: false });

    if (error) {
      throw toServiceError(
        500,
        "COURSE_PROGRESS_LIST_FAILED",
        "Unable to load student course progress",
        error
      );
    }

    rows.push(...((data ?? []) as CourseProgressRow[]));
  }

  return rows;
}

async function listCoursesByIds(courseIds: string[]) {
  if (courseIds.length === 0) {
    return new Map<string, CourseRow>();
  }

  const courses: CourseRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("id,title,status,thumbnail_path,is_published,deleted_at")
      .in("id", chunk);

    if (error) {
      throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to load courses", error);
    }

    courses.push(...((data ?? []) as CourseRow[]));
  }

  return new Map(courses.map((course) => [course.id, course]));
}

async function listModulesByCourseIds(courseIds: string[]) {
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
      throw toServiceError(500, "MODULES_LIST_FAILED", "Unable to load course modules", error);
    }

    modules.push(...((data ?? []) as ModuleRow[]));
  }

  return modules;
}

async function listLessonsByModuleIds(moduleIds: string[]) {
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
      throw toServiceError(500, "LESSONS_LIST_FAILED", "Unable to load course lessons", error);
    }

    lessons.push(...((data ?? []) as LessonRow[]));
  }

  return lessons;
}

// Ids of the course's graded content, needed to clear a student's results when their enrollment
// is reset. Results are keyed by test_id / exercise_id, never by course, so the ids have to be
// resolved first — the same approach permanentlyDeleteAdminDashboardCourse takes.
async function listContentIdsByModuleIds(table: "test_entities" | "exercises", moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as string[];
  }

  const ids: string[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin.from(table).select("id").in("module_id", chunk);

    if (error) {
      throw toServiceError(
        500,
        "COURSE_CONTENT_LIST_FAILED",
        "Unable to load course content",
        error
      );
    }

    ids.push(...((data ?? []) as Array<{ id: string }>).map((row) => row.id));
  }

  return ids;
}

async function deleteStudentResults(
  table: "user_test_results" | "user_exercise_results",
  column: "test_id" | "exercise_id",
  studentId: string,
  contentIds: string[],
  errorCode: string,
  errorMessage: string
) {
  for (const chunk of chunkValues(contentIds)) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("user_id", studentId)
      .in(column, chunk);

    if (error) {
      throw toServiceError(500, errorCode, errorMessage, error);
    }
  }
}

async function listCompletedLessonProgress(studentIds: string[], lessonIds: string[]) {
  if (studentIds.length === 0 || lessonIds.length === 0) {
    return [] as LessonProgressRow[];
  }

  const rows: LessonProgressRow[] = [];

  for (const studentChunk of chunkValues(studentIds, 25)) {
    for (const lessonChunk of chunkValues(lessonIds, 50)) {
      const { data, error } = await supabaseAdmin
        .from("lesson_progress")
        .select("user_id,lesson_id")
        .in("user_id", studentChunk)
        .in("lesson_id", lessonChunk)
        .eq("is_completed", true);

      if (error) {
        throw toServiceError(
          500,
          "LESSON_PROGRESS_LIST_FAILED",
          "Unable to load completed lesson progress",
          error
        );
      }

      rows.push(...((data ?? []) as LessonProgressRow[]));
    }
  }

  return rows;
}

async function buildEnrollmentDetailsByStudentId(studentIds: string[]) {
  const progressRows = await listCourseProgressByStudentIds(studentIds);
  const courseIds = [...new Set(progressRows.map((row) => row.course_id))];
  const coursesById = await listCoursesByIds(courseIds);
  const modules = await listModulesByCourseIds(courseIds);
  const lessons = await listLessonsByModuleIds(modules.map((module) => module.id));
  const courseIdByModuleId = new Map(modules.map((module) => [module.id, module.course_id]));
  const lessonCourseEntries = lessons
    .map((lesson) => {
      const courseId = courseIdByModuleId.get(lesson.module_id);
      return courseId ? { lessonId: lesson.id, courseId } : null;
    })
    .filter((entry): entry is { lessonId: string; courseId: string } => entry !== null);
  const totalLessonsByCourseId = lessonCourseEntries.reduce((counts, entry) => {
    counts.set(entry.courseId, (counts.get(entry.courseId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const courseIdByLessonId = new Map(
    lessonCourseEntries.map((entry) => [entry.lessonId, entry.courseId])
  );
  const completedLessonRows = await listCompletedLessonProgress(
    studentIds,
    lessonCourseEntries.map((entry) => entry.lessonId)
  );
  const completedLessonsByStudentCourse = completedLessonRows.reduce((counts, row) => {
    const courseId = courseIdByLessonId.get(row.lesson_id);

    if (!courseId) {
      return counts;
    }

    const key = `${row.user_id}:${courseId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const progressByStudentId = groupBy(progressRows, (row) => row.user_id);

  return new Map(
    studentIds.map((studentId) => {
      const enrollments = (progressByStudentId.get(studentId) ?? [])
        .map((progress): AdminStudentCourseEnrollment | null => {
          const course = coursesById.get(progress.course_id);

          if (!course || course.deleted_at) {
            return null;
          }

          const totalLessonsCount = totalLessonsByCourseId.get(course.id) ?? 0;
          const completedLessonsCount =
            completedLessonsByStudentCourse.get(`${studentId}:${course.id}`) ?? 0;
          const progressPercent =
            totalLessonsCount > 0
              ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
              : progress.finished_at
                ? 100
                : 0;

          return {
            progressId: progress.id,
            courseId: course.id,
            title: course.title?.trim() || "Untitled course",
            status: course.status,
            thumbnailPath: course.thumbnail_path,
            isPublished: course.is_published,
            startedAt: progress.started_at,
            finishedAt: progress.finished_at,
            completedLessonsCount,
            totalLessonsCount,
            progressPercent,
          };
        })
        .filter((enrollment): enrollment is AdminStudentCourseEnrollment => enrollment !== null);

      return [studentId, enrollments];
    })
  );
}

export async function listAdminDashboardStudents(): Promise<AdminDashboardStudent[]> {
  const [students, courseTitlesById] = await Promise.all([
    listStudentProfiles(),
    listCourseTitlesById(),
  ]);
  const studentIds = students.map((student) => student.id);
  const [studentProfilesById, enrollmentDetailsByStudentId] = await Promise.all([
    listOptionalStudentProfiles(studentIds),
    buildEnrollmentDetailsByStudentId(studentIds),
  ]);

  return students.map((student) =>
    buildStudentRecord(
      student,
      studentProfilesById.get(student.id) ?? null,
      courseTitlesById,
      enrollmentDetailsByStudentId.get(student.id) ?? []
    )
  );
}

export async function getAdminDashboardStudent(studentId: string): Promise<AdminDashboardStudent> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .eq("role", "student")
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "STUDENT_FETCH_FAILED", "Unable to load student", error);
  }

  if (!data) {
    throw new AppError(404, "Student not found.", "STUDENT_NOT_FOUND");
  }

  const [studentProfile, courseTitlesById, enrollmentDetailsByStudentId] = await Promise.all([
    getOptionalStudentProfile(studentId),
    listCourseTitlesById(),
    buildEnrollmentDetailsByStudentId([studentId]),
  ]);

  return buildStudentRecord(
    data as StudentProfileRow,
    studentProfile,
    courseTitlesById,
    enrollmentDetailsByStudentId.get(studentId) ?? []
  );
}

export async function saveAdminDashboardStudentProfile(
  studentId: string,
  input: AdminDashboardStudentProfileInput
): Promise<AdminDashboardStudent> {
  const student = await getAdminDashboardStudent(studentId);
  const authContext = await getRequestAuthContext(studentId, student.email, student.fullName);

  if (authContext.role !== "student") {
    throw new AppError(404, "Student not found.", "STUDENT_NOT_FOUND");
  }

  await updateCurrentUserProfile(authContext, input);
  return getAdminDashboardStudent(studentId);
}

export async function deleteAdminDashboardStudent(studentId: string): Promise<void> {
  await getAdminDashboardStudent(studentId);
  await deleteStudentAccount(studentId);
}

export async function clearAdminDashboardStudentCourse(
  studentId: string,
  courseId: string
): Promise<AdminDashboardStudent> {
  await getAdminDashboardStudent(studentId);

  const modules = await listModulesByCourseIds([courseId]);
  const moduleIds = modules.map((module) => module.id);
  const lessons = await listLessonsByModuleIds(moduleIds);
  const lessonIds = lessons.map((lesson) => lesson.id);

  // Clearing only lesson_progress + course_progress left the student's test scores and exercise
  // completions behind, so a "reset" student came back reading 0% lessons and 100% tests, and the
  // teacher dashboard still showed their results for a course they were removed from.
  const [testIds, exerciseIds] = await Promise.all([
    listContentIdsByModuleIds("test_entities", moduleIds),
    listContentIdsByModuleIds("exercises", moduleIds),
  ]);

  await deleteStudentResults(
    "user_test_results",
    "test_id",
    studentId,
    testIds,
    "USER_TEST_RESULTS_DELETE_FAILED",
    "Unable to clear test results"
  );
  await deleteStudentResults(
    "user_exercise_results",
    "exercise_id",
    studentId,
    exerciseIds,
    "USER_EXERCISE_RESULTS_DELETE_FAILED",
    "Unable to clear exercise results"
  );

  if (lessonIds.length > 0) {
    for (const lessonChunk of chunkValues(lessonIds)) {
      const { error } = await supabaseAdmin
        .from("lesson_progress")
        .delete()
        .eq("user_id", studentId)
        .in("lesson_id", lessonChunk);

      if (error) {
        throw toServiceError(
          500,
          "LESSON_PROGRESS_DELETE_FAILED",
          "Unable to clear lesson progress",
          error
        );
      }
    }
  }

  const { error } = await supabaseAdmin
    .from("course_progress")
    .delete()
    .eq("user_id", studentId)
    .eq("course_id", courseId);

  if (error) {
    throw toServiceError(
      500,
      "COURSE_PROGRESS_DELETE_FAILED",
      "Unable to clear course enrollment",
      error
    );
  }

  return getAdminDashboardStudent(studentId);
}
