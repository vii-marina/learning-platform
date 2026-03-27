import { AppError } from "../lib/appError";
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

function toServiceError(statusCode: number, code: string, fallbackMessage: string, error: BackendError) {
  return new AppError(statusCode, `${fallbackMessage}: ${error.message}`, code);
}

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
  courseTitlesById: Map<string, string>
): AdminDashboardStudent {
  const records = [extraProfile, profile];
  const enrolledCourses = normalizeCourseList(
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
  const completedCourses = normalizeCourseList(
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
    .select("id,title")
    .is("deleted_at", null);

  if (error) {
    throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to load courses", error);
  }

  const courses = (data ?? []) as CourseRow[];
  return new Map(
    courses.map((course) => [course.id, course.title?.trim() || "Untitled course"])
  );
}

export async function listAdminDashboardStudents(): Promise<AdminDashboardStudent[]> {
  const [students, courseTitlesById] = await Promise.all([
    listStudentProfiles(),
    listCourseTitlesById(),
  ]);
  const studentProfilesById = await listOptionalStudentProfiles(
    students.map((student) => student.id)
  );

  return students.map((student) =>
    buildStudentRecord(
      student,
      studentProfilesById.get(student.id) ?? null,
      courseTitlesById
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

  const [studentProfile, courseTitlesById] = await Promise.all([
    getOptionalStudentProfile(studentId),
    listCourseTitlesById(),
  ]);

  return buildStudentRecord(data as StudentProfileRow, studentProfile, courseTitlesById);
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
