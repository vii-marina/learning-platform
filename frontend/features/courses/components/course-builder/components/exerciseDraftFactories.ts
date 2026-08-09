/** Empty content and draft factories, one per exercise type. */

import { DEFAULT_EXERCISE_TITLES } from "./exerciseTemplateTokens";
import type { DragDropCodeExerciseContent, ExerciseType, WriteCodeExerciseContent } from "../../../api/index";
import type { ExerciseEditorDraft } from "../types/courseBuilderUiTypes";

export function createEmptyDragDropContent(question = ""): DragDropCodeExerciseContent {
  return {
    type: "drag_drop_code",
    question,
    code_template: "",
    tokens: [],
    correct_answer: [],
    blanks: [],
  };
}

export function createEmptyWriteCodeContent(question = ""): WriteCodeExerciseContent {
  return {
    type: "write_code",
    question,
    initial_code: "",
    expected_answer: "",
    match_mode: "strict",
  };
}

export function createEmptyDraftForType(
  type: "drag_drop_code",
  afterLessonId?: string | null
): Extract<ExerciseEditorDraft, { type: "drag_drop_code" }>;
export function createEmptyDraftForType(
  type: "write_code",
  afterLessonId?: string | null
): Extract<ExerciseEditorDraft, { type: "write_code" }>;
export function createEmptyDraftForType(
  type: ExerciseType,
  afterLessonId: string | null = null
): ExerciseEditorDraft {
  if (type === "drag_drop_code") {
    return {
      afterLessonId,
      type: "drag_drop_code",
      title: DEFAULT_EXERCISE_TITLES.drag_drop_code,
      description: "",
      content: createEmptyDragDropContent(),
    };
  }

  return {
    afterLessonId,
    type: "write_code",
    title: DEFAULT_EXERCISE_TITLES.write_code,
    description: "",
    content: createEmptyWriteCodeContent(),
  };
}

export function createDefaultDraft(): ExerciseEditorDraft {
  return createEmptyDraftForType("drag_drop_code");
}
