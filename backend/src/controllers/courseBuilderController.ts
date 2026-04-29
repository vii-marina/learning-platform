import type { Request, Response } from "express";
import { AppError } from "../lib/appError";
import {
  createLessonBlockForLesson,
  createModuleLesson,
  deleteLessonBlockById,
  deleteLessonById,
  listModuleContent,
  listBlocksByLesson,
  listModuleLessons,
  updateLessonBlockById,
  updateLessonById,
} from "../services/courseBuilderService";
import {
  createLessonBlockSchema,
  createLessonSchema,
  lessonBlockParamsSchema,
  lessonParamsSchema,
  moduleParamsSchema,
  updateLessonBlockSchema,
  updateLessonSchema,
} from "../validators/courseBuilderSchemas";

function getAuthenticatedUser(req: Request) {
  if (!req.auth) {
    throw new AppError(401, "Authentication is required.", "AUTH_REQUIRED");
  }

  return req.auth;
}

export async function listModuleLessonsHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const { moduleId } = moduleParamsSchema.parse(req.params);
  const lessons = await listModuleLessons(auth, moduleId);
  res.status(200).json({ lessons });
}

export async function listModuleContentHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const { moduleId } = moduleParamsSchema.parse(req.params);
  const content = await listModuleContent(auth, moduleId);
  res.status(200).json(content);
}

export async function createModuleLessonHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const { moduleId } = moduleParamsSchema.parse(req.params);
  const input = createLessonSchema.parse(req.body);
  const lesson = await createModuleLesson(auth, {
    moduleId,
    title: input.title,
    content: input.content,
    videoUrl: input.videoUrl,
    contentType: input.contentType,
    order: input.order,
  });
  res.status(201).json({ lesson });
}

export async function updateLessonHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const { lessonId } = lessonParamsSchema.parse(req.params);
  const input = updateLessonSchema.parse(req.body);
  const lesson = await updateLessonById(auth, lessonId, {
    title: input.title,
    content: input.content,
    videoUrl: input.videoUrl,
    contentType: input.contentType,
    order: input.order,
  });
  res.status(200).json({ lesson });
}

export async function deleteLessonHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const { lessonId } = lessonParamsSchema.parse(req.params);
  await deleteLessonById(auth, lessonId);
  res.status(204).send();
}

export async function listLessonBlocksHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const { lessonId } = lessonParamsSchema.parse(req.params);
  const lessonBlocks = await listBlocksByLesson(auth, lessonId);
  res.status(200).json({ lessonBlocks });
}

export async function createLessonBlockHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const { lessonId } = lessonParamsSchema.parse(req.params);
  const input = createLessonBlockSchema.parse(req.body);
  const lessonBlock = await createLessonBlockForLesson(auth, {
    lessonId,
    blockType: input.blockType,
    content: input.content,
    order: input.order,
  });
  res.status(201).json({ lessonBlock });
}

export async function updateLessonBlockHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const { lessonBlockId } = lessonBlockParamsSchema.parse(req.params);
  const input = updateLessonBlockSchema.parse(req.body);
  const lessonBlock = await updateLessonBlockById(auth, lessonBlockId, {
    blockType: input.blockType,
    content: input.content,
    order: input.order,
  });
  res.status(200).json({ lessonBlock });
}

export async function deleteLessonBlockHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const { lessonBlockId } = lessonBlockParamsSchema.parse(req.params);
  await deleteLessonBlockById(auth, lessonBlockId);
  res.status(204).send();
}
