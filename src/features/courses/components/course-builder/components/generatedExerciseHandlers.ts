import type { Dispatch, SetStateAction } from "react";
import type {
  DragDropCodeExerciseContent,
  WriteCodeExerciseContent,
} from "../../../api/index";
import type {
  ExerciseEditorDraft,
  GeneratedExerciseAiDraft,
} from "../types/courseBuilderUiTypes";
import {
  getGeneratedAnswerOptionItems,
  normalizeDraft,
  shuffleValues,
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

// Plain handler factory — owns no state; the hook passes its state + setters in.
type GeneratedExerciseHandlerDeps = {
  generatedExercises: GeneratedExerciseAiDraft[];
  selectedGeneratedExerciseId: string | null;
  isLocked: boolean;
  setGeneratedExercises: Dispatch<SetStateAction<GeneratedExerciseAiDraft[]>>;
  setSelectedGeneratedExerciseId: Dispatch<SetStateAction<string | null>>;
  setAcceptedGeneratedExerciseId: Dispatch<SetStateAction<string | null>>;
  setEditingGeneratedCodeExerciseId: Dispatch<SetStateAction<string | null>>;
  setGeneratedOptionOrderByExerciseId: Dispatch<SetStateAction<Record<string, string[]>>>;
  setDraft: Dispatch<SetStateAction<ExerciseEditorDraft>>;
  setAiError: Dispatch<SetStateAction<string>>;
};

export function createGeneratedExerciseHandlers({
  generatedExercises,
  selectedGeneratedExerciseId,
  isLocked,
  setGeneratedExercises,
  setSelectedGeneratedExerciseId,
  setAcceptedGeneratedExerciseId,
  setEditingGeneratedCodeExerciseId,
  setGeneratedOptionOrderByExerciseId,
  setDraft,
  setAiError,
}: GeneratedExerciseHandlerDeps) {
  const handleAcceptGeneratedExercise = (generatedExerciseId: string) => {
    if (isLocked) {
      return;
    }

    const acceptedExercise = generatedExercises.find(
      (exercise) => exercise.id === generatedExerciseId
    );

    if (!acceptedExercise) {
      return;
    }

    setSelectedGeneratedExerciseId(generatedExerciseId);
    setAcceptedGeneratedExerciseId(generatedExerciseId);
    setDraft(normalizeDraft(acceptedExercise.draft));
    setAiError("");
  };

  const handleDeleteGeneratedExercise = (generatedExerciseId: string) => {
    if (isLocked) {
      return;
    }

    const remainingExercises = generatedExercises.filter(
      (exercise) => exercise.id !== generatedExerciseId
    );
    const nextSelectedExercise = remainingExercises[0] ?? null;

    setGeneratedExercises(remainingExercises);

    if (selectedGeneratedExerciseId === generatedExerciseId) {
      setSelectedGeneratedExerciseId(nextSelectedExercise?.id ?? null);

      if (nextSelectedExercise) {
        setDraft(normalizeDraft(nextSelectedExercise.draft));
      }
    }

    setAcceptedGeneratedExerciseId((currentAcceptedId) =>
      currentAcceptedId === generatedExerciseId ? null : currentAcceptedId
    );
    setEditingGeneratedCodeExerciseId((currentEditingId) =>
      currentEditingId === generatedExerciseId ? null : currentEditingId
    );
    setGeneratedOptionOrderByExerciseId((currentOrders) => {
      const remainingOrders = { ...currentOrders };
      delete remainingOrders[generatedExerciseId];
      return remainingOrders;
    });
    setAiError("");
  };

  const updateGeneratedExerciseDraft = (
    generatedExerciseId: string,
    updater: (currentDraft: ExerciseEditorDraft) => ExerciseEditorDraft
  ) => {
    const currentExercise = generatedExercises.find(
      (exercise) => exercise.id === generatedExerciseId
    );

    if (!currentExercise) {
      return;
    }

    const nextDraft = normalizeDraft(updater(currentExercise.draft));

    setGeneratedExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.id === generatedExerciseId
          ? {
              ...exercise,
              draft: nextDraft,
            }
          : exercise
      )
    );
    setSelectedGeneratedExerciseId(generatedExerciseId);
    setAcceptedGeneratedExerciseId((currentAcceptedId) =>
      currentAcceptedId === generatedExerciseId ? null : currentAcceptedId
    );
    setDraft(nextDraft);
    setAiError("");
  };

  const updateGeneratedDragDropContent = (
    generatedExerciseId: string,
    updater: (content: DragDropCodeExerciseContent) => DragDropCodeExerciseContent
  ) => {
    updateGeneratedExerciseDraft(generatedExerciseId, (currentDraft) =>
      withDragDropContent(currentDraft, updater)
    );
  };

  const updateGeneratedWriteCodeContent = (
    generatedExerciseId: string,
    updater: (content: WriteCodeExerciseContent) => WriteCodeExerciseContent
  ) => {
    updateGeneratedExerciseDraft(generatedExerciseId, (currentDraft) =>
      withWriteCodeContent(currentDraft, updater)
    );
  };

  const handleGeneratedQuestionChange = (generatedExerciseId: string, value: string) => {
    updateGeneratedExerciseDraft(generatedExerciseId, (currentDraft) =>
      withQuestion(currentDraft, value)
    );
  };

  const handleGeneratedCodeTemplateChange = (generatedExerciseId: string, value: string) => {
    updateGeneratedDragDropContent(generatedExerciseId, (content) => ({
      ...content,
      code_template: value,
    }));
  };

  const handleGeneratedDragDropCorrectChange = (
    generatedExerciseId: string,
    blankIndex: number,
    value: string
  ) => {
    updateGeneratedDragDropContent(generatedExerciseId, (content) =>
      withBlankUpdated(content, blankIndex, (blank) => withBlankCorrect(blank, value))
    );
  };

  const handleGeneratedDragDropDistractorChange = (
    generatedExerciseId: string,
    blankIndex: number,
    distractorIndex: number,
    value: string
  ) => {
    updateGeneratedDragDropContent(generatedExerciseId, (content) =>
      withBlankUpdated(content, blankIndex, (blank) =>
        withDistractorChanged(blank, distractorIndex, value)
      )
    );
  };

  const handleRemoveGeneratedDragDropDistractor = (
    generatedExerciseId: string,
    blankIndex: number,
    distractorIndex: number
  ) => {
    updateGeneratedDragDropContent(generatedExerciseId, (content) =>
      withBlankUpdated(content, blankIndex, (blank) =>
        withDistractorRemoved(blank, distractorIndex)
      )
    );
  };

  const handleGeneratedWriteCodeInitialCodeChange = (
    generatedExerciseId: string,
    value: string
  ) => {
    updateGeneratedWriteCodeContent(generatedExerciseId, (content) => ({
      ...content,
      initial_code: value,
    }));
  };

  const handleGeneratedWriteCodeExpectedAnswerChange = (
    generatedExerciseId: string,
    value: string
  ) => {
    updateGeneratedWriteCodeContent(generatedExerciseId, (content) => ({
      ...content,
      expected_answer: value,
    }));
  };

  const handleAddGeneratedOption = (generatedExerciseId: string) => {
    const generatedExercise = generatedExercises.find(
      (exercise) => exercise.id === generatedExerciseId
    );

    if (
      !generatedExercise ||
      generatedExercise.draft.type !== "drag_drop_code" ||
      (generatedExercise.draft.content.blanks ?? []).length === 0
    ) {
      return;
    }

    updateGeneratedDragDropContent(generatedExerciseId, (content) =>
      withBlankUpdated(content, 0, withDistractorAdded)
    );
  };

  const handleShuffleGeneratedOptions = (generatedExerciseId: string) => {
    const generatedExercise = generatedExercises.find(
      (exercise) => exercise.id === generatedExerciseId
    );

    if (!generatedExercise || generatedExercise.draft.type !== "drag_drop_code") {
      return;
    }

    const optionKeys = getGeneratedAnswerOptionItems(
      generatedExercise.draft.content.blanks ?? []
    ).map((option) => option.key);

    setGeneratedOptionOrderByExerciseId((currentOrders) => ({
      ...currentOrders,
      [generatedExerciseId]: shuffleValues(optionKeys),
    }));
  };

  const startGeneratedCodeEdit = (generatedExerciseId: string) => {
    setEditingGeneratedCodeExerciseId(generatedExerciseId);
  };

  const finishGeneratedCodeEdit = () => {
    setEditingGeneratedCodeExerciseId(null);
  };

  return {
    handleAcceptGeneratedExercise,
    handleDeleteGeneratedExercise,
    handleGeneratedQuestionChange,
    handleGeneratedCodeTemplateChange,
    handleGeneratedDragDropCorrectChange,
    handleGeneratedDragDropDistractorChange,
    handleRemoveGeneratedDragDropDistractor,
    handleGeneratedWriteCodeInitialCodeChange,
    handleGeneratedWriteCodeExpectedAnswerChange,
    handleAddGeneratedOption,
    handleShuffleGeneratedOptions,
    startGeneratedCodeEdit,
    finishGeneratedCodeEdit,
  };
}
