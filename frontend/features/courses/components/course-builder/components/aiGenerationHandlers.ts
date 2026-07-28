import type { Dispatch, SetStateAction } from "react";
import type { ExerciseDifficulty } from "../../../api/index";
import type {
  ExerciseEditorDraft,
  GeneratedExerciseAiDraft,
} from "../types/courseBuilderUiTypes";
import {
  clampExerciseCount,
  coerceGeneratedExerciseAiDraft,
  hasMeaningfulExerciseDraft,
  normalizeDraft,
} from "./exerciseCreateModalUtils";

// Plain handler factory — owns no state; the hook passes its state + setters in.
type AiGenerationHandlerDeps = {
  draft: ExerciseEditorDraft;
  isAiMode: boolean;
  generatedExercises: GeneratedExerciseAiDraft[];
  selectedDifficulties: ExerciseDifficulty[];
  exerciseCount: number;
  exerciseAiCountLimit: number;
  canAdjustExerciseCount: boolean;
  canSubmitAiGeneration: boolean;
  warnAboutUnconfirmedGeneratedExercise: () => boolean;
  resetAiGenerationState: () => void;
  onGenerateAi: (
    draft: ExerciseEditorDraft,
    options: {
      difficulties: ExerciseDifficulty[];
      count: number;
    }
  ) => Promise<GeneratedExerciseAiDraft[]>;
  setSelectedDifficulties: Dispatch<SetStateAction<ExerciseDifficulty[]>>;
  setExerciseCount: Dispatch<SetStateAction<number>>;
  setExerciseCountLimitError: Dispatch<SetStateAction<boolean>>;
  setAiError: Dispatch<SetStateAction<string>>;
  setIsGeneratingAi: Dispatch<SetStateAction<boolean>>;
  setGeneratedExercises: Dispatch<SetStateAction<GeneratedExerciseAiDraft[]>>;
  setSelectedGeneratedExerciseId: Dispatch<SetStateAction<string | null>>;
  setAcceptedGeneratedExerciseId: Dispatch<SetStateAction<string | null>>;
  setEditingGeneratedCodeExerciseId: Dispatch<SetStateAction<string | null>>;
  setGeneratedOptionOrderByExerciseId: Dispatch<SetStateAction<Record<string, string[]>>>;
  setDraft: Dispatch<SetStateAction<ExerciseEditorDraft>>;
};

export function createAiGenerationHandlers({
  draft,
  isAiMode,
  generatedExercises,
  selectedDifficulties,
  exerciseCount,
  exerciseAiCountLimit,
  canAdjustExerciseCount,
  canSubmitAiGeneration,
  warnAboutUnconfirmedGeneratedExercise,
  resetAiGenerationState,
  onGenerateAi,
  setSelectedDifficulties,
  setExerciseCount,
  setExerciseCountLimitError,
  setAiError,
  setIsGeneratingAi,
  setGeneratedExercises,
  setSelectedGeneratedExerciseId,
  setAcceptedGeneratedExerciseId,
  setEditingGeneratedCodeExerciseId,
  setGeneratedOptionOrderByExerciseId,
  setDraft,
}: AiGenerationHandlerDeps) {
  const handleDifficultyToggle = (difficulty: ExerciseDifficulty) => {
    if (
      selectedDifficulties.length === 1 &&
      selectedDifficulties[0] === difficulty
    ) {
      return;
    }

    if (warnAboutUnconfirmedGeneratedExercise()) {
      return;
    }

    resetAiGenerationState();
    setExerciseCountLimitError(false);
    setSelectedDifficulties([difficulty]);
  };

  const applyExerciseCount = (nextValue: number, markLimitError = false) => {
    if (exerciseAiCountLimit <= 0) {
      setExerciseCountLimitError(markLimitError);
      return;
    }

    if (
      (nextValue !== exerciseCount || markLimitError) &&
      warnAboutUnconfirmedGeneratedExercise()
    ) {
      return;
    }

    resetAiGenerationState();
    const safeValue = clampExerciseCount(nextValue, exerciseAiCountLimit);
    setExerciseCountLimitError(markLimitError || nextValue > exerciseAiCountLimit);
    setExerciseCount(safeValue);
  };

  const handleExerciseCountInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");

    if (!digitsOnly) {
      setExerciseCountLimitError(false);
      return;
    }

    const parsedValue = Number(digitsOnly);

    if (parsedValue > exerciseAiCountLimit && exerciseAiCountLimit > 0) {
      applyExerciseCount(exerciseAiCountLimit, true);
      return;
    }

    applyExerciseCount(parsedValue);
  };

  const handleIncreaseExerciseCount = () => {
    if (!canAdjustExerciseCount) {
      return;
    }

    if (exerciseCount >= exerciseAiCountLimit) {
      setExerciseCountLimitError(true);
      return;
    }

    applyExerciseCount(exerciseCount + 1);
  };

  const handleDecreaseExerciseCount = () => {
    if (!canAdjustExerciseCount) {
      return;
    }

    applyExerciseCount(exerciseCount - 1);
  };

  const handleGenerateAi = async () => {
    if (!canSubmitAiGeneration) {
      return;
    }

    if (warnAboutUnconfirmedGeneratedExercise()) {
      return;
    }

    const shouldConfirmReplace =
      hasMeaningfulExerciseDraft(draft) && (!isAiMode || generatedExercises.length === 0);

    if (
      shouldConfirmReplace &&
      !window.confirm("Замінити поточну вправу AI-згенерованим контентом?")
    ) {
      return;
    }

    try {
      setAiError("");
      setIsGeneratingAi(true);
      const nextExercises = await onGenerateAi(normalizeDraft(draft), {
        difficulties: selectedDifficulties,
        count: exerciseCount,
      });
      const normalizedExercises = nextExercises
        .map((exercise) => coerceGeneratedExerciseAiDraft(exercise))
        .filter((exercise): exercise is GeneratedExerciseAiDraft => exercise !== null);

      if (normalizedExercises.length === 0) {
        throw new Error("AI повернув некоректні дані вправи.");
      }

      setGeneratedExercises(normalizedExercises);

      const firstExercise = normalizedExercises[0];

      if (firstExercise) {
        setSelectedGeneratedExerciseId(firstExercise.id);
        setAcceptedGeneratedExerciseId(null);
        setEditingGeneratedCodeExerciseId(null);
        setGeneratedOptionOrderByExerciseId({});
        setDraft(normalizeDraft(firstExercise.draft));
      } else {
        setSelectedGeneratedExerciseId(null);
        setAcceptedGeneratedExerciseId(null);
        setEditingGeneratedCodeExerciseId(null);
        setGeneratedOptionOrderByExerciseId({});
      }
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setAiError(error.message);
      } else {
        setAiError("Не вдалося згенерувати вправу з AI.");
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleGenerateAiClick = () => {
    void handleGenerateAi();
  };

  return {
    handleDifficultyToggle,
    handleExerciseCountInputChange,
    handleIncreaseExerciseCount,
    handleDecreaseExerciseCount,
    handleGenerateAiClick,
  };
}
