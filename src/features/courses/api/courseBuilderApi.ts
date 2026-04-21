import { supabase } from "../../../lib/supabase";
import { authorizedBackendRequest } from "../../auth/api/backendClient";
import type {
  AiQuestionGenerationMode,
  Course,
  CourseAccessType,
  CourseStatus,
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

function normalizeCourseSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildDefaultSlug(title: string) {
  const base = normalizeCourseSlug(title) || "course";
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}

function buildDuplicateCourseTitle(title: string) {
  const normalizedTitle = title.trim() || "Untitled course";

  if (/\bcopy(?:\s+\d+)?$/i.test(normalizedTitle)) {
    return `${normalizedTitle} 2`;
  }

  return `${normalizedTitle} Copy`;
}

function normalizeCourseStatus(isPublished: boolean | undefined): CourseStatus {
  return isPublished ? "published" : "draft";
}

async function getNextModuleOrder(courseId: string) {
  const { data, error } = await supabase
    .from("modules")
    .select("order")
    .eq("course_id", courseId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage("Unable to compute next module order", error.message));
  }

  return (data?.order ?? 0) + 1;
}

async function getNextQuestionOrder(testId: string) {
  const { data, error } = await supabase
    .from("test_questions")
    .select("order")
    .eq("test_id", testId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage("Unable to compute next question order", error.message));
  }

  return (data?.order ?? 0) + 1;
}

async function getNextTestOrder(moduleId: string) {
  const { data, error } = await supabase
    .from("test_entities")
    .select("order")
    .eq("module_id", moduleId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage("Unable to compute next test order", error.message));
  }

  return (data?.order ?? 0) + 1;
}

function validateTestEntityTarget(input: CreateTestEntityInput) {
  if (!input.module_id) {
    throw new Error("Test entity must target a module.");
  }

  if (!input.title.trim()) {
    throw new Error("Test entity must include a title.");
  }
}

export async function listCourses(teacherId?: string) {
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
}

export async function getCourseById(courseId: string) {
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
}

export async function createCourse(input: CreateCourseInput) {
  const payload: {
    title: string;
    description: string | null;
    teacher_id: string;
    status: CourseStatus;
    slug: string;
    thumbnail_path: string | null;
    is_published: boolean;
    access_type?: CourseAccessType;
  } = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    teacher_id: input.teacher_id,
    status: input.status ?? normalizeCourseStatus(input.is_published),
    slug: input.slug?.trim() || buildDefaultSlug(input.title),
    thumbnail_path: input.thumbnail_path ?? null,
    is_published: input.is_published ?? false,
  };

  if (input.access_type) {
    payload.access_type = input.access_type;
  }

  const { data, error } = await supabase
    .from("courses")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to create course", error.message));
  }

  return data as Course;
}

export async function updateCourse(courseId: string, input: UpdateCourseInput) {
  const payload: UpdateCourseInput = {
    ...input,
    description:
      typeof input.description === "string" ? input.description.trim() || null : input.description,
    slug: typeof input.slug === "string" ? normalizeCourseSlug(input.slug) : input.slug,
  };

  const { data, error } = await supabase
    .from("courses")
    .update(payload)
    .eq("id", courseId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to update course", error.message));
  }

  return data as Course;
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
  const { error } = await supabase.from("courses").delete().eq("id", courseId);

  if (error) {
    throw new Error(toErrorMessage("Unable to delete course", error.message));
  }
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

export async function listModulesByCourse(courseId: string) {
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Unable to list modules", error.message));
  }

  return (data ?? []) as Module[];
}

export async function createModule(input: CreateModuleInput) {
  const order = input.order ?? (await getNextModuleOrder(input.course_id));

  const { data, error } = await supabase
    .from("modules")
    .insert({
      course_id: input.course_id,
      title: input.title.trim(),
      order,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to create module", error.message));
  }

  return data as Module;
}

export async function updateModule(moduleId: string, input: UpdateModuleInput) {
  const { data, error } = await supabase
    .from("modules")
    .update({
      ...input,
      title: typeof input.title === "string" ? input.title.trim() : input.title,
    })
    .eq("id", moduleId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to update module", error.message));
  }

  return data as Module;
}

export async function deleteModule(moduleId: string) {
  const { error } = await supabase.from("modules").delete().eq("id", moduleId);

  if (error) {
    throw new Error(toErrorMessage("Unable to delete module", error.message));
  }
}

export async function swapModuleOrder(first: Module, second: Module) {
  const { error } = await supabase.from("modules").upsert([
    { id: first.id, order: second.order },
    { id: second.id, order: first.order },
  ]);

  if (error) {
    throw new Error(toErrorMessage("Unable to reorder modules", error.message));
  }
}

export async function listLessonsByModule(moduleId: string) {
  const response = await authorizedBackendRequest<LessonsResponse>(
    `/auth/course-builder/modules/${moduleId}/lessons`
  );

  return response.lessons;
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
  const { error } = await supabase.from("lessons").upsert([
    { id: first.id, order: second.order },
    { id: second.id, order: first.order },
  ]);

  if (error) {
    throw new Error(toErrorMessage("Unable to reorder lessons", error.message));
  }
}

export async function listLessonBlocksByLesson(lessonId: string) {
  const response = await authorizedBackendRequest<LessonBlocksResponse>(
    `/auth/course-builder/lessons/${lessonId}/blocks`
  );

  return response.lessonBlocks;
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

export async function listExercisesByModule(moduleId: string) {
  const response = await authorizedBackendRequest<ExercisesResponse>(
    `/api/modules/${moduleId}/exercises`
  );

  return response.exercises;
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
  const { error } = await supabase.from("lesson_blocks").upsert([
    { id: first.id, order: second.order },
    { id: second.id, order: first.order },
  ]);

  if (error) {
    throw new Error(toErrorMessage("Unable to reorder lesson blocks", error.message));
  }
}

export async function listTestsByModule(moduleId: string) {
  const { data, error } = await supabase
    .from("test_entities")
    .select("*")
    .eq("module_id", moduleId)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Unable to list module tests", error.message));
  }

  return (data ?? []) as TestEntity[];
}

export async function listTestsByLesson(lessonId: string) {
  const { data, error } = await supabase
    .from("test_entities")
    .select("*")
    .eq("after_lesson_id", lessonId)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Unable to list lesson tests", error.message));
  }

  return (data ?? []) as TestEntity[];
}

