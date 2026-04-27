import type { ReactNode } from "react";

type ExerciseEditorCardProps = {
  indexLabel: string;
  question: string;
  questionAriaLabel: string;
  questionPlaceholder?: string;
  isHighlighted?: boolean;
  disabled: boolean;
  actions: ReactNode;
  onQuestionChange: (value: string) => void;
  children: ReactNode;
};

export function ExerciseEditorCard({
  indexLabel,
  question,
  questionAriaLabel,
  questionPlaceholder = "Type the task for the student...",
  isHighlighted = false,
  disabled,
  actions,
  onQuestionChange,
  children,
}: ExerciseEditorCardProps) {
  return (
    <article
      className={`rounded-2xl border border-orange-300 bg-orange-50/40 p-4 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.18)] transition ${
        isHighlighted ? "ring-2 ring-emerald-300" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-orange-600">
          {indexLabel}
        </span>

        <div className="min-w-0 flex-1">
          <textarea
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            disabled={disabled}
            aria-label={questionAriaLabel}
            rows={2}
            placeholder={questionPlaceholder}
            className="min-h-[4.5rem] w-full resize-y rounded-xl border border-orange-200 bg-white px-4 py-3 text-base font-semibold leading-6 text-[#14213d] outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>

      {children}
    </article>
  );
}
