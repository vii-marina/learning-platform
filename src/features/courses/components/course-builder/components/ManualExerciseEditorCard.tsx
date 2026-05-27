import type { RefObject } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import type { ExerciseEditorDraft } from "../types/courseBuilderUiTypes";
import { ExerciseEditorCard } from "./ExerciseEditorCard";
import {
  AUTHOR_BLANK_TOKEN,
  BLANK_FRAGMENT_PATTERN,
  BLANK_SPLIT_PATTERN,
  WRITE_CODE_SLOT_FRAGMENT_PATTERN,
  WRITE_CODE_SLOT_SPLIT_PATTERN,
  WRITE_CODE_SLOT_TOKEN,
  countBlankPlaceholders,
  getChipInputWidth,
  getInlineBlankWidth,
  hasWriteCodeAnswerSlot,
} from "./exerciseCreateModalUtils";

type ManualExerciseEditorCardProps = {
  draft: ExerciseEditorDraft;
  isConfirmed: boolean;
  canConfirm: boolean;
  disabled: boolean;
  dragDropEditorRef: RefObject<HTMLTextAreaElement | null>;
  writeCodeEditorRef: RefObject<HTMLTextAreaElement | null>;
  onQuestionChange: (value: string) => void;
  onReset: () => void;
  onToggleConfirm: () => void;
  onInsertDragDropBlank: () => void;
  onDragDropCodeTemplateChange: (value: string) => void;
  onDragDropCorrectChange: (blankIndex: number, value: string) => void;
  onDragDropDistractorChange: (
    blankIndex: number,
    distractorIndex: number,
    value: string
  ) => void;
  onRemoveDragDropDistractor: (blankIndex: number, distractorIndex: number) => void;
  onAddDragDropOption: (blankIndex: number) => void;
  onInsertWriteCodeAnswerSlot: () => void;
  onWriteCodeInitialCodeChange: (value: string) => void;
  onWriteCodeExpectedAnswerChange: (value: string) => void;
  showCreateAnotherButton: boolean;
  onCreateAnother: () => void;
};

const codePanelClassName =
  "mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-[#0f172a] shadow-[0_16px_40px_rgba(15,23,42,0.18)]";
const codePanelToolbarButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-full border border-orange-300 bg-white px-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50";
const actionButtonClassName =
  "h-10 rounded-xl !border-orange-300 !bg-orange-500 px-5 text-sm font-semibold !text-white shadow-[0_0_18px_rgba(249,115,22,0.55),0_0_34px_rgba(251,146,60,0.24)] hover:!bg-orange-600 hover:shadow-[0_0_22px_rgba(249,115,22,0.7),0_0_42px_rgba(251,146,60,0.34)] disabled:shadow-none";

