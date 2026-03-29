import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Code2,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import type { Lesson, Module } from "../../api";
import type { CourseExercise, CourseTest } from "./courseBuilderUiTypes";
import { CourseBuilderStepHeading } from "./CourseBuilderStepHeading";
import { ModuleContentList } from "./ModuleContentList";

type CourseBuilderContentStepProps = {
  title: string;
  modules: Module[];
  isCreatingModule: boolean;
  isNewModuleComposerOpen: boolean;
  newModuleTitle: string;
  nextModuleOrder: number;
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  expandedModuleId: string | null;
  editModuleId: string | null;
  editModuleTitle: string;
  currentCourseId: string | null;
  expandedLessonIds: Record<string, boolean>;
  expandedTestIds: Record<string, boolean>;
  expandedExerciseIds: Record<string, boolean>;
  isPreparingExercise: boolean;
  onNewModuleTitleChange: (value: string) => void;
  onSaveNewModule: () => void;
  onToggleModule: (moduleId: string) => void;
  onStartEditModule: (moduleId: string, title: string) => void;
  onEditModuleTitleChange: (value: string) => void;
  onSaveModule: () => void;
  onCancelEditModule: () => void;
  onDeleteModule: (moduleId: string) => void;
  onToggleLesson: (lessonId: string) => void;
  onEditLesson: (moduleId: string, lesson: Lesson) => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
  onToggleTest: (testId: string) => void;
  onEditTest: (moduleId: string, test: CourseTest) => void;
  onDeleteTest: (moduleId: string, testId: string) => void;
  onToggleExercise: (exerciseId: string) => void;
  onEditExercise: (moduleId: string, exercise: CourseExercise) => void;
  onDeleteExercise: (moduleId: string, exerciseId: string) => void;
  onCreateLesson: (moduleId: string) => void;
  onCreateTest: (moduleId: string) => void;
  onCreateExercise: (moduleId: string) => void;
  onCreateModule: () => void;
  onBack: () => void;
  onContinueToReview: () => void;
};

