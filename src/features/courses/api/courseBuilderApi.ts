import { supabase } from "../../../lib/supabase";
import { authorizedBackendRequest } from "../../auth/api/backendClient";
import { dedupeRequest } from "../../../lib/requestDedup";
import type {
  AiQuestionGenerationMode,
  Course,
  CreateCourseInput,
  CreateExerciseInput,
  CreateLessonBlockInput,
  CreateLessonInput,
  CreateModuleInput,
  CreateTestAnswerInput,
  CreateTestEntityInput,
  CreateTestQuestionInput,
  Exercise,
  ExerciseContent,
  ExerciseDifficulty,
  ExerciseType,
  Lesson,
  LessonBlock,
  Module,
  TestAnswer,
  TestEntity,
  TestQuestion,
  TestQuestionType,
  UpdateExerciseInput,
  UpdateCourseInput,
  UpdateLessonBlockInput,
  UpdateLessonInput,
  UpdateModuleInput,
  UpdateTestAnswerInput,
  UpdateTestEntityInput,
  UpdateTestQuestionInput,
} from "./types";

function toErrorMessage(scope: string, details: string) {
  return `${scope}: ${details}`;
}

type LessonResponse = {
  lesson: Lesson;
};

type LessonsResponse = {
  lessons: Lesson[];
};

type LessonBlockResponse = {
  lessonBlock: LessonBlock;
};

type LessonBlocksResponse = {
  lessonBlocks: LessonBlock[];
};

type ExerciseResponse = {
  exercise: Exercise;
};

type ExercisesResponse = {
  exercises: Exercise[];
};

// WP2: course-authoring write responses (backend-mediated)
type CourseResponse = { course: Course };
type ModuleResponse = { module: Module };
type TestResponse = { test: TestEntity };
type QuestionResponse = { question: TestQuestion };
type AnswerResponse = { answer: TestAnswer };

type HydratedTestQuestionResponse = TestQuestion & {
  answers: TestAnswer[];
};

export type HydratedTestEntityResponse = TestEntity & {
  questions: HydratedTestQuestionResponse[];
};

type ModuleContentResponse = {
  lessons: Lesson[];
  tests: HydratedTestEntityResponse[];
  exercises: Exercise[];
};

export type GeneratedTestQuestionOption = {
  text: string;
  correct: boolean;
};

export type GeneratedTestQuestion = {
  type: TestQuestionType;
  question_text: string;
  options: GeneratedTestQuestionOption[];
};

type GenerateTestQuestionsResponse = {
  questions: GeneratedTestQuestion[];
};

type GenerateTestQuestionsInput = {
  afterLessonId?: string;
  moduleId?: string;
  questionCount?: number;
  generationMode?: AiQuestionGenerationMode;
};

export type GeneratedExerciseWithDifficulty = ExerciseContent & {
  difficulty: ExerciseDifficulty;
};

export type GenerateExerciseResponse = {
  content?: ExerciseContent;
  exercises?: GeneratedExerciseWithDifficulty[];
  maxDifficulty?: ExerciseDifficulty;
};

export type GenerateExerciseInput = {
  afterLessonId?: string;
  moduleId?: string;
  type: ExerciseType;
  difficulties?: ExerciseDifficulty[];
  count?: number;
};

export type ExerciseGenerationLimitInput = {
  afterLessonId?: string;
  moduleId?: string;
};

export type ExerciseGenerationLimitResponse = {
  maxCount: number;
  maxDifficulty?: ExerciseDifficulty;
};

function buildDuplicateCourseTitle(title: string) {
  const normalizedTitle = title.trim() || "Untitled course";

  if (/\bcopy(?:\s+\d+)?$/i.test(normalizedTitle)) {
    return `${normalizedTitle} 2`;
  }

  return `${normalizedTitle} Copy`;
}

// COURSES — reads via anon client (RLS-scoped); writes via backend (WP2).
export async function listCourses(teacherId?: string) {
  return dedupeRequest(`courses:list:${teacherId ?? "all"}`, async () => {
    const query = supabase
      .from("courses")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const { data, error } = teacherId
      ? await query.eq("teacher_id", teacherId)
      : await query;

    if (error) {
      throw new Error(toErrorMessage("Unable to list courses", error.message));
    }

    return (data ?? []) as Course[];
  });
}