export function ManualExerciseEditorCard({
  draft,
  isConfirmed,
  canConfirm,
  disabled,
  dragDropEditorRef,
  writeCodeEditorRef,
  onQuestionChange,
  onReset,
  onToggleConfirm,
  onInsertDragDropBlank,
  onDragDropCodeTemplateChange,
  onDragDropCorrectChange,
  onDragDropDistractorChange,
  onRemoveDragDropDistractor,
  onAddDragDropOption,
  onInsertWriteCodeAnswerSlot,
  onWriteCodeInitialCodeChange,
  onWriteCodeExpectedAnswerChange,
  showCreateAnotherButton,
  onCreateAnother,
}: ManualExerciseEditorCardProps) {
  return (
    <div className="space-y-4">
      <ExerciseEditorCard
        indexLabel="1."
        question={draft.content.question}
        questionAriaLabel="Exercise task"
        isHighlighted={isConfirmed}
        disabled={disabled}
        onQuestionChange={onQuestionChange}
        actions={
          <>
            <button
              type="button"
              onClick={onReset}
              disabled={disabled}
              aria-label="Очистити вправу, створену вручну"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onToggleConfirm}
              disabled={!canConfirm}
              aria-label="Підтвердити вправу, створену вручну"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isConfirmed
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <p className="text-sm font-semibold text-slate-200">Шаблон коду</p>
              <button
                type="button"
                onClick={onInsertDragDropBlank}
                className={codePanelToolbarButtonClassName}
                disabled={disabled}
              >
                <Plus className="h-4 w-4" />
                Add Blank
              </button>
            </div>

            <textarea
              ref={dragDropEditorRef}
              value={draft.content.code_template}
              onChange={(event) => onDragDropCodeTemplateChange(event.target.value)}
              disabled={disabled}
              className="min-h-[11rem] w-full resize-y border-0 bg-transparent px-5 py-5 font-mono text-sm leading-7 text-slate-900 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
              placeholder={`Example:\nprint(${AUTHOR_BLANK_TOKEN})`}
              spellCheck={false}
            />

            <div className="border-t border-white/10 px-5 py-4">
              {countBlankPlaceholders(draft.content.code_template) > 0 ? (
                <div className="overflow-x-auto font-mono text-sm leading-7 text-slate-100">
                  {(() => {
                    let blankIndex = 0;

                    return draft.content.code_template
                      .split(BLANK_SPLIT_PATTERN)
                      .map((part, partIndex) => {
                        if (!BLANK_FRAGMENT_PATTERN.test(part)) {
                          return (
                            <span
                              key={`manual-drag-code-${partIndex}`}
                              className="whitespace-pre-wrap"
                            >
                              {part}
                            </span>
                          );
                        }

                        const currentBlankIndex = blankIndex;
                        blankIndex += 1;
                        const blank = draft.content.blanks?.[currentBlankIndex];

                        return (
                          <input
                            key={`manual-drag-blank-${partIndex}`}
                            value={blank?.correct ?? ""}
                            onChange={(event) =>
                              onDragDropCorrectChange(
                                currentBlankIndex,
                                event.target.value
                              )
                            }
                            disabled={disabled || !blank}
                            aria-label={`Correct answer ${currentBlankIndex + 1}`}
                            style={{
                              width: getInlineBlankWidth(blank?.correct ?? "", 5),
                            }}
                            className="mx-1 inline-flex min-w-[4.5rem] rounded-lg border border-orange-300 bg-orange-200/15 px-2.5 py-1 font-mono text-sm font-semibold text-orange-100 outline-none transition focus:border-orange-200 focus:bg-orange-300/20 disabled:cursor-not-allowed"
                            placeholder={`Blank ${currentBlankIndex + 1}`}
                          />
                        );
                      });
                  })()}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Click “Add Blank” to insert `___` into the code.
                </p>
              )}
            </div>

            <div className="border-t border-white/10 px-5 py-4">
              
                <div className="space-y-4">
                  {(draft.content.blanks ?? []).map((blank, index) => (
                    <div key={blank.id} className="flex flex-wrap items-start gap-3">
                      <span className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-orange-600">
                        {index + 1}
                      </span>

                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        {blank.distractors.map((distractor, distractorIndex) => (
                          <span
                            key={`${blank.id}-distractor-${distractorIndex}`}
                            className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-orange-300 bg-white px-3 py-1.5"
                          >
                            <input
                              value={distractor}
                              onChange={(event) =>
                                onDragDropDistractorChange(
                                  index,
                                  distractorIndex,
                                  event.target.value
                                )
                              }
                              disabled={disabled}
                              style={{
                                width: getChipInputWidth(distractor, 8),
                              }}
                              className="min-w-0 bg-transparent font-mono text-sm font-semibold text-orange-700 outline-none placeholder:text-orange-300 disabled:cursor-not-allowed"
                              placeholder="Варіант"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                onRemoveDragDropDistractor(index, distractorIndex)
                              }
                              disabled={disabled}
                              className="text-xs font-bold text-orange-500 transition hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              x
                            </button>
                          </span>
                        ))}

                        <button
                          type="button"
                          onClick={() => onAddDragDropOption(index)}
                          disabled={disabled}
                          className="inline-flex min-h-9 items-center rounded-full border border-orange-300 bg-white px-4 py-1.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          + Add option
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
             
            </div>
          </div>
        ) : (
          <div className={codePanelClassName}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <p className="text-sm font-semibold text-slate-200">Початковий код</p>
              <button
                type="button"
                onClick={onInsertWriteCodeAnswerSlot}
                className={codePanelToolbarButtonClassName}
                disabled={disabled}
              >
                <Plus className="h-4 w-4" />
                Insert Answer Slot
              </button>
            </div>

            <textarea
              ref={writeCodeEditorRef}
              value={draft.content.initial_code}
              onChange={(event) => onWriteCodeInitialCodeChange(event.target.value)}
              disabled={disabled}
              className="min-h-[11rem] w-full resize-y border-0 bg-transparent px-5 py-5 font-mono text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
              placeholder={`Example:\nreturn ${WRITE_CODE_SLOT_TOKEN}`}
              spellCheck={false}
            />

            <div className="border-t border-white/10 px-5 py-4">
              {hasWriteCodeAnswerSlot(draft.content.initial_code) ? (
                <div className="overflow-x-auto font-mono text-sm leading-7 text-slate-100">
                  {draft.content.initial_code
                    .split(WRITE_CODE_SLOT_SPLIT_PATTERN)
                    .map((part, partIndex) =>
                      WRITE_CODE_SLOT_FRAGMENT_PATTERN.test(part) ? (
                        <input
                          key={`manual-write-code-slot-${partIndex}`}
                          value={draft.content.expected_answer}
                          onChange={(event) =>
                            onWriteCodeExpectedAnswerChange(event.target.value)
                          }
                          disabled={disabled}
                          aria-label="Очікувана відповідь"
                          style={{
                            width: getInlineBlankWidth(draft.content.expected_answer, 6),
                          }}
                          className="mx-1 inline-flex min-w-[4.5rem] rounded-lg border border-orange-300 bg-orange-200/15 px-2.5 py-1 font-mono text-sm font-semibold text-orange-100 outline-none transition focus:border-orange-200 focus:bg-orange-300/20 disabled:cursor-not-allowed"
                          placeholder="Відповідь"
                        />
                      ) : (
                        <span
                          key={`manual-write-code-${partIndex}`}
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
                    Click “Insert Answer Slot” to add the blank the student should fill in.
                  </p>
                  <Input
                    value={draft.content.expected_answer}
                    onChange={(event) => onWriteCodeExpectedAnswerChange(event.target.value)}
                    disabled={disabled}
                    className="h-10 w-full max-w-xs rounded-full border-orange-300 bg-white px-4 font-mono text-sm font-semibold text-orange-700 focus:border-orange-300 focus:ring-orange-100"
                    placeholder="Очікувана відповідь"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </ExerciseEditorCard>

      {showCreateAnotherButton ? (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onCreateAnother}
            disabled={disabled}
            className={actionButtonClassName}
          >
            Create another exercise
          </Button>
        </div>
      ) : null}
    </div>
  );
}
