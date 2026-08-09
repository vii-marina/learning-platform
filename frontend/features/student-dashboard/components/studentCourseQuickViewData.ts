/**
 * Shaping the course-details payload into what the quick-view modal renders.
 *
 * The API returns modules, lessons, tests and exercises as separate keyed maps in no
 * particular order, so everything here sorts before it returns. Tests sort by `order` and
 * exercises by `created_at`, because exercises have no explicit position.
 */

import type { HydratedTestEntityResponse } from "../../courses/api/courseBuilderApi";
import type {
  CourseExercise,
  CourseTest,
} from "../../courses/components/course-builder/types/courseBuilderUiTypes";
import type { StudentCourseDetailsResponse } from "../api/studentDashboardApi";

export const metricButtonBaseClassName =
  "flex min-w-[10.5rem] cursor-default items-center gap-3 rounded-[1.25rem] border bg-white px-4 py-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.06)]";

export const metricButtonToneClassNames = {
  modules: "border-cyan-200 text-cyan-700",
  lessons: "border-emerald-200 text-emerald-700",
  exercises: "border-amber-200 text-amber-800",
  tests: "border-violet-200 text-violet-700",
};

export const metricIconToneClassNames = {
  modules: "bg-cyan-50 text-cyan-600",
  lessons: "bg-emerald-50 text-emerald-600",
  exercises: "bg-amber-50 text-amber-700",
  tests: "bg-violet-50 text-violet-700",
};

export function normalizeDescription(value: string | null) {
  return (
    value
      ?.split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ") ?? ""
  );
}

export function getCollapsedDescription(value: string | null) {
  const normalizedValue = normalizeDescription(value);

  if (!normalizedValue) {
    return "Опис курсу зʼявиться тут.";
  }

  if (normalizedValue.length <= 190) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 190).trim()}...`;
}

export function getAuthorInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "IN";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function mapHydratedTestToCourseTest(test: HydratedTestEntityResponse): CourseTest {
  return {
    id: test.id,
    title: test.title,
    afterLessonId: test.after_lesson_id,
    order: test.order,
    isGraded: test.is_graded,
    questions: [...test.questions]
      .sort((left, right) => left.order - right.order)
      .map((question) => ({
        id: question.id,
        type: question.type,
        questionText: question.question_text,
        options: question.answers.map((answer) => answer.answer_text),
        correctOptionIndexes: question.answers.reduce<number[]>(
          (indexes, answer, answerIndex) => {
            if (answer.is_correct) {
              indexes.push(answerIndex);
            }

            return indexes;
          },
          []
        ),
        hint: question.hint,
      })),
  };
}
export function mapExerciseToCourseExercise(
  exercise: StudentCourseDetailsResponse["exercises_by_module"][string][number]
): CourseExercise {
  return {
    id: exercise.id,
    title: exercise.title,
    description: exercise.description,
    afterLessonId: exercise.after_lesson_id,
    type: exercise.type,
    content: exercise.content,
    createdAt: exercise.created_at,
    updatedAt: exercise.updated_at,
  };
}
export function getSortedModules(courseData: StudentCourseDetailsResponse | null) {
  return [...(courseData?.modules ?? [])].sort((left, right) => left.order - right.order);
}

export function getSortedLessons(courseData: StudentCourseDetailsResponse | null, moduleId: string) {
  return [...(courseData?.lessons_by_module[moduleId] ?? [])].sort(
    (left, right) => left.order - right.order
  );
}

export function getSortedTests(courseData: StudentCourseDetailsResponse | null, moduleId: string) {
  return [...(courseData?.tests_by_module[moduleId] ?? [])]
    .sort((left, right) => left.order - right.order)
    .map(mapHydratedTestToCourseTest);
}
export function getSortedExercises(courseData: StudentCourseDetailsResponse | null, moduleId: string) {
  return [...(courseData?.exercises_by_module[moduleId] ?? [])]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .map(mapExerciseToCourseExercise);
}

export function getFirstLesson(courseData: StudentCourseDetailsResponse | null) {
  for (const module of getSortedModules(courseData)) {
    const lesson = getSortedLessons(courseData, module.id)[0] ?? null;

    if (lesson) {
      return {
        module,
        lesson,
        lessons: getSortedLessons(courseData, module.id),
        tests: getSortedTests(courseData, module.id),
      };
    }
  }

  return null;
}
