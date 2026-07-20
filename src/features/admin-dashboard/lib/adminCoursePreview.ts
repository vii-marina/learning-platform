import { mapQuestionToCourseTestQuestion } from "../../courses/components/course-builder/lib/courseBuilderPageUtils";
import type { CourseTest } from "../../courses/components/course-builder/types/courseBuilderUiTypes";
import {
  getCourseMediaKind,
  getCourseMediaPublicUrl,
} from "../../courses/api/courseMediaStorage";
import type { Lesson, Module } from "../../courses/api";
import type {
  AdminDashboardCourse,
  AdminDashboardCourseSummary,
  AdminDashboardTest,
} from "../types";

function mapAdminTestToCourseTest(test: AdminDashboardTest): CourseTest {
  return {
    id: test.id,
    title: test.title,
    afterLessonId: test.after_lesson_id,
    order: test.order,
    isGraded: test.is_graded,
    questions: test.questions.map((question) =>
      mapQuestionToCourseTestQuestion(question, question.answers)
    ),
  };
}

export function getAdminCourseAuthorName(course: AdminDashboardCourseSummary) {
  return course.teacher?.fullName?.trim() || course.teacher?.email || "No instructor assigned";
}

export function mapAdminDashboardCourseToPreview(course: AdminDashboardCourse): {
  courseThumbnailUrl: string | null;
  courseThumbnailKind: "image" | "video" | "file";
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
} {
  const modules: Module[] = course.modules.map((module) => ({
    id: module.id,
    course_id: module.course_id,
    title: module.title,
    order: module.order,
    created_at: module.created_at,
    updated_at: module.updated_at,
  }));
  const lessonsByModule = Object.fromEntries(
    course.modules.map((module) => [
      module.id,
      module.lessons.map((lesson) => ({
        id: lesson.id,
        module_id: lesson.module_id,
        title: lesson.title,
        content: lesson.content,
        video_url: lesson.video_url,
        content_type: lesson.content_type,
        order: lesson.order,
        created_at: lesson.created_at,
        updated_at: lesson.updated_at,
      })),
    ])
  ) as Record<string, Lesson[]>;
  const testsByModule = Object.fromEntries(
    course.modules.map((module) => [
      module.id,
      module.tests.map(mapAdminTestToCourseTest),
    ])
  ) as Record<string, CourseTest[]>;

  return {
    courseThumbnailUrl: getCourseMediaPublicUrl(course.thumbnail_path),
    courseThumbnailKind: getCourseMediaKind(course.thumbnail_path),
    modules,
    lessonsByModule,
    testsByModule,
  };
}
