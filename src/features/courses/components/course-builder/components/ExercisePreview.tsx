import { useEffect, useState } from "react";
import type { ExerciseContent } from "../../../api/index";

type ExercisePreviewProps = {
  content: ExerciseContent;
  description?: string | null;
  allowWriteCodeInput?: boolean;
  compact?: boolean;
  showAnswerKey?: boolean;
  showQuestion?: boolean;
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
  allowWriteCodeInput = false,
  compact = false,
  showAnswerKey = false,
  showQuestion = true,
}: ExercisePreviewProps) {
  const [activeDragBlankIndex, setActiveDragBlankIndex] = useState<number | null>(null);
  const [dragDropSelections, setDragDropSelections] = useState<string[]>([]);
  const [dragDropResult, setDragDropResult] = useState<"correct" | "incorrect" | null>(null);
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

  useEffect(() => {
    if (content.type !== "drag_drop_code") {
      setActiveDragBlankIndex(null);
      setDragDropSelections([]);
      setDragDropResult(null);
      return;
    }

    const blankCount = content.code_template.split(DRAG_DROP_SLOT_PATTERN).filter((part) =>
      DRAG_DROP_SLOT_FRAGMENT_PATTERN.test(part)
    ).length;

    setActiveDragBlankIndex(blankCount > 0 ? 0 : null);
    setDragDropSelections(Array.from({ length: blankCount }, () => ""));
    setDragDropResult(null);
  }, [content]);

  const sectionSpacing = compact ? "space-y-3" : "space-y-4";
  const previewBodyMinHeight = compact ? "min-h-[12rem]" : "min-h-[16rem]";
  const previewTitle = content.question.trim() || "Type the task for the student...";
  const answerKeyClassName = compact
    ? "rounded-2xl border border-sky-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
    : "rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)]";

  if (content.type === "drag_drop_code") {
    const templateParts = content.code_template.split(DRAG_DROP_SLOT_PATTERN);
    const correctAnswer = content.correct_answer.map((token) => token.trim()).filter(Boolean);
    const tokenBank =
      content.tokens.map((token) => token.trim()).filter(Boolean).length > 0
        ? content.tokens.map((token) => token.trim()).filter(Boolean)
        : correctAnswer;
    let blankIndex = 0;

    const handleTokenSelect = (token: string) => {
      setDragDropSelections((currentSelections) => {
        if (currentSelections.length === 0) {
          return currentSelections;
        }

        const targetIndex =
          activeDragBlankIndex !== null
            ? activeDragBlankIndex
            : currentSelections.findIndex((value) => !value.trim());
        const resolvedIndex =
          targetIndex >= 0 ? targetIndex : Math.max(0, currentSelections.length - 1);
        const nextSelections = [...currentSelections];

        nextSelections[resolvedIndex] = token;
        const nextEmptyIndex = nextSelections.findIndex((value) => !value.trim());
        setActiveDragBlankIndex(
          nextEmptyIndex >= 0
            ? nextEmptyIndex
            : resolvedIndex < nextSelections.length - 1
              ? resolvedIndex + 1
              : resolvedIndex
        );
        setDragDropResult(null);

        return nextSelections;
      });
    };

    const handleCheckAnswer = () => {
      const isCorrect =
        dragDropSelections.length === correctAnswer.length &&
        dragDropSelections.every(
          (selection, index) => selection.trim() === (correctAnswer[index] ?? "").trim()
        );

      setDragDropResult(isCorrect ? "correct" : "incorrect");
    };

    return (
      <div className={sectionSpacing}>
        {showQuestion ? (
          <p className="text-sm font-normal leading-6 text-slate-600">{previewTitle}</p>
        ) : null}

        <div className="overflow-hidden rounded-[1.5rem] bg-[#0f172a] shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
          <div
            className={`${previewBodyMinHeight} overflow-x-auto px-4 py-4 font-mono text-sm leading-7 text-slate-100`}
          >
            {templateParts.map((part, index) => {
              if (!DRAG_DROP_SLOT_FRAGMENT_PATTERN.test(part)) {
                return (
                  <span key={`text-${index}`} className="whitespace-pre-wrap">
                    {part}
                  </span>
                );
              }

              const currentBlankIndex = blankIndex;
              blankIndex += 1;

              return (
                <button
                  key={`blank-${index}`}
                  type="button"
                  onClick={() => {
                    setDragDropSelections((currentSelections) => {
                      if (!currentSelections[currentBlankIndex]?.trim()) {
                        return currentSelections;
                      }

                      const nextSelections = [...currentSelections];
                      nextSelections[currentBlankIndex] = "";
                      return nextSelections;
                    });
                    setActiveDragBlankIndex(currentBlankIndex);
                    setDragDropResult(null);
                  }}
                  className={`mx-1 inline-flex min-w-[6.5rem] items-center justify-center rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    activeDragBlankIndex === currentBlankIndex
                      ? "border-sky-300 bg-white text-[#14213d]"
                      : "border-white/20 bg-white/90 text-[#14213d]"
                  }`}
                >
                  {dragDropSelections[currentBlankIndex]?.trim() || "___"}
                </button>
              );
            })}

            <div className="mt-6 flex flex-wrap gap-2">
              {tokenBank.length > 0 ? (
                tokenBank.map((token, index) => (
                  <button
                    key={`${token}-${index}`}
                    type="button"
                    onClick={() => handleTokenSelect(token)}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    {token}
                  </button>
                ))
              ) : (
                <span className="text-sm text-slate-400">
                  Add options in the builder to preview student choices here.
                </span>
              )}
            </div>

            {tokenBank.length > 0 && dragDropSelections.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCheckAnswer}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-400"
                >
                  Check Answer
                </button>
                {dragDropResult ? (
                  <span
                    className={`text-sm font-semibold ${
                      dragDropResult === "correct" ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {dragDropResult === "correct" ? "Correct answer." : "Incorrect answer."}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>


        {showAnswerKey ? (
          <div className={answerKeyClassName}>
            <p className="text-sm font-semibold  text-sky-600">
              Answer Key
            </p>
            <div className="mt-3">
              {correctAnswer.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {correctAnswer.map((token, index) => (
                    <span
                      key={`${token}-${index}`}
                      className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 font-mono text-xs font-semibold text-sky-700"
                    >
                      {token}
                    </span>
                  ))}
                </div>
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
      {showQuestion ? (
        <p className="text-sm font-normal leading-6 text-slate-600">{previewTitle}</p>
      ) : null}

      <div className="overflow-hidden rounded-[1.5rem] bg-[#0f172a] shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
        {hasInlineInput ? (
          <div
            className={`${previewBodyMinHeight} overflow-x-auto px-4 py-4 font-mono text-sm leading-7 text-slate-100`}
          >
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
          <div className={`flex ${previewBodyMinHeight} flex-col px-4 py-4`}>
            <textarea
              value={allowWriteCodeInput ? writeCodeValue : content.initial_code}
              onChange={(event) => setWriteCodeValue(event.target.value)}
              readOnly={!allowWriteCodeInput}
              className="mt-4 min-h-0 w-full flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10"
            />
          </div>
        )}
      </div>

      {showAnswerKey ? (
        <div className={`${answerKeyClassName} space-y-2`}>
          <p className="text-sm font-semibold  text-sky-600">
            Answer Key
          </p>
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 font-mono text-sm font-semibold text-[#14213d]">
            {content.expected_answer || "// Add the expected answer to preview it here."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
