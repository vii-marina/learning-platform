import { ChevronDown, ChevronRight, Code2 } from "lucide-react";
import type { Lesson, Module } from "../../../../api/index";
import type { CourseExercise } from "../../types/courseBuilderUiTypes";

type ExerciseRowProps = {
  module: Module;
  exercise: CourseExercise;
  lessons: Lesson[];
  activeExerciseId: string | null;
  previewExerciseId: string | null;
  showTestSourcePreview: boolean;
  registerRef: (node: HTMLElement | null) => void;
  // Prepared by the orchestrator: sets the manual preview selection + collapses the module.
  onSelectPreviewExercise: (moduleId: string, exerciseId: string) => void;
};

export function ExerciseRow({
  module,
  exercise,
  lessons,
  activeExerciseId,
  previewExerciseId,
  showTestSourcePreview,
  registerRef,
  onSelectPreviewExercise,
}: ExerciseRowProps) {
  const isActiveExercise = exercise.id === activeExerciseId;
  const isPreviewExercise =
    showTestSourcePreview && previewExerciseId === exercise.id;
  const isSelectedExercise = isActiveExercise || isPreviewExercise;
  const isNestedExercise = Boolean(
    exercise.afterLessonId &&
      lessons.some((lesson) => lesson.id === exercise.afterLessonId)
  );
  const exerciseRowContent = (
    <>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.6rem] ${
          isSelectedExercise
            ? "bg-orange-100 text-orange-600"
            : "bg-orange-50 text-orange-400"
        }`}
      >
        <Code2 className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {exercise.title}
      </span>
      {showTestSourcePreview ? (
        isSelectedExercise ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-orange-300" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-orange-300" />
        )
      ) : null}
    </>
  );

  const exerciseContent = showTestSourcePreview ? (
    <button
      type="button"
      onClick={() => onSelectPreviewExercise(module.id, exercise.id)}
      className={`flex w-full items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition ${
        isSelectedExercise
          ? "border-[#fdba74] bg-[#fff7ed] text-[#14213d]"
          : "border-transparent bg-transparent text-slate-500 hover:border-[#fed7aa] hover:bg-[#fff7ed] hover:text-[#14213d]"
      }`}
    >
      {exerciseRowContent}
    </button>
  ) : (
    <div
      className={`flex items-center gap-3 rounded-[1rem] border px-3 py-2.5 ${
        isSelectedExercise
          ? "border-[#fdba74] bg-[#fff7ed] text-[#14213d]"
          : "border-transparent bg-transparent text-slate-500"
      }`}
    >
      {exerciseRowContent}
    </div>
  );

  return (
    <div ref={registerRef} className={isNestedExercise ? "pl-11" : ""}>
      {exerciseContent}
    </div>
  );
}
