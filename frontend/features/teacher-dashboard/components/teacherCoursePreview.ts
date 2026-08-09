/** Loads a course's whole tree so the teacher preview can render it like a student would. */

import { listModuleContent, listModulesByCourse, type Lesson, type Module } from "../../courses/api";
import {
  mapExerciseToCourseExercise,
  mapHydratedTestsToCourseTests,
} from "../../courses/components/course-builder/lib/courseBuilderPageUtils";
import type {
  CourseExercise,
  CourseTest,
} from "../../courses/components/course-builder/types/courseBuilderUiTypes";
import type { TeacherCourseSummary } from "./teacherCourseDashboard.types";

export type TeacherCoursePreviewData = {
  course: TeacherCourseSummary;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
};

export type PendingCourseAction = {
  courseId: string;
  action: "delete" | "publish" | "unpublish";
} | null;

export function buildAlertClassName(type: "error" | "success") {
  return type === "error"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-[#13daec]/30 bg-[#13daec]/10 text-slate-800";
}

export async function loadTeacherCoursePreview(
  course: TeacherCourseSummary
): Promise<TeacherCoursePreviewData> {
  const modules = await listModulesByCourse(course.id);
  const moduleContent = await Promise.all(
    modules.map(async (module) => {
      const content = await listModuleContent(module.id);

      return {
        moduleId: module.id,
        lessons: content.lessons,
        tests: mapHydratedTestsToCourseTests(content.tests),
        exercises: content.exercises.map(mapExerciseToCourseExercise),
      };
    })
  );

  return {
    course,
    modules,
    lessonsByModule: Object.fromEntries(
      moduleContent.map(({ moduleId, lessons }) => [moduleId, lessons])
    ) as Record<string, Lesson[]>,
    testsByModule: Object.fromEntries(
      moduleContent.map(({ moduleId, tests }) => [moduleId, tests])
    ) as Record<string, CourseTest[]>,
    exercisesByModule: Object.fromEntries(
      moduleContent.map(({ moduleId, exercises }) => [moduleId, exercises])
    ) as Record<string, CourseExercise[]>,
  };
}