export async function getCourseById(courseId: string) {
  return dedupeRequest(`course:${courseId}`, async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .is("deleted_at", null)
      .single();

    if (error) {
      throw new Error(toErrorMessage("Unable to fetch course", error.message));
    }

    return data as Course;
  });
}

export async function createCourse(input: CreateCourseInput) {
  const response = await authorizedBackendRequest<CourseResponse>("/authoring/courses", {
    method: "POST",
    body: input,
  });
  return response.course;
}

export async function updateCourse(courseId: string, input: UpdateCourseInput) {
  const response = await authorizedBackendRequest<CourseResponse>(`/authoring/courses/${courseId}`, {
    method: "PATCH",
    body: input,
  });
  return response.course;
}

export async function publishCourse(courseId: string) {
  return updateCourse(courseId, {
    status: "published",
    is_published: true,
    deleted_at: null,
  });
}

export async function unpublishCourse(courseId: string) {
  return updateCourse(courseId, {
    status: "draft",
    is_published: false,
    deleted_at: null,
  });
}

export async function archiveCourse(courseId: string) {
  return updateCourse(courseId, {
    status: "archived",
    is_published: false,
  });
}

export async function softDeleteCourse(courseId: string) {
  return updateCourse(courseId, {
    deleted_at: new Date().toISOString(),
    status: "archived",
    is_published: false,
  });
}

export async function deleteCourse(courseId: string) {
  await authorizedBackendRequest<void>(`/authoring/courses/${courseId}`, {
    method: "DELETE",
  });
}

export async function duplicateCourse(courseId: string) {
  const sourceCourse = await getCourseById(courseId);
  const duplicatedCourse = await createCourse({
    title: buildDuplicateCourseTitle(sourceCourse.title),
    description: sourceCourse.description,
    teacher_id: sourceCourse.teacher_id,
    status: "draft",
    access_type: sourceCourse.access_type,
    thumbnail_path: sourceCourse.thumbnail_path,
    is_published: false,
  });
  const sourceModules = await listModulesByCourse(sourceCourse.id);
  const lessonIdMap = new Map<string, string>();

  for (const sourceModule of sourceModules) {
    const duplicatedModule = await createModule({
      course_id: duplicatedCourse.id,
      title: sourceModule.title,
      order: sourceModule.order,
    });

    const [sourceLessons, sourceTests, sourceExercises] = await Promise.all([
      listLessonsByModule(sourceModule.id),
      listTestsByModule(sourceModule.id),
      listExercisesByModule(sourceModule.id),
    ]);

    for (const sourceLesson of sourceLessons) {
      const duplicatedLesson = await createLesson({
        module_id: duplicatedModule.id,
        title: sourceLesson.title,
        content: sourceLesson.content,
        video_url: sourceLesson.video_url,
        content_type: sourceLesson.content_type,
        order: sourceLesson.order,
      });

      lessonIdMap.set(sourceLesson.id, duplicatedLesson.id);

      const sourceLessonBlocks = await listLessonBlocksByLesson(sourceLesson.id);

      for (const sourceLessonBlock of sourceLessonBlocks) {
        await createLessonBlock({
          lesson_id: duplicatedLesson.id,
          block_type: sourceLessonBlock.block_type,
          content: sourceLessonBlock.content,
          order: sourceLessonBlock.order,
        });
      }
    }

    for (const sourceExercise of sourceExercises) {
      await createExercise({
        moduleId: duplicatedModule.id,
        afterLessonId: sourceExercise.after_lesson_id
          ? lessonIdMap.get(sourceExercise.after_lesson_id)
          : undefined,
        type: sourceExercise.type,
        title: sourceExercise.title,
        description: sourceExercise.description,
        content: sourceExercise.content,
      });
    }

    for (const sourceTest of sourceTests) {
      const duplicatedTest = await createTestEntity({
        module_id: duplicatedModule.id,
        after_lesson_id: sourceTest.after_lesson_id
          ? lessonIdMap.get(sourceTest.after_lesson_id) ?? null
          : null,
        title: sourceTest.title,
        order: sourceTest.order,
      });
      const sourceQuestions = await listTestQuestions(sourceTest.id);

      for (const sourceQuestion of sourceQuestions) {
        const duplicatedQuestion = await createTestQuestion({
          test_id: duplicatedTest.id,
          type: sourceQuestion.type,
          question_text: sourceQuestion.question_text,
          order: sourceQuestion.order,
          hint: sourceQuestion.hint,
        });
        const sourceAnswers = await listTestAnswers(sourceQuestion.id);

        for (const sourceAnswer of sourceAnswers) {
          await createTestAnswer({
            question_id: duplicatedQuestion.id,
            answer_text: sourceAnswer.answer_text,
            is_correct: sourceAnswer.is_correct,
          });
        }
      }
    }
  }

  return duplicatedCourse;
}

