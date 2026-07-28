import { ChevronDown, ChevronRight, Code2, Pencil, Trash2 } from "lucide-react";
import type { Lesson } from "../../../api/index";
import type { CourseExercise } from "../types/courseBuilderUiTypes";
import { ExercisePreview } from "./ExercisePreview";

type ModuleExercisesSectionProps = {
  moduleId: string;
  lessons: Lesson[];
  exercises: CourseExercise[];
  expandedExerciseIds: Record<string, boolean>;
  onToggleExercise: (exerciseId: string) => void;
  onEditExercise: (moduleId: string, exercise: CourseExercise) => void;
  onDeleteExercise: (moduleId: string, exerciseId: string) => void;
};

function getPlacementLabel(lessons: Lesson[], exercise: CourseExercise) {
  if (!exercise.afterLessonId) {
    return "На рівні модуля";
  }

  const linkedLesson = lessons.find((lesson) => lesson.id === exercise.afterLessonId);

  if (!linkedLesson) {
    return "Після повʼязаного уроку";
  }

  return `Після ${linkedLesson.order}. ${linkedLesson.title}`;
}

function getExerciseTypeLabel(exercise: CourseExercise) {
  return exercise.type === "drag_drop_code" ? "Заповнити пропуски в коді" : "Написати код";
}

export function ModuleExercisesSection({
  moduleId,
  lessons,
  exercises,
  expandedExerciseIds,
  onToggleExercise,
  onEditExercise,
  onDeleteExercise,
}: ModuleExercisesSectionProps) {
  if (exercises.length === 0) {
    return null;
  }

  const lessonOrderById = new Map(lessons.map((lesson) => [lesson.id, lesson.order]));
  const sortedExercises = [...exercises].sort((left, right) => {
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

  return (
    <section className="space-y-3">
      {sortedExercises.map((exercise) => {
        const isExpanded = Boolean(expandedExerciseIds[exercise.id]);

        return (
          <article
            key={exercise.id}
            className="group overflow-hidden rounded-[1rem] border border-[#fed7aa] bg-[#fff7ed]"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <button
                type="button"
                onClick={() => onToggleExercise(exercise.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.6rem] bg-white text-[#f97316]">
                  <Code2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[1rem] font-semibold text-[#14213d]">
                      {exercise.title}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#c2410c]">
                      {getExerciseTypeLabel(exercise)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs font-medium text-slate-500">
                    {getPlacementLabel(lessons, exercise)}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                ) : (
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                )}
              </button>

              <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onEditExercise(moduleId, exercise)}
                  aria-label={`Edit ${exercise.title}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-[#f97316]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteExercise(moduleId, exercise.id)}
                  aria-label={`Delete ${exercise.title}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isExpanded ? (
              <div className="border-t border-[#fed7aa] bg-white px-4 py-4">
                <ExercisePreview
                  content={exercise.content}
                  description={exercise.description}
                  compact
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
