import type { DragDropCodeExerciseBlank, DragDropCodeExerciseContent, WriteCodeExerciseContent } from "../../../api/index";
import type { ExerciseEditorDraft } from "../types/courseBuilderUiTypes";

// Pure draft transformations shared by the manual and AI-generated editors.

export const withDragDropContent = (
  draft: ExerciseEditorDraft,
  updater: (content: DragDropCodeExerciseContent) => DragDropCodeExerciseContent
): ExerciseEditorDraft =>
  draft.type === "drag_drop_code"
    ? { ...draft, content: updater(draft.content) }
    : draft;

export const withWriteCodeContent = (
  draft: ExerciseEditorDraft,
  updater: (content: WriteCodeExerciseContent) => WriteCodeExerciseContent
): ExerciseEditorDraft =>
  draft.type === "write_code"
    ? { ...draft, content: updater(draft.content) }
    : draft;

export const withQuestion = (
  draft: ExerciseEditorDraft,
  value: string
): ExerciseEditorDraft =>
  draft.type === "drag_drop_code"
    ? { ...draft, content: { ...draft.content, question: value } }
    : { ...draft, content: { ...draft.content, question: value } };

export const withBlankUpdated = (
  content: DragDropCodeExerciseContent,
  blankIndex: number,
  updater: (blank: DragDropCodeExerciseBlank) => DragDropCodeExerciseBlank
): DragDropCodeExerciseContent => ({
  ...content,
  blanks: (content.blanks ?? []).map((blank, currentIndex) =>
    currentIndex === blankIndex ? updater(blank) : blank
  ),
});

export const withBlankCorrect = (
  blank: DragDropCodeExerciseBlank,
  value: string
): DragDropCodeExerciseBlank => ({
  ...blank,
  correct: value,
});

export const withDistractorChanged = (
  blank: DragDropCodeExerciseBlank,
  distractorIndex: number,
  value: string
): DragDropCodeExerciseBlank => ({
  ...blank,
  distractors: blank.distractors.map((currentDistractor, currentDistractorIndex) =>
    currentDistractorIndex === distractorIndex ? value : currentDistractor
  ),
});

export const withDistractorRemoved = (
  blank: DragDropCodeExerciseBlank,
  distractorIndex: number
): DragDropCodeExerciseBlank => ({
  ...blank,
  distractors: blank.distractors.filter(
    (_, currentDistractorIndex) => currentDistractorIndex !== distractorIndex
  ),
});

export const withDistractorAdded = (
  blank: DragDropCodeExerciseBlank
): DragDropCodeExerciseBlank => ({
  ...blank,
  distractors: [...blank.distractors, ""],
});
