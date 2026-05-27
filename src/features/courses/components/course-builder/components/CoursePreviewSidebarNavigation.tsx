import {
  BadgeCheck,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Code2,
  Layers3,
  Play,
} from "lucide-react";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import {
  buildCoursePreviewSidebarItems,
  getCoursePreviewTestTitle,
} from "../lib/coursePreviewUtils";

type ActiveContentType = "lesson" | "exercise" | "test";

type CoursePreviewSidebarNavigationProps = {
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  expandedModuleId: string | null;
  activeLessonId: string | null;
  activeExerciseId: string | null;
  activeTestId: string | null;
  activeContentType: ActiveContentType;
  completedLessonIds: Record<string, boolean>;
  completedExerciseIds: Record<string, boolean>;
  completedTestIds: Record<string, boolean>;
  onContentTypeChange: (contentType: ActiveContentType) => void;
  onModuleToggle: (moduleId: string) => void;
  onSelectLesson: (moduleId: string, lessonId: string) => void;
  onSelectExercise: (moduleId: string, lessonId: string, exerciseId: string) => void;
  onSelectTest: (moduleId: string, lessonId: string, testId: string) => void;
};

export function CoursePreviewSidebarNavigation({
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  expandedModuleId,
  activeLessonId,
  activeExerciseId,
  activeTestId,
  activeContentType,
  completedLessonIds,
  completedExerciseIds,
  completedTestIds,
  onContentTypeChange,
  onModuleToggle,
  onSelectLesson,
  onSelectExercise,
  onSelectTest,
}: CoursePreviewSidebarNavigationProps) {
  const activeModule = modules.find((module) => module.id === expandedModuleId) ?? null;
  const activeModuleExercises = activeModule ? exercisesByModule[activeModule.id] ?? [] : [];
  const activeModuleTests = activeModule ? testsByModule[activeModule.id] ?? [] : [];
  const contentTabs = [
    {
      type: "lesson" as const,
      label: "Урок",
      icon: BookOpen,
      isDisabled: false,
    },
    {
      type: "test" as const,
      label: "Тест",
      icon: ClipboardList,
      isDisabled: activeModuleTests.length === 0,
    },
    {
      type: "exercise" as const,
      label: "Вправа",
      icon: Layers3,
      isDisabled: activeModuleExercises.length === 0,
    },
  ];
  return (
    <aside className="flex h-full min-h-0 flex-col border-b border-[#dedcff] bg-white lg:border-b-0 lg:border-r">
      <div className="shrink-0 border-b border-[#dedcff] px-5 py-4">
        <div className="flex rounded-2xl bg-[#e7e4ff] p-1">
          {contentTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeContentType === tab.type;

            return (
              <button
                key={tab.type}
                type="button"
                onClick={() => onContentTypeChange(tab.type)}
                disabled={tab.isDisabled}
                className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  isActive
                    ? "bg-white text-[#5549f1] shadow-[0_8px_18px_rgba(31,27,77,0.12)]"
                    : "text-[#6d6a9f] hover:bg-white/55 hover:text-[#1f1b4d]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
            Додайте модулі й уроки, щоб побачити фінальний перегляд курсу.
          </div>
        ) : (
          [...modules]
            .sort((left, right) => left.order - right.order)
            .map((module) => {
              const lessons = lessonsByModule[module.id] ?? [];
              const tests = testsByModule[module.id] ?? [];
              const exercises = exercisesByModule[module.id] ?? [];
              const isExpanded = expandedModuleId === module.id;
              const items = buildCoursePreviewSidebarItems({
                lessons,
                exercises,
                tests,
              });

              return (
                <section key={module.id} className="overflow-hidden rounded-[1.25rem] bg-white">
                  <button
                    type="button"
                    onClick={() => onModuleToggle(module.id)}
                    className="flex w-full items-start gap-3 px-2 py-3 text-left transition hover:bg-[#f8f7ff]"
                  >
                    <ChevronDown
                      className={`mt-1 h-4 w-4 shrink-0 text-[#6d6a9f] transition ${
                        isExpanded ? "" : "-rotate-90"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-normal break-words text-base font-extrabold leading-6 tracking-tight text-[#1f1b4d]">
                        {`Модуль ${module.order}: ${module.title}`}
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-[#6d6a9f]">
                        {`${lessons.filter((lesson) => completedLessonIds[lesson.id]).length}/${lessons.length} виконано`}
                      </p>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="space-y-1">
                      {items.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                          У цьому модулі поки немає уроків.
                        </div>
                      ) : (
                        items.map((item) => {
                          if (item.type === "lesson") {
                            const isActive = item.lesson.id === activeLessonId;

                            return (
                              <button
                                key={item.lesson.id}
                                type="button"
                                onClick={() => onSelectLesson(module.id, item.lesson.id)}
                                className={`flex w-full items-center gap-3 px-8 py-3 text-left transition ${
                                  isActive
                                    ? "bg-[#e7e4ff] text-[#5549f1]"
                                    : "text-[#4d4a75] hover:bg-[#f8f7ff]"
                                }`}
                              >
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                                    completedLessonIds[item.lesson.id]
                                      ? "text-emerald-500"
                                      : isActive
                                        ? "text-[#5549f1]"
                                        : "text-[#8d89b8]"
                                  }`}
                                >
                                  {completedLessonIds[item.lesson.id] ? (
                                    <BadgeCheck className="h-5 w-5" />
                                  ) : (
                                    <Play className="ml-0.5 h-5 w-5" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-bold leading-6">
                                  {`${module.order}.${item.lesson.order} ${item.lesson.title}`}
                                </span>
                              </button>
                            );
                          }

                          if (item.type === "exercise") {
                            const isActive = item.exercise.id === activeExerciseId;

                            return (
                              <button
                                key={item.exercise.id}
                                type="button"
                                onClick={() =>
                                  onSelectExercise(
                                    module.id,
                                    item.lesson.id,
                                    item.exercise.id
                                  )
                                }
                                className={`ml-11 flex w-[calc(100%-2.75rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                  isActive
                                    ? "bg-[#fff4e8] text-orange-700"
                                    : "text-[#6d6a9f] hover:bg-[#fff8f0]"
                                }`}
                              >
                                <span
                                  className="flex h-5 w-5 shrink-0 items-center justify-center text-orange-500"
                                >
                                  <Code2 className="h-5 w-5" />
                                </span>
                                <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-bold leading-6">
                                  {item.exercise.title}
                                </span>
                                {completedExerciseIds[item.exercise.id] ? (
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                                    Готово
                                  </span>
                                ) : null}
                              </button>
                            );
                          }

                          const isActive = item.test.id === activeTestId;
                          const displayTitle = getCoursePreviewTestTitle(
                            module.order,
                            lessons,
                            item.test
                          );

                          return (
                            <button
                              key={item.test.id}
                              type="button"
                              onClick={() =>
                                onSelectTest(module.id, item.lesson.id, item.test.id)
                              }
                              className={`ml-11 flex w-[calc(100%-2.75rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                isActive
                                  ? "bg-[#e7e4ff] text-[#5549f1]"
                                  : "text-[#6d6a9f] hover:bg-[#f8f7ff]"
                              }`}
                            >
                              <span
                                className="flex h-5 w-5 shrink-0 items-center justify-center text-[#5549f1]"
                              >
                                <ClipboardList className="h-5 w-5" />
                              </span>
                              <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-bold leading-6">
                                {displayTitle}
                              </span>
                              {completedTestIds[item.test.id] ? (
                                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                                  Готово
                                </span>
                              ) : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </section>
              );
            })
        )}
      </div>
    </aside>
  );
}
