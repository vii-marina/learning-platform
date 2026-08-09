/**
 * Enrollment and completion state.
 *
 * `course_progress` doubles as the enrollment record: a row exists once the student has
 * started the course, and `finished_at` is set when they complete it. Both writers here
 * tolerate a 23505 from a concurrent duplicate rather than surfacing it as a 500.
 */

import { toServiceError } from "../../lib/appError";
import { supabaseAdmin } from "../../lib/supabase";
import type { CourseProgressRow, LessonProgressRecord } from "./types";

export async function getCourseProgressByUserAndCourse(userId: string, courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("course_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toServiceError(
      500,
      "COURSE_PROGRESS_FETCH_FAILED",
      "Unable to load course progress",
      error
    );
  }

  return (data as CourseProgressRow | null) ?? null;
}

export async function createCourseProgress(userId: string, courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("course_progress")
    .insert({
      user_id: userId,
      course_id: courseId,
      started_at: new Date().toISOString(),
      finished_at: null,
    })
    .select("*")
    .single();

  if (error) {
    if ("code" in error && error.code === "23505") {
      const existingProgress = await getCourseProgressByUserAndCourse(userId, courseId);

      if (existingProgress) {
        return existingProgress;
      }
    }

    throw toServiceError(
      500,
      "COURSE_PROGRESS_CREATE_FAILED",
      "Unable to start course",
      error
    );
  }

  return data as CourseProgressRow;
}

export async function getLessonProgressByUserAndLesson(userId: string, lessonId: string) {
  const { data, error } = await supabaseAdmin
    .from("lesson_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) {
    throw toServiceError(
      500,
      "LESSON_PROGRESS_FETCH_FAILED",
      "Unable to load lesson progress",
      error
    );
  }

  return (data as LessonProgressRecord | null) ?? null;
}

export async function markLessonProgressCompleted(userId: string, lessonId: string) {
  const now = new Date().toISOString();
  const existingProgress = await getLessonProgressByUserAndLesson(userId, lessonId);

  if (existingProgress) {
    const { error } = await supabaseAdmin
      .from("lesson_progress")
      .update({
        is_completed: true,
        completed_at: existingProgress.completed_at ?? now,
        updated_at: now,
      })
      .eq("id", existingProgress.id);

    if (error) {
      throw toServiceError(
        500,
        "LESSON_PROGRESS_UPDATE_FAILED",
        "Unable to complete lesson",
        error
      );
    }

    return;
  }

  const { error } = await supabaseAdmin
    .from("lesson_progress")
    .insert({
      user_id: userId,
      lesson_id: lessonId,
      is_completed: true,
      completed_at: now,
      updated_at: now,
    });

  if (error) {
    if ("code" in error && error.code === "23505") {
      await markLessonProgressCompleted(userId, lessonId);
      return;
    }

    throw toServiceError(
      500,
      "LESSON_PROGRESS_CREATE_FAILED",
      "Unable to complete lesson",
      error
    );
  }
}

export async function updateCourseProgressAfterLessonCompletion(
  courseProgress: CourseProgressRow,
  isCourseCompleted: boolean
) {
  const now = new Date().toISOString();
  const payload: Record<string, string> = {
    updated_at: now,
  };

  if (isCourseCompleted && !courseProgress.finished_at) {
    payload.finished_at = now;
  }

  const { data, error } = await supabaseAdmin
    .from("course_progress")
    .update(payload)
    .eq("id", courseProgress.id)
    .select("*")
    .single();

  if (error) {
    throw toServiceError(
      500,
      "COURSE_PROGRESS_UPDATE_FAILED",
      "Unable to update course progress",
      error
    );
  }

  return data as CourseProgressRow;
}
