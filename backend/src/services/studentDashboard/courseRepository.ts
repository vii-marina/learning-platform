/**
 * Course lookups for the student surface.
 *
 * Every query filters `deleted_at` and publication state, so a soft-deleted or unpublished
 * course is invisible here regardless of what the caller asks for.
 */

import { AppError, toServiceError } from "../../lib/appError";
import { chunkValues } from "../../lib/collections";
import { supabaseAdmin } from "../../lib/supabase";
import { getCourseProgressByUserAndCourse } from "./progressRepository";
import type { CourseProgressRow, CourseRow } from "./types";

export async function listPublishedPublicCourses() {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .is("deleted_at", null)
    .eq("access_type", "public")
    .or("status.eq.published,is_published.eq.true")
    .order("updated_at", { ascending: false });

  if (error) {
    throw toServiceError(
      500,
      "PUBLIC_COURSES_LIST_FAILED",
      "Unable to load public courses",
      error
    );
  }

  return (data ?? []) as CourseRow[];
}

export async function listCourseProgressByUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("course_progress")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw toServiceError(
      500,
      "COURSE_PROGRESS_LIST_FAILED",
      "Unable to load course progress",
      error
    );
  }

  return (data ?? []) as CourseProgressRow[];
}

export async function getPublishedPublicCourse(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .is("deleted_at", null)
    .eq("access_type", "public")
    .or("status.eq.published,is_published.eq.true")
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "COURSE_FETCH_FAILED", "Unable to load course", error);
  }

  if (!data) {
    throw new AppError(
      404,
      "Published public course was not found.",
      "COURSE_NOT_FOUND"
    );
  }

  return data as CourseRow;
}

export async function getAnyLandingPreviewCourse(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "COURSE_FETCH_FAILED", "Unable to load course", error);
  }

  if (!data) {
    throw new AppError(404, "Landing course was not found.", "COURSE_NOT_FOUND");
  }

  return data as CourseRow;
}

export async function getPublishedCourse(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .is("deleted_at", null)
    .or("status.eq.published,is_published.eq.true")
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "COURSE_FETCH_FAILED", "Unable to load course", error);
  }

  if (!data) {
    throw new AppError(404, "Published course was not found.", "COURSE_NOT_FOUND");
  }

  return data as CourseRow;
}

export async function ensureStudentCourseAccess(userId: string, course: CourseRow) {
  if (course.access_type === "public") {
    return null;
  }

  const progress = await getCourseProgressByUserAndCourse(userId, course.id);

  if (progress) {
    return progress;
  }

  throw new AppError(403, "You do not have access to this course.", "COURSE_ACCESS_DENIED");
}

export async function listPublishedCoursesByIds(courseIds: string[]) {
  if (courseIds.length === 0) {
    return [] as CourseRow[];
  }

  const courses: CourseRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("*")
      .in("id", chunk)
      .is("deleted_at", null)
      .or("status.eq.published,is_published.eq.true");

    if (error) {
      throw toServiceError(
        500,
        "COURSES_LIST_FAILED",
        "Unable to load enrolled courses",
        error
      );
    }

    courses.push(...((data ?? []) as CourseRow[]));
  }

  const courseById = new Map(courses.map((course) => [course.id, course]));
  return courseIds.flatMap((courseId) => {
    const course = courseById.get(courseId);
    return course ? [course] : [];
  });
}
