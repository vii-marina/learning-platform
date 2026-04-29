import { BadgeCheck, BookOpen, ChevronDown, ChevronRight, Code2, Play } from "lucide-react";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import {
  buildCoursePreviewSidebarItems,
  getCoursePreviewTestTitle,
} from "../lib/coursePreviewUtils";

type CoursePreviewSidebarNavigationProps = {
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  expandedModuleId: string | null;
  activeLessonId: string | null;
  activeExerciseId: string | null;
  activeTestId: string | null;
  completedLessonIds: Record<string, boolean>;
  completedExerciseIds: Record<string, boolean>;
  completedTestIds: Record<string, boolean>;
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
  completedLessonIds,
  completedExerciseIds,
  completedTestIds,
  onModuleToggle,
  onSelectLesson,
  onSelectExercise,
  onSelectTest,
}: CoursePreviewSidebarNavigationProps) {
  const itemToneClassNames = {
    lesson: {
      activeRow:
        "border-emerald-200 bg-emerald-50/80 text-[#14213d] shadow-[0_8px_20px_rgba(16,185,129,0.10)]",
      inactiveRow:
        "border-transparent bg-transparent text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/70 hover:text-[#14213d]",
      activeIcon: "bg-emerald-100 text-emerald-700",
      inactiveIcon: "bg-emerald-50 text-emerald-600",
    },
    exercise: {
      activeRow:
        "border-orange-200 bg-orange-50/80 text-[#14213d] shadow-[0_8px_20px_rgba(249,115,22,0.10)]",
      inactiveRow:
        "border-transparent bg-transparent text-slate-500 hover:border-orange-200 hover:bg-orange-50/70 hover:text-[#14213d]",
      activeIcon: "bg-orange-100 text-orange-700",
      inactiveIcon: "bg-orange-50 text-orange-500",
    },
    test: {
      activeRow:
        "border-violet-200 bg-violet-50/80 text-[#14213d] shadow-[0_8px_20px_rgba(139,92,246,0.10)]",
      inactiveRow:
        "border-transparent bg-transparent text-slate-500 hover:border-violet-200 hover:bg-violet-50/70 hover:text-[#14213d]",
      activeIcon: "bg-violet-100 text-violet-700",
      inactiveIcon: "bg-violet-50 text-violet-600",
    },
  } as const;

  return (
    <aside className="border-b border-slate-200 bg-[#f9fbfd] lg:w-[24rem] lg:flex-shrink-0 lg:border-b-0 lg:border-r">
      <div className="space-y-3 px-4 py-4">
        {modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
            Add modules and lessons to see the final course preview.
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
                <section
                  key={module.id}
                  className={`rounded-[1.25rem] border px-3 py-3 transition ${
                    isExpanded
                      ? "border-[#13daec]/35 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.06)]"
                      : "border-slate-200 bg-white/90"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onModuleToggle(module.id)}
                    className="flex w-full items-start gap-3 rounded-[1rem] px-2 py-2 text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#13daec]/12 text-[#08bfd4]">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-normal break-words text-base font-semibold leading-6 tracking-tight text-slate-950">
                        {`Module ${module.order}: ${module.title}`}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-[#90a0b7]" />
                    ) : (
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#90a0b7]" />
                    )}
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                      {items.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                          This module does not have lessons yet.
                        </div>
                      ) : (
                        items.map((item) => {
                          if (item.type === "lesson") {
                            const isActive = item.lesson.id === activeLessonId;
                            const tone = itemToneClassNames.lesson;

                            return (
                              <button
                                key={item.lesson.id}
                                type="button"
                                onClick={() => onSelectLesson(module.id, item.lesson.id)}
                                className={`flex w-full items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition ${
                                  isActive ? tone.activeRow : tone.inactiveRow
                                }`}
                              >
                                <span
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] ${
                                    isActive ? tone.activeIcon : tone.inactiveIcon
                                  }`}
                                >
                                  <Play className="ml-0.5 h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-medium leading-6">
                                  {`${module.order}.${item.lesson.order} ${item.lesson.title}`}
                                </span>
                                {completedLessonIds[item.lesson.id] ? (
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                                    Done
                                  </span>
                                ) : null}
                              </button>
                            );
                          }

                          if (item.type === "exercise") {
                            const isActive = item.exercise.id === activeExerciseId;
                            const tone = itemToneClassNames.exercise;

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
                                className={`ml-11 flex w-[calc(100%-2.75rem)] items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition ${
                                  isActive ? tone.activeRow : tone.inactiveRow
                                }`}
                              >
                                <span
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] ${
                                    isActive ? tone.activeIcon : tone.inactiveIcon
                                  }`}
                                >
                                  <Code2 className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-medium leading-6">
                                  {item.exercise.title}
                                </span>
                                {completedExerciseIds[item.exercise.id] ? (
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                                    Done
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
                          const tone = itemToneClassNames.test;

                          return (
                            <button
                              key={item.test.id}
                              type="button"
                              onClick={() =>
                                onSelectTest(module.id, item.lesson.id, item.test.id)
                              }
                              className={`ml-11 flex w-[calc(100%-2.75rem)] items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition ${
                                isActive ? tone.activeRow : tone.inactiveRow
                              }`}
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] ${
                                  isActive ? tone.activeIcon : tone.inactiveIcon
                                }`}
                              >
                                <BadgeCheck className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-medium leading-6">
                                {displayTitle}
                              </span>
                              {completedTestIds[item.test.id] ? (
                                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                                  Done
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
