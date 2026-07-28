import type { Lesson, Module } from "../../../api/index";
import { getGeneratedCourseTestTitle } from "./courseBuilderPageUtils";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";

export type CoursePreviewMode = "student" | "teacher";

export type CoursePreviewLessonRef = {
  module: Module;
  lesson: Lesson;
};

export type CoursePreviewSidebarItem =
  | {
      type: "lesson";
      lesson: Lesson;
    }
  | {
      type: "exercise";
      lesson: Lesson;
      exercise: CourseExercise;
    }
  | {
      type: "test";
      lesson: Lesson;
      test: CourseTest;
    };

export function getSortedLessons(lessons: Lesson[]) {
  return [...lessons].sort((left, right) => left.order - right.order);
}

export function getSortedTests(tests: CourseTest[]) {
  return [...tests].sort((left, right) => left.order - right.order);
}

export function getSortedExercises(lessons: Lesson[], exercises: CourseExercise[]) {
  const lessonOrderById = new Map(lessons.map((lesson) => [lesson.id, lesson.order]));

  return [...exercises].sort((left, right) => {
    const leftPosition = left.afterLessonId
      ? lessonOrderById.get(left.afterLessonId) ?? Number.MAX_SAFE_INTEGER - 1
      : Number.MAX_SAFE_INTEGER;
    const rightPosition = right.afterLessonId
      ? lessonOrderById.get(right.afterLessonId) ?? Number.MAX_SAFE_INTEGER - 1
      : Number.MAX_SAFE_INTEGER;

    if (leftPosition !== rightPosition) {
      return leftPosition - rightPosition;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function resolveAnchoredLesson(lessons: Lesson[], afterLessonId: string | null) {
  if (afterLessonId) {
    const linkedLesson = lessons.find((lesson) => lesson.id === afterLessonId);

    if (linkedLesson) {
      return linkedLesson;
    }
  }

  return lessons[lessons.length - 1] ?? null;
}

export function getLessonExercises(
  lessons: Lesson[],
  exercises: CourseExercise[],
  lessonId: string
) {
  return getSortedExercises(lessons, exercises).filter(
    (exercise) => resolveAnchoredLesson(lessons, exercise.afterLessonId)?.id === lessonId
  );
}

export function getLessonTests(lessons: Lesson[], tests: CourseTest[], lessonId: string) {
  return getSortedTests(tests).filter(
    (test) => resolveAnchoredLesson(lessons, test.afterLessonId)?.id === lessonId
  );
}

export function buildCoursePreviewSidebarItems({
  lessons,
  exercises,
  tests,
}: {
  lessons: Lesson[];
  exercises: CourseExercise[];
  tests: CourseTest[];
}) {
  const sortedLessons = getSortedLessons(lessons);
  const items: CoursePreviewSidebarItem[] = [];

  sortedLessons.forEach((lesson) => {
    items.push({
      type: "lesson",
      lesson,
    });

    getLessonExercises(sortedLessons, exercises, lesson.id).forEach((exercise) => {
      items.push({
        type: "exercise",
        lesson,
        exercise,
      });
    });

    getLessonTests(sortedLessons, tests, lesson.id).forEach((test) => {
      items.push({
        type: "test",
        lesson,
        test,
      });
    });
  });

  return items;
}

export function buildCoursePreviewLessonSequence(
  modules: Module[],
  lessonsByModule: Record<string, Lesson[]>
) {
  return [...modules]
    .sort((left, right) => left.order - right.order)
    .flatMap((module) =>
      getSortedLessons(lessonsByModule[module.id] ?? []).map((lesson) => ({
        module,
        lesson,
      }))
    );
}

export function getNextCoursePreviewLesson(
  lessonSequence: CoursePreviewLessonRef[],
  currentLessonId: string | null
) {
  if (!currentLessonId) {
    return lessonSequence[0] ?? null;
  }

  const currentLessonIndex = lessonSequence.findIndex(
    (lessonRef) => lessonRef.lesson.id === currentLessonId
  );

  if (currentLessonIndex < 0) {
    return lessonSequence[0] ?? null;
  }

  return lessonSequence[currentLessonIndex + 1] ?? null;
}

export function getPreviewProgressStorageKey(courseId: string | null, courseTitle: string) {
  const normalizedTitle =
    courseTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "course";

  return `course-preview-progress:${courseId ?? normalizedTitle}`;
}

export function getCoursePreviewTestTitle(
  moduleOrder: number,
  lessons: Lesson[],
  test: CourseTest
) {
  return getGeneratedCourseTestTitle({
    moduleOrder,
    lessons,
    afterLessonId: test.afterLessonId,
    fallbackTitle: test.title,
  });
}

export function isGeneratedCoursePreviewItem(id: string) {
  return id.startsWith("generated-");
}
