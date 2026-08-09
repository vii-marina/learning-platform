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

export async function createManagedUserHandler(req: Request, res: Response) {
  const input = createManagedUserSchema.parse(req.body);
  const user = await createManagedUser(input);

  res.status(201).json({ user });
}

// The only role-mutation path in the system. Nothing in the UI calls it yet, but it is kept
// deliberately: /auth/register-profile no longer lets a user set their own role after sign-up,
// so removing this would leave no way to change anyone's role at all.
export async function updateUserHandler(req: Request, res: Response) {
  const params = updateUserParamsSchema.parse(req.params);
  const input = updateUserSchema.parse(req.body);
  const user = await updateUser(params.id, {
    fullName: input.fullName,
    role: input.role,
  });

  res.status(200).json({ user });
}
