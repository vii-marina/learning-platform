import { AppError } from "../lib/appError";
import { isAdminRole } from "../lib/roles";
import { supabaseAdmin } from "../lib/supabase";
import type { NormalizedUser, UserProfileRow } from "../types/auth";
import { updateCurrentUserProfile } from "./authService";
import {
  deleteTeacherAccount,
  getRequestAuthContext,
  listProfileUsersByRole,
} from "./userService";

type CountedTable =
  | "modules"
  | "lessons"
  | "lesson_blocks"
  | "test_entities"
  | "test_questions"
  | "test_answers";

type TeacherProfileRow = {
  id: string;
} & Record<string, unknown>;

type CourseStatusRow = {
  teacher_id: string | null;
  status: string | null;
  is_published: boolean | null;
  deleted_at?: string | null;
};

type AdminDashboardOverviewData = {
  totals: {
    users: number;
    teachers: number;
    students: number;
    courses: number;
    modules: number;
    lessons: number;
    blocks: number;
    tests: number;
    questions: number;
    answers: number;
  };
  courseStatuses: {
    total: number;
    draft: number;
    published: number;
    archived: number;
  };
};

type AdminDashboardTeacher = NormalizedUser & {
  headline?: string | null;
  bio?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  education?: string | null;
  gender?: "male" | "female" | "other" | null;
  birthDate?: string | null;
  avatarPath?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  assignedStudents: NormalizedUser[];
  courseCount: number;
  publishedCourseCount: number;
  draftCourseCount: number;
};

type AdminDashboardTeacherProfileInput = {
  email?: string;
  fullName?: string;
  headline?: string | null;
  bio?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  education?: string | null;
  educationPlace?: string | null;
  gender?: "male" | "female" | "other" | null;
  birthDate?: string | null;
  avatarPath?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
};

const profileSelect = "id,email,full_name,role,created_at";

function toServiceError(statusCode: number, code: string, fallbackMessage: string, error: { message: string }) {
  return new AppError(statusCode, `${fallbackMessage}: ${error.message}`, code);
}

function toNormalizedUser(profile: UserProfileRow): NormalizedUser {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    isAdmin: isAdminRole(profile.role),
    isSuperAdmin: profile.role === "super-admin",
    createdAt: profile.created_at,
  };
}

async function countTableRows(table: CountedTable) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    throw toServiceError(500, "TABLE_COUNT_FAILED", `Unable to count ${table}`, error);
  }

  return count ?? 0;
}

async function countProfiles(role?: "teacher" | "student") {
  const query = supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const { count, error } = role ? await query.eq("role", role) : await query;

  if (error) {
    throw toServiceError(500, "PROFILES_COUNT_FAILED", "Unable to count profiles", error);
  }

  return count ?? 0;
}

async function listCourseStatusRows(teacherId?: string) {
  const query = supabaseAdmin
    .from("courses")
    .select("teacher_id,status,is_published,deleted_at")
    .is("deleted_at", null);
  const { data, error } = teacherId
    ? await query.eq("teacher_id", teacherId)
    : await query;

  if (error) {
    throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to load course statuses", error);
  }

  return (data ?? []) as CourseStatusRow[];
}

async function listTeacherProfiles(teacherIds: string[]) {
  if (teacherIds.length === 0) {
    return new Map<string, TeacherProfileRow>();
  }

  const { data, error } = await supabaseAdmin
    .from("teacher_profiles")
    .select("*")
    .in("id", teacherIds);

  if (error) {
    throw toServiceError(
      500,
      "TEACHER_PROFILES_LIST_FAILED",
      "Unable to list teacher profiles",
      error
    );
  }

  const rows = (data ?? []) as TeacherProfileRow[];
  return new Map(rows.map((row) => [row.id, row]));
}

async function getTeacherProfile(teacherId: string) {
  const { data, error } = await supabaseAdmin
    .from("teacher_profiles")
    .select("*")
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    throw toServiceError(
      500,
      "TEACHER_PROFILE_FETCH_FAILED",
      "Unable to load teacher profile",
      error
    );
  }

  return (data as TeacherProfileRow | null) ?? null;
}

