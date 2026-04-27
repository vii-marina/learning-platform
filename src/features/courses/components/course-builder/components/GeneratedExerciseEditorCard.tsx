import { Check, Shuffle, Trash2 } from "lucide-react";
import { Input } from "../../../../../components/ui/input";
import type { GeneratedExerciseAiDraft } from "../types/courseBuilderUiTypes";
import { ExerciseEditorCard } from "./ExerciseEditorCard";
import type { GeneratedAnswerOptionItem } from "./exerciseCreateModalUtils";
import {
  BLANK_FRAGMENT_PATTERN,
  BLANK_SPLIT_PATTERN,
  WRITE_CODE_SLOT_FRAGMENT_PATTERN,
  WRITE_CODE_SLOT_SPLIT_PATTERN,
  formatAuthorCodeTemplate,
  getChipInputWidth,
  getInlineBlankWidth,
  hasWriteCodeAnswerSlot,
} from "./exerciseCreateModalUtils";

type GeneratedExerciseEditorCardProps = {
  exercise: GeneratedExerciseAiDraft;
  index: number;
  isAccepted: boolean;
  isDisabled: boolean;
  isEditingCode: boolean;
  answerOptions: GeneratedAnswerOptionItem[];
  onQuestionChange: (value: string) => void;
  onDelete: () => void;
  onAccept: () => void;
  onStartCodeEdit: () => void;
  onFinishCodeEdit: () => void;
  onCodeTemplateChange: (value: string) => void;
  onDragDropCorrectChange: (blankIndex: number, value: string) => void;
  onDragDropDistractorChange: (
    blankIndex: number,
    distractorIndex: number,
    value: string
  ) => void;
  onRemoveDragDropDistractor: (blankIndex: number, distractorIndex: number) => void;
  onShuffleOptions: () => void;
  onAddOption: () => void;
  onWriteCodeInitialCodeChange: (value: string) => void;
  onWriteCodeExpectedAnswerChange: (value: string) => void;
};

const codePanelClassName =
  "mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-[#0f172a] shadow-[0_16px_40px_rgba(15,23,42,0.18)]";

