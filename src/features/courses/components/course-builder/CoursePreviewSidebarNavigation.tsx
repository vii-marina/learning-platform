import { BadgeCheck, BookOpen, ChevronDown, ChevronRight, Code2, Play } from "lucide-react";
import type { Lesson, Module } from "../../api";
import type { CourseExercise, CourseTest } from "./courseBuilderUiTypes";
import {
  buildCoursePreviewSidebarItems,
  getCoursePreviewTestTitle,
  isGeneratedCoursePreviewItem,
} from "./coursePreviewUtils";

type CoursePreviewSidebarNavigationProps = {
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  expandedModuleId: string | null;
  activeLessonId: string | null;
  activeExerciseId: string | null;
  activeTestId: string | null;
  revealedTestIds: Record<string, boolean>;
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
  revealedTestIds,
  completedLessonIds,
  completedExerciseIds,
  completedTestIds,
  onModuleToggle,
  onSelectLesson,
  onSelectExercise,
  onSelectTest,
}: CoursePreviewSidebarNavigationProps) {
  return (
    <aside className="border-b border-slate-200 bg-[#f9fbfd] lg:w-[20rem] lg:flex-shrink-0 lg:border-b-0 lg:border-r">
      <div className="space-y-3 px-4 py-4 md:px-5">
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
                revealedTestIds,
              });

              return (
                <section
                  key={module.id}
                  className={`overflow-hidden rounded-[0.75rem] border bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] ${
                    isExpanded ? "border-[#13daec]" : "border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onModuleToggle(module.id)}
                    className={`flex w-full items-center gap-3 px-4 py-4 text-left ${
                      isExpanded
                        ? "border-b border-[#13daec] bg-[#13daec]/5"
                        : "bg-white"
                    }`}
                  >
                    <BookOpen className="h-4 w-4 shrink-0 text-[#08bfd4]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold tracking-tight text-slate-950">
                        {`Module ${module.order}: ${module.title}`}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-400">
                        {`${lessons.length} lesson${lessons.length === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[#90a0b7]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#90a0b7]" />
                    )}
                  </button>

                  {isExpanded ? (
                    <div className="space-y-1 px-3 py-3">
                      {items.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                          This module does not have lessons yet.
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
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                  isActive
                                    ? "border-l-4 border-[#13daec] bg-[#13daec]/12 text-[#14213d]"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
                                }`}
                              >
                                <Play
                                  className={`h-4 w-4 shrink-0 ${
                                    isActive ? "text-[#13daec]" : "text-slate-300"
                                  }`}
                                />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                  {`${module.order}.${item.lesson.order} ${item.lesson.title}`}
                                </span>
                                {completedLessonIds[item.lesson.id] ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                    Done
                                  </span>
                                ) : null}
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
                                className={`ml-6 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                  isActive
                                    ? "border-l-4 border-[#13daec] bg-[#13daec]/12 text-[#14213d]"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
                                }`}
                              >
                                <Code2
                                  className={`h-4 w-4 shrink-0 ${
                                    isActive ? "text-[#13daec]" : "text-slate-300"
                                  }`}
                                />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                  {item.exercise.title}
                                </span>
                                {isGeneratedCoursePreviewItem(item.exercise.id) ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                    AI
                                  </span>
                                ) : null}
                                {completedExerciseIds[item.exercise.id] ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
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

                          return (
                            <button
                              key={item.test.id}
                              type="button"
                              onClick={() =>
                                onSelectTest(module.id, item.lesson.id, item.test.id)
                              }
                              className={`ml-6 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                isActive
                                  ? "border-l-4 border-[#13daec] bg-[#13daec]/12 text-[#14213d]"
                                  : "text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
                              }`}
                            >
                              <BadgeCheck
                                className={`h-4 w-4 shrink-0 ${
                                  isActive ? "text-[#13daec]" : "text-slate-300"
                                }`}
                              />
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                Test
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {displayTitle}
                              </span>
                              {completedTestIds[item.test.id] ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
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