// MODULES — read via anon client; writes via backend.
export async function listModulesByCourse(courseId: string) {
  return dedupeRequest(`modules:course:${courseId}`, async () => {
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", courseId)
      .order("order", { ascending: true });

    if (error) {
      throw new Error(toErrorMessage("Unable to list modules", error.message));
    }

    return (data ?? []) as Module[];
  });
}

export async function createModule(input: CreateModuleInput) {
  const response = await authorizedBackendRequest<ModuleResponse>("/authoring/modules", {
    method: "POST",
    body: input,
  });
  return response.module;
}

export async function updateModule(moduleId: string, input: UpdateModuleInput) {
  const response = await authorizedBackendRequest<ModuleResponse>(`/authoring/modules/${moduleId}`, {
    method: "PATCH",
    body: input,
  });
  return response.module;
}

export async function deleteModule(moduleId: string) {
  await authorizedBackendRequest<void>(`/authoring/modules/${moduleId}`, {
    method: "DELETE",
  });
}

export async function swapModuleOrder(first: Module, second: Module) {
  await authorizedBackendRequest<void>("/authoring/reorder/modules", {
    method: "POST",
    body: { firstId: first.id, secondId: second.id },
  });
}

// LESSONS — already backend-mediated.
export async function listLessonsByModule(moduleId: string) {
  return dedupeRequest(`lessons:module:${moduleId}`, async () => {
    const response = await authorizedBackendRequest<LessonsResponse>(
      `/auth/course-builder/modules/${moduleId}/lessons`
    );

    return response.lessons;
  });
}

export async function listModuleContent(moduleId: string) {
  return dedupeRequest(`module-content:${moduleId}`, () =>
    authorizedBackendRequest<ModuleContentResponse>(
      `/auth/course-builder/modules/${moduleId}/content`
    )
  );
}

export async function createLesson(input: CreateLessonInput) {
  const response = await authorizedBackendRequest<LessonResponse>(
    `/auth/course-builder/modules/${input.module_id}/lessons`,
    {
      method: "POST",
      body: {
        title: input.title.trim(),
        content: input.content ?? "",
        videoUrl: input.video_url?.trim() || null,
        contentType: input.content_type ?? null,
        order: input.order,
      },
    }
  );

  return response.lesson;
}

export async function updateLesson(lessonId: string, input: UpdateLessonInput) {
  const response = await authorizedBackendRequest<LessonResponse>(
    `/auth/course-builder/lessons/${lessonId}`,
    {
      method: "PATCH",
      body: {
        title: typeof input.title === "string" ? input.title.trim() : input.title,
        content: input.content,
        videoUrl:
          typeof input.video_url === "string" ? input.video_url.trim() || null : input.video_url,
        contentType: input.content_type,
        order: input.order,
      },
    }
  );

  return response.lesson;
}

export async function deleteLesson(lessonId: string) {
  await authorizedBackendRequest<void>(`/auth/course-builder/lessons/${lessonId}`, {
    method: "DELETE",
  });
}

export async function swapLessonOrder(first: Lesson, second: Lesson) {
  await authorizedBackendRequest<void>("/authoring/reorder/lessons", {
    method: "POST",
    body: { firstId: first.id, secondId: second.id },
  });
}

export async function listLessonBlocksByLesson(lessonId: string) {
  return dedupeRequest(`lesson-blocks:${lessonId}`, async () => {
    const response = await authorizedBackendRequest<LessonBlocksResponse>(
      `/auth/course-builder/lessons/${lessonId}/blocks`
    );

    return response.lessonBlocks;
  });
}

