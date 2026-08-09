/** Lessons and lesson blocks. Fully backend-mediated in both directions. */

import { dedupeRequest } from "../../../../lib/requestDedup";
import { authorizedBackendRequest } from "../../../auth/api/backendClient";
import type { LessonResponse, LessonsResponse, LessonBlockResponse, LessonBlocksResponse, ModuleContentResponse } from "./internal";
import type { CreateLessonBlockInput, CreateLessonInput, Lesson, UpdateLessonBlockInput, UpdateLessonInput } from "../types";

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
