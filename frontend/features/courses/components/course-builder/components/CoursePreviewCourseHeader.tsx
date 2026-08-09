/**
 * The course header above the preview: thumbnail, title, description and the four content
 * counters.
 *
 * The counters double as buttons that open the overview modal on the matching tab, which is
 * why they take a handler rather than being plain text.
 */

import { BookOpen, ClipboardList, Code2, Layers3, Play } from "lucide-react";
import type { CoursePreviewOverviewTab } from "./CoursePreviewOverviewModal";

export function CoursePreviewCourseHeader({
  courseTitle,
  courseDescription,
  courseThumbnailUrl,
  totalModules,
  totalLessons,
  totalExercises,
  totalTests,
  showCourseOverviewActions,
  onOpenOverviewTab: setOverviewModalTab,
}: {
  courseTitle: string;
  courseDescription?: string | null;
  courseThumbnailUrl?: string | null;
  totalModules: number;
  totalLessons: number;
  totalExercises: number;
  totalTests: number;
  showCourseOverviewActions: boolean;
  onOpenOverviewTab: (tab: CoursePreviewOverviewTab) => void;
}) {
  return (
      <section className="mb-4 rounded-[0.75rem] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
          <div className="aspect-video overflow-hidden rounded-[0.75rem] border border-slate-200 bg-slate-950">
            {courseThumbnailUrl ? (
              <img
                src={courseThumbnailUrl}
                alt={`${courseTitle} thumbnail`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#14213d] text-white">
                <BookOpen className="h-12 w-12" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-black leading-tight tracking-tight text-[#14213d] sm:text-2xl">
              {courseTitle}
            </h2>
            {courseDescription?.trim() ? (
              <p className="mt-1.5 max-h-20 overflow-y-auto whitespace-pre-line pr-2 text-xs font-semibold leading-5 text-slate-600 sm:mt-3 sm:max-h-32 sm:text-sm sm:leading-7">
                {courseDescription}
              </p>
            ) : (
              <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500 sm:mt-3 sm:text-sm sm:leading-7">
                Опис курсу поки не додано.
              </p>
            )}

            {showCourseOverviewActions ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setOverviewModalTab("modules")}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100"
                >
                  <Layers3 className="h-4 w-4" />
                  {totalModules} модулі
                </button>
                <button
                  type="button"
                  onClick={() => setOverviewModalTab("lessons")}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  <Play className="h-4 w-4" />
                  {totalLessons} уроки
                </button>
                <button
                  type="button"
                  onClick={() => setOverviewModalTab("exercises")}
                  className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
                >
                  <Code2 className="h-4 w-4" />
                  {totalExercises} вправи
                </button>
                <button
                  type="button"
                  onClick={() => setOverviewModalTab("tests")}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-800 transition hover:border-violet-300 hover:bg-violet-100"
                >
                  <ClipboardList className="h-4 w-4" />
                  {totalTests} тести
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
  );
}
