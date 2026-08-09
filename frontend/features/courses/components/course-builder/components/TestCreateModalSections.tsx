/**
 * The two setup sections of the test-create modal: where the test sits in the course, and
 * whether it is written by hand or generated.
 *
 * "Graded" is the consequential switch here — it decides whether the answer key is sent to
 * the student's browser at all, so the label spells out what changes rather than just
 * naming the setting.
 */

import { PenSquare, Sparkles } from "lucide-react";
import type { Lesson } from "../../../api/index";
import type { CreateContentMode } from "../lib/courseBuilderPageUtils";

export function TestPlacementControls({
  lessons,
  selectedAfterLessonId,
  isGraded,
  controlsDisabled,
  surfaceControlClassName,
  onPlacementChange,
  onIsGradedChange,
}: {
  lessons: Lesson[];
  selectedAfterLessonId: string | null;
  isGraded: boolean;
  controlsDisabled: boolean;
  surfaceControlClassName: string;
  onPlacementChange: (lessonId: string | null) => void;
  onIsGradedChange: (isGraded: boolean) => void;
}) {
  return (
    <div className="mt-5 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onPlacementChange(null)}
          className={`h-12 w-full rounded-xl border px-4 text-sm font-medium transition ${
            selectedAfterLessonId === null
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
          disabled={controlsDisabled}
        >
          This Module
        </button>

        <select
          value={selectedAfterLessonId ?? ""}
          onChange={(event) => onPlacementChange(event.target.value || null)}
          disabled={lessons.length === 0 || controlsDisabled}
          className={`${surfaceControlClassName} px-4 ${
            selectedAfterLessonId !== null
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : "text-slate-700"
          }`}
        >
          <option value="" disabled>
            {lessons.length === 0 ? "Немає доступних уроків" : "Оберіть урок"}
          </option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {`${lesson.order}. ${lesson.title}`}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span>
          <span className="block text-sm font-semibold text-slate-800">Оцінюваний тест</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Студент не бачить правильних відповідей під час проходження — лише результат наприкінці.
          </span>
        </span>
        <input
          type="checkbox"
          checked={isGraded}
          onChange={(event) => onIsGradedChange(event.target.checked)}
          disabled={controlsDisabled}
          className="h-5 w-5 shrink-0 accent-violet-600"
        />
      </label>
    </div>
  );
}

export function TestCreationMethodCards({
  mode,
  isSaving,
  // Aliased so the moved JSX is unchanged.
  onModeChange: setMode,
}: {
  mode: CreateContentMode | null;
  isSaving: boolean;
  onModeChange: (mode: CreateContentMode) => void;
}) {
  return (
    <div className="mt-5 grid gap-3 xl:grid-cols-2">
      <button
        type="button"
        onClick={() => setMode("ai")}
        aria-pressed={mode === "ai"}
        disabled={isSaving}
        className={`rounded-xl border p-4 text-left transition ${
          mode === "ai"
            ? "border-violet-200 bg-violet-50"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              mode === "ai"
                ? "bg-white text-violet-600"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h4 className="text-base font-semibold text-[#14213d]">
              Генерувати за допомогою ШІ
            </h4>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => setMode("manual")}
        aria-pressed={mode === "manual"}
        disabled={isSaving}
        className={`rounded-xl border p-4 text-left transition ${
          mode === "manual"
            ? "border-violet-200 bg-violet-50"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              mode === "manual"
                ? "bg-white text-violet-600"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <PenSquare className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h4 className="text-base font-semibold text-[#14213d]">
              Створити самостійно
            </h4>
          </div>
        </div>
      </button>
    </div>
  );
}
