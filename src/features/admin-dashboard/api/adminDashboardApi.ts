import { listAdminUsers, listStudents, updateAdminUser } from "../../auth/api/authApi";
import { authorizedBackendRequest } from "../../auth/api/backendClient";
import type {
  AdminDashboardCourse,
  AdminDashboardOverviewData,
  AdminDashboardSettingsData,
  AdminTeacher,
  AdminTeacherProfileInput,
} from "../types";

type AdminOverviewResponse = {
  overview: AdminDashboardOverviewData;
};

type AdminTeachersResponse = {
  teachers: AdminTeacher[];
};

type AdminTeacherResponse = {
  teacher: AdminTeacher;
};

type AdminCoursesResponse = {
  courses: AdminDashboardCourse[];
};

type AdminCourseResponse = {
  course: AdminDashboardCourse;
};

export async function loadAdminOverviewData(): Promise<AdminDashboardOverviewData> {
  const response = await authorizedBackendRequest<AdminOverviewResponse>(
    "/admin/dashboard/overview"
  );

  return response.overview;
}

export async function loadAdminTeachersData() {
  const response = await authorizedBackendRequest<AdminTeachersResponse>(
    "/admin/dashboard/teachers"
  );

  return response.teachers;
}

export async function loadAdminStudentsData() {
  return listStudents();
}

export async function loadAdminTeacherDetailData(teacherId: string) {
  const response = await authorizedBackendRequest<AdminTeacherResponse>(
    `/admin/dashboard/teachers/${teacherId}`
  );

  return response.teacher;
}

export async function saveAdminTeacherProfile(
  teacher: AdminTeacher,
  input: AdminTeacherProfileInput
) {
  await updateAdminUser(teacher.id, {
    fullName: input.fullName.trim() || null,
  });

  return loadAdminTeacherDetailData(teacher.id);
}

export async function loadAdminCoursesData(): Promise<AdminDashboardCourse[]> {
  const response = await authorizedBackendRequest<AdminCoursesResponse>(
    "/admin/dashboard/courses"
  );

  return response.courses;
}

export async function loadAdminCourseDetailData(courseId: string): Promise<AdminDashboardCourse> {
  const response = await authorizedBackendRequest<AdminCourseResponse>(
    `/admin/dashboard/courses/${courseId}`
  );

  return response.course;
}

export async function loadAdminSettingsData(): Promise<AdminDashboardSettingsData> {
  const users = await listAdminUsers();

  return {
    users,
  };
}
