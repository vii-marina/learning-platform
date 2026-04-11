import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers3,
  Pencil,
  Play,
  PlayCircle,
} from "lucide-react";
import type { Lesson, Module } from "../../api";
import { LoadingState } from "../../../../components/ui/LoadingState";
import type { CourseTest } from "./courseBuilderUiTypes";
import {
  getGeneratedCourseTestTitle,
  hasLessonContent,
} from "./courseBuilderPageUtils";
import { getYouTubeEmbedUrl } from "./youtube";

type CourseStructureSidebarProps = {
  courseTitle: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  variant?: "modal" | "panel";
  accent?: "default" | "lesson";
  isResizable?: boolean;
  restrictToActiveModule?: boolean;
  activeModuleId: string | null;
  activeLessonId?: string | null;
  activeTestId?: string | null;
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
} satisfies Record<
  NonNullable<CourseStructureSidebarProps["accent"]>,
  Record<string, string>
>;

const buildOrderedModuleItems = (lessons: Lesson[], tests: CourseTest[]) => {
  const items: Array<
    | { type: "lesson"; lesson: Lesson }
    | { type: "test"; test: CourseTest }
  > = [];

  lessons.forEach((lesson) => {
    items.push({ type: "lesson", lesson });

    tests
      .filter((test) => test.afterLessonId === lesson.id)
      .forEach((test) => {
        items.push({ type: "test", test });
      });
  });

  tests
    .filter(
      (test) =>
        !test.afterLessonId || !lessons.some((lesson) => lesson.id === test.afterLessonId)
    )
    .forEach((test) => {
      items.push({ type: "test", test });
    });

  return items;
};

