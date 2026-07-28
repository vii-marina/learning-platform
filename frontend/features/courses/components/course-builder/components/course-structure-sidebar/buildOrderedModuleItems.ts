import type { Lesson } from "../../../../api/index";
import type { CourseExercise, CourseTest } from "../../types/courseBuilderUiTypes";

export type ModuleItem =
  | { type: "lesson"; lesson: Lesson }
  | { type: "test"; test: CourseTest }
  | { type: "exercise"; exercise: CourseExercise };

export const buildOrderedModuleItems = (
  lessons: Lesson[],
  tests: CourseTest[],
  exercises: CourseExercise[]
): ModuleItem[] => {
  const sortedLessons = [...lessons].sort((left, right) => left.order - right.order);
  const sortedTests = [...tests].sort((left, right) => left.order - right.order);
  const sortedExercises = [...exercises].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
  const items: ModuleItem[] = [];

  sortedLessons.forEach((lesson) => {
    items.push({ type: "lesson", lesson });

    sortedTests
      .filter((test) => test.afterLessonId === lesson.id)
      .forEach((test) => {
        items.push({ type: "test", test });
      });

    sortedExercises
      .filter((exercise) => exercise.afterLessonId === lesson.id)
      .forEach((exercise) => {
        items.push({ type: "exercise", exercise });
      });
  });

  sortedTests
    .filter(
      (test) =>
        !test.afterLessonId ||
        !sortedLessons.some((lesson) => lesson.id === test.afterLessonId)
    )
    .forEach((test) => {
      items.push({ type: "test", test });
    });

  sortedExercises
    .filter(
      (exercise) =>
        !exercise.afterLessonId ||
        !sortedLessons.some((lesson) => lesson.id === exercise.afterLessonId)
    )
    .forEach((exercise) => {
      items.push({ type: "exercise", exercise });
    });

  return items;
};
