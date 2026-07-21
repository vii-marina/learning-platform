import { useEffect, useRef, useState } from "react";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import {
  accentClassNames,
  getDraftRowKey,
  getExerciseRowKey,
  getLessonRowKey,
  getTestRowKey,
  MODAL_SIDEBAR_WIDTH,
  PREVIEW_MODAL_SIDEBAR_WIDTH,
  resolvePreviewAccentClasses,
  type SidebarAccent,
} from "./course-structure-sidebar/constants";
import { ModuleSection } from "./course-structure-sidebar/ModuleSection";
import { PreviewPanel } from "./course-structure-sidebar/PreviewPanel";
import { useSidebarResize } from "./course-structure-sidebar/useSidebarResize";

type CourseStructureSidebarProps = {
  courseTitle: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  variant?: "modal" | "panel";
  accent?: SidebarAccent;
  isResizable?: boolean;
  restrictToActiveModule?: boolean;
  activeModuleId: string | null;
  activeLessonId?: string | null;
  activeTestId?: string | null;
  activeExerciseId?: string | null;
  selectedAfterLessonId?: string | null;
  draftLessonModuleId?: string | null;
  draftLessonTitle?: string;
  showModulePlacementHint?: boolean;
  showTestSourcePreview?: boolean;
  previewLessonId?: string | null;
  isDirty?: boolean;
  onSelectLesson?: (moduleId: string, lesson: Lesson) => void;
  onSelectTest?: (moduleId: string, test: CourseTest) => void;
  onSelectDraftLesson?: (moduleId: string) => void;
  onSelectPreviewLesson?: (lessonId: string) => void;
};

