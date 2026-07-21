import type { AccentClasses } from "./constants";

type DraftLessonRowProps = {
  moduleId: string;
  isDraftActive: boolean;
  draftLessonTitle: string;
  isDirty: boolean;
  isCleanAccent: boolean;
  accentClasses: AccentClasses;
  registerRef: (node: HTMLElement | null) => void;
  onSelectDraftLesson?: (moduleId: string) => void;
};

export function DraftLessonRow({
  moduleId,
  isDraftActive,
  draftLessonTitle,
  isDirty,
  isCleanAccent,
  accentClasses,
  registerRef,
  onSelectDraftLesson,
}: DraftLessonRowProps) {
  if (onSelectDraftLesson) {
    return (
      <button
        ref={registerRef}
        type="button"
        onClick={() => onSelectDraftLesson(moduleId)}
        className={`flex w-full items-center gap-3 rounded-xl border-l-4 px-3 py-2.5 text-left transition ${
          isDraftActive
            ? `${accentClasses.itemActiveBorder} ${accentClasses.itemActiveBg} text-[#14213d]`
            : isCleanAccent
              ? "border-transparent text-slate-500 hover:text-[#14213d]"
              : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isDraftActive ? accentClasses.itemActiveDot : "bg-slate-300"
          }`}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {draftLessonTitle.trim() || "New lesson"}
        </span>
        {isDirty ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            Unsaved
          </span>
        ) : !isDraftActive ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            Continue
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div
      ref={registerRef}
      className={`rounded-xl border-l-4 ${accentClasses.itemActiveBorder} ${accentClasses.itemActiveBg} px-3 py-2.5`}
    >
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${accentClasses.itemActiveDot}`} />
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
  );
}
