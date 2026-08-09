import type { Dispatch, RefObject, SetStateAction } from "react";
import type { ConfirmDialogContextValue } from "../../../../../components/ui/confirmDialogContext";
import type { ExerciseEditorDraft } from "../types/courseBuilderUiTypes";
import {
  AUTHOR_BLANK_TOKEN,
  WRITE_CODE_SLOT_TOKEN,
  createEmptyDraftForType,
  hasMeaningfulExerciseDraft,
  hasWriteCodeAnswerSlot,
  normalizeDraft,
} from "./exerciseCreateModalUtils";
import {
  withBlankCorrect,
  withBlankUpdated,
  withDistractorAdded,
  withDistractorChanged,
  withDistractorRemoved,
  withDragDropContent,
  withQuestion,
  withWriteCodeContent,
} from "./exerciseDraftUpdates";

const insertSnippetIntoEditor = (
  textarea: HTMLTextAreaElement | null,
  currentValue: string,
  snippet: string,
  onApply: (nextValue: string) => void
) => {
  const selectionStart = textarea?.selectionStart ?? currentValue.length;
  const selectionEnd = textarea?.selectionEnd ?? currentValue.length;
  const nextValue = `${currentValue.slice(0, selectionStart)}${snippet}${currentValue.slice(
    selectionEnd
  )}`;
  const nextCursorPosition = selectionStart + snippet.length;

  onApply(nextValue);

  requestAnimationFrame(() => {
    textarea?.focus();
    textarea?.setSelectionRange(nextCursorPosition, nextCursorPosition);
  });
};

// Plain handler factory — owns no state; the hook passes its state + setters in.
type ManualExerciseHandlerDeps = {
  // Passed in rather than read from context: this is a plain factory, not a hook.
  confirm: ConfirmDialogContextValue["confirm"];
  draft: ExerciseEditorDraft;
  updateDraft: (updater: (currentDraft: ExerciseEditorDraft) => ExerciseEditorDraft) => void;
  setDraft: Dispatch<SetStateAction<ExerciseEditorDraft>>;
  setAiError: Dispatch<SetStateAction<string>>;
  setIsExerciseTypeSelected: Dispatch<SetStateAction<boolean>>;
  dragDropEditorRef: RefObject<HTMLTextAreaElement | null>;
  writeCodeEditorRef: RefObject<HTMLTextAreaElement | null>;
};

export function createManualExerciseHandlers({
  confirm,
  draft,
  updateDraft,
  setDraft,
  setAiError,
  setIsExerciseTypeSelected,
  dragDropEditorRef,
  writeCodeEditorRef,
}: ManualExerciseHandlerDeps) {
  const updateDragDropBlank = (
    blankIndex: number,
    updater: Parameters<typeof withBlankUpdated>[2]
  ) => {
    updateDraft((currentDraft) =>
      withDragDropContent(currentDraft, (content) =>
        withBlankUpdated(content, blankIndex, updater)
      )
    );
  };

  const handleQuestionChange = (value: string) => {
    setAiError("");
    updateDraft((currentDraft) => withQuestion(currentDraft, value));
  };

  const handleResetManualExercise = async (confirmationMessage: string) => {
    if (hasMeaningfulExerciseDraft(draft)) {
      const shouldReset = await confirm({
        title: confirmationMessage,
        description: "Введені дані вправи буде очищено.",
        confirmLabel: "Очистити",
        tone: "danger",
      });

      if (!shouldReset) {
        return;
      }
    }

    setAiError("");
    setIsExerciseTypeSelected(true);
    setDraft(
      normalizeDraft(
        draft.type === "drag_drop_code"
          ? createEmptyDraftForType("drag_drop_code", draft.afterLessonId)
          : createEmptyDraftForType("write_code", draft.afterLessonId)
      )
    );
  };

  const handleDragDropCodeTemplateChange = (value: string) => {
    updateDraft((currentDraft) =>
      withDragDropContent(currentDraft, (content) => ({
        ...content,
        code_template: value,
      }))
    );
  };

  const handleDragDropCorrectChange = (blankIndex: number, value: string) => {
    updateDragDropBlank(blankIndex, (blank) => withBlankCorrect(blank, value));
  };

  const handleDragDropDistractorChange = (
    blankIndex: number,
    distractorIndex: number,
    value: string
  ) => {
    updateDragDropBlank(blankIndex, (blank) =>
      withDistractorChanged(blank, distractorIndex, value)
    );
  };

  const handleRemoveDragDropDistractor = (blankIndex: number, distractorIndex: number) => {
    updateDragDropBlank(blankIndex, (blank) => withDistractorRemoved(blank, distractorIndex));
  };

  const handleAddDragDropOption = (blankIndex: number) => {
    updateDragDropBlank(blankIndex, withDistractorAdded);
  };

  const handleInsertDragDropBlank = () => {
    insertSnippetIntoEditor(
      dragDropEditorRef.current,
      draft.type === "drag_drop_code" ? draft.content.code_template : "",
      AUTHOR_BLANK_TOKEN,
      (nextValue) =>
        updateDraft((currentDraft) =>
          withDragDropContent(currentDraft, (content) => ({
            ...content,
            code_template: nextValue,
          }))
        )
    );
  };

  const handleInsertWriteCodeAnswerSlot = () => {
    if (draft.type !== "write_code") {
      return;
    }

    if (hasWriteCodeAnswerSlot(draft.content.initial_code)) {
      writeCodeEditorRef.current?.focus();
      return;
    }

    insertSnippetIntoEditor(
      writeCodeEditorRef.current,
      draft.content.initial_code,
      WRITE_CODE_SLOT_TOKEN,
      (nextValue) =>
        updateDraft((currentDraft) =>
          withWriteCodeContent(currentDraft, (content) => ({
            ...content,
            initial_code: nextValue,
          }))
        )
    );
  };

  const handleWriteCodeInitialCodeChange = (value: string) => {
    updateDraft((currentDraft) =>
      withWriteCodeContent(currentDraft, (content) => ({
        ...content,
        initial_code: value,
      }))
    );
  };

  const handleWriteCodeExpectedAnswerChange = (value: string) => {
    updateDraft((currentDraft) =>
      withWriteCodeContent(currentDraft, (content) => ({
        ...content,
        expected_answer: value,
      }))
    );
  };

  return {
    handleQuestionChange,
    handleResetManualExercise,
    handleDragDropCodeTemplateChange,
    handleDragDropCorrectChange,
    handleDragDropDistractorChange,
    handleRemoveDragDropDistractor,
    handleAddDragDropOption,
    handleInsertDragDropBlank,
    handleInsertWriteCodeAnswerSlot,
    handleWriteCodeInitialCodeChange,
    handleWriteCodeExpectedAnswerChange,
  };
}
