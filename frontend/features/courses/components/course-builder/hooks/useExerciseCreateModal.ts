import { useEffect, useRef, useState } from "react";
import { getExerciseAiGenerationLimit } from "../../../api/index";
import type {
  ExerciseDifficulty,
  ExerciseType,
  Lesson,
} from "../../../api/index";
import type {
  ExerciseEditorDraft,
  GeneratedExerciseAiDraft,
} from "../types/courseBuilderUiTypes";
import { type CreateContentMode } from "../lib/courseBuilderPageUtils";
import { createAiGenerationHandlers } from "../components/aiGenerationHandlers";
import { createGeneratedExerciseHandlers } from "../components/generatedExerciseHandlers";
import { createManualExerciseHandlers } from "../components/manualExerciseHandlers";
import {
  DEFAULT_EXERCISE_TITLES,
  EXERCISE_COUNT_MIN,
  clampExerciseCount,
  createDefaultDraft,
  createEmptyDragDropContent,
  createEmptyWriteCodeContent,
  getExerciseValidationMessage,
  normalizeDraft,
  sanitizeExerciseDraftForSave,
} from "../components/exerciseCreateModalUtils";
import { useAiDraftPersistence } from "./useAiDraftPersistence";

type UseExerciseCreateModalInput = {
  isOpen: boolean;
  initialMode: CreateContentMode | null;
  courseTitle: string;
  activeModuleId: string | null;
  activeExerciseId: string | null;
  lessons: Lesson[];
  initialDraft: ExerciseEditorDraft | null;
  isSaving: boolean;
  onGenerateAi: (
    draft: ExerciseEditorDraft,
    options: {
      difficulties: ExerciseDifficulty[];
      count: number;
    }
  ) => Promise<GeneratedExerciseAiDraft[]>;
  onSave: (draft: ExerciseEditorDraft) => void;
  onClose: () => void;
};