export function CourseStructureSidebar({
  courseTitle,
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  variant = "modal",
  accent = "default",
  isResizable = false,
  restrictToActiveModule = false,
  activeModuleId,
  activeLessonId = null,
  activeTestId = null,
  activeExerciseId = null,
  selectedAfterLessonId = null,
  draftLessonModuleId = null,
  draftLessonTitle = "",
  showTestSourcePreview = false,
  previewLessonId = null,
  isDirty = false,
  onSelectLesson,
  onSelectTest,
  onSelectDraftLesson,
  onSelectPreviewLesson,
}: CourseStructureSidebarProps) {
  const isCleanAccent =
    accent === "lesson" || accent === "test" || accent === "exercise";
  const accentClasses = accentClassNames[accent];
  const previewAccentClasses = resolvePreviewAccentClasses(isCleanAccent);
  const [collapsedModuleIds, setCollapsedModuleIds] = useState<Record<string, boolean>>({});
  const defaultSidebarWidth = showTestSourcePreview
    ? PREVIEW_MODAL_SIDEBAR_WIDTH
    : MODAL_SIDEBAR_WIDTH;
  const { sidebarWidth, handleResizePointerDown } = useSidebarResize(
    isResizable,
    defaultSidebarWidth
  );
  const [manualPreviewTestSelection, setManualPreviewTestSelection] = useState<{
    contextKey: string;
    testId: string;
  } | null>(null);
  const [manualPreviewExerciseSelection, setManualPreviewExerciseSelection] = useState<{
    contextKey: string;
    exerciseId: string;
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const moduleSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const moduleItemRefs = useRef<Record<string, HTMLElement | null>>({});
  const previousSelectedAfterLessonIdRef = useRef<string | null>(selectedAfterLessonId);

  const registerModuleSectionRef = (moduleId: string) => (node: HTMLElement | null) => {
    if (node) {
      moduleSectionRefs.current[moduleId] = node;
      return;
    }

    delete moduleSectionRefs.current[moduleId];
  };

  const registerModuleItemRef = (itemKey: string) => (node: HTMLElement | null) => {
    if (node) {
      moduleItemRefs.current[itemKey] = node;
      return;
    }

    delete moduleItemRefs.current[itemKey];
  };

  const activeModule = modules.find((module) => module.id === activeModuleId) || null;
  const activeModuleLessons = activeModule ? lessonsByModule[activeModule.id] || [] : [];
  const activeModuleTests = activeModule ? testsByModule[activeModule.id] || [] : [];
  const activeModuleExercises = activeModule ? exercisesByModule[activeModule.id] || [] : [];
  const previewSelectionContextKey = [
    activeModuleId ?? "",
    activeTestId ?? "",
    activeExerciseId ?? "",
    selectedAfterLessonId ?? "",
    previewLessonId ?? "",
  ].join(":");
  const resolvedPreviewLessonId = selectedAfterLessonId || previewLessonId;
  const previewExercise =
    activeModule &&
    manualPreviewExerciseSelection?.contextKey === previewSelectionContextKey
      ? activeModuleExercises.find(
          (exercise) => exercise.id === manualPreviewExerciseSelection.exerciseId
        ) ||
        (activeExerciseId
          ? activeModuleExercises.find((exercise) => exercise.id === activeExerciseId) || null
          : null)
      : activeExerciseId
        ? activeModuleExercises.find((exercise) => exercise.id === activeExerciseId) || null
        : null;
  const previewTest =
    !previewExercise &&
    activeModule &&
    manualPreviewTestSelection?.contextKey === previewSelectionContextKey
      ? activeModuleTests.find((test) => test.id === manualPreviewTestSelection.testId) ||
        (activeTestId
          ? activeModuleTests.find((test) => test.id === activeTestId) || null
          : null)
      : activeTestId
        ? activeModuleTests.find((test) => test.id === activeTestId) || null
        : null;
  const previewLesson =
    !previewExercise && !previewTest && resolvedPreviewLessonId && activeModule
      ? activeModuleLessons.find((lesson) => lesson.id === resolvedPreviewLessonId) || null
      : null;
  const visibleModules =
    restrictToActiveModule && activeModuleId
      ? modules.filter((module) => module.id === activeModuleId)
      : modules;
  const sidebarBackgroundClassName = isCleanAccent ? "bg-white" : "bg-[#f9fbfd]";
  const modalContainerClassName =
    `relative hidden flex-shrink-0 border-r border-slate-200 ${sidebarBackgroundClassName} lg:flex lg:flex-col`;
  const containerClassName =
    variant === "panel"
      ? "flex w-full max-w-[24rem] flex-shrink-0 flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#f9fbfd] shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
      : isResizable
        ? modalContainerClassName
        : showTestSourcePreview
          ? `${modalContainerClassName} w-[28rem] xl:w-[30rem]`
          : `${modalContainerClassName} w-[21rem]`;
  const containerStyle =
    variant === "modal" && isResizable
      ? { width: `${sidebarWidth}px` }
      : undefined;
  const scrollTargetKey =
    activeModuleId === null
      ? null
      : previewExercise
        ? getExerciseRowKey(activeModuleId, previewExercise.id)
        : previewTest
          ? getTestRowKey(activeModuleId, previewTest.id)
          : selectedAfterLessonId
            ? getLessonRowKey(activeModuleId, selectedAfterLessonId)
            : activeExerciseId
              ? getExerciseRowKey(activeModuleId, activeExerciseId)
              : activeTestId
                ? getTestRowKey(activeModuleId, activeTestId)
                : activeLessonId
                  ? getLessonRowKey(activeModuleId, activeLessonId)
                  : draftLessonModuleId === activeModuleId
                    ? getDraftRowKey(activeModuleId)
                    : null;

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const targetElement =
      (scrollTargetKey ? moduleItemRefs.current[scrollTargetKey] : null) ??
      (activeModuleId ? moduleSectionRefs.current[activeModuleId] : null);

    if (!targetElement) {
      return;
    }

    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const isAboveViewport = targetRect.top < containerRect.top;
    const isBelowViewport = targetRect.bottom > containerRect.bottom;

    if (isAboveViewport || isBelowViewport) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeModuleId, collapsedModuleIds, scrollTargetKey, visibleModules.length]);

  const collapseModuleContent = (moduleId: string) => {
    if (!showTestSourcePreview) {
      return;
    }

    setCollapsedModuleIds((previousState) =>
      previousState[moduleId]
        ? previousState
        : {
            ...previousState,
            [moduleId]: true,
          }
    );
  };

  useEffect(() => {
    const previousSelectedAfterLessonId = previousSelectedAfterLessonIdRef.current;
    previousSelectedAfterLessonIdRef.current = selectedAfterLessonId;

    if (
      !showTestSourcePreview ||
      !activeModuleId ||
      !selectedAfterLessonId ||
      selectedAfterLessonId === previousSelectedAfterLessonId
    ) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      setCollapsedModuleIds((previousState) =>
        previousState[activeModuleId]
          ? previousState
          : {
              ...previousState,
              [activeModuleId]: true,
            }
      );
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [activeModuleId, selectedAfterLessonId, showTestSourcePreview]);

  const handleSelectPreviewLesson = onSelectPreviewLesson
    ? (moduleId: string, lessonId: string) => {
        setManualPreviewTestSelection(null);
        setManualPreviewExerciseSelection(null);
        onSelectPreviewLesson(lessonId);
        collapseModuleContent(moduleId);
      }
    : undefined;

  const handleSelectPreviewTest = (moduleId: string, testId: string) => {
    setManualPreviewExerciseSelection(null);
    setManualPreviewTestSelection({
      contextKey: previewSelectionContextKey,
      testId,
    });
    collapseModuleContent(moduleId);
  };

  const handleSelectPreviewExercise = (moduleId: string, exerciseId: string) => {
    setManualPreviewTestSelection(null);
    setManualPreviewExerciseSelection({
      contextKey: previewSelectionContextKey,
      exerciseId,
    });
    collapseModuleContent(moduleId);
  };

  return (
    <aside className={containerClassName} style={containerStyle}>
      <div className="flex min-h-[108px] flex-col justify-center border-b border-slate-200 px-6 py-4">
        <h3 className="text-xl font-extrabold tracking-tight text-[#14213d]">
          {courseTitle}
        </h3>
      </div>

      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {visibleModules.map((module) => {
            const isActiveModule = module.id === activeModuleId;
            const isCollapsed = showTestSourcePreview
              ? Boolean(collapsedModuleIds[module.id])
              : false;
            const showDraftRow = draftLessonModuleId === module.id;
            const isDraftActive = showDraftRow && isActiveModule && activeLessonId === null;

            return (
              <ModuleSection
                key={module.id}
                module={module}
                lessons={lessonsByModule[module.id]}
                tests={testsByModule[module.id]}
                exercises={exercisesByModule[module.id]}
                isActiveModule={isActiveModule}
                isCollapsed={isCollapsed}
                showTestSourcePreview={showTestSourcePreview}
                isCleanAccent={isCleanAccent}
                accentClasses={accentClasses}
                previewAccentClasses={previewAccentClasses}
                activeLessonId={activeLessonId}
                activeTestId={activeTestId}
                activeExerciseId={activeExerciseId}
                selectedAfterLessonId={selectedAfterLessonId}
                previewLessonId={previewLessonId}
                previewTestId={previewTest?.id ?? null}
                previewExerciseId={previewExercise?.id ?? null}
                showDraftRow={showDraftRow}
                isDraftActive={isDraftActive}
                draftLessonTitle={draftLessonTitle}
                isDirty={isDirty}
                registerSectionRef={registerModuleSectionRef(module.id)}
                registerItemRef={registerModuleItemRef}
                onToggleCollapse={() =>
                  setCollapsedModuleIds((prev) => ({
                    ...prev,
                    [module.id]: !isCollapsed,
                  }))
                }
                onSelectLesson={onSelectLesson}
                onSelectTest={onSelectTest}
                onSelectDraftLesson={onSelectDraftLesson}
                onSelectPreviewLesson={handleSelectPreviewLesson}
                onSelectPreviewTest={handleSelectPreviewTest}
                onSelectPreviewExercise={handleSelectPreviewExercise}
              />
            );
          })}

          {showTestSourcePreview &&
          activeModule &&
          (
            activeModuleLessons.length > 0 ||
            activeModuleTests.length > 0 ||
            activeModuleExercises.length > 0 ||
            accent !== "lesson"
          ) ? (
            <PreviewPanel
              activeModule={activeModule}
              activeModuleLessons={activeModuleLessons}
              previewLesson={previewLesson}
              previewTest={previewTest}
              previewExercise={previewExercise}
              isCleanAccent={isCleanAccent}
            />
          ) : null}
        </div>
      </div>
      {variant === "modal" && isResizable ? (
        <button
          type="button"
          aria-label="Змінити розмір сайдбару структури курсу"
          onPointerDown={handleResizePointerDown}
          className={`absolute inset-y-0 right-0 z-20 w-[1px] cursor-col-resize border-r transition ${accentClasses.resizeRing}`}
        />
      ) : null}
    </aside>
  );
}
