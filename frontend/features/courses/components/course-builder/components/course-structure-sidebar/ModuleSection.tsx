import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import type { Lesson, Module } from "../../../../api/index";
import { LoadingState } from "../../../../../../components/ui/LoadingState";
import type { CourseExercise, CourseTest } from "../../types/courseBuilderUiTypes";
import { buildOrderedModuleItems } from "./buildOrderedModuleItems";
import {
  getDraftRowKey,
  getExerciseRowKey,
  getLessonRowKey,
  getTestRowKey,
  moduleHeaderIconClassName,
  type AccentClasses,
  type PreviewAccentClasses,
} from "./constants";
import { DraftLessonRow } from "./DraftLessonRow";
import { ExerciseRow } from "./ExerciseRow";
import { LessonRow } from "./LessonRow";
import { TestRow } from "./TestRow";

type ModuleSectionProps = {
  module: Module;
  lessons: Lesson[] | undefined;
  tests: CourseTest[] | undefined;
  exercises: CourseExercise[] | undefined;
  isActiveModule: boolean;
  isCollapsed: boolean;
  showTestSourcePreview: boolean;
  isCleanAccent: boolean;
  accentClasses: AccentClasses;
  previewAccentClasses: PreviewAccentClasses;
  activeLessonId: string | null;
  activeTestId: string | null;
  activeExerciseId: string | null;
  selectedAfterLessonId: string | null;
  previewLessonId: string | null;
  previewTestId: string | null;
  previewExerciseId: string | null;
  showDraftRow: boolean;
  isDraftActive: boolean;
  draftLessonTitle: string;
  isDirty: boolean;
  registerSectionRef: (node: HTMLElement | null) => void;
  registerItemRef: (itemKey: string) => (node: HTMLElement | null) => void;
  onToggleCollapse: () => void;
  onSelectLesson?: (moduleId: string, lesson: Lesson) => void;
  onSelectTest?: (moduleId: string, test: CourseTest) => void;
  onSelectDraftLesson?: (moduleId: string) => void;
  onSelectPreviewLesson?: (moduleId: string, lessonId: string) => void;
  onSelectPreviewTest: (moduleId: string, testId: string) => void;
  onSelectPreviewExercise: (moduleId: string, exerciseId: string) => void;
};

export function ModuleSection({
  module,
  lessons,
  tests,
  exercises,
  isActiveModule,
  isCollapsed,
  showTestSourcePreview,
  isCleanAccent,
  accentClasses,
  previewAccentClasses,
  activeLessonId,
  activeTestId,
  activeExerciseId,
  selectedAfterLessonId,
  previewLessonId,
  previewTestId,
  previewExerciseId,
  showDraftRow,
  isDraftActive,
  draftLessonTitle,
  isDirty,
  registerSectionRef,
  registerItemRef,
  onToggleCollapse,
  onSelectLesson,
  onSelectTest,
  onSelectDraftLesson,
  onSelectPreviewLesson,
  onSelectPreviewTest,
  onSelectPreviewExercise,
}: ModuleSectionProps) {
  const items =
    lessons && tests && exercises
      ? buildOrderedModuleItems(lessons, tests, exercises)
      : null;

  return (
    <section
      ref={registerSectionRef}
      className={`rounded-[1.25rem] border px-4 py-4 ${
        isCleanAccent
          ? "border-slate-200 bg-transparent"
          : isActiveModule
          ? `${accentClasses.moduleActiveBorder} bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]`
          : "border-slate-200 bg-white/70"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${moduleHeaderIconClassName}`}
        >
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#14213d]">
            {`Модуль ${module.order}: ${module.title}`}
          </p>
        </div>
        {showTestSourcePreview ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand module lessons" : "Collapse module lessons"}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-[#14213d] ${
              isCleanAccent
                ? "bg-transparent hover:bg-transparent"
                : "bg-white hover:bg-slate-50"
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>

      {!isCollapsed ? (
        <div className="mt-4 space-y-1.5">
          {!items ? (
            <LoadingState variant="inline" className="min-h-[8.5rem]" />
          ) : (
            <>
              {items.map((item) => {
                if (item.type === "lesson") {
                  return (
                    <LessonRow
                      key={item.lesson.id}
                      module={module}
                      lesson={item.lesson}
                      activeLessonId={activeLessonId}
                      selectedAfterLessonId={selectedAfterLessonId}
                      previewLessonId={previewLessonId}
                      isActiveModule={isActiveModule}
                      isDirty={isDirty}
                      showTestSourcePreview={showTestSourcePreview}
                      isCleanAccent={isCleanAccent}
                      accentClasses={accentClasses}
                      previewAccentClasses={previewAccentClasses}
                      registerRef={registerItemRef(getLessonRowKey(module.id, item.lesson.id))}
                      onSelectLesson={onSelectLesson}
                      onSelectPreviewLesson={onSelectPreviewLesson}
                    />
                  );
                }

                if (item.type === "test") {
                  return (
                    <TestRow
                      key={item.test.id}
                      module={module}
                      test={item.test}
                      lessons={lessons ?? []}
                      activeTestId={activeTestId}
                      previewTestId={previewTestId}
                      showTestSourcePreview={showTestSourcePreview}
                      registerRef={registerItemRef(getTestRowKey(module.id, item.test.id))}
                      onSelectTest={onSelectTest}
                      onSelectPreviewTest={onSelectPreviewTest}
                    />
                  );
                }

                return (
                  <ExerciseRow
                    key={item.exercise.id}
                    module={module}
                    exercise={item.exercise}
                    lessons={lessons ?? []}
                    activeExerciseId={activeExerciseId}
                    previewExerciseId={previewExerciseId}
                    showTestSourcePreview={showTestSourcePreview}
                    registerRef={registerItemRef(getExerciseRowKey(module.id, item.exercise.id))}
                    onSelectPreviewExercise={onSelectPreviewExercise}
                  />
                );
              })}

              {showDraftRow ? (
                <DraftLessonRow
                  moduleId={module.id}
                  isDraftActive={isDraftActive}
                  draftLessonTitle={draftLessonTitle}
                  isDirty={isDirty}
                  isCleanAccent={isCleanAccent}
                  accentClasses={accentClasses}
                  registerRef={registerItemRef(getDraftRowKey(module.id))}
                  onSelectDraftLesson={onSelectDraftLesson}
                />
              ) : null}

              {items.length === 0 && !showDraftRow ? (
                <div
                  className={`rounded-xl px-3 py-3 text-sm text-slate-500 ${
                    isCleanAccent ? "bg-transparent" : "bg-slate-50"
                  }`}
                >
                  Ви завжди можете додати уроки, тести чи вправи до цього модуля пізніше.
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
