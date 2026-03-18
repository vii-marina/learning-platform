import type { Request, Response } from "express";
import { listUsers, updateUser } from "../services/adminService";
import { listUsersQuerySchema, updateUserParamsSchema, updateUserSchema } from "../validators/adminSchemas";

export async function listUsersHandler(req: Request, res: Response) {
  const query = listUsersQuerySchema.parse(req.query);
  const users = await listUsers(query.role);

  res.status(200).json({ users });
}

export async function listTeachersHandler(_req: Request, res: Response) {
  const users = await listUsers("teacher");
  res.status(200).json({ users });
}

export async function listStudentsHandler(_req: Request, res: Response) {
  const users = await listUsers("student");
  res.status(200).json({ users });
}

export async function updateUserHandler(req: Request, res: Response) {
  const params = updateUserParamsSchema.parse(req.params);
  const input = updateUserSchema.parse(req.body);
  const user = await updateUser(params.id, {
    fullName: input.fullName,
    role: input.role,
  });

  res.status(200).json({ user });
}