export async function createTestEntity(input: CreateTestEntityInput) {
  validateTestEntityTarget(input);
  const order = input.order ?? (await getNextTestOrder(input.module_id));

  const { data, error } = await supabase
    .from("test_entities")
    .insert({
      after_lesson_id: input.after_lesson_id ?? null,
      module_id: input.module_id,
      title: input.title.trim(),
      order,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to create test entity", error.message));
  }

  return data as TestEntity;
}

export async function updateTestEntity(testId: string, input: UpdateTestEntityInput) {
  const payload: UpdateTestEntityInput = {
    ...input,
    title: typeof input.title === "string" ? input.title.trim() : input.title,
  };

  const { data, error } = await supabase
    .from("test_entities")
    .update(payload)
    .eq("id", testId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to update test entity", error.message));
  }

  return data as TestEntity;
}

export async function deleteTestEntity(testId: string) {
  const questions = await listTestQuestions(testId);

  for (const question of questions) {
    await deleteTestQuestion(question.id);
  }

  const { error: resultDeleteError } = await supabase
    .from("user_test_results")
    .delete()
    .eq("test_id", testId);

  if (resultDeleteError) {
    throw new Error(
      toErrorMessage("Unable to delete test results", resultDeleteError.message)
    );
  }

  const { error } = await supabase.from("test_entities").delete().eq("id", testId);

  if (error) {
    throw new Error(toErrorMessage("Unable to delete test entity", error.message));
  }
}

export async function listTestQuestions(testId: string) {
  const { data, error } = await supabase
    .from("test_questions")
    .select("*")
    .eq("test_id", testId)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Unable to list test questions", error.message));
  }

  return (data ?? []) as TestQuestion[];
}

export async function createTestQuestion(input: CreateTestQuestionInput) {
  const order = input.order ?? (await getNextQuestionOrder(input.test_id));

  const { data, error } = await supabase
    .from("test_questions")
    .insert({
      test_id: input.test_id,
      type: input.type,
      question_text: input.question_text.trim(),
      order,
      hint: input.hint?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to create test question", error.message));
  }

  return data as TestQuestion;
}

export async function updateTestQuestion(questionId: string, input: UpdateTestQuestionInput) {
  const payload: UpdateTestQuestionInput = {
    ...input,
    question_text:
      typeof input.question_text === "string"
        ? input.question_text.trim()
        : input.question_text,
    hint: typeof input.hint === "string" ? input.hint.trim() || null : input.hint,
  };

  const { data, error } = await supabase
    .from("test_questions")
    .update(payload)
    .eq("id", questionId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to update test question", error.message));
  }

  return data as TestQuestion;
}

export async function deleteTestQuestion(questionId: string) {
  const { error: answerDeleteError } = await supabase
    .from("test_answers")
    .delete()
    .eq("question_id", questionId);

  if (answerDeleteError) {
    throw new Error(toErrorMessage("Unable to delete test answers", answerDeleteError.message));
  }

  const { error } = await supabase.from("test_questions").delete().eq("id", questionId);

  if (error) {
    throw new Error(toErrorMessage("Unable to delete test question", error.message));
  }
}

export async function listTestAnswers(questionId: string) {
  const { data, error } = await supabase
    .from("test_answers")
    .select("*")
    .eq("question_id", questionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Unable to list test answers", error.message));
  }

  return (data ?? []) as TestAnswer[];
}

export async function createTestAnswer(input: CreateTestAnswerInput) {
  const { data, error } = await supabase
    .from("test_answers")
    .insert({
      question_id: input.question_id,
      answer_text: input.answer_text,
      is_correct: input.is_correct ?? false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to create test answer", error.message));
  }

  return data as TestAnswer;
}

export async function updateTestAnswer(answerId: string, input: UpdateTestAnswerInput) {
  const { data, error } = await supabase
    .from("test_answers")
    .update(input)
    .eq("id", answerId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to update test answer", error.message));
  }

  return data as TestAnswer;
}

export async function deleteTestAnswer(answerId: string) {
  const { error } = await supabase.from("test_answers").delete().eq("id", answerId);

  if (error) {
    throw new Error(toErrorMessage("Unable to delete test answer", error.message));
  }
}
