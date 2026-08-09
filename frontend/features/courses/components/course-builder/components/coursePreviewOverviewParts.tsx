/**
 * Presentation pieces for the course-overview modal: the tab-button styling, the
 * module/lesson breadcrumb, and the read-only question card.
 *
 * `TestQuestionPreviewCard` is deliberately read-only — the overview is for seeing what a
 * course contains, not for answering it, so it shows the question and its options without
 * any selection state.
 */

import { Layers3, Play } from "lucide-react";
import type { Lesson, Module } from "../../../api/index";
import { studentQuestionTypeLabels } from "../lib/courseBuilderPageUtils";
import type { CourseTest } from "../types/courseBuilderUiTypes";

export type CourseOverviewPathProps = {
  module: Module;
  lesson?: Lesson | null;
};

export type TestQuestionPreviewCardProps = {
  question: CourseTest["questions"][number];
  index: number;
};

export function CourseOverviewPath({ module, lesson = null }: CourseOverviewPathProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
        <Layers3 className="h-3.5 w-3.5 text-[#08bfd4]" />
        <span>{`Модуль ${module.order}`}</span>
      </span>

      {lesson ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
          <Play className="ml-0.5 h-3.5 w-3.5 text-emerald-600" />
          <span>{`Урок ${module.order}.${lesson.order}`}</span>
        </span>
      ) : null}
    </div>
  );
}

export function TestQuestionPreviewCard({ question, index }: TestQuestionPreviewCardProps) {
  const isSingleChoice = question.type === "single_choice";

  return (
    <div className="rounded-[1.25rem] border border-violet-200 bg-slate-50 p-4 shadow-[0_14px_30px_rgba(139,92,246,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-white px-2 text-xs font-semibold text-violet-700 shadow-[0_8px_18px_rgba(139,92,246,0.08)]">
            {index + 1}
          </span>
          <label className="text-sm font-semibold text-[#14213d]">Запитання</label>
        </div>

        <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold text-violet-700">
          {studentQuestionTypeLabels[question.type]}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-transparent bg-white px-4 py-3 text-sm leading-6 text-slate-700">
        {question.questionText.trim() || `Запитання ${index + 1}`}
      </div>

      <div className="mt-4 space-y-3">
        {question.options.map((option, optionIndex) => {
          const isCorrect = question.correctOptionIndexes.includes(optionIndex);

          return (
            <div key={`${question.id}-${optionIndex}`} className="flex items-center gap-3">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                  isSingleChoice ? "rounded-full" : "rounded-[4px]"
                } ${
                  isCorrect ? "border-violet-500 bg-violet-500" : "border-slate-300 bg-white"
                }`}
              >
                {isCorrect ? (
                  <span
                    className={`block bg-white ${
                      isSingleChoice ? "h-1.5 w-1.5 rounded-full" : "h-2 w-2 rounded-[2px]"
                    }`}
                  />
                ) : null}
              </span>

              <div
                className={`flex h-11 flex-1 items-center rounded-xl border px-4 text-sm ${
                  isCorrect
                    ? "border-violet-200 bg-violet-50 text-violet-900"
                    : "border-transparent bg-white text-[#14213d]"
                }`}
              >
                {option}
              </div>
            </div>
          );
        })}
      </div>

      {question.hint?.trim() ? (
        <div className="mt-4 rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
          <span className="font-semibold text-slate-700">Підказка:</span> {question.hint.trim()}
        </div>
      ) : null}
    </div>
  );
}
