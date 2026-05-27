import { PenSquare, RectangleEllipsis, Sparkles } from "lucide-react";
import type { ExerciseType, Lesson } from "../../../api/index";
import { type CreateContentMode } from "../lib/courseBuilderPageUtils";

type ExerciseCreateSetupSectionsProps = {
  creationMode: CreateContentMode | null;
  isSaving: boolean;
  isStepTwoLocked: boolean;
  isStepThreeLocked: boolean;
  lessons: Lesson[];
  afterLessonId: string | null;
  isExerciseTypeSelected: boolean;
  selectedExerciseType: ExerciseType;
  onCreationModeChange: (mode: CreateContentMode) => void;
  onSelectModulePlacement: () => void;
  onSelectLessonPlacement: (lessonId: string | null) => void;
  onExerciseTypeChange: (type: ExerciseType) => void;
};

const sectionClassName = "rounded-xl border border-slate-200 bg-white px-5 py-4";
const sectionStepClassName =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-orange-600";
const stageTitleClassName = "text-base font-semibold text-slate-600";
const stepTwoTextControlClassName =
  "h-12 w-full rounded-xl border px-4 text-base font-semibold text-[#14213d] outline-none transition placeholder:text-slate-400 focus:border-orange-200 focus:ring-4 focus:ring-orange-50 disabled:cursor-not-allowed disabled:opacity-60";
const selectionCardClassName = "flex h-full flex-col rounded-xl border p-4 text-left transition";
const previewCardClassName =
  "mt-4 flex min-h-[9rem] flex-1 flex-col overflow-hidden rounded-xl bg-[#0f172a]";

export function ExerciseCreateSetupSections({
  creationMode,
  isSaving,
  isStepTwoLocked,
  isStepThreeLocked,
  lessons,
  afterLessonId,
  isExerciseTypeSelected,
  selectedExerciseType,
  onCreationModeChange,
  onSelectModulePlacement,
  onSelectLessonPlacement,
  onExerciseTypeChange,
}: ExerciseCreateSetupSectionsProps) {
  return (
    <>
      <section className={sectionClassName}>
        <div className="flex items-center gap-3">
          <span className={sectionStepClassName}>1</span>
          <h4 className={stageTitleClassName}>
            How would you like to create this exercise?
          </h4>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          <button
            type="button"
            onClick={() => onCreationModeChange("ai")}
            aria-pressed={creationMode === "ai"}
            className={`${selectionCardClassName} ${
              creationMode === "ai"
                ? "border-orange-200 bg-orange-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
            disabled={isSaving}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  creationMode === "ai"
                    ? "bg-white text-orange-500"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h5 className="text-base font-semibold text-[#14213d]">Згенерувати з AI</h5>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onCreationModeChange("manual")}
            aria-pressed={creationMode === "manual"}
            className={`${selectionCardClassName} ${
              creationMode === "manual"
                ? "border-orange-200 bg-orange-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
            disabled={isSaving}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  creationMode === "manual"
                    ? "bg-white text-orange-500"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <PenSquare className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h5 className="text-base font-semibold text-[#14213d]">Створити вручну</h5>
              </div>
            </div>
          </button>
        </div>
      </section>

      <section className={`${sectionClassName} ${isStepTwoLocked ? "opacity-45" : ""}`}>
        <div className="flex items-center gap-3">
          <span className={sectionStepClassName}>2</span>
          <h4 className={stageTitleClassName}>Розмістити вправу після:</h4>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onSelectModulePlacement}
            className={`${stepTwoTextControlClassName} transition ${
              afterLessonId === null
                ? "border-orange-200 bg-orange-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
            disabled={isSaving || isStepTwoLocked}
          >
            This Module
          </button>

          <select
            value={afterLessonId ?? ""}
            onChange={(event) => onSelectLessonPlacement(event.target.value || null)}
            disabled={lessons.length === 0 || isSaving || isStepTwoLocked}
            className={`${stepTwoTextControlClassName} ${
              afterLessonId !== null
                ? "border-orange-200 bg-orange-50"
                : "border-slate-200 bg-[#f9fbfd]"
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
      </section>

      <section className={`${sectionClassName} ${isStepThreeLocked ? "opacity-45" : ""}`}>
        <div className="flex items-center gap-3">
          <span className={sectionStepClassName}>3</span>
          <h4 className={stageTitleClassName}>Оберіть формат вправи</h4>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          <button
            type="button"
            onClick={() => onExerciseTypeChange("drag_drop_code")}
            aria-pressed={isExerciseTypeSelected && selectedExerciseType === "drag_drop_code"}
            className={`${selectionCardClassName} ${
              isExerciseTypeSelected && selectedExerciseType === "drag_drop_code"
                ? "border-orange-200 bg-orange-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
            disabled={isSaving || isStepThreeLocked}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isExerciseTypeSelected && selectedExerciseType === "drag_drop_code"
                    ? "bg-white text-orange-500"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <RectangleEllipsis className="h-4 w-4" />
              </span>
              <div className="flex min-h-[3.5rem] min-w-0 items-center">
                <h5 className="text-base font-semibold text-[#14213d]">Заповнити пропуски в коді</h5>
              </div>
            </div>

            <div className={previewCardClassName}>
              <div className="flex flex-1 flex-col justify-between gap-4 px-4 py-4">
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-slate-100">
                  <span>print(</span>
                  <span className="mx-1 inline-flex rounded-md border border-dashed border-sky-300/50 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-200">
                    blank
                  </span>
                  <span>)</span>
                </pre>
                <div className="flex flex-wrap gap-2">
                  {["Hello", "Hi", "Test"].map((token) => (
                    <span
                      key={token}
                      className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700"
                    >
                      {token}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onExerciseTypeChange("write_code")}
            aria-pressed={isExerciseTypeSelected && selectedExerciseType === "write_code"}
            className={`${selectionCardClassName} ${
              isExerciseTypeSelected && selectedExerciseType === "write_code"
                ? "border-orange-200 bg-orange-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
            disabled={isSaving || isStepThreeLocked}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isExerciseTypeSelected && selectedExerciseType === "write_code"
                    ? "bg-white text-orange-500"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <PenSquare className="h-4 w-4" />
              </span>
              <div className="flex min-h-[3.5rem] min-w-0 items-center">
                <h5 className="text-base font-semibold text-[#14213d]">Написати код</h5>
              </div>
            </div>

            <div className={previewCardClassName}>
              <div className="flex flex-1 items-start px-4 py-4 font-mono text-xs leading-6 text-slate-100">
                <div>
                  <span>return </span>
                  <span className="inline-flex min-w-[6rem] translate-y-[0.15rem] items-center rounded-md border border-sky-300/50 bg-white px-2 py-1 text-[11px] font-medium text-slate-400">
                    input
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>
      </section>
    </>
  );
}
