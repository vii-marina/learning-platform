import { useState } from "react";
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
import { LoadingState } from "../../../../components/ui/LoadingState";
import type { Lesson, Module } from "../../api";
import type { CourseExercise, CourseTest } from "./courseBuilderUiTypes";
import type { CreateContentMode } from "./courseBuilderPageUtils";
import { CreationPathModal } from "./CreationPathModal";
import { CourseBuilderStepHeading } from "./CourseBuilderStepHeading";
import { ModuleContentList } from "./ModuleContentList";

type CourseBuilderContentStepProps = {
  title: string;
  modules: Module[];
  modulesLoadState: "idle" | "loading" | "ready" | "error";
  isCreatingModule: boolean;
  isNewModuleComposerOpen: boolean;
  newModuleTitle: string;
  nextModuleOrder: number;
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  moduleContentLoadStateByModule: Record<string, "idle" | "loading" | "ready" | "error">;
  expandedModuleId: string | null;
  editModuleId: string | null;
  editModuleTitle: string;
  currentCourseId: string | null;
  isPersistedCourse: boolean;
  expandedLessonIds: Record<string, boolean>;
  expandedTestIds: Record<string, boolean>;
  expandedExerciseIds: Record<string, boolean>;
  isPreparingExercise: boolean;
  onNewModuleTitleChange: (value: string) => void;
  onSaveNewModule: () => void;
  onToggleModule: (moduleId: string) => void;
  onRetryModules: () => void;
  onRetryModuleContent: (moduleId: string) => void;
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
  onCreateTest: (moduleId: string, mode: CreateContentMode) => void;
  onCreateExercise: (moduleId: string, mode: CreateContentMode) => void;
  onCreateModule: () => void;
  onBack: () => void;
  onContinueToReview: () => void;
};