export async function createLessonBlock(input: CreateLessonBlockInput) {
  const response = await authorizedBackendRequest<LessonBlockResponse>(
    `/auth/course-builder/lessons/${input.lesson_id}/blocks`,
    {
      method: "POST",
      body: {
        blockType: input.block_type,
        content: input.content,
        order: input.order,
      },
    }
  );

  return response.lessonBlock;
}

export async function updateLessonBlock(lessonBlockId: string, input: UpdateLessonBlockInput) {
  const response = await authorizedBackendRequest<LessonBlockResponse>(
    `/auth/course-builder/lesson-blocks/${lessonBlockId}`,
    {
      method: "PATCH",
      body: {
        blockType: input.block_type,
        content: input.content,
        order: input.order,
      },
    }
  );

  return response.lessonBlock;
}

export async function deleteLessonBlock(lessonBlockId: string) {
  await authorizedBackendRequest<void>(`/auth/course-builder/lesson-blocks/${lessonBlockId}`, {
    method: "DELETE",
  });
}

export async function upsertLessonPrimaryRichTextBlock(lessonId: string, html: string) {
  const blocks = await listLessonBlocksByLesson(lessonId);
  const firstBlock = blocks[0];

  if (firstBlock) {
    return updateLessonBlock(firstBlock.id, {
      block_type: firstBlock.block_type,
      content: { html },
    });
  }

  return createLessonBlock({
    lesson_id: lessonId,
    block_type: "rich_text",
    content: { html },
    order: 1,
  });
}

// AI generation — backend-mediated.
export async function generateTestQuestionsWithAi(
  input: GenerateTestQuestionsInput
) {
  const response = await authorizedBackendRequest<GenerateTestQuestionsResponse>(
    "/api/ai/generate-test-questions",
    {
      method: "POST",
      body: input,
    }
  );

  return response.questions;
}

export async function generateExercisesWithAi(input: GenerateExerciseInput) {
  const response = await authorizedBackendRequest<GenerateExerciseResponse>(
    "/api/ai/generate-exercise",
    {
      method: "POST",
      body: input,
    }
  );

  return response;
}

export async function getExerciseAiGenerationLimit(
  input: ExerciseGenerationLimitInput
) {
  return authorizedBackendRequest<ExerciseGenerationLimitResponse>(
    "/api/ai/exercise-generation-limit",
    {
      method: "POST",
      body: input,
    }
  );
}

export async function generateExerciseWithAi(input: GenerateExerciseInput) {
  const response = await generateExercisesWithAi(input);

  if (response.content) {
    return response.content;
  }

  const firstExercise = response.exercises?.[0];

  if (firstExercise) {
    return firstExercise;
  }

  throw new Error("AI did not return any exercises.");
}

// EXERCISES — already backend-mediated.
export async function listExercisesByModule(moduleId: string) {
  return dedupeRequest(`exercises:module:${moduleId}`, async () => {
    const response = await authorizedBackendRequest<ExercisesResponse>(
      `/api/modules/${moduleId}/exercises`
    );

    return response.exercises;
  });
}

export async function createExercise(input: CreateExerciseInput) {
  const response = await authorizedBackendRequest<ExerciseResponse>("/api/exercises", {
    method: "POST",
    body: {
      afterLessonId: input.afterLessonId,
      moduleId: input.moduleId,
      type: input.type,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      content: input.content,
    },
  });

  return response.exercise;
}

export async function updateExercise(exerciseId: string, input: UpdateExerciseInput) {
  const response = await authorizedBackendRequest<ExerciseResponse>(
    `/api/exercises/${exerciseId}`,
    {
      method: "PATCH",
      body: {
        afterLessonId: input.afterLessonId,
        moduleId: input.moduleId,
        type: input.type,
        title: typeof input.title === "string" ? input.title.trim() : input.title,
        description:
          typeof input.description === "string"
            ? input.description.trim() || null
            : input.description,
        content: input.content,
      },
    }
  );

  return response.exercise;
}

