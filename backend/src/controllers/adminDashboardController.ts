import type { Request, Response } from "express";
import { updateUserParamsSchema } from "../validators/adminSchemas";
import { updateCurrentUserSchema } from "../validators/authSchemas";
import {
  deleteAdminDashboardTeacher,
  getAdminDashboardOverview,
  getAdminDashboardTeacher,
  listAdminDashboardTeachers,
  saveAdminDashboardTeacherProfile,
} from "../services/adminDashboardService";
import {
  deleteAdminDashboardStudent,
  getAdminDashboardStudent,
  listAdminDashboardStudents,
  saveAdminDashboardStudentProfile,
} from "../services/adminDashboardStudentsService";

export async function getAdminDashboardOverviewHandler(_req: Request, res: Response) {
  const overview = await getAdminDashboardOverview();
  res.status(200).json({ overview });
}

export async function listAdminDashboardTeachersHandler(_req: Request, res: Response) {
  const teachers = await listAdminDashboardTeachers();
  res.status(200).json({ teachers });
}

export async function listAdminDashboardStudentsHandler(_req: Request, res: Response) {
  const students = await listAdminDashboardStudents();
  res.status(200).json({ students });
}

export async function getAdminDashboardStudentHandler(req: Request, res: Response) {
  const params = updateUserParamsSchema.parse(req.params);
  const student = await getAdminDashboardStudent(params.id);
  res.status(200).json({ student });
}

export async function getAdminDashboardTeacherHandler(req: Request, res: Response) {
  const params = updateUserParamsSchema.parse(req.params);
  const teacher = await getAdminDashboardTeacher(params.id);
  res.status(200).json({ teacher });
}

export async function updateAdminDashboardTeacherHandler(req: Request, res: Response) {
  const params = updateUserParamsSchema.parse(req.params);
  const input = updateCurrentUserSchema.parse(req.body);
  const teacher = await saveAdminDashboardTeacherProfile(params.id, {
    email: input.email,
    fullName: input.fullName,
    headline: input.headline,
    bio: input.bio,
    specialization: input.specialization,
    experienceYears: input.experienceYears,
    education: input.education,
    educationPlace: input.educationPlace,
    gender: input.gender,
    birthDate: input.birthDate,
    avatarPath: input.avatarPath,
    linkedinUrl: input.linkedinUrl,
    githubUrl: input.githubUrl,
  });

  res.status(200).json({ teacher });
}

export async function updateAdminDashboardStudentHandler(req: Request, res: Response) {
  const params = updateUserParamsSchema.parse(req.params);
  const input = updateCurrentUserSchema.parse(req.body);
  const student = await saveAdminDashboardStudentProfile(params.id, {
    email: input.email,
    fullName: input.fullName,
    bio: input.bio,
    educationPlace: input.educationPlace,
    birthDate: input.birthDate,
    avatarPath: input.avatarPath,
    linkedinUrl: input.linkedinUrl,
    githubUrl: input.githubUrl,
  });

  res.status(200).json({ student });
}

export async function deleteAdminDashboardTeacherHandler(req: Request, res: Response) {
  const params = updateUserParamsSchema.parse(req.params);
  await deleteAdminDashboardTeacher(params.id);
  res.status(200).json({ deletedId: params.id });
}

export async function deleteAdminDashboardStudentHandler(req: Request, res: Response) {
  const params = updateUserParamsSchema.parse(req.params);
  await deleteAdminDashboardStudent(params.id);
  res.status(200).json({ deletedId: params.id });
}
