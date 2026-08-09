/**
 * Reading the admin's landing selection out of a course tree.
 *
 * The landing preview can show a lesson, the test attached to it, or an exercise, so these
 * flatten the course into pickable options and resolve what is linked to each one. Exercise
 * content is stored as free-form JSON, which is why pulling a question or a code snippet out
 * of it is a series of guarded lookups rather than a property access.
 */

import type {
  AdminDashboardCourse,
  AdminDashboardLesson,
  AdminDashboardModule,
} from "../../../features/admin-dashboard/types";
import type { Exercise } from "../../../features/courses/api";

export type PageMessage = {
  type: "error" | "success";
  text: string;
} | null;

export type LessonOption = {
  module: AdminDashboardModule;
  lesson: AdminDashboardLesson;
};

export type PreviewMode = "lesson" | "test" | "exercise";

export function getAlertClassName(type: "error" | "success") {
  return type === "error"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-cyan-200 bg-cyan-50 text-cyan-900";
}

export function flattenCourseLessons(course: AdminDashboardCourse | null) {
  if (!course) {
    return [] as LessonOption[];
  }

  return course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      module,
      lesson,
    }))
  );
}

export function getLinkedTest(option: LessonOption | null) {
  if (!option) {
    return null;
  }

  return (
    option.lesson.linkedTests[0] ??
    option.module.tests.find((test) => test.after_lesson_id === option.lesson.id) ??
    null
  );
}

export function getLinkedExercise(
  option: LessonOption | null,
  exercisesByModule: Record<string, Exercise[]>
) {
  if (!option) {
    return null;
  }

  const moduleExercises = exercisesByModule[option.module.id] ?? [];

  return (
    moduleExercises.find((exercise) => exercise.after_lesson_id === option.lesson.id) ??
    moduleExercises[0] ??
    null
  );
}

export function getExerciseQuestion(exercise: Exercise | null) {
  if (!exercise) {
    return "";
  }

  const question = exercise.content.question;

  return typeof question === "string"
    ? question
    : exercise.description ?? "Практична вправа до вибраного уроку.";
}

export function getExerciseCode(exercise: Exercise | null) {
  if (!exercise) {
    return "";
  }

  const initialCode = exercise.content.type === "write_code" ? exercise.content.initial_code : "";
  const codeTemplate =
    exercise.content.type === "drag_drop_code" ? exercise.content.code_template : "";

  return initialCode || codeTemplate || "";
}
