/**
 * The admin overview and teacher-management API.
 *
 * Profile field readers live in `adminDashboard/teacherProfileFields`.
 */

import { AppError, toServiceError } from "../lib/appError";
import { isAdminRole, normalizeUserRole } from "../lib/roles";
import { supabaseAdmin } from "../lib/supabase";
import type { AdminRow, NormalizedUser, UserProfileRow } from "../types/auth";
import {
  extractAssignedStudentIds,
  listStudentsByIds,
  pickNumberValue,
  pickStringValue,
} from "./adminDashboard/teacherProfileFields";
import type {
  AdminDashboardOverviewData,
  AdminDashboardTeacher,
  AdminDashboardTeacherProfileInput,
  CountedTable,
  CourseStatusRow,
  TeacherProfileRow,
} from "./adminDashboard/types";

import { updateCurrentUserProfile } from "./authService";
import {
  deleteTeacherAccount,
  getAdminRecordById,
  getRequestAuthContext,
  listProfileUsersByRole,
} from "./userService";

export type { AdminDashboardTeacher } from "./adminDashboard/types";


const profileSelect = "id,email,full_name,role,created_at";

// `admins` decides elevation, `profiles.role` is only the fallback — the same rule the request
// context uses. Reading profiles.role alone made these lists disagree with the rest of the system
// about who is an admin whenever the two drifted.
function toNormalizedUser(
  profile: UserProfileRow,
  adminRecord: AdminRow | null = null
): NormalizedUser {
  const role = normalizeUserRole(profile.role, adminRecord) ?? profile.role;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role,
    isAdmin: isAdminRole(role),
    isSuperAdmin: role === "super-admin",
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

  const teacher = toNormalizedUser(
    data as UserProfileRow,
    await getAdminRecordById(teacherId)
  );
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