export function CourseStructureSidebar({
  courseTitle,
  modules,
  lessonsByModule,
  testsByModule,
  variant = "modal",
  accent = "default",
  isResizable = false,
  restrictToActiveModule = false,
  activeModuleId,
  activeLessonId = null,
  activeTestId = null,
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
  const isLessonAccent = accent === "lesson";
  const accentClasses = accentClassNames[accent];
  const [collapsedModuleIdsState, setCollapsedModuleIds] = useState<Record<string, boolean>>({});
  const defaultSidebarWidth = showTestSourcePreview
    ? PREVIEW_MODAL_SIDEBAR_WIDTH
    : MODAL_SIDEBAR_WIDTH;
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(null);
  const collapsedModuleIds =
    showTestSourcePreview && activeModuleId
      ? {
          ...collapsedModuleIdsState,
          [activeModuleId]: selectedAfterLessonId
            ? true
            : collapsedModuleIdsState[activeModuleId] ?? false,
        }
      : collapsedModuleIdsState;

  const totalLessons = modules.reduce(
    (sum, module) => sum + (lessonsByModule[module.id]?.length || 0),
    0
  );
  const totalTests = modules.reduce(
    (sum, module) => sum + (testsByModule[module.id]?.length || 0),
    0
  );
  const activeModule = modules.find((module) => module.id === activeModuleId) || null;
  const activeModuleLessons = activeModule ? lessonsByModule[activeModule.id] || [] : [];
  const resolvedPreviewLessonId = selectedAfterLessonId || previewLessonId;
  const previewLesson =
    resolvedPreviewLessonId && activeModule
      ? activeModuleLessons.find((lesson) => lesson.id === resolvedPreviewLessonId) || null
      : null;
  const previewLessonEmbedUrl = previewLesson
    ? getYouTubeEmbedUrl(previewLesson.video_url)
    : null;
  const visibleModules =
    restrictToActiveModule && activeModuleId
      ? modules.filter((module) => module.id === activeModuleId)
      : modules;
  const sidebarBackgroundClassName = isLessonAccent ? "bg-white" : "bg-[#f9fbfd]";
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

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    resizeStartRef.current = {
      pointerX: event.clientX,
      width: sidebarWidth,
    };
    setIsResizing(true);
  };

  return (
    <aside className={containerClassName} style={containerStyle}>
      <div className="flex min-h-[108px] flex-col justify-center border-b border-slate-200 px-6 py-4">
        <h3 className="text-xl font-extrabold tracking-tight text-[#14213d]">
          {courseTitle}
        </h3>
        <p className="mt-4 text-sm font-medium text-slate-500">
          {`${modules.length} modules • ${totalLessons} lessons • ${totalTests} tests`}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {visibleModules.map((module) => {
            const lessons = lessonsByModule[module.id];
            const tests = testsByModule[module.id];
            const items = lessons && tests ? buildOrderedModuleItems(lessons, tests) : null;
            const isActiveModule = module.id === activeModuleId;
            const isCollapsed = showTestSourcePreview
              ? Boolean(collapsedModuleIds[module.id])
              : false;
            const showDraftRow = draftLessonModuleId === module.id;
            const isDraftActive = showDraftRow && isActiveModule && activeLessonId === null;

            return (
              <section
                key={module.id}
                className={`rounded-[1.25rem] border px-4 py-4 ${
                  isLessonAccent
                    ? "border-slate-200 bg-transparent"
                    : isActiveModule
                    ? `${accentClasses.moduleActiveBorder} bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]`
                    : "border-slate-200 bg-white/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentClasses.moduleIcon}`}>
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#14213d]">
                      {`Module ${module.order}: ${module.title}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {lessons && tests
                        ? `${lessons.length} lessons • ${tests.length} tests`
                        : "Loading . . ."}
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
                        isLessonAccent
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
                          : isLessonAccent
                            ? "border-l-4 border-transparent text-slate-500"
                            : "text-slate-500";
                        const canSelectPreviewLesson =
                          showTestSourcePreview &&
                          isActiveModule &&
                          Boolean(onSelectPreviewLesson);
                        const showLessonEditButton = showTestSourcePreview && Boolean(onSelectLesson);
                        const lessonRowContent = (
                          <>
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                showTestSourcePreview
                                  ? isLessonAccent
                                    ? "bg-transparent text-emerald-600"
                                    : "bg-white text-emerald-600"
                                  : isActiveLesson
                                    ? accentClasses.itemActiveDot
                                    : "bg-slate-300"
                              }`}
                            >
                              {showTestSourcePreview ? (
                                <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                              ) : null}
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
                                <ChevronDown className="h-4 w-4 shrink-0 text-emerald-300" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-emerald-300" />
                              )
                            ) : null}
                          </>
                        );

                        if (canSelectPreviewLesson && onSelectPreviewLesson) {
                          return (
                            <div
                              key={item.lesson.id}
                              className={`flex w-full items-center gap-2 rounded-[1rem] border px-3 py-2.5 transition ${
                                isLessonAccent
                                  ? isActiveLesson
                                    ? "border-emerald-200 bg-transparent text-[#14213d]"
                                    : "border-transparent bg-transparent text-slate-500 hover:border-emerald-200 hover:text-[#14213d]"
                                  : isActiveLesson
                                  ? "border-emerald-200 bg-emerald-50 text-[#14213d]"
                                  : "border-transparent text-slate-500 hover:border-emerald-100 hover:bg-emerald-50/70 hover:text-[#14213d]"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => onSelectPreviewLesson(item.lesson.id)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              >
                                {lessonRowContent}
                              </button>
                              {showLessonEditButton && onSelectLesson ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectLesson(module.id, item.lesson)}
                                  aria-label={`Edit ${item.lesson.title}`}
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:text-emerald-600 ${
                                    isLessonAccent ? "hover:bg-transparent" : "hover:bg-white"
                                  }`}
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
                              type="button"
                              onClick={() => onSelectLesson(module.id, item.lesson)}
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                isActiveLesson
                                  ? rowClass
                                  : isLessonAccent
                                    ? "border-l-4 border-transparent text-slate-500 hover:text-[#14213d]"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
                              }`}
                            >
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  isActiveLesson ? accentClasses.itemActiveDot : "bg-slate-300"
                                }`}
                              />
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
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowClass}`}
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                isActiveLesson ? accentClasses.itemActiveDot : "bg-slate-300"
                              }`}
                            />
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

                      const isActiveTest = item.test.id === activeTestId;
                      const isNestedTest = Boolean(
                        item.test.afterLessonId &&
                          (lessons || []).some((lesson) => lesson.id === item.test.afterLessonId)
                      );
                      const displayTitle = getGeneratedCourseTestTitle({
                        moduleOrder: module.order,
                        lessons: lessons || [],
                        afterLessonId: item.test.afterLessonId,
                        fallbackTitle: item.test.title,
                      });

                      const testContent = onSelectTest ? (
                        <button
                          type="button"
                          onClick={() => onSelectTest(module.id, item.test)}
                          className={`flex w-full items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition ${
                            isActiveTest
                              ? "border-[#c4b5fd] bg-[#f5f3ff] text-[#14213d]"
                              : "border-transparent bg-transparent text-slate-500 hover:border-[#ddd6fe] hover:bg-[#f5f3ff] hover:text-[#14213d]"
                          }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-[4px] ${
                              isActiveTest ? "bg-[#8b5cf6]" : "bg-[#c4b5fd]"
                            }`}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {displayTitle}
                          </span>
                        </button>
                      ) : (
                        <div
                          className={`flex items-center gap-3 rounded-[1rem] border px-3 py-2.5 ${
                            isActiveTest
                              ? "border-[#c4b5fd] bg-[#f5f3ff] text-[#14213d]"
                              : "border-transparent bg-transparent text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-[4px] ${
                              isActiveTest ? "bg-[#8b5cf6]" : "bg-[#c4b5fd]"
                            }`}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {displayTitle}
                          </span>
                        </div>
                      );

                      return (
                        <div
                          key={item.test.id}
                          className={isNestedTest ? "pl-11" : ""}
                        >
                          {testContent}
                        </div>
                      );
                        })}

                        {showDraftRow
                          ? onSelectDraftLesson
                            ? (
                              <button
                                type="button"
                                onClick={() => onSelectDraftLesson(module.id)}
                                className={`flex w-full items-center gap-3 rounded-xl border-l-4 px-3 py-2.5 text-left transition ${
                                  isDraftActive
                                    ? `${accentClasses.itemActiveBorder} ${accentClasses.itemActiveBg} text-[#14213d]`
                                    : isLessonAccent
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
                              <div className={`rounded-xl border-l-4 ${accentClasses.itemActiveBorder} ${accentClasses.itemActiveBg} px-3 py-2.5`}>
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
                              isLessonAccent ? "bg-transparent" : "bg-slate-50"
                            }`}
                          >
                            You can always add lessons or tests to this module later.
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
          (activeModuleLessons.length > 0 || accent !== "lesson") ? (
            <section
              className={`rounded-[1.25rem] border border-slate-200 p-4 ${
                isLessonAccent
                  ? "bg-transparent shadow-none"
                  : "bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentClasses.moduleIcon}`}>
                  {previewLesson ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <Layers3 className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <h6 className="mt-1 text-base font-bold text-[#14213d]">
                    {previewLesson
                      ? `${activeModule.order}.${previewLesson.order} ${previewLesson.title}`
                      : `Module ${activeModule.order}: ${activeModule.title}`}
                  </h6>
                </div>
              </div>

              {activeModuleLessons.length > 0 ? (
                <>
                  <div
                    className={`mt-4 ${
                      isLessonAccent
                        ? ""
                        : "rounded-[1rem] border border-slate-200 bg-[#f9fbfd] p-4"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold  text-slate-400">
                      <PlayCircle className="h-3.5 w-3.5" />
                      {previewLesson ? "Lesson Content" : "Module Content"}
                    </div>
                    <div className="mt-3 max-h-[28rem] overflow-y-auto pr-2">
                      {previewLesson ? (
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
                          Choose a lesson to preview its content.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div
                  className={`mt-4 rounded-[1rem] border border-slate-200 px-3 py-3 text-sm text-slate-500 ${
                    isLessonAccent ? "bg-transparent" : "bg-[#f9fbfd]"
                  }`}
                >
                  Add lessons to this module before creating a module-level test.
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