export function CourseBuilderContentStep({
  title,
  modules,
  modulesLoadState,
  isCreatingModule,
  isNewModuleComposerOpen,
  newModuleTitle,
  nextModuleOrder,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  moduleContentLoadStateByModule,
  expandedModuleId,
  editModuleId,
  editModuleTitle,
  currentCourseId,
  isPersistedCourse,
  expandedLessonIds,
  expandedTestIds,
  expandedExerciseIds,
  isPreparingExercise,
  onNewModuleTitleChange,
  onSaveNewModule,
  onToggleModule,
  onRetryModules,
  onRetryModuleContent,
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
  const [createContentChoice, setCreateContentChoice] = useState<{
    kind: "test" | "exercise";
    moduleId: string;
  } | null>(null);

  return (
    <>
      <section className="mx-auto w-full max-w-[64rem]">
        <CourseBuilderStepHeading title={title} />

        <div className="mt-8 space-y-4">
          {isPersistedCourse && modulesLoadState === "loading" && modules.length === 0 ? (
            <LoadingState variant="section" className="min-h-[15rem]" />
          ) : null}

          {isPersistedCourse && modulesLoadState === "error" && modules.length === 0 ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-6 shadow-sm">
              <p className="text-sm font-medium text-rose-700">
                Unable to load the course modules.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={onRetryModules}
                className="mt-4 border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
              >
                Try Again
              </Button>
            </div>
          ) : null}

          {modules.map((module) => {
            const lessons = lessonsByModule[module.id] || [];
            const tests = testsByModule[module.id] || [];
            const exercises = exercisesByModule[module.id] || [];
            const isExpanded = expandedModuleId === module.id;
            const moduleContentLoadState =
              moduleContentLoadStateByModule[module.id] ??
              (isPersistedCourse ? "idle" : "ready");
            const hasLoadedModuleContent =
              !isPersistedCourse ||
              (lessonsByModule[module.id] !== undefined &&
                testsByModule[module.id] !== undefined &&
                exercisesByModule[module.id] !== undefined);
            const isModuleContentLoading = moduleContentLoadState === "loading";
            const hasModuleContentError =
              moduleContentLoadState === "error" && !hasLoadedModuleContent;

            return (
              <article
                key={module.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 md:px-5">
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
                        className="h-12 text-base font-medium"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="md"
                          onClick={onSaveModule}
                        >
                          Save Module
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="md"
                          onClick={onCancelEditModule}
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
                      <span className="truncate text-xl font-semibold tracking-tight text-slate-950">
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
                      className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-slate-200 hover:bg-white hover:text-slate-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteModule(module.id)}
                      aria-label="Delete module"
                      className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="flex flex-col">
                    <div className="max-h-[16rem] overflow-y-auto px-4 py-4 md:px-5 md:py-5">
                      {!hasLoadedModuleContent ? (
                        hasModuleContentError ? (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
                            <p>Some module content could not be loaded.</p>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => onRetryModuleContent(module.id)}
                              className="mt-4 border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                            >
                              Try Again
                            </Button>
                          </div>
                        ) : (
                          <LoadingState variant="inline" className="min-h-[11rem]" />
                        )
                      ) : (
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
                      )}
                    </div>

                    {hasLoadedModuleContent ? (
                      <div className="border-t border-slate-200 px-4 py-4 md:px-5">
                        <div className="flex flex-wrap gap-3">
                          <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            onClick={() => onCreateLesson(module.id)}
                          >
                            <Plus className="h-4 w-4 text-slate-500" />
                            Add Lesson
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            onClick={() =>
                              setCreateContentChoice({
                                kind: "test",
                                moduleId: module.id,
                              })
                            }
                          >
                            <BadgeCheck className="h-4 w-4 text-[#0f8ea0]" />
                            Add Test
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            onClick={() =>
                              setCreateContentChoice({
                                kind: "exercise",
                                moduleId: module.id,
                              })
                            }
                            disabled={isPreparingExercise || isModuleContentLoading}
                          >
                            <Code2 className="h-4 w-4 text-amber-600" />
                            {isPreparingExercise ? "Saving Draft..." : "Add Exercise"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}

          {isNewModuleComposerOpen ? (
            <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 md:px-5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <GripVertical className="h-5 w-5 shrink-0 text-slate-400" />
                  <span className="shrink-0 text-xl font-semibold tracking-tight text-slate-950">
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
                    className="h-12 flex-1 text-base font-medium"
                  />
                </div>
              </div>
            </article>
          ) : (
            <button
              type="button"
              onClick={onCreateModule}
              disabled={!currentCourseId || (isPersistedCourse && modulesLoadState !== "ready")}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-7 text-lg font-semibold text-slate-500 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Plus className="h-5 w-5" />
              </div>
              Add New Module
            </button>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 pt-5">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onBack}
              className="px-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Course Info
            </Button>

            <Button
              type="button"
              size="lg"
              onClick={onContinueToReview}
              disabled={!currentCourseId || (isPersistedCourse && modulesLoadState !== "ready")}
            >
              Continue to Review
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <CreationPathModal
        isOpen={createContentChoice !== null}
        title={createContentChoice?.kind === "exercise" ? "Create Exercise" : "Create Test"}
        aiLabel={
          createContentChoice?.kind === "exercise"
            ? "Generate Exercise with AI"
            : "Generate Test with AI"
        }
        manualLabel={
          createContentChoice?.kind === "exercise"
            ? "Create Exercise Manually"
            : "Create Test Manually"
        }
        accent={createContentChoice?.kind === "exercise" ? "exercise" : "test"}
        onClose={() => {
          setCreateContentChoice(null);
        }}
        onSelectAi={() => {
          if (!createContentChoice) {
            return;
          }

          const { kind, moduleId } = createContentChoice;
          setCreateContentChoice(null);

          if (kind === "exercise") {
            onCreateExercise(moduleId, "ai");
            return;
          }

          onCreateTest(moduleId, "ai");
        }}
        onSelectManual={() => {
          if (!createContentChoice) {
            return;
          }

          const { kind, moduleId } = createContentChoice;
          setCreateContentChoice(null);

          if (kind === "exercise") {
            onCreateExercise(moduleId, "manual");
            return;
          }

          onCreateTest(moduleId, "manual");
        }}
      />
    </>
  );
}
