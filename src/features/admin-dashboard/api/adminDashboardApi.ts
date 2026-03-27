import { listAdminUsers } from "../../auth/api/authApi";
import { authorizedBackendRequest } from "../../auth/api/backendClient";
import type {
  AdminDashboardCourse,
  AdminDashboardCourseSummary,
  AdminDashboardOverviewData,
  AdminDashboardSettingsData,
  AdminDashboardStudent,
  AdminTeacher,
  AdminTeacherProfileInput,
} from "../types";

type AdminOverviewResponse = {
  overview: AdminDashboardOverviewData;
};

type AdminTeachersResponse = {
  teachers: AdminTeacher[];
};

type AdminStudentsResponse = {
  students: AdminDashboardStudent[];
};

type AdminTeacherResponse = {
  teacher: AdminTeacher;
};

type AdminCoursesResponse = {
  courses: AdminDashboardCourseSummary[];
};

type AdminCourseResponse = {
  course: AdminDashboardCourse;
};

type CacheEntry<T> = {
  value?: T;
  expiresAt: number;
  promise?: Promise<T>;
};

const DASHBOARD_CACHE_TTL_MS = 60_000;
const dashboardCache = new Map<string, CacheEntry<unknown>>();

function readCachedDashboardValue<T>(key: string) {
  const entry = dashboardCache.get(key) as CacheEntry<T> | undefined;

  if (!entry || entry.value === undefined || entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.value;
}

function setCachedDashboardValue<T>(key: string, value: T, ttlMs = DASHBOARD_CACHE_TTL_MS) {
  dashboardCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function loadCachedDashboardValue<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = DASHBOARD_CACHE_TTL_MS
) {
  const entry = dashboardCache.get(key) as CacheEntry<T> | undefined;
  const cachedValue = readCachedDashboardValue<T>(key);

  if (cachedValue !== null) {
    return Promise.resolve(cachedValue);
  }

  if (entry?.promise) {
    return entry.promise;
  }

  const promise = loader()
    .then((value) => {
      setCachedDashboardValue(key, value, ttlMs);
      return value;
    })
    .catch((error) => {
      dashboardCache.delete(key);
      throw error;
    });

  dashboardCache.set(key, {
    expiresAt: entry?.expiresAt ?? 0,
    promise,
  });

  return promise;
}

function deleteDashboardKeys(keys: string[]) {
  for (const key of keys) {
    dashboardCache.delete(key);
  }
}

function teacherDetailKey(teacherId: string) {
  return `teacher:${teacherId}`;
}

function courseDetailKey(courseId: string) {
  return `course:${courseId}`;
}

export function clearAdminDashboardCache() {
  dashboardCache.clear();
}

export function primeAdminTeacherDetailCache(teacher: AdminTeacher) {
  setCachedDashboardValue(teacherDetailKey(teacher.id), teacher);
}

export function primeAdminCourseDetailCache(course: AdminDashboardCourse) {
  setCachedDashboardValue(courseDetailKey(course.id), course);
}

export async function loadAdminOverviewData(): Promise<AdminDashboardOverviewData> {
  const response = await loadCachedDashboardValue(
    "overview",
    () =>
      authorizedBackendRequest<AdminOverviewResponse>(
        "/admin/dashboard/overview"
      )
  );

  return response.overview;
}

export async function loadAdminTeachersData() {
  const response = await loadCachedDashboardValue(
    "teachers:list",
    () =>
      authorizedBackendRequest<AdminTeachersResponse>(
        "/admin/dashboard/teachers"
      )
  );

  return response.teachers;
}

export async function loadAdminStudentsData(): Promise<AdminDashboardStudent[]> {
  const response = await loadCachedDashboardValue(
    "students:list",
    () =>
      authorizedBackendRequest<AdminStudentsResponse>(
        "/admin/dashboard/students"
      )
  );

  return response.students;
}

export async function loadAdminTeacherDetailData(teacherId: string) {
  const response = await loadCachedDashboardValue(
    teacherDetailKey(teacherId),
    () =>
      authorizedBackendRequest<AdminTeacherResponse>(
        `/admin/dashboard/teachers/${teacherId}`
      )
  );

  return response.teacher;
}

export async function saveAdminTeacherProfile(
  teacherId: string,
  input: AdminTeacherProfileInput
) {
  const response = await authorizedBackendRequest<AdminTeacherResponse>(
    `/admin/dashboard/teachers/${teacherId}`,
    {
      method: "PATCH",
      body: input,
    }
  );

  deleteDashboardKeys(["teachers:list", teacherDetailKey(teacherId)]);
  const updatedTeacher = response.teacher;
  primeAdminTeacherDetailCache(updatedTeacher);
  return updatedTeacher;
}

export async function loadAdminCoursesData(): Promise<AdminDashboardCourseSummary[]> {
  const response = await loadCachedDashboardValue(
    "courses:list",
    () =>
      authorizedBackendRequest<AdminCoursesResponse>(
        "/admin/dashboard/courses"
      )
  );

  return response.courses;
}

export async function loadAdminCourseDetailData(courseId: string): Promise<AdminDashboardCourse> {
  const response = await loadCachedDashboardValue(
    courseDetailKey(courseId),
    () =>
      authorizedBackendRequest<AdminCourseResponse>(
        `/admin/dashboard/courses/${courseId}`
      )
  );

  return response.course;
}

export async function loadAdminSettingsData(): Promise<AdminDashboardSettingsData> {
  const users = await loadCachedDashboardValue("settings", () => listAdminUsers());

  return {
    users,
  };
}