export function CourseBuilderContentStep({
  title,
  modules,
  isCreatingModule,
  isNewModuleComposerOpen,
  newModuleTitle,
  nextModuleOrder,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  expandedModuleId,
  editModuleId,
  editModuleTitle,
  currentCourseId,
  expandedLessonIds,
  expandedTestIds,
  expandedExerciseIds,
  isPreparingExercise,
  onNewModuleTitleChange,
  onSaveNewModule,
  onToggleModule,
  onStartEditModule,
  onEditModuleTitleChange,
  onSaveModule,
  onCancelEditModule,
  onDeleteModule,
  onToggleLesson,
  onEditLesson,
  onDeleteLesson,
  onToggleTest,
  onEditTest,
  onDeleteTest,
  onToggleExercise,
  onEditExercise,
  onDeleteExercise,
  onCreateLesson,
  onCreateTest,
  onCreateExercise,
  onCreateModule,
  onBack,
  onContinueToReview,
}: CourseBuilderContentStepProps) {
  return (
    <section className="mx-auto w-full max-w-[64rem]">
      <CourseBuilderStepHeading title={title} />

      <div className="mt-8 space-y-4">
        {modules.map((module) => {
          const lessons = lessonsByModule[module.id] || [];
          const tests = testsByModule[module.id] || [];
          const exercises = exercisesByModule[module.id] || [];
          const isExpanded = expandedModuleId === module.id;

          return (
            <article
              key={module.id}
              className="overflow-hidden rounded-[1.5rem] border border-[#16d0e7] bg-white shadow-[0_16px_36px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-center gap-3 border-b border-[#d7eff4] bg-[#edfafd] px-4 py-4 md:px-5">
                {editModuleId === module.id ? (
                  <div className="flex flex-1 flex-col gap-3">
                    <Input
                      value={editModuleTitle}
                      onChange={(event) => onEditModuleTitleChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onSaveModule();
                        }
                      }}
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-[#14213d] focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/15"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={onSaveModule}
                        className="h-10 rounded-xl bg-[#13daec] px-4 text-sm font-bold text-[#0f172a] hover:bg-[#10c6d7]"
                      >
                        Save Module
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={onCancelEditModule}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleModule(module.id)}
                    aria-label={isExpanded ? "Collapse module" : "Expand module"}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <GripVertical className="h-5 w-5 shrink-0 text-slate-400" />
                    <span className="truncate text-[1.4rem] font-bold tracking-tight text-[#14213d]">
                      {`Module ${module.order}: ${module.title}`}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </button>
                )}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onStartEditModule(module.id, module.title)}
                    aria-label="Edit module"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-[#08bfd4]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteModule(module.id)}
                    aria-label="Delete module"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="flex flex-col">
                  <div className="max-h-[30rem] overflow-y-auto px-4 py-4 md:px-5 md:py-5">
                    <ModuleContentList
                      moduleId={module.id}
                      moduleOrder={module.order}
                      lessons={lessons}
                      tests={tests}
                      exercises={exercises}
                      expandedLessonIds={expandedLessonIds}
                      expandedTestIds={expandedTestIds}
                      expandedExerciseIds={expandedExerciseIds}
                      onToggleLesson={onToggleLesson}
                      onEditLesson={onEditLesson}
                      onDeleteLesson={onDeleteLesson}
                      onToggleTest={onToggleTest}
                      onEditTest={onEditTest}
                      onDeleteTest={onDeleteTest}
                      onToggleExercise={onToggleExercise}
                      onEditExercise={onEditExercise}
                      onDeleteExercise={onDeleteExercise}
                    />
                  </div>

                  <div className="border-t border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur md:px-5">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => onCreateLesson(module.id)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#13daec]/35 bg-white px-4 text-sm font-bold text-[#08bfd4] transition hover:bg-[#13daec]/8"
                      >
                        <Plus className="h-4 w-4" />
                        Add Lesson
                      </button>
                      <button
                        type="button"
                        onClick={() => onCreateTest(module.id)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#c4b5fd]/60 bg-[#f5f3ff] px-4 text-sm font-bold text-[#7c3aed] transition hover:bg-[#ede9fe]"
                      >
                        <BadgeCheck className="h-4 w-4" />
                        Add Test
                      </button>
                      <button
                        type="button"
                        onClick={() => onCreateExercise(module.id)}
                        disabled={isPreparingExercise}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#f97316]/35 bg-[#fff7ed] px-4 text-sm font-bold text-[#c2410c] transition hover:bg-[#fed7aa]/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Code2 className="h-4 w-4" />
                        {isPreparingExercise ? "Saving Draft..." : "Add Exercise"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {isNewModuleComposerOpen ? (
          <article className="overflow-hidden rounded-[1.5rem] border border-[#16d0e7] bg-white shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3 border-b border-[#d7eff4] bg-[#edfafd] px-4 py-4 md:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <GripVertical className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="shrink-0 text-[1.4rem] font-bold tracking-tight text-[#14213d]">
                  {`Module ${nextModuleOrder}:`}
                </span>
                <Input
                  value={newModuleTitle}
                  onChange={(event) => onNewModuleTitleChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSaveNewModule();
                    }
                  }}
                  autoFocus
                  disabled={isCreatingModule}
                  className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-[#14213d] focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/15"
                />
              </div>
            </div>
          </article>
        ) : (
          <button
            type="button"
            onClick={onCreateModule}
            disabled={!currentCourseId}
            className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] border-2 border-dashed border-slate-300/80 bg-white/70 px-6 py-7 text-lg font-bold text-slate-400 transition hover:border-[#13daec]/45 hover:bg-[#13daec]/5 hover:text-[#08bfd4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[#08bfd4]">
              <Plus className="h-5 w-5" />
            </div>
            Add New Module
          </button>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 pt-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-1 text-base font-semibold text-slate-500 transition hover:text-[#14213d]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course Info
          </button>

          <button
            type="button"
            onClick={onContinueToReview}
            disabled={!currentCourseId}
            className="inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-[#0f172a] px-7 text-base font-bold text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:bg-[#111f39] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue to Review
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
