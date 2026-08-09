/** The three preview cards the admin sees before saving a landing selection. */

import { BookOpen, Layers3 } from "lucide-react";
import type { AdminDashboardTest } from "../../../features/admin-dashboard/types";
import type { Exercise } from "../../../features/courses/api";
import {
  getExerciseCode,
  getExerciseQuestion,
  type LessonOption,
} from "./landingSelectionSelectors";

export function TestPreviewCard({ test }: { test: AdminDashboardTest }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase text-violet-700">Тест</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-[#14213d]">
          {test.title}
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          {`${test.questions.length} запитань у тесті`}
        </p>
      </div>

      <div className="space-y-3">
        {test.questions.map((question, index) => (
          <article
            key={question.id}
            className="rounded-xl border border-violet-100 bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-violet-100 text-sm font-black text-violet-800">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black leading-6 text-[#14213d]">
                  {question.question_text}
                </p>
                <div className="mt-3 grid gap-2">
                  {question.answers.map((answer) => (
                    <div
                      key={answer.id}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                        answer.is_correct
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {answer.answer_text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ExercisePreviewCard({ exercise }: { exercise: Exercise }) {
  const code = getExerciseCode(exercise);

  return (
    <div>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-[#14213d]">
        {exercise.title}
      </h2>
      <p className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold leading-6 text-orange-900">
        {getExerciseQuestion(exercise)}
      </p>
      {code ? (
        <pre className="mt-4 overflow-x-auto rounded-xl bg-[#111827] p-4 text-sm font-bold leading-6 text-slate-100">
          <code>{code}</code>
        </pre>
      ) : null}
    </div>
  );
}

export function LessonPreviewCard({ option }: { option: LessonOption }) {
  const hasHtmlContent = Boolean(option.lesson.content?.trim());

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800">
          <Layers3 className="h-3.5 w-3.5" />
          {`Модуль ${option.module.order}`}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
          <BookOpen className="h-3.5 w-3.5" />
          {`Урок ${option.module.order}.${option.lesson.order}`}
        </span>
      </div>

      <h2 className="mt-5 text-3xl font-black tracking-tight text-[#14213d]">
        {option.lesson.title}
      </h2>

      {hasHtmlContent ? (
        <div
          className="prose prose-slate mt-5 max-w-none text-slate-700 prose-headings:text-[#14213d] prose-a:text-[#08bfd4] prose-code:rounded-md prose-code:bg-cyan-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[#087f8f]"
          dangerouslySetInnerHTML={{ __html: option.lesson.content ?? "" }}
        />
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm font-semibold text-slate-500">
          У цього уроку поки немає контенту для перегляду.
        </div>
      )}
    </div>
  );
}
