import type { Request, Response } from "express";
import { createManagedUser, listUsers, updateUser } from "../services/adminService";
import {
  createManagedUserSchema,
  listUsersQuerySchema,
  updateUserParamsSchema,
  updateUserSchema,
} from "../validators/adminSchemas";

export async function listUsersHandler(req: Request, res: Response) {
  const query = listUsersQuerySchema.parse(req.query);
  const users = await listUsers(query.role);

  res.status(200).json({ users });
}

export async function listTeachersHandler(_req: Request, res: Response) {
  const users = await listUsers("teacher");
  res.status(200).json({ users });
}

export async function createManagedUserHandler(req: Request, res: Response) {
  const input = createManagedUserSchema.parse(req.body);
  const user = await createManagedUser(input);

  res.status(201).json({ user });
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