export function useExerciseCreateModal({
  isOpen,
  initialMode,
  courseTitle,
  activeModuleId,
  activeExerciseId,
  lessons,
  initialDraft,
  isSaving,
  onGenerateAi,
  onSave,
  onClose,
}: UseExerciseCreateModalInput) {
  const [creationMode, setCreationMode] = useState<CreateContentMode | null>(initialMode);
  const [isExerciseTypeSelected, setIsExerciseTypeSelected] = useState(
    activeExerciseId !== null
  );
  const [draft, setDraft] = useState<ExerciseEditorDraft>(() =>
    normalizeDraft(initialDraft ?? createDefaultDraft())
  );
  const [selectedDifficulties, setSelectedDifficulties] = useState<ExerciseDifficulty[]>([]);
  const [exerciseCount, setExerciseCount] = useState(EXERCISE_COUNT_MIN);
  const [exerciseCountLimitError, setExerciseCountLimitError] = useState(false);
  const [generatedExercises, setGeneratedExercises] = useState<GeneratedExerciseAiDraft[]>([]);
  const [selectedGeneratedExerciseId, setSelectedGeneratedExerciseId] = useState<string | null>(
    null
  );
  const [acceptedGeneratedExerciseId, setAcceptedGeneratedExerciseId] = useState<string | null>(
    null
  );
  const [editingGeneratedCodeExerciseId, setEditingGeneratedCodeExerciseId] =
    useState<string | null>(null);
  const [generatedOptionOrderByExerciseId, setGeneratedOptionOrderByExerciseId] = useState<
    Record<string, string[]>
  >({});
  const [isManualExerciseConfirmed, setIsManualExerciseConfirmed] = useState(false);
  const [manualPreviewLessonId, setManualPreviewLessonId] = useState<string | null>(
    lessons[0]?.id ?? null
  );
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");
  const [exerciseAiCountLimit, setExerciseAiCountLimit] = useState(0);
  const [isResolvingAiLimit, setIsResolvingAiLimit] = useState(false);
  const dragDropEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const writeCodeEditorRef = useRef<HTMLTextAreaElement | null>(null);

  const previewLessonId =
    manualPreviewLessonId && lessons.some((lesson) => lesson.id === manualPreviewLessonId)
      ? manualPreviewLessonId
      : lessons[0]?.id ?? null;
  const aiDraftStorageKey = `course-builder:exercise-ai-draft:${courseTitle}:${activeModuleId ?? "module"}:${
    draft.afterLessonId ?? "module"
  }:${draft.type}`;

  const resetAiGenerationState = () => {
    setAiError("");
    setGeneratedExercises([]);
    setSelectedGeneratedExerciseId(null);
    setAcceptedGeneratedExerciseId(null);
    setEditingGeneratedCodeExerciseId(null);
    setGeneratedOptionOrderByExerciseId({});

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(aiDraftStorageKey);
    }
  };

  const updateDraft = (updater: (currentDraft: ExerciseEditorDraft) => ExerciseEditorDraft) => {
    setDraft((currentDraft) => normalizeDraft(updater(currentDraft)));
  };

  const isCreationModePending = creationMode === null;
  const isStepTwoLocked = isCreationModePending;
  const isStepThreeLocked = isCreationModePending;
  const isBuildLocked = isCreationModePending || !isExerciseTypeSelected;
  const controlsDisabled = isSaving || isBuildLocked;
  const isAiMode = creationMode === "ai";
  const hasUnconfirmedGeneratedExercise =
    isAiMode && generatedExercises.length > 0 && acceptedGeneratedExerciseId === null;
  const validationMessage =
    isBuildLocked
      ? "Завершіть кроки 1-3, щоб продовжити."
      : isAiMode && generatedExercises.length === 0
        ? "Згенеруйте вправу з AI, щоб продовжити."
        : isAiMode && acceptedGeneratedExerciseId === null
          ? "Підтвердьте згенеровану вправу перед збереженням."
        : getExerciseValidationMessage(draft);
  const canSave =
    validationMessage.length === 0 &&
    !isBuildLocked &&
    (isAiMode ? acceptedGeneratedExerciseId !== null : true);
  const canGenerateAi = exerciseAiCountLimit > 0 && !isResolvingAiLimit;
  const hasSelectedDifficulties = selectedDifficulties.length > 0;
  const hasMultipleSelectedDifficulties = selectedDifficulties.length > 1;
  const isExerciseCountValid =
    exerciseAiCountLimit > 0 &&
    exerciseCount >= EXERCISE_COUNT_MIN &&
    exerciseCount <= exerciseAiCountLimit;
  const canSubmitAiGeneration =
    canGenerateAi &&
    hasSelectedDifficulties &&
    isExerciseCountValid &&
    !isGeneratingAi &&
    !isSaving &&
    !isBuildLocked;
  const canAdjustExerciseCount =
    exerciseAiCountLimit > 0 &&
    !controlsDisabled &&
    !isGeneratingAi &&
    !hasMultipleSelectedDifficulties;
  const exerciseCountInputValue =
    exerciseAiCountLimit > 0 ? String(exerciseCount) : "0";
  const manualValidationMessage =
    !isAiMode && !isBuildLocked ? getExerciseValidationMessage(draft) : "";
  const canConfirmManualExercise =
    creationMode === "manual" &&
    !controlsDisabled &&
    manualValidationMessage.length === 0;
  const unconfirmedGeneratedExerciseMessage =
    "Підтвердьте згенеровану вправу зеленою галочкою або видаліть її перед продовженням, інакше вона буде втрачена.";
  const generatedEditorDisabled = isSaving || isGeneratingAi;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const payload = draft.afterLessonId
      ? { afterLessonId: draft.afterLessonId }
      : activeModuleId
        ? { moduleId: activeModuleId }
        : null;

    if (!payload) {
      setExerciseAiCountLimit(0);
      return;
    }

    let isCancelled = false;
    setIsResolvingAiLimit(true);

    void (async () => {
      try {
        const response = await getExerciseAiGenerationLimit(payload);

        if (isCancelled) {
          return;
        }

        setExerciseAiCountLimit(response.maxCount);
        setExerciseCount((currentCount) => {
          if (response.maxCount <= 0) {
            return EXERCISE_COUNT_MIN;
          }

          return clampExerciseCount(currentCount, response.maxCount);
        });
        setExerciseCountLimitError(false);
      } catch {
        if (isCancelled) {
          return;
        }

        setExerciseAiCountLimit(0);
      } finally {
        if (!isCancelled) {
          setIsResolvingAiLimit(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [activeModuleId, draft.afterLessonId, isOpen]);

  useEffect(() => {
    if (selectedDifficulties.length > 1) {
      setExerciseCount(
        exerciseAiCountLimit > 0
          ? clampExerciseCount(selectedDifficulties.length, exerciseAiCountLimit)
          : EXERCISE_COUNT_MIN
      );
      setExerciseCountLimitError(false);
    }
  }, [exerciseAiCountLimit, selectedDifficulties]);

  useEffect(() => {
    setIsManualExerciseConfirmed(false);
  }, [creationMode, draft]);

  useAiDraftPersistence({
    isOpen,
    isAiMode,
    aiDraftStorageKey,
    generatedExercises,
    selectedGeneratedExerciseId,
    acceptedGeneratedExerciseId,
    setGeneratedExercises,
    setSelectedGeneratedExerciseId,
    setAcceptedGeneratedExerciseId,
    setDraft,
  });

  const warnAboutUnconfirmedGeneratedExercise = () => hasUnconfirmedGeneratedExercise;

  const handleTypeChange = (nextType: ExerciseType) => {
    if (isExerciseTypeSelected && draft.type === nextType) {
      return;
    }

    if (warnAboutUnconfirmedGeneratedExercise()) {
      return;
    }

    setIsExerciseTypeSelected(true);
    resetAiGenerationState();
    updateDraft((currentDraft) => {
      if (currentDraft.type === nextType) {
        return currentDraft;
      }

      const sharedQuestion = currentDraft.content.question;
      const shouldResetTitle =
        !currentDraft.title.trim() ||
        currentDraft.title === DEFAULT_EXERCISE_TITLES[currentDraft.type];

      if (nextType === "drag_drop_code") {
        return {
          ...currentDraft,
          type: "drag_drop_code",
          title: shouldResetTitle
            ? DEFAULT_EXERCISE_TITLES.drag_drop_code
            : currentDraft.title,
          content: createEmptyDragDropContent(sharedQuestion),
        };
      }

      return {
        ...currentDraft,
        type: "write_code",
        title: shouldResetTitle ? DEFAULT_EXERCISE_TITLES.write_code : currentDraft.title,
        content: createEmptyWriteCodeContent(sharedQuestion),
      };
    });
  };

  const handleCreationModeChange = (mode: CreateContentMode) => {
    if (creationMode === mode) {
      return;
    }

    if (warnAboutUnconfirmedGeneratedExercise()) {
      return;
    }

    resetAiGenerationState();
    setExerciseCountLimitError(false);
    setCreationMode(mode);
  };

  const handleSelectModulePlacement = () => {
    if (draft.afterLessonId === null) {
      return;
    }

    if (warnAboutUnconfirmedGeneratedExercise()) {
      return;
    }

    resetAiGenerationState();
    updateDraft((currentDraft) => ({
      ...currentDraft,
      afterLessonId: null,
    }));
  };

  const handleSelectLessonPlacement = (nextAfterLessonId: string | null) => {
    if (draft.afterLessonId === nextAfterLessonId) {
      return;
    }

    if (warnAboutUnconfirmedGeneratedExercise()) {
      return;
    }

    resetAiGenerationState();
    updateDraft((currentDraft) => ({
      ...currentDraft,
      afterLessonId: nextAfterLessonId,
    }));
  };

  const aiGenerationHandlers = createAiGenerationHandlers({
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
  });

  const generatedExerciseHandlers = createGeneratedExerciseHandlers({
    generatedExercises,
    selectedGeneratedExerciseId,
    isLocked: controlsDisabled || isGeneratingAi,
    setGeneratedExercises,
    setSelectedGeneratedExerciseId,
    setAcceptedGeneratedExerciseId,
    setEditingGeneratedCodeExerciseId,
    setGeneratedOptionOrderByExerciseId,
    setDraft,
    setAiError,
  });

  const manualExerciseHandlers = createManualExerciseHandlers({
    draft,
    updateDraft,
    setDraft,
    setAiError,
    setIsExerciseTypeSelected,
    dragDropEditorRef,
    writeCodeEditorRef,
  });

  const toggleManualExerciseConfirmed = () => {
    setIsManualExerciseConfirmed((currentValue) => !currentValue);
  };

  const handleCloseAttempt = () => {
    if (warnAboutUnconfirmedGeneratedExercise()) {
      return;
    }

    onClose();
  };

  const handleSave = () => {
    onSave(sanitizeExerciseDraftForSave(normalizeDraft(draft)));
  };

  return {
    // state
    creationMode,
    draft,
    selectedDifficulties,
    generatedExercises,
    acceptedGeneratedExerciseId,
    editingGeneratedCodeExerciseId,
    generatedOptionOrderByExerciseId,
    isManualExerciseConfirmed,
    isGeneratingAi,
    aiError,
    exerciseAiCountLimit,
    isResolvingAiLimit,
    exerciseCountLimitError,
    isExerciseTypeSelected,
    previewLessonId,
    setManualPreviewLessonId,
    dragDropEditorRef,
    writeCodeEditorRef,
    // derived
    isStepTwoLocked,
    isStepThreeLocked,
    isBuildLocked,
    controlsDisabled,
    isAiMode,
    hasUnconfirmedGeneratedExercise,
    unconfirmedGeneratedExerciseMessage,
    canSave,
    canGenerateAi,
    canSubmitAiGeneration,
    canAdjustExerciseCount,
    exerciseCountInputValue,
    canConfirmManualExercise,
    generatedEditorDisabled,
    // setup
    handleCreationModeChange,
    handleSelectModulePlacement,
    handleSelectLessonPlacement,
    handleTypeChange,
    toggleManualExerciseConfirmed,
    handleCloseAttempt,
    handleSave,
    // AI generation settings + generated/manual editors
    ...aiGenerationHandlers,
    ...generatedExerciseHandlers,
    ...manualExerciseHandlers,
  };
}
