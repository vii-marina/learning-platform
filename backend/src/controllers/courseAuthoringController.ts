import type { Request, Response } from "express";
import { AppError } from "../lib/appError";
import {
  createCourse,
  createModule,
  createTestAnswer,
  createTestEntity,
  createTestQuestion,
  deleteCourse,
  deleteModule,
  deleteTestAnswer,
  deleteTestEntity,
  deleteTestQuestion,
  reorderLessonBlocks,
  reorderLessons,
  reorderModules,
  saveTestQuestions,
  updateCourse,
  updateModule,
  updateTestAnswer,
  updateTestEntity,
  updateTestQuestion,
} from "../services/courseAuthoringService";
import {
  answerIdParams,
  courseIdParams,
  createAnswerSchema,
  createCourseSchema,
  createModuleSchema,
  createQuestionSchema,
  createTestSchema,
  moduleIdParams,
  questionIdParams,
  reorderSchema,
  saveTestQuestionsSchema,
  testIdParams,
  updateAnswerSchema,
  updateCourseSchema,
  updateModuleSchema,
  updateQuestionSchema,
  updateTestSchema,
} from "../validators/authoringSchemas";

function getAuth(req: Request) {
  if (!req.auth) {
    throw new AppError(401, "Authentication is required.", "AUTH_REQUIRED");
  }
  return req.auth;
}

export async function createCourseHandler(req: Request, res: Response) {
  const input = createCourseSchema.parse(req.body);
  const course = await createCourse(getAuth(req), input);
  res.status(201).json({ course });
}

export async function updateCourseHandler(req: Request, res: Response) {
  const { courseId } = courseIdParams.parse(req.params);
  const input = updateCourseSchema.parse(req.body);
  const course = await updateCourse(getAuth(req), courseId, input);
  res.status(200).json({ course });
}

export async function deleteCourseHandler(req: Request, res: Response) {
  const { courseId } = courseIdParams.parse(req.params);
  await deleteCourse(getAuth(req), courseId);
  res.status(204).send();
}

export async function createModuleHandler(req: Request, res: Response) {
  const input = createModuleSchema.parse(req.body);
  const module = await createModule(getAuth(req), input);
  res.status(201).json({ module });
}

export async function updateModuleHandler(req: Request, res: Response) {
  const { moduleId } = moduleIdParams.parse(req.params);
  const input = updateModuleSchema.parse(req.body);
  const module = await updateModule(getAuth(req), moduleId, input);
  res.status(200).json({ module });
}

export async function deleteModuleHandler(req: Request, res: Response) {
  const { moduleId } = moduleIdParams.parse(req.params);
  await deleteModule(getAuth(req), moduleId);
  res.status(204).send();
}

export async function createTestHandler(req: Request, res: Response) {
  const input = createTestSchema.parse(req.body);
  const test = await createTestEntity(getAuth(req), input);
  res.status(201).json({ test });
}

export async function updateTestHandler(req: Request, res: Response) {
  const { testId } = testIdParams.parse(req.params);
  const input = updateTestSchema.parse(req.body);
  const test = await updateTestEntity(getAuth(req), testId, input);
  res.status(200).json({ test });
}

export async function deleteTestHandler(req: Request, res: Response) {
  const { testId } = testIdParams.parse(req.params);
  await deleteTestEntity(getAuth(req), testId);
  res.status(204).send();
}

export async function saveTestQuestionsHandler(req: Request, res: Response) {
  const { testId } = testIdParams.parse(req.params);
  const { questions } = saveTestQuestionsSchema.parse(req.body);
  await saveTestQuestions(getAuth(req), testId, questions);
  res.status(204).send();
}

export async function createQuestionHandler(req: Request, res: Response) {
  const input = createQuestionSchema.parse(req.body);
  const question = await createTestQuestion(getAuth(req), input);
  res.status(201).json({ question });
}

export async function updateQuestionHandler(req: Request, res: Response) {
  const { questionId } = questionIdParams.parse(req.params);
  const input = updateQuestionSchema.parse(req.body);
  const question = await updateTestQuestion(getAuth(req), questionId, input);
  res.status(200).json({ question });
}

export async function deleteQuestionHandler(req: Request, res: Response) {
  const { questionId } = questionIdParams.parse(req.params);
  await deleteTestQuestion(getAuth(req), questionId);
  res.status(204).send();
}

export async function createAnswerHandler(req: Request, res: Response) {
  const input = createAnswerSchema.parse(req.body);
  const answer = await createTestAnswer(getAuth(req), input);
  res.status(201).json({ answer });
}

export async function updateAnswerHandler(req: Request, res: Response) {
  const { answerId } = answerIdParams.parse(req.params);
  const input = updateAnswerSchema.parse(req.body);
  const answer = await updateTestAnswer(getAuth(req), answerId, input);
  res.status(200).json({ answer });
}

export async function deleteAnswerHandler(req: Request, res: Response) {
  const { answerId } = answerIdParams.parse(req.params);
  await deleteTestAnswer(getAuth(req), answerId);
  res.status(204).send();
}

export async function reorderModulesHandler(req: Request, res: Response) {
  const { firstId, secondId } = reorderSchema.parse(req.body);
  await reorderModules(getAuth(req), firstId, secondId);
  res.status(204).send();
}

export async function reorderLessonsHandler(req: Request, res: Response) {
  const { firstId, secondId } = reorderSchema.parse(req.body);
  await reorderLessons(getAuth(req), firstId, secondId);
  res.status(204).send();
}

export async function reorderLessonBlocksHandler(req: Request, res: Response) {
  const { firstId, secondId } = reorderSchema.parse(req.body);
  await reorderLessonBlocks(getAuth(req), firstId, secondId);
  res.status(204).send();
}
