import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BadgeCheck,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  Layers3,
  Pencil,
  Play,
  PlayCircle,
} from "lucide-react";
import type { Lesson, Module } from "../../../api/index";
import { LoadingState } from "../../../../../components/ui/LoadingState";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import { ExercisePreview } from "./ExercisePreview";
import {
  getGeneratedCourseTestTitle,
  hasLessonContent,
  studentQuestionTypeLabels,
} from "../lib/courseBuilderPageUtils";
import { getYouTubeEmbedUrl } from "../lib/youtube";

type CourseStructureSidebarProps = {
  courseTitle: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  variant?: "modal" | "panel";
  accent?: "default" | "lesson" | "test" | "exercise";
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

const MODAL_SIDEBAR_WIDTH = 336;
const PREVIEW_MODAL_SIDEBAR_WIDTH = 480;
const RESIZABLE_SIDEBAR_MIN_WIDTH = 288;
const RESIZABLE_SIDEBAR_MAX_WIDTH = 620;
const moduleHeaderIconClassName = "bg-[#13daec]/12 text-[#08bfd4]";
const lessonSidebarIconClassNames = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-emerald-50 text-emerald-600",
} as const;
const testSidebarIconClassNames = {
  active: "bg-violet-100 text-violet-700",
  inactive: "bg-violet-50 text-violet-600",
} as const;

const accentClassNames = {
  default: {
    moduleActiveBorder: "border-[#13daec]/30",
    moduleIcon: "bg-[#13daec]/12 text-[#08bfd4]",
    itemActiveBorder: "border-[#13daec]",
    itemActiveBg: "bg-[#13daec]/12",
    itemActiveDot: "bg-[#13daec]",
    resizeRing: "hover:border-[#13daec] focus-visible:ring-[#13daec]/50",
  },
  lesson: {
    moduleActiveBorder: "border-emerald-200",
    moduleIcon: "bg-emerald-50 text-emerald-600",
    itemActiveBorder: "border-emerald-300",
    itemActiveBg: "bg-emerald-50",
    itemActiveDot: "bg-emerald-500",
    resizeRing:
      "border border-emerald-300",
  },
  test: {
    moduleActiveBorder: "border-violet-200",
    moduleIcon: "bg-violet-50 text-violet-600",
    itemActiveBorder: "border-violet-300",
    itemActiveBg: "bg-violet-50",
    itemActiveDot: "bg-violet-500",
    resizeRing:
      "border border-violet-300",
  },
  exercise: {
    moduleActiveBorder: "border-orange-200",
    moduleIcon: "bg-orange-50 text-orange-500",
    itemActiveBorder: "border-orange-300",
    itemActiveBg: "bg-orange-50",
    itemActiveDot: "bg-orange-500",
    resizeRing:
      "border border-orange-300",
  },
} satisfies Record<
  NonNullable<CourseStructureSidebarProps["accent"]>,
  Record<string, string>
>;