function pickStringValue(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function pickNumberValue(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) {
    return null;
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

  return null;
}

function pickArrayValue(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) {
    return [];
  }

  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        return [];
      }
    }
  }

  return [];
}

function extractAssignedStudentIds(record: TeacherProfileRow | null | undefined) {
  const values = pickArrayValue(record, [
    "assigned_student_ids",
    "assignedStudents",
    "student_ids",
    "students",
  ]);

  const ids = values
    .map((value) => {
      if (typeof value === "string") {
        return value;
      }

      if (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        typeof value.id === "string"
      ) {
        return value.id;
      }

      return null;
    })
    .filter((value): value is string => Boolean(value));

  return [...new Set(ids)];
}

async function listStudentsByIds(studentIds: string[]) {
  if (studentIds.length === 0) {
    return new Map<string, NormalizedUser>();
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(profileSelect)
    .in("id", studentIds)
    .eq("role", "student");

  if (error) {
    throw toServiceError(
      500,
      "STUDENTS_LIST_FAILED",
      "Unable to load assigned students",
      error
    );
  }

  const students = ((data ?? []) as UserProfileRow[]).map(toNormalizedUser);
  return new Map(students.map((student) => [student.id, student]));
}

function buildCourseStats(courseRows: CourseStatusRow[]) {
  const statsByTeacherId = new Map<
    string,
    { courseCount: number; publishedCourseCount: number; draftCourseCount: number }
  >();

  for (const course of courseRows) {
    if (!course.teacher_id) {
      continue;
    }

    const currentStats = statsByTeacherId.get(course.teacher_id) ?? {
      courseCount: 0,
      publishedCourseCount: 0,
      draftCourseCount: 0,
    };

    currentStats.courseCount += 1;

    if (course.status === "published" || course.is_published) {
      currentStats.publishedCourseCount += 1;
    } else if (course.status !== "archived") {
      currentStats.draftCourseCount += 1;
    }

    statsByTeacherId.set(course.teacher_id, currentStats);
  }

  return statsByTeacherId;
}

function buildTeacherRecord(
  teacher: NormalizedUser,
  teacherProfile: TeacherProfileRow | null,
  assignedStudentsById: Map<string, NormalizedUser>,
  statsByTeacherId: Map<
    string,
    { courseCount: number; publishedCourseCount: number; draftCourseCount: number }
  >
): AdminDashboardTeacher {
  const assignedStudents = extractAssignedStudentIds(teacherProfile)
    .map((studentId) => assignedStudentsById.get(studentId) ?? null)
    .filter((student): student is NormalizedUser => Boolean(student));
  const stats = statsByTeacherId.get(teacher.id) ?? {
    courseCount: 0,
    publishedCourseCount: 0,
    draftCourseCount: 0,
  };

  return {
    ...teacher,
    fullName: teacher.fullName ?? null,
    headline: pickStringValue(teacherProfile, ["headline"]),
    bio: pickStringValue(teacherProfile, ["bio"]),
    specialization: pickStringValue(teacherProfile, ["specialization"]),
    experienceYears: pickNumberValue(teacherProfile, [
      "experience_years",
      "experienceYears",
    ]),
    education: pickStringValue(teacherProfile, ["education"]),
    gender: pickStringValue(teacherProfile, ["gender"]) as
      | "male"
      | "female"
      | "other"
      | null,
    birthDate: pickStringValue(teacherProfile, ["birth_date", "birthDate"]),
    avatarPath: pickStringValue(teacherProfile, ["avatar_path", "avatarPath"]),
    linkedinUrl: pickStringValue(teacherProfile, ["linkedin_url", "linkedinUrl"]),
    githubUrl: pickStringValue(teacherProfile, ["github_url", "githubUrl"]),
    assignedStudents,
    courseCount: stats.courseCount,
    publishedCourseCount: stats.publishedCourseCount,
    draftCourseCount: stats.draftCourseCount,
  };
}

export async function getAdminDashboardOverview(): Promise<AdminDashboardOverviewData> {
  const [users, teachers, students, courseRows, modules, lessons, blocks, tests, questions, answers] =
    await Promise.all([
      countProfiles(),
      countProfiles("teacher"),
      countProfiles("student"),
      listCourseStatusRows(),
      countTableRows("modules"),
      countTableRows("lessons"),
      countTableRows("lesson_blocks"),
      countTableRows("test_entities"),
      countTableRows("test_questions"),
      countTableRows("test_answers"),
    ]);

  const courseStatuses = courseRows.reduce(
    (totals, course) => {
      totals.total += 1;

      if (course.status === "archived") {
        totals.archived += 1;
        return totals;
      }

      if (course.status === "published" || course.is_published) {
        totals.published += 1;
        return totals;
      }

      totals.draft += 1;
      return totals;
    },
    {
      total: 0,
      draft: 0,
      published: 0,
      archived: 0,
    }
  );

  return {
    totals: {
      users,
      teachers,
      students,
      courses: courseStatuses.total,
      modules,
      lessons,
      blocks,
      tests,
      questions,
      answers,
    },
    courseStatuses,
  };
}

export async function listAdminDashboardTeachers(): Promise<AdminDashboardTeacher[]> {
  const teachers = await listProfileUsersByRole("teacher");
  const teacherIds = teachers.map((teacher) => teacher.id);
  const teacherProfiles = await listTeacherProfiles(teacherIds);
  const assignedStudentIds = [
    ...new Set(
      Array.from(teacherProfiles.values()).flatMap((profile) => extractAssignedStudentIds(profile))
    ),
  ];
  const [assignedStudentsById, courseRows] = await Promise.all([
    listStudentsByIds(assignedStudentIds),
    listCourseStatusRows(),
  ]);
  const statsByTeacherId = buildCourseStats(courseRows);

  return teachers.map((teacher) =>
    buildTeacherRecord(
      teacher,
      teacherProfiles.get(teacher.id) ?? null,
      assignedStudentsById,
      statsByTeacherId
    )
  );
}

export async function getAdminDashboardTeacher(teacherId: string): Promise<AdminDashboardTeacher> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(profileSelect)
    .eq("id", teacherId)
    .eq("role", "teacher")
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "TEACHER_FETCH_FAILED", "Unable to load teacher", error);
  }

  if (!data) {
    throw new AppError(404, "Teacher not found.", "TEACHER_NOT_FOUND");
  }

  const teacher = toNormalizedUser(data as UserProfileRow);
  const teacherProfile = await getTeacherProfile(teacherId);
  const assignedStudentIds = extractAssignedStudentIds(teacherProfile);
  const [assignedStudentsById, courseRows] = await Promise.all([
    listStudentsByIds(assignedStudentIds),
    listCourseStatusRows(teacherId),
  ]);
  const statsByTeacherId = buildCourseStats(courseRows);

  return buildTeacherRecord(teacher, teacherProfile, assignedStudentsById, statsByTeacherId);
}

export async function saveAdminDashboardTeacherProfile(
  teacherId: string,
  input: AdminDashboardTeacherProfileInput
): Promise<AdminDashboardTeacher> {
  const teacher = await getAdminDashboardTeacher(teacherId);
  const authContext = await getRequestAuthContext(teacherId, teacher.email, teacher.fullName);

  if (authContext.role !== "teacher") {
    throw new AppError(404, "Teacher not found.", "TEACHER_NOT_FOUND");
  }

  await updateCurrentUserProfile(authContext, input);
  return getAdminDashboardTeacher(teacherId);
}

export async function deleteAdminDashboardTeacher(teacherId: string): Promise<void> {
  await getAdminDashboardTeacher(teacherId);
  await deleteTeacherAccount(teacherId);
}