export async function deleteExercise(exerciseId: string) {
  await authorizedBackendRequest<void>(`/api/exercises/${exerciseId}`, {
    method: "DELETE",
  });
}

export async function swapLessonBlockOrder(first: LessonBlock, second: LessonBlock) {
  await authorizedBackendRequest<void>("/authoring/reorder/lesson-blocks", {
    method: "POST",
    body: { firstId: first.id, secondId: second.id },
  });
}

// TESTS / QUESTIONS / ANSWERS — reads via anon client; writes via backend (WP2).
export async function listTestsByModule(moduleId: string) {
  return dedupeRequest(`tests:module:${moduleId}`, async () => {
    const { data, error } = await supabase
      .from("test_entities")
      .select("*")
      .eq("module_id", moduleId)
      .order("order", { ascending: true });

    if (error) {
      throw new Error(toErrorMessage("Unable to list module tests", error.message));
    }

    return (data ?? []) as TestEntity[];
  });
}

export async function listTestsByLesson(lessonId: string) {
  return dedupeRequest(`tests:lesson:${lessonId}`, async () => {
    const { data, error } = await supabase
      .from("test_entities")
      .select("*")
      .eq("after_lesson_id", lessonId)
      .order("order", { ascending: true });

    if (error) {
      throw new Error(toErrorMessage("Unable to list lesson tests", error.message));
    }

    return (data ?? []) as TestEntity[];
  });
}

export async function createTestEntity(input: CreateTestEntityInput) {
  const response = await authorizedBackendRequest<TestResponse>("/authoring/tests", {
    method: "POST",
    body: input,
  });
  return response.test;
}

export async function updateTestEntity(testId: string, input: UpdateTestEntityInput) {
  const response = await authorizedBackendRequest<TestResponse>(`/authoring/tests/${testId}`, {
    method: "PATCH",
    body: input,
  });
  return response.test;
}

export async function deleteTestEntity(testId: string) {
  // Backend cascades: deletes questions, answers, and user_test_results.
  await authorizedBackendRequest<void>(`/authoring/tests/${testId}`, {
    method: "DELETE",
  });
}

export async function listTestQuestions(testId: string) {
  return dedupeRequest(`test-questions:${testId}`, async () => {
    const { data, error } = await supabase
      .from("test_questions")
      .select("*")
      .eq("test_id", testId)
      .order("order", { ascending: true });

    if (error) {
      throw new Error(toErrorMessage("Unable to list test questions", error.message));
    }

    return (data ?? []) as TestQuestion[];
  });
}

export async function createTestQuestion(input: CreateTestQuestionInput) {
  const response = await authorizedBackendRequest<QuestionResponse>("/authoring/questions", {
    method: "POST",
    body: input,
  });
  return response.question;
}

export async function updateTestQuestion(questionId: string, input: UpdateTestQuestionInput) {
  const response = await authorizedBackendRequest<QuestionResponse>(
    `/authoring/questions/${questionId}`,
    {
      method: "PATCH",
      body: input,
    }
  );
  return response.question;
}

export async function deleteTestQuestion(questionId: string) {
  // Backend cascades: deletes the question's answers.
  await authorizedBackendRequest<void>(`/authoring/questions/${questionId}`, {
    method: "DELETE",
  });
}

export async function listTestAnswers(questionId: string) {
  return dedupeRequest(`test-answers:${questionId}`, async () => {
    const { data, error } = await supabase
      .from("test_answers")
      .select("*")
      .eq("question_id", questionId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(toErrorMessage("Unable to list test answers", error.message));
    }

    return (data ?? []) as TestAnswer[];
  });
}

export async function createTestAnswer(input: CreateTestAnswerInput) {
  const response = await authorizedBackendRequest<AnswerResponse>("/authoring/answers", {
    method: "POST",
    body: input,
  });
  return response.answer;
}

export async function updateTestAnswer(answerId: string, input: UpdateTestAnswerInput) {
  const response = await authorizedBackendRequest<AnswerResponse>(`/authoring/answers/${answerId}`, {
    method: "PATCH",
    body: input,
  });
  return response.answer;
}

export async function deleteTestAnswer(answerId: string) {
  await authorizedBackendRequest<void>(`/authoring/answers/${answerId}`, {
    method: "DELETE",
  });
}
