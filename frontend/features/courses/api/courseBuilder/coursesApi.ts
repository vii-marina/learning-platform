/** Course reads (anon client, RLS-scoped) and writes (backend, ownership-checked). */

// `duplicateCourse` rebuilds a whole course tree, so it reaches into every other domain
// module. That is one function's dependency, not a layering problem.
import { createExercise, listExercisesByModule } from "./exercisesApi";
import { createLesson, createLessonBlock, listLessonBlocksByLesson, listLessonsByModule } from "./lessonsApi";
import { createModule, listModulesByCourse } from "./modulesApi";
import { createTestAnswer, createTestEntity, createTestQuestion, listTestAnswers, listTestQuestions, listTestsByModule } from "./testsApi";
import { supabase } from "../../../../lib/supabase";
import { dedupeRequest } from "../../../../lib/requestDedup";
import { authorizedBackendRequest } from "../../../auth/api/backendClient";
import { toErrorMessage, buildDuplicateCourseTitle } from "./internal";
import type { CourseResponse } from "./internal";
import type { Course, CreateCourseInput, UpdateCourseInput } from "../types";

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

export async function getCurrentTeacherId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Не вдалося знайти поточного викладача.");
  }
  return data.user.id;
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
  });
}

export async function unpublishCourse(courseId: string) {
  return updateCourse(courseId, {
    status: "draft",
    is_published: false,
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
