import type { Request, Response } from "express";
import { AppError } from "../lib/appError";
import {
  createExercise,
  deleteExerciseById,
  listModuleExercises,
  updateExerciseById,
} from "../services/exerciseService";
import { moduleParamsSchema } from "../validators/courseBuilderSchemas";
import {
  createExerciseSchema,
  exerciseParamsSchema,
  updateExerciseSchema,
} from "../validators/exerciseSchemas";

function getAuthenticatedUser(req: Request) {
  if (!req.auth) {
    throw new AppError(401, "Authentication is required.", "AUTH_REQUIRED");
  }

  return req.auth;
}

export async function listModuleExercisesHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const { moduleId } = moduleParamsSchema.parse(req.params);
  const exercises = await listModuleExercises(auth, moduleId);
  res.status(200).json({ exercises });
}

export async function createExerciseHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const input = createExerciseSchema.parse(req.body);
  const exercise = await createExercise(auth, input);
  res.status(201).json({ exercise });
}

export async function updateExerciseHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const { exerciseId } = exerciseParamsSchema.parse(req.params);
  const input = updateExerciseSchema.parse(req.body);
  const exercise = await updateExerciseById(auth, exerciseId, input);
  res.status(200).json({ exercise });
}

export async function deleteExerciseHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const { exerciseId } = exerciseParamsSchema.parse(req.params);
  await deleteExerciseById(auth, exerciseId);
  res.status(204).send();
}