export function GeneratedExerciseEditorCard({
  exercise,
  index,
  isAccepted,
  isDisabled,
  isEditingCode,
  answerOptions,
  onQuestionChange,
  onDelete,
  onAccept,
  onStartCodeEdit,
  onFinishCodeEdit,
  onCodeTemplateChange,
  onDragDropCorrectChange,
  onDragDropDistractorChange,
  onRemoveDragDropDistractor,
  onShuffleOptions,
  onAddOption,
  onWriteCodeInitialCodeChange,
  onWriteCodeExpectedAnswerChange,
}: GeneratedExerciseEditorCardProps) {
  const { draft } = exercise;

  return (
    <ExerciseEditorCard
      indexLabel={`${index + 1}.`}
      question={draft.content.question}
      questionAriaLabel={`Generated exercise ${index + 1} task`}
      isHighlighted={isAccepted}
      disabled={isDisabled}
      onQuestionChange={onQuestionChange}
      actions={
        <>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDisabled}
            aria-label={`Delete generated exercise ${index + 1}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onAccept}
            disabled={isDisabled}
            aria-label={`Confirm generated exercise ${index + 1}`}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isAccepted
                ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.45)]"
                : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-100"
            }`}
          >
            <Check className="h-4 w-4" />
          </button>
        </>
      }
    >
      {draft.type === "drag_drop_code" ? (
        <div className={codePanelClassName}>
          {isEditingCode ? (
            <textarea
              value={formatAuthorCodeTemplate(
                draft.content.code_template,
                draft.content.blanks
              )}
              onChange={(event) => onCodeTemplateChange(event.target.value)}
              onBlur={onFinishCodeEdit}
              disabled={isDisabled}
              autoFocus
              aria-label={`Generated exercise ${index + 1} code`}
              spellCheck={false}
              className="min-h-[11rem] w-full resize-y border-0 bg-transparent px-5 py-5 font-mono text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
            />
          ) : (
            <div
              role="button"
              tabIndex={isDisabled ? -1 : 0}
              onClick={() => {
                if (!isDisabled) {
                  onStartCodeEdit();
                }
              }}
              onKeyDown={(event) => {
                if (!isDisabled && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onStartCodeEdit();
                }
              }}
              className={`block min-h-[11rem] w-full px-5 py-5 text-left font-mono text-sm leading-7 text-slate-100 outline-none transition hover:bg-white/[0.03] ${
                isDisabled ? "cursor-not-allowed opacity-70" : "cursor-text"
              }`}
            >
              {draft.content.code_template.split(BLANK_SPLIT_PATTERN).map((part, partIndex) => {
                if (!BLANK_FRAGMENT_PATTERN.test(part)) {
                  return (
                    <span key={`generated-code-${partIndex}`} className="whitespace-pre-wrap">
                      {part}
                    </span>
                  );
                }

                const blankIndex = draft.content.code_template
                  .split(BLANK_SPLIT_PATTERN)
                  .slice(0, partIndex)
                  .filter((previousPart) => BLANK_FRAGMENT_PATTERN.test(previousPart)).length;
                const blank = draft.content.blanks?.[blankIndex];

                return (
                  <input
                    key={`generated-blank-${partIndex}`}
                    value={blank?.correct ?? ""}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      onDragDropCorrectChange(blankIndex, event.target.value)
                    }
                    disabled={isDisabled || !blank}
                    aria-label={`Correct answer ${blankIndex + 1}`}
                    style={{
                      width: getInlineBlankWidth(blank?.correct ?? "", 5),
                    }}
                    className="mx-1 inline-flex min-w-[4.5rem] rounded-lg border border-orange-300 bg-orange-200/15 px-2.5 py-1 font-mono text-sm font-semibold text-orange-100 outline-none transition focus:border-orange-200 focus:bg-orange-300/20 disabled:cursor-not-allowed"
                    placeholder={`Blank ${blankIndex + 1}`}
                  />
                );
              })}
            </div>
          )}

          <div className="border-t border-white/10 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {answerOptions.map((option) =>
                  option.kind === "correct" ? (
                    <span
                      key={option.key}
                      className="inline-flex min-h-9 max-w-full items-center rounded-full border border-orange-300 bg-white px-3 py-1.5 font-mono text-sm font-semibold text-orange-700"
                    >
                      {option.blank.correct || `Answer ${option.blankIndex + 1}`}
                    </span>
                  ) : (
                    <span
                      key={option.key}
                      className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-orange-300 bg-white px-3 py-1.5"
                    >
                      <input
                        value={
                          option.distractorIndex !== undefined
                            ? option.blank.distractors[option.distractorIndex] ?? ""
                            : ""
                        }
                        onChange={(event) => {
                          if (option.distractorIndex === undefined) {
                            return;
                          }

                          onDragDropDistractorChange(
                            option.blankIndex,
                            option.distractorIndex,
                            event.target.value
                          );
                        }}
                        disabled={isDisabled}
                        style={{
                          width: getChipInputWidth(
                            option.distractorIndex !== undefined
                              ? option.blank.distractors[option.distractorIndex] ?? ""
                              : "",
                            8
                          ),
                        }}
                        className="min-w-0 bg-transparent font-mono text-sm font-semibold text-orange-700 outline-none placeholder:text-orange-300 disabled:cursor-not-allowed"
                        placeholder="Option"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (option.distractorIndex === undefined) {
                            return;
                          }

                          onRemoveDragDropDistractor(
                            option.blankIndex,
                            option.distractorIndex
                          );
                        }}
                        disabled={isDisabled}
                        className="text-xs font-bold text-orange-500 transition hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        x
                      </button>
                    </span>
                  )
                )}
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={onShuffleOptions}
                  disabled={isDisabled || (draft.content.blanks ?? []).length === 0}
                  aria-label="Shuffle answer options"
                  className="inline-flex min-h-9 w-9 items-center justify-center rounded-full border border-orange-300 bg-white text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Shuffle className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={onAddOption}
                  disabled={isDisabled || (draft.content.blanks ?? []).length === 0}
                  className="inline-flex min-h-9 items-center rounded-full border border-orange-300 bg-white px-4 py-1.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Add option
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={codePanelClassName}>
          <textarea
            value={draft.content.initial_code}
            onChange={(event) => onWriteCodeInitialCodeChange(event.target.value)}
            disabled={isDisabled}
            aria-label={`Generated exercise ${index + 1} starter code`}
            spellCheck={false}
            className="min-h-[11rem] w-full resize-y border-0 bg-transparent px-5 py-5 font-mono text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
          />

          <div className="border-t border-white/10 px-5 py-4">
            {hasWriteCodeAnswerSlot(draft.content.initial_code) ? (
              <div className="overflow-x-auto font-mono text-sm leading-7 text-slate-100">
                {draft.content.initial_code
                  .split(WRITE_CODE_SLOT_SPLIT_PATTERN)
                  .map((part, partIndex) =>
                    WRITE_CODE_SLOT_FRAGMENT_PATTERN.test(part) ? (
                      <input
                        key={`generated-write-code-slot-${partIndex}`}
                        value={draft.content.expected_answer}
                        onChange={(event) => onWriteCodeExpectedAnswerChange(event.target.value)}
                        disabled={isDisabled}
                        aria-label="Expected answer"
                        style={{
                          width: getInlineBlankWidth(draft.content.expected_answer, 6),
                        }}
                        className="mx-1 inline-flex min-w-[4.5rem] rounded-lg border border-orange-300 bg-orange-200/15 px-2.5 py-1 font-mono text-sm font-semibold text-orange-100 outline-none transition focus:border-orange-200 focus:bg-orange-300/20 disabled:cursor-not-allowed"
                        placeholder="Answer"
                      />
                    ) : (
                      <span
                        key={`generated-write-code-${partIndex}`}
                        className="whitespace-pre-wrap"
                      >
                        {part}
                      </span>
                    )
                  )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-slate-400">
                  Add <code>{"{{answer}}"}</code> to show the blank in the code.
                </p>
                <Input
                  value={draft.content.expected_answer}
                  onChange={(event) => onWriteCodeExpectedAnswerChange(event.target.value)}
                  disabled={isDisabled}
                  className="h-10 w-full max-w-xs rounded-full border-orange-300 bg-white px-4 font-mono text-sm font-semibold text-orange-700 focus:border-orange-300 focus:ring-orange-100"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </ExerciseEditorCard>
  );
}
