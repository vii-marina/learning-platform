import { BadgeCheck, ChevronDown, ChevronRight, Play } from "lucide-react";
import type { Lesson, Module } from "../../../api/index";
import type { CourseTest } from "../types/courseBuilderUiTypes";
import {
  buildOrderedModuleItems,
  getGeneratedCourseTestTitle,
  type ReviewPreviewSelection,
} from "../lib/courseBuilderPageUtils";

type StudentCourseOutlineProps = {
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  expandedModuleId: string | null;
  resolvedReviewSelection: ReviewPreviewSelection | null;
  onModuleToggle: (moduleId: string) => void;
  onItemSelect: (selection: ReviewPreviewSelection) => void;
};

export function StudentCourseOutline({
  modules,
  lessonsByModule,
  testsByModule,
  expandedModuleId,
  resolvedReviewSelection,
  onModuleToggle,
  onItemSelect,
}: StudentCourseOutlineProps) {
  return (
    <aside className="border-r border-slate-200 bg-[#f8fafc] p-5 md:p-6">
      <h3 className="text-xl font-bold text-[#14213d]">Course Content</h3>

      <div className="mt-5 space-y-3">
        {modules.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
            Add modules and lessons to see the preview.
          </div>
        ) : (
          modules.map((module) => {
            const lessons = lessonsByModule[module.id] || [];
            const tests = testsByModule[module.id] || [];
            const orderedItems = buildOrderedModuleItems(lessons, tests);
            const isExpanded = expandedModuleId === module.id;

            return (
              <div
                key={module.id}
                className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => onModuleToggle(module.id)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                    isExpanded ? "bg-[#13daec]/10" : "hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="text-base font-semibold text-[#14213d]">
                      {`${module.order}. ${module.title}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {`${lessons.length} lessons • ${tests.length} tests`}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  )}
                </button>

                {isExpanded ? (
                  <div className="border-t border-slate-100 px-3 py-3">
                    {orderedItems.length === 0 ? (
                      <div className="rounded-xl bg-[#f8fafc] px-3 py-3 text-sm text-slate-500">
                        This module does not contain lessons or tests yet.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {orderedItems.map((item) => {
                          const isActive =
                            resolvedReviewSelection?.moduleId === module.id &&
                            resolvedReviewSelection.itemId ===
                              (item.type === "lesson" ? item.lesson.id : item.test.id) &&
                            resolvedReviewSelection.itemType === item.type;

                          return (
                            <button
                              key={item.type === "lesson" ? item.lesson.id : item.test.id}
                              type="button"
                              onClick={() =>
                                onItemSelect(
                                  item.type === "lesson"
                                    ? {
                                        moduleId: module.id,
                                        itemType: "lesson",
                                        itemId: item.lesson.id,
                                      }
                                    : {
                                        moduleId: module.id,
                                        itemType: "test",
                                        itemId: item.test.id,
                                      }
                                )
                              }
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                isActive
                                  ? "bg-[#14213d] text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-[#14213d]"
                              }`}
                            >
                              {item.type === "lesson" ? (
                                <Play
                                  className={`h-4 w-4 ${
                                    isActive ? "text-[#13daec]" : "text-[#08bfd4]"
                                  }`}
                                />
                              ) : (
                                <BadgeCheck
                                  className={`h-4 w-4 ${
                                    isActive ? "text-[#13daec]" : "text-[#08bfd4]"
                                  }`}
                                />
                              )}
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {item.type === "lesson"
                                  ? item.lesson.title
                                  : getGeneratedCourseTestTitle({
                                      moduleOrder: module.order,
                                      lessons,
                                      afterLessonId: item.test.afterLessonId,
                                      fallbackTitle: item.test.title,
                                    })}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
