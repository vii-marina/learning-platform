import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers3,
  PlayCircle,
} from "lucide-react";
import type { Lesson, Module } from "../../api";
import type { CourseTest } from "./courseBuilderUiTypes";
import {
  getGeneratedCourseTestTitle,
  getPlainTextFromHtml,
} from "./courseBuilderPageUtils";

type CourseStructureSidebarProps = {
  courseTitle: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  variant?: "modal" | "panel";
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
  const [collapsedModuleIds, setCollapsedModuleIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!showTestSourcePreview || !activeModuleId) {
      return;
    }

    setCollapsedModuleIds((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, activeModuleId)) {
        return prev;
      }

      return {
        ...prev,
        [activeModuleId]: false,
      };
    });
  }, [activeModuleId, showTestSourcePreview]);

  useEffect(() => {
    if (!showTestSourcePreview || !activeModuleId || !selectedAfterLessonId) {
      return;
    }

    setCollapsedModuleIds((prev) => ({
      ...prev,
      [activeModuleId]: true,
    }));
  }, [activeModuleId, selectedAfterLessonId, showTestSourcePreview]);

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
  const previewLessonText = previewLesson
    ? getPlainTextFromHtml(previewLesson.content)
    : "";
  const visibleModules =
    restrictToActiveModule && activeModuleId
      ? modules.filter((module) => module.id === activeModuleId)
      : modules;
  const containerClassName =
    variant === "panel"
      ? "flex w-full max-w-[24rem] flex-shrink-0 flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#f9fbfd] shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
      : showTestSourcePreview
        ? "hidden w-[28rem] flex-shrink-0 border-r border-slate-200 bg-[#f9fbfd] lg:flex lg:flex-col xl:w-[30rem]"
        : "hidden w-[21rem] flex-shrink-0 border-r border-slate-200 bg-[#f9fbfd] lg:flex lg:flex-col";

  return (
    <aside className={containerClassName}>
      <div className="border-b border-slate-200 px-6 py-6">
        <p className="text-sm font-semibold text-slate-400">Course Structure</p>
        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-[#14213d]">
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
                  isActiveModule
                    ? "border-[#13daec]/30 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                    : "border-slate-200 bg-white/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#13daec]/12 text-[#08bfd4]">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#14213d]">
                      {`Module ${module.order}: ${module.title}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {lessons && tests
                        ? `${lessons.length} lessons • ${tests.length} tests`
                        : "Loading content..."}
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
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-[#14213d]"
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
                    {items?.map((item) => {
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
                        const rowClass = isActiveLesson
                          ? "border-l-4 border-[#13daec] bg-[#13daec]/12 text-[#14213d]"
                          : "text-slate-500";
                        const canSelectPreviewLesson =
                          showTestSourcePreview &&
                          isActiveModule &&
                          selectedAfterLessonId === null &&
                          Boolean(onSelectPreviewLesson);

                        if (onSelectLesson) {
                          return (
                            <button
                              key={item.lesson.id}
                              type="button"
                              onClick={() => onSelectLesson(module.id, item.lesson)}
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                isActiveLesson
                                  ? rowClass
                                  : "text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
                              }`}
                            >
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  isActiveLesson ? "bg-[#13daec]" : "bg-slate-300"
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

                        if (canSelectPreviewLesson && onSelectPreviewLesson) {
                          return (
                            <button
                              key={item.lesson.id}
                              type="button"
                              onClick={() => onSelectPreviewLesson(item.lesson.id)}
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                isActiveLesson
                                  ? rowClass
                                  : "text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
                              }`}
                            >
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  isActiveLesson ? "bg-[#13daec]" : "bg-slate-300"
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
                                isActiveLesson ? "bg-[#13daec]" : "bg-slate-300"
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
                      const displayTitle = getGeneratedCourseTestTitle({
                        moduleOrder: module.order,
                        lessons: lessons || [],
                        afterLessonId: item.test.afterLessonId,
                        fallbackTitle: item.test.title,
                      });

                      return onSelectTest ? (
                        <button
                          key={item.test.id}
                          type="button"
                          onClick={() => onSelectTest(module.id, item.test)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                            isActiveTest
                              ? "border-l-4 border-[#13daec] bg-[#13daec]/12 text-[#14213d]"
                              : "text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
                          }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-[4px] ${
                              isActiveTest ? "bg-[#13daec]" : "bg-slate-300"
                            }`}
                          />
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            Test
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {displayTitle}
                          </span>
                        </button>
                      ) : (
                        <div
                          key={item.test.id}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                            isActiveTest
                              ? "border-l-4 border-[#13daec] bg-[#13daec]/12 text-[#14213d]"
                              : "text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-[4px] ${
                              isActiveTest ? "bg-[#13daec]" : "bg-slate-300"
                            }`}
                          />
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            Test
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {displayTitle}
                          </span>
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
                                ? "border-[#13daec] bg-[#13daec]/12 text-[#14213d]"
                                : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
                            }`}
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                isDraftActive ? "bg-[#13daec]" : "bg-slate-300"
                              }`}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                              {draftLessonTitle.trim() || "New lesson"}
                            </span>
                            {isDirty ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                Unsaved
                              </span>
                            ) : null}
                          </button>
                        )
                        : (
                          <div className="rounded-xl border-l-4 border-[#13daec] bg-[#13daec]/12 px-3 py-2.5">
                            <div className="flex items-center gap-3">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#13daec]" />
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

                    {items && items.length === 0 && !showDraftRow ? (
                      <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                        You can always add lessons or tests to this module later.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}

          {showTestSourcePreview && activeModule ? (
            <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#13daec]/12 text-[#08bfd4]">
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
                  <div className="mt-4 rounded-[1rem] border border-slate-200 bg-[#f9fbfd] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold  text-slate-400">
                      <PlayCircle className="h-3.5 w-3.5" />
                      {previewLesson ? "Lesson Content" : "Module Content"}
                    </div>
                    <div className="mt-3 max-h-[28rem] overflow-y-auto pr-2">
                      {previewLessonText ? (
                        <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
                          {previewLessonText}
                        </p>
                      ) : (
                        <p className="text-sm leading-6 text-slate-500">
                          {previewLesson
                            ? "This lesson does not have content yet."
                            : "Choose a lesson to preview its content."}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-[1rem] border border-slate-200 bg-[#f9fbfd] px-3 py-3 text-sm text-slate-500">
                  Add lessons to this module before creating a module-level test.
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
