import { useEffect, useState } from "react";
import type { ExerciseContent } from "../../api";

type ExercisePreviewProps = {
  content: ExerciseContent;
  description?: string | null;
  allowWriteCodeInput?: boolean;
  compact?: boolean;
  showAnswerKey?: boolean;
};

const DRAG_DROP_SLOT_PATTERN = /(___|{{blank_\d+}})/g;
const DRAG_DROP_SLOT_FRAGMENT_PATTERN = /^(___|{{blank_\d+}})$/;
const WRITE_CODE_SLOT_PATTERN = /(___|{{blank_\d+}}|{{answer}})/g;
const WRITE_CODE_SLOT_FRAGMENT_PATTERN = /^(___|{{blank_\d+}}|{{answer}})$/;

function hasWriteCodeSlot(template: string) {
  return template.match(WRITE_CODE_SLOT_PATTERN) !== null;
}

export function ExercisePreview({
  content,
  description = null,
  allowWriteCodeInput = false,
  compact = false,
  showAnswerKey = false,
}: ExercisePreviewProps) {
  const [writeCodeValue, setWriteCodeValue] = useState(
    content.type === "write_code" && !hasWriteCodeSlot(content.initial_code)
      ? content.initial_code
      : ""
  );

  useEffect(() => {
    if (content.type === "write_code") {
      setWriteCodeValue(hasWriteCodeSlot(content.initial_code) ? "" : content.initial_code);
    }
  }, [content]);

  const sectionSpacing = compact ? "space-y-3" : "space-y-4";
  const sectionPadding = compact ? "p-4" : "p-5";

  if (content.type === "drag_drop_code") {
    const templateParts = content.code_template.split(DRAG_DROP_SLOT_PATTERN);
    const correctAnswer = content.correct_answer.map((token) => token.trim()).filter(Boolean);
    let blankIndex = 0;

    return (
      <div className={sectionSpacing}>

        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#0f172a] shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            <p className="ml-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Code View
            </p>
          </div>

          <div className="overflow-x-auto px-4 py-4 font-mono text-sm leading-7 text-slate-100">
            {templateParts.map((part, index) =>
              DRAG_DROP_SLOT_FRAGMENT_PATTERN.test(part) ? (
                <span
                  key={`blank-${index}`}
                  className="mx-1 inline-flex min-w-[6.5rem] items-center justify-center rounded-xl border border-dashed border-sky-300/50 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200"
                >
                  {`Blank ${++blankIndex}`}
                </span>
              ) : (
                <span key={`text-${index}`} className="whitespace-pre-wrap">
                  {part}
                </span>
              )
            )}
          </div>
        </div>


        {showAnswerKey ? (
          <div className={`rounded-[1.5rem] border border-slate-200 bg-white ${sectionPadding}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Answer Key
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {correctAnswer.length > 0 ? (
                correctAnswer.map((token, index) => (
                  <span
                    key={`${token}-${index}`}
                    className="rounded-full bg-[#14213d] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {`${index + 1}. ${token}`}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">
                  Add blank answers to build the answer key.
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const initialCodeParts = content.initial_code.split(WRITE_CODE_SLOT_PATTERN);
  const hasInlineInput = hasWriteCodeSlot(content.initial_code);
  let slotIndex = 0;

  return (
    <div className={sectionSpacing}>
      <div className={`rounded-[1.5rem] border border-slate-200 bg-white ${sectionPadding}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-s font-semibold  text-slate-400">
              Student Prompt
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {content.question || "Add the instructions students should follow."}
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {content.match_mode === "flexible" ? "Flexible Match" : "Strict Match"}
          </span>
        </div>

        {description?.trim() ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
            {description.trim()}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#0f172a] shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <p className="ml-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Coding Area
          </p>
        </div>

        {hasInlineInput ? (
          <div className="overflow-x-auto px-4 py-4 font-mono text-sm leading-7 text-slate-100">
            {initialCodeParts.map((part, index) =>
              WRITE_CODE_SLOT_FRAGMENT_PATTERN.test(part) ? (
                <span
                  key={`slot-${index}`}
                  className="mx-1 inline-flex min-w-[8rem] translate-y-[0.15rem] items-center rounded-xl border border-sky-300/50 bg-white px-2.5 py-1.5 text-slate-700 shadow-sm"
                >
                  {allowWriteCodeInput ? (
                    <input
                      value={writeCodeValue}
                      onChange={(event) => setWriteCodeValue(event.target.value)}
                      className="w-full bg-transparent text-sm font-medium outline-none"
                      placeholder={`Answer ${++slotIndex}`}
                    />
                  ) : (
                    <span className="text-sm font-medium text-slate-400">
                      {`Answer ${++slotIndex}`}
                    </span>
                  )}
                </span>
              ) : (
                <span key={`code-${index}`} className="whitespace-pre-wrap">
                  {part}
                </span>
              )
            )}
          </div>
        ) : (
          <div className="px-4 py-4">
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 px-4 py-3 text-xs font-medium text-slate-400">
              Insert <span className="font-mono text-slate-200">___</span> into the initial code
              to preview inline typing.
            </div>
            <textarea
              value={allowWriteCodeInput ? writeCodeValue : content.initial_code}
              onChange={(event) => setWriteCodeValue(event.target.value)}
              readOnly={!allowWriteCodeInput}
              className="mt-4 min-h-[12rem] w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10"
            />
          </div>
        )}
      </div>

      {showAnswerKey ? (
        <div className={`rounded-[1.5rem] border border-slate-200 bg-white ${sectionPadding}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Expected Answer
          </p>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-slate-100">
            {content.expected_answer || "// Add the expected answer to preview it here."}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