const buildOrderedModuleItems = (
  lessons: Lesson[],
  tests: CourseTest[],
  exercises: CourseExercise[]
) => {
  const sortedLessons = [...lessons].sort((left, right) => left.order - right.order);
  const sortedTests = [...tests].sort((left, right) => left.order - right.order);
  const sortedExercises = [...exercises].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
  const items: Array<
    | { type: "lesson"; lesson: Lesson }
    | { type: "test"; test: CourseTest }
    | { type: "exercise"; exercise: CourseExercise }
  > = [];

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

const getLessonRowKey = (moduleId: string, lessonId: string) =>
  `lesson:${moduleId}:${lessonId}`;

const getTestRowKey = (moduleId: string, testId: string) =>
  `test:${moduleId}:${testId}`;

const getExerciseRowKey = (moduleId: string, exerciseId: string) =>
  `exercise:${moduleId}:${exerciseId}`;

const getDraftRowKey = (moduleId: string) => `draft:${moduleId}`;

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
  const previewAccentClasses =
    accent === "test"
      ? {
          rowActive: "border-emerald-200 bg-transparent text-[#14213d]",
          rowInactive:
            "border-transparent bg-transparent text-slate-500 hover:border-emerald-200 hover:text-[#14213d]",
          icon: "bg-transparent text-emerald-600",
          chevron: "text-emerald-300",
          editButton: "hover:bg-transparent hover:text-emerald-600",
        }
      : isCleanAccent
        ? {
            rowActive: "border-emerald-200 bg-transparent text-[#14213d]",
            rowInactive:
              "border-transparent bg-transparent text-slate-500 hover:border-emerald-200 hover:text-[#14213d]",
            icon: "bg-transparent text-emerald-600",
            chevron: "text-emerald-300",
            editButton: "hover:bg-transparent hover:text-emerald-600",
          }
        : {
            rowActive: "border-emerald-200 bg-emerald-50 text-[#14213d]",
            rowInactive:
              "border-transparent text-slate-500 hover:border-emerald-100 hover:bg-emerald-50/70 hover:text-[#14213d]",
            icon: "bg-white text-emerald-600",
            chevron: "text-emerald-300",
            editButton: "hover:bg-white hover:text-emerald-600",
          };
  const [collapsedModuleIdsState, setCollapsedModuleIds] = useState<Record<string, boolean>>({});
  const defaultSidebarWidth = showTestSourcePreview
    ? PREVIEW_MODAL_SIDEBAR_WIDTH
    : MODAL_SIDEBAR_WIDTH;
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);
  const [manualPreviewTestSelection, setManualPreviewTestSelection] = useState<{
    contextKey: string;
    testId: string;
  } | null>(null);
  const [manualPreviewExerciseSelection, setManualPreviewExerciseSelection] = useState<{
    contextKey: string;
    exerciseId: string;
  } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const moduleSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const moduleItemRefs = useRef<Record<string, HTMLElement | null>>({});
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(null);
  const previousSelectedAfterLessonIdRef = useRef<string | null>(selectedAfterLessonId);
  const collapsedModuleIds = collapsedModuleIdsState;

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
  const previewLessonEmbedUrl = previewLesson
    ? getYouTubeEmbedUrl(previewLesson.video_url)
    : null;
  const previewTestTitle =
    previewTest && activeModule
      ? getGeneratedCourseTestTitle({
          moduleOrder: activeModule.order,
          lessons: activeModuleLessons,
          afterLessonId: previewTest.afterLessonId,
          fallbackTitle: previewTest.title,
        })
      : null;
  const hasPreviewContent = Boolean(previewLesson || previewTest || previewExercise);
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
    if (!isResizable || !isResizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeStart = resizeStartRef.current;

      if (!resizeStart) {
        return;
      }

      const nextWidth = resizeStart.width + event.clientX - resizeStart.pointerX;
      setSidebarWidth(
        Math.min(
          RESIZABLE_SIDEBAR_MAX_WIDTH,
          Math.max(RESIZABLE_SIDEBAR_MIN_WIDTH, nextWidth)
        )
      );
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizable, isResizing]);

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
  }, [activeModuleId, collapsedModuleIdsState, scrollTargetKey, visibleModules.length]);

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    resizeStartRef.current = {
      pointerX: event.clientX,
      width: sidebarWidth,
    };
    setIsResizing(true);
  };

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
            const lessons = lessonsByModule[module.id];
            const tests = testsByModule[module.id];
            const exercises = exercisesByModule[module.id];
            const items =
              lessons && tests && exercises
                ? buildOrderedModuleItems(lessons, tests, exercises)
                : null;
            const isActiveModule = module.id === activeModuleId;
            const isCollapsed = showTestSourcePreview
              ? Boolean(collapsedModuleIds[module.id])
              : false;
            const showDraftRow = draftLessonModuleId === module.id;
            const isDraftActive = showDraftRow && isActiveModule && activeLessonId === null;
            const draftRowKey = getDraftRowKey(module.id);

            return (
              <section
                key={module.id}
                ref={registerModuleSectionRef(module.id)}
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
                      {`Module ${module.order}: ${module.title}`}
                    </p>
                  </div>
                  {showTestSourcePreview ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedModuleIds((prev) => ({
                          ...prev,
                          [module.id]: !isCollapsed,
                        }))
                      }
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
                        const isPlacementLesson = item.lesson.id === selectedAfterLessonId;
                        const isPreviewLesson =
                          showTestSourcePreview &&
                          selectedAfterLessonId === null &&
                          item.lesson.id === previewLessonId;
                        const isActiveLesson =
                          item.lesson.id === activeLessonId ||
                          isPlacementLesson ||
                          isPreviewLesson;
                        const badgeLabel =
                          item.lesson.id === activeLessonId && isDirty ? "Unsaved" : null;
                        const activeRowClass = `border-l-4 ${accentClasses.itemActiveBorder} ${accentClasses.itemActiveBg} text-[#14213d]`;
                        const rowClass = isActiveLesson
                          ? activeRowClass
                          : isCleanAccent
                            ? "border-l-4 border-transparent text-slate-500"
                            : "text-slate-500";
                        const canSelectPreviewLesson =
                          showTestSourcePreview &&
                          isActiveModule &&
                          Boolean(onSelectPreviewLesson);
                        const showLessonEditButton = showTestSourcePreview && Boolean(onSelectLesson);
                        const lessonRowKey = getLessonRowKey(module.id, item.lesson.id);
                        const lessonIconClassName = isActiveLesson
                          ? lessonSidebarIconClassNames.active
                          : lessonSidebarIconClassNames.inactive;
                        const lessonRowContent = (
                          <>
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] ${
                                showTestSourcePreview
                                  ? lessonIconClassName
                                  : lessonIconClassName
                              }`}
                            >
                              <Play className="ml-0.5 h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {`${module.order}.${item.lesson.order} ${item.lesson.title}`}
                            </span>
                            {badgeLabel ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                {badgeLabel}
                              </span>
                            ) : null}
                            {showTestSourcePreview ? (
                              isActiveLesson ? (
                                <ChevronDown className={`h-4 w-4 shrink-0 ${previewAccentClasses.chevron}`} />
                              ) : (
                                <ChevronRight className={`h-4 w-4 shrink-0 ${previewAccentClasses.chevron}`} />
                              )
                            ) : null}
                          </>
                        );

                        if (canSelectPreviewLesson && onSelectPreviewLesson) {
                          return (
                            <div
                              key={item.lesson.id}
                              ref={registerModuleItemRef(lessonRowKey)}
                              className={`flex w-full items-center gap-2 rounded-[1rem] border px-3 py-2.5 transition ${
                                isActiveLesson
                                  ? previewAccentClasses.rowActive
                                  : previewAccentClasses.rowInactive
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setManualPreviewTestSelection(null);
                                  setManualPreviewExerciseSelection(null);
                                  onSelectPreviewLesson(item.lesson.id);
                                  collapseModuleContent(module.id);
                                }}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              >
                                {lessonRowContent}
                              </button>
                              {showLessonEditButton && onSelectLesson ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectLesson(module.id, item.lesson)}
                                  aria-label={`Edit ${item.lesson.title}`}
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition ${previewAccentClasses.editButton}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                          );
                        }

                        if (onSelectLesson) {
                          return (
                            <button
                              key={item.lesson.id}
                              ref={registerModuleItemRef(lessonRowKey)}
                              type="button"
                              onClick={() => onSelectLesson(module.id, item.lesson)}
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                isActiveLesson
                                  ? rowClass
                                  : isCleanAccent
                                    ? "border-l-4 border-transparent text-slate-500 hover:text-[#14213d]"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
                              }`}
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] ${lessonIconClassName}`}
                              >
                                <Play className="ml-0.5 h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {`${module.order}.${item.lesson.order} ${item.lesson.title}`}
                              </span>
                              {badgeLabel ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                  {badgeLabel}
                                </span>
                              ) : null}
                            </button>
                          );
                        }

                        return (
                          <div
                            key={item.lesson.id}
                            ref={registerModuleItemRef(lessonRowKey)}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowClass}`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] ${lessonIconClassName}`}
                            >
                              <Play className="ml-0.5 h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {`${module.order}.${item.lesson.order} ${item.lesson.title}`}
                            </span>
                            {badgeLabel ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                {badgeLabel}
                              </span>
                            ) : null}
                          </div>
                        );
                      }

                      if (item.type === "test") {
                        const isActiveTest = item.test.id === activeTestId;
                        const isPreviewTest =
                          showTestSourcePreview && previewTest?.id === item.test.id;
                        const isSelectedTest = isActiveTest || isPreviewTest;
                        const isNestedTest = Boolean(
                          item.test.afterLessonId &&
                            (lessons || []).some((lesson) => lesson.id === item.test.afterLessonId)
                        );
                        const testRowKey = getTestRowKey(module.id, item.test.id);
                        const displayTitle = getGeneratedCourseTestTitle({
                          moduleOrder: module.order,
                          lessons: lessons || [],
                          afterLessonId: item.test.afterLessonId,
                          fallbackTitle: item.test.title,
                        });
                        const testIconClassName = isSelectedTest
                          ? testSidebarIconClassNames.active
                          : testSidebarIconClassNames.inactive;
                        const testRowContent = (
                          <>
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] ${testIconClassName}`}
                            >
                              <BadgeCheck className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {displayTitle}
                            </span>
                            {showTestSourcePreview ? (
                              isSelectedTest ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-[#c4b5fd]" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-[#c4b5fd]" />
                              )
                            ) : null}
                          </>
                        );

                        const previewTestContent = showTestSourcePreview ? (
                          <button
                            type="button"
                            onClick={() => {
                              setManualPreviewExerciseSelection(null);
                              setManualPreviewTestSelection({
                                contextKey: previewSelectionContextKey,
                                testId: item.test.id,
                              });
                              collapseModuleContent(module.id);
                            }}
                            className={`flex w-full items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition ${
                              isSelectedTest
                                ? "border-[#c4b5fd] bg-[#f5f3ff] text-[#14213d]"
                                : "border-transparent bg-transparent text-slate-500 hover:border-[#ddd6fe] hover:bg-[#f5f3ff] hover:text-[#14213d]"
                            }`}
                          >
                            {testRowContent}
                          </button>
                        ) : null;

                        const testContent = onSelectTest ? (
                          <button
                            type="button"
                            onClick={() => onSelectTest(module.id, item.test)}
                            className={`flex w-full items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition ${
                              isSelectedTest
                                ? "border-[#c4b5fd] bg-[#f5f3ff] text-[#14213d]"
                                : "border-transparent bg-transparent text-slate-500 hover:border-[#ddd6fe] hover:bg-[#f5f3ff] hover:text-[#14213d]"
                            }`}
                          >
                            {testRowContent}
                          </button>
                        ) : (
                          <div
                            className={`flex items-center gap-3 rounded-[1rem] border px-3 py-2.5 ${
                              isSelectedTest
                                ? "border-[#c4b5fd] bg-[#f5f3ff] text-[#14213d]"
                                : "border-transparent bg-transparent text-slate-500"
                            }`}
                          >
                            {testRowContent}
                          </div>
                        );

                        return (
                          <div
                            key={item.test.id}
                            ref={registerModuleItemRef(testRowKey)}
                            className={isNestedTest ? "pl-11" : ""}
                          >
                            {previewTestContent ?? testContent}
                          </div>
                        );
                      }

                      const isActiveExercise = item.exercise.id === activeExerciseId;
                      const isPreviewExercise =
                        showTestSourcePreview && previewExercise?.id === item.exercise.id;
                      const isSelectedExercise = isActiveExercise || isPreviewExercise;
                      const isNestedExercise = Boolean(
                        item.exercise.afterLessonId &&
                          (lessons || []).some(
                            (lesson) => lesson.id === item.exercise.afterLessonId
                          )
                      );
                      const exerciseRowKey = getExerciseRowKey(module.id, item.exercise.id);
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
                            {item.exercise.title}
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
                          onClick={() => {
                            setManualPreviewTestSelection(null);
                            setManualPreviewExerciseSelection({
                              contextKey: previewSelectionContextKey,
                              exerciseId: item.exercise.id,
                            });
                            collapseModuleContent(module.id);
                          }}
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
                        <div
                          key={item.exercise.id}
                          ref={registerModuleItemRef(exerciseRowKey)}
                          className={isNestedExercise ? "pl-11" : ""}
                        >
                          {exerciseContent}
                        </div>
                      );
                        })}

                        {showDraftRow
                          ? onSelectDraftLesson
                            ? (
                              <button
                                ref={registerModuleItemRef(draftRowKey)}
                                type="button"
                                onClick={() => onSelectDraftLesson(module.id)}
                                className={`flex w-full items-center gap-3 rounded-xl border-l-4 px-3 py-2.5 text-left transition ${
                                  isDraftActive
                                    ? `${accentClasses.itemActiveBorder} ${accentClasses.itemActiveBg} text-[#14213d]`
                                    : isCleanAccent
                                      ? "border-transparent text-slate-500 hover:text-[#14213d]"
                                      : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
                                }`}
                              >
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    isDraftActive ? accentClasses.itemActiveDot : "bg-slate-300"
                                  }`}
                                />
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                  {draftLessonTitle.trim() || "New lesson"}
                                </span>
                                {isDirty ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                    Unsaved
                                  </span>
                                ) : !isDraftActive ? (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                    Continue
                                  </span>
                                ) : null}
                              </button>
                            )
                            : (
                              <div
                                ref={registerModuleItemRef(draftRowKey)}
                                className={`rounded-xl border-l-4 ${accentClasses.itemActiveBorder} ${accentClasses.itemActiveBg} px-3 py-2.5`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`h-2.5 w-2.5 rounded-full ${accentClasses.itemActiveDot}`} />
                                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#14213d]">
                                    {draftLessonTitle.trim() || "New lesson"}
                                  </span>
                                  {isDirty ? (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                      Unsaved
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            )
                          : null}

                        {items.length === 0 && !showDraftRow ? (
                          <div
                            className={`rounded-xl px-3 py-3 text-sm text-slate-500 ${
                              isCleanAccent ? "bg-transparent" : "bg-slate-50"
                            }`}
                          >
                            You can always add lessons, tests, or exercises to this module later.
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </section>
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
            <section
              className={`rounded-[1.25rem] border border-slate-200 p-4 ${
                isCleanAccent
                  ? "bg-transparent shadow-none"
                  : "bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    previewExercise
                      ? "bg-orange-50 text-orange-500"
                      : previewTest
                      ? "bg-violet-50 text-violet-600"
                      : previewLesson
                        ? "bg-emerald-50 text-emerald-600"
                        : moduleHeaderIconClassName
                  }`}
                >
                  {previewExercise ? (
                    <Code2 className="h-4 w-4" />
                  ) : previewTest ? (
                    <BadgeCheck className="h-4 w-4" />
                  ) : previewLesson ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <Layers3 className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <h6 className="mt-1 text-base font-bold text-[#14213d]">
                    {previewExercise
                      ? previewExercise.title
                      : previewTest
                      ? previewTestTitle
                      : previewLesson
                      ? `${activeModule.order}.${previewLesson.order} ${previewLesson.title}`
                      : `Module ${activeModule.order}: ${activeModule.title}`}
                  </h6>
                </div>
              </div>

              {hasPreviewContent ? (
                <>
                  <div
                    className={`mt-4 ${
                      isCleanAccent
                        ? ""
                        : "rounded-[1rem] border border-slate-200 bg-[#f9fbfd] p-4"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold  text-slate-400">
                      {previewExercise ? (
                        <Code2 className="h-3.5 w-3.5" />
                      ) : previewTest ? (
                        <BadgeCheck className="h-3.5 w-3.5" />
                      ) : (
                        <PlayCircle className="h-3.5 w-3.5" />
                      )}
                      {previewExercise
                        ? "Exercise Preview"
                        : previewTest
                          ? "Test Questions"
                          : previewLesson
                            ? "Lesson Content"
                            : "Module Content"}
                    </div>
                    <div className="mt-3 max-h-[28rem] overflow-y-auto pr-2">
                      {previewExercise ? (
                        <ExercisePreview
                          content={previewExercise.content}
                          description={previewExercise.description}
                          compact
                        />
                      ) : previewTest ? (
                        previewTest.questions.length > 0 ? (
                          <div className="space-y-3">
                            {previewTest.questions.map((question, index) => (
                              <div
                                key={question.id}
                                className="rounded-[1rem] border border-[#ede9fe] bg-[#faf7ff] p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d8b4fe] bg-[#f5f3ff] text-sm font-bold text-[#7c3aed]">
                                      {index + 1}
                                    </div>
                                    <p className="min-w-0 whitespace-pre-wrap pt-0.5 text-sm font-semibold leading-6 text-[#14213d]">
                                      {question.questionText.trim() || `Question ${index + 1}`}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-full border border-[#ddd6fe] bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                                    {studentQuestionTypeLabels[question.type]}
                                  </span>
                                </div>

                                <div className="mt-4 space-y-2">
                                  {(question.type === "true_false"
                                    ? ["True", "False"]
                                    : question.options
                                  ).map((option, optionIndex) => {
                                    const isCorrect =
                                      question.correctOptionIndexes.includes(optionIndex);

                                    return (
                                      <div
                                        key={`${question.id}-${optionIndex}`}
                                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                                          isCorrect
                                            ? "border-[#d8b4fe] bg-[#f5f3ff] text-violet-800"
                                            : "border-slate-200 bg-white text-slate-600"
                                        }`}
                                      >
                                        <span
                                          className={`flex h-4 w-4 shrink-0 items-center justify-center border border-[#c4b5fd] ${
                                            question.type === "multiple_choice"
                                              ? "rounded-[4px]"
                                              : "rounded-full"
                                          } ${isCorrect ? "bg-[#8b5cf6]" : "bg-white"}`}
                                        />
                                        <span className="min-w-0 flex-1">{option}</span>
                                      </div>
                                    );
                                  })}
                                </div>

                                {question.hint?.trim() ? (
                                  <div className="mt-4 rounded-xl border border-[#ede9fe] bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                                    <span className="font-semibold text-slate-700">Hint:</span>{" "}
                                    {question.hint.trim()}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm leading-6 text-slate-500">
                            This test does not have any questions yet.
                          </p>
                        )
                      ) : previewLesson ? (
                        <>
                          {previewLessonEmbedUrl ? (
                            <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                              <div className="aspect-video">
                                <iframe
                                  src={previewLessonEmbedUrl}
                                  title={`${previewLesson.title} video`}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="h-full w-full"
                                />
                              </div>
                            </div>
                          ) : null}

                          {hasLessonContent(previewLesson.content) ? (
                            <div
                              className="prose prose-sm max-w-none text-slate-600"
                              dangerouslySetInnerHTML={{
                                __html: previewLesson.content ?? "",
                              }}
                            />
                          ) : (
                            <p className="text-sm leading-6 text-slate-500">
                              This lesson does not have content yet.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm leading-6 text-slate-500">
                          Choose a lesson, test, or exercise to preview its content.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div
                  className={`mt-4 rounded-[1rem] border border-slate-200 px-3 py-3 text-sm text-slate-500 ${
                    isCleanAccent ? "bg-transparent" : "bg-[#f9fbfd]"
                  }`}
                >
                  Add lessons, tests, or exercises to this module to preview their content here.
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
      {variant === "modal" && isResizable ? (
        <button
          type="button"
          aria-label="Resize course structure sidebar"
          onPointerDown={handleResizePointerDown}
          className={`absolute inset-y-0 right-0 z-20 w-[1px] cursor-col-resize border-r transition ${accentClasses.resizeRing}`}
        />
      ) : null}
    </aside>
  );
}
