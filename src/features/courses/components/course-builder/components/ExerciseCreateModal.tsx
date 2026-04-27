import { useEffect, useRef, useState } from "react";
import { Code2, X } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import { getExerciseAiGenerationLimit } from "../../../api/index";
import type {
  DragDropCodeExerciseBlank,
  DragDropCodeExerciseContent,
  ExerciseDifficulty,
  ExerciseType,
  Lesson,
  Module,
  WriteCodeExerciseContent,
} from "../../../api/index";
import type {
  CourseExercise,
  CourseTest,
  ExerciseEditorDraft,
  GeneratedExerciseAiDraft,
} from "../types/courseBuilderUiTypes";
import { CourseStructureSidebar } from "./CourseStructureSidebar";
import { type CreateContentMode } from "../lib/courseBuilderPageUtils";
import { ExerciseAiBuildSection } from "./ExerciseAiBuildSection";
import { ExerciseCreateSetupSections } from "./ExerciseCreateSetupSections";
import { GeneratedExerciseEditorCard } from "./GeneratedExerciseEditorCard";
import { ManualExerciseEditorCard } from "./ManualExerciseEditorCard";
import {
  AUTHOR_BLANK_TOKEN,
  DEFAULT_EXERCISE_TITLES,
  EXERCISE_COUNT_MIN,
  WRITE_CODE_SLOT_TOKEN,
  buildGeneratedAnswerOptions,
  clampExerciseCount,
  coerceGeneratedExerciseAiDraft,
  createDefaultDraft,
  createEmptyDragDropContent,
  createEmptyDraftForType,
  createEmptyWriteCodeContent,
  getGeneratedAnswerOptionItems,
  getExerciseValidationMessage,
  hasMeaningfulExerciseDraft,
  hasWriteCodeAnswerSlot,
  normalizeDraft,
  sanitizeExerciseDraftForSave,
  shuffleValues,
} from "./exerciseCreateModalUtils";

type ExerciseCreateModalProps = {
  isOpen: boolean;
  initialMode?: CreateContentMode | null;
  heading?: string;
  saveLabel?: string;
  courseTitle: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  activeModuleId: string | null;
  activeExerciseId?: string | null;
  lessons: Lesson[];
  initialDraft: ExerciseEditorDraft | null;
  isSaving?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onGenerateAi: (
    draft: ExerciseEditorDraft,
    options: {
      difficulties: ExerciseDifficulty[];
      count: number;
    }
  ) => Promise<GeneratedExerciseAiDraft[]>;
  onSave: (draft: ExerciseEditorDraft) => void;
};

type PersistedAiExerciseState = {
  generatedExercises: GeneratedExerciseAiDraft[];
  selectedGeneratedExerciseId: string | null;
  acceptedGeneratedExerciseId?: string | null;
};

export function ExerciseCreateModal({
  isOpen,
  initialMode = null,
  heading = "Create Exercise",
  saveLabel = "Save Exercise",
  courseTitle,
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  activeModuleId,
  activeExerciseId = null,
  lessons,
  initialDraft,
  isSaving = false,
  errorMessage = "",
  onClose,
  onGenerateAi,
  onSave,
}: ExerciseCreateModalProps) {
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

  const updateDragDropContent = (
    updater: (content: DragDropCodeExerciseContent) => DragDropCodeExerciseContent
  ) => {
    updateDraft((currentDraft) =>
      currentDraft.type === "drag_drop_code"
        ? {
            ...currentDraft,
            content: updater(currentDraft.content),
          }
        : currentDraft
    );
  };

  const updateWriteCodeContent = (
    updater: (content: WriteCodeExerciseContent) => WriteCodeExerciseContent
  ) => {
    updateDraft((currentDraft) =>
      currentDraft.type === "write_code"
        ? {
            ...currentDraft,
            content: updater(currentDraft.content),
          }
        : currentDraft
    );
  };

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
      ? "Complete steps 1-3 to continue."
      : isAiMode && generatedExercises.length === 0
        ? "Generate an exercise with AI to continue."
        : isAiMode && acceptedGeneratedExerciseId === null
          ? "Confirm the generated exercise before saving."
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
    "Confirm the generated exercise with the green check or delete it before continuing, otherwise it will be lost.";

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
    if (!isOpen || !isAiMode || typeof window === "undefined") {
      return;
    }

    const rawValue = window.localStorage.getItem(aiDraftStorageKey);

    if (!rawValue) {
      return;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as PersistedAiExerciseState;
      const rawPersistedExercises = Array.isArray(parsedValue.generatedExercises)
        ? parsedValue.generatedExercises
        : [];
      const persistedExercises = Array.isArray(parsedValue.generatedExercises)
        ? parsedValue.generatedExercises
            .map((exercise) => coerceGeneratedExerciseAiDraft(exercise))
            .filter((exercise): exercise is GeneratedExerciseAiDraft => exercise !== null)
        : [];

      if (persistedExercises.length === 0) {
        if (rawPersistedExercises.length > 0) {
          window.localStorage.removeItem(aiDraftStorageKey);
        }
        return;
      }

      setGeneratedExercises(persistedExercises);

      const persistedSelectionId = parsedValue.selectedGeneratedExerciseId;
      const hasPersistedSelection = persistedExercises.some(
        (exercise) => exercise.id === persistedSelectionId
      );
      const persistedAcceptedId = parsedValue.acceptedGeneratedExerciseId ?? null;
      const hasPersistedAccepted = persistedExercises.some(
        (exercise) => exercise.id === persistedAcceptedId
      );
      const resolvedSelectionId = hasPersistedSelection
        ? persistedSelectionId
        : persistedExercises[0]?.id ?? null;
      const resolvedAcceptedId = hasPersistedAccepted ? persistedAcceptedId : null;
      const resolvedDraftExercise =
        persistedExercises.find(
          (exercise) => exercise.id === (resolvedAcceptedId ?? resolvedSelectionId)
        ) ?? null;

      setSelectedGeneratedExerciseId(resolvedSelectionId);
      setAcceptedGeneratedExerciseId(resolvedAcceptedId);

      if (resolvedDraftExercise) {
        setDraft(normalizeDraft(resolvedDraftExercise.draft));
      }
    } catch {
      window.localStorage.removeItem(aiDraftStorageKey);
    }
  }, [aiDraftStorageKey, isAiMode, isOpen]);

  useEffect(() => {
    if (!isOpen || !isAiMode || typeof window === "undefined") {
      return;
    }

    if (generatedExercises.length === 0) {
      window.localStorage.removeItem(aiDraftStorageKey);
      return;
    }

    const payload: PersistedAiExerciseState = {
      generatedExercises,
      selectedGeneratedExerciseId,
      acceptedGeneratedExerciseId,
    };

    window.localStorage.setItem(aiDraftStorageKey, JSON.stringify(payload));
  }, [
    acceptedGeneratedExerciseId,
    aiDraftStorageKey,
    generatedExercises,
    isAiMode,
    isOpen,
    selectedGeneratedExerciseId,
  ]);

  useEffect(() => {
    setIsManualExerciseConfirmed(false);
  }, [creationMode, draft]);

  const warnAboutUnconfirmedGeneratedExercise = () => {
    if (!hasUnconfirmedGeneratedExercise) {
      return false;
    }

    return true;
  };

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

  const handleAcceptGeneratedExercise = (generatedExerciseId: string) => {
    if (controlsDisabled || isGeneratingAi) {
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
    if (controlsDisabled || isGeneratingAi) {
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
      currentDraft.type === "drag_drop_code"
        ? {
            ...currentDraft,
            content: updater(currentDraft.content),
          }
        : currentDraft
    );
  };

  const updateGeneratedWriteCodeContent = (
    generatedExerciseId: string,
    updater: (content: WriteCodeExerciseContent) => WriteCodeExerciseContent
  ) => {
    updateGeneratedExerciseDraft(generatedExerciseId, (currentDraft) =>
      currentDraft.type === "write_code"
        ? {
            ...currentDraft,
            content: updater(currentDraft.content),
          }
        : currentDraft
    );
  };

  const updateGeneratedDragDropBlank = (
    generatedExerciseId: string,
    blankIndex: number,
    updater: (blank: DragDropCodeExerciseBlank) => DragDropCodeExerciseBlank
  ) => {
    updateGeneratedDragDropContent(generatedExerciseId, (content) => ({
      ...content,
      blanks: (content.blanks ?? []).map((blank, currentIndex) =>
        currentIndex === blankIndex ? updater(blank) : blank
      ),
    }));
  };

  const handleGeneratedCodeTemplateChange = (
    generatedExerciseId: string,
    value: string
  ) => {
    updateGeneratedDragDropContent(generatedExerciseId, (content) => ({
      ...content,
      code_template: value,
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

    updateGeneratedDragDropBlank(generatedExerciseId, 0, (currentBlank) => ({
      ...currentBlank,
      distractors: [...currentBlank.distractors, ""],
    }));
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
      !window.confirm("Replace the current exercise with AI-generated content?")
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
        throw new Error("AI returned an invalid exercise payload.");
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
        setAiError("Unable to generate exercise with AI.");
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const updateDragDropBlank = (
    blankIndex: number,
    updater: (blank: DragDropCodeExerciseBlank) => DragDropCodeExerciseBlank
  ) => {
    updateDragDropContent((content) => ({
      ...content,
      blanks: (content.blanks ?? []).map((blank, currentIndex) =>
        currentIndex === blankIndex ? updater(blank) : blank
      ),
    }));
  };

  const handleQuestionChange = (value: string) => {
    setAiError("");
    updateDraft((currentDraft) =>
      currentDraft.type === "drag_drop_code"
        ? {
            ...currentDraft,
            content: {
              ...currentDraft.content,
              question: value,
            },
          }
        : {
            ...currentDraft,
            content: {
              ...currentDraft.content,
              question: value,
            },
          }
    );
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

  const handleResetManualExercise = (confirmationMessage: string) => {
    if (hasMeaningfulExerciseDraft(draft) && !window.confirm(confirmationMessage)) {
      return;
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

  const handleGenerateAiClick = () => {
    void handleGenerateAi();
  };

  const generatedEditorDisabled = isSaving || isGeneratingAi;
  const generatedExerciseEditors = generatedExercises.map((generatedExercise, index) => (
    <GeneratedExerciseEditorCard
      key={generatedExercise.id}
      exercise={generatedExercise}
      index={index}
      isAccepted={acceptedGeneratedExerciseId === generatedExercise.id}
      isDisabled={generatedEditorDisabled}
      isEditingCode={editingGeneratedCodeExerciseId === generatedExercise.id}
      answerOptions={buildGeneratedAnswerOptions(
        generatedExercise,
        generatedOptionOrderByExerciseId[generatedExercise.id]
      )}
      onQuestionChange={(value) =>
        updateGeneratedExerciseDraft(generatedExercise.id, (currentDraft) =>
          currentDraft.type === "drag_drop_code"
            ? {
                ...currentDraft,
                content: {
                  ...currentDraft.content,
                  question: value,
                },
              }
            : {
                ...currentDraft,
                content: {
                  ...currentDraft.content,
                  question: value,
                },
              }
        )
      }
      onDelete={() => handleDeleteGeneratedExercise(generatedExercise.id)}
      onAccept={() => handleAcceptGeneratedExercise(generatedExercise.id)}
      onStartCodeEdit={() => setEditingGeneratedCodeExerciseId(generatedExercise.id)}
      onFinishCodeEdit={() => setEditingGeneratedCodeExerciseId(null)}
      onCodeTemplateChange={(value) =>
        handleGeneratedCodeTemplateChange(generatedExercise.id, value)
      }
      onDragDropCorrectChange={(blankIndex, value) =>
        updateGeneratedDragDropBlank(generatedExercise.id, blankIndex, (currentBlank) => ({
          ...currentBlank,
          correct: value,
        }))
      }
      onDragDropDistractorChange={(blankIndex, distractorIndex, value) =>
        updateGeneratedDragDropBlank(generatedExercise.id, blankIndex, (currentBlank) => ({
          ...currentBlank,
          distractors: currentBlank.distractors.map(
            (currentDistractor, currentDistractorIndex) =>
              currentDistractorIndex === distractorIndex ? value : currentDistractor
          ),
        }))
      }
      onRemoveDragDropDistractor={(blankIndex, distractorIndex) =>
        updateGeneratedDragDropBlank(generatedExercise.id, blankIndex, (currentBlank) => ({
          ...currentBlank,
          distractors: currentBlank.distractors.filter(
            (_, currentDistractorIndex) => currentDistractorIndex !== distractorIndex
          ),
        }))
      }
      onShuffleOptions={() => handleShuffleGeneratedOptions(generatedExercise.id)}
      onAddOption={() => handleAddGeneratedOption(generatedExercise.id)}
      onWriteCodeInitialCodeChange={(value) =>
        updateGeneratedWriteCodeContent(generatedExercise.id, (content) => ({
          ...content,
          initial_code: value,
        }))
      }
      onWriteCodeExpectedAnswerChange={(value) =>
        updateGeneratedWriteCodeContent(generatedExercise.id, (content) => ({
          ...content,
          expected_answer: value,
        }))
      }
    />
  ));

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-h-[94vh] w-full max-w-[98rem] overflow-hidden rounded-[0.75rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
        <CourseStructureSidebar
          courseTitle={courseTitle}
          modules={modules}
          lessonsByModule={lessonsByModule}
          testsByModule={testsByModule}
          exercisesByModule={exercisesByModule}
          accent="exercise"
          isResizable
          restrictToActiveModule
          activeModuleId={activeModuleId}
          activeExerciseId={activeExerciseId}
          selectedAfterLessonId={draft.afterLessonId}
          previewLessonId={previewLessonId}
          showTestSourcePreview
          onSelectPreviewLesson={setManualPreviewLessonId}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-[108px] items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <Code2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3 className="text-2xl font-extrabold tracking-tight text-[#14213d]">
                  {heading}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (warnAboutUnconfirmedGeneratedExercise()) {
                  return;
                }

                onClose();
              }}
              aria-label="Close exercise modal"
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-4">
              <ExerciseCreateSetupSections
                creationMode={creationMode}
                isSaving={isSaving}
                isStepTwoLocked={isStepTwoLocked}
                isStepThreeLocked={isStepThreeLocked}
                lessons={lessons}
                afterLessonId={draft.afterLessonId}
                isExerciseTypeSelected={isExerciseTypeSelected}
                selectedExerciseType={draft.type}
                onCreationModeChange={handleCreationModeChange}
                onSelectModulePlacement={handleSelectModulePlacement}
                onSelectLessonPlacement={handleSelectLessonPlacement}
                onExerciseTypeChange={handleTypeChange}
              />

              <section
                className={`rounded-xl border border-slate-200 bg-white px-5 py-4 ${
                  isBuildLocked ? "opacity-45" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-orange-600">
                    4
                  </span>
                  <h4 className="text-base font-semibold text-slate-600">Build the exercise</h4>
                </div>

                <div className="mt-5 space-y-5">
                  {isAiMode ? (
                    <ExerciseAiBuildSection
                      selectedDifficulties={selectedDifficulties}
                      isDisabled={controlsDisabled}
                      exerciseCountLimitError={exerciseCountLimitError}
                      exerciseCountInputValue={exerciseCountInputValue}
                      exerciseAiCountLimit={exerciseAiCountLimit}
                      canAdjustExerciseCount={canAdjustExerciseCount}
                      canSubmitAiGeneration={canSubmitAiGeneration}
                      canGenerateAi={canGenerateAi}
                      isGeneratingAi={isGeneratingAi}
                      isResolvingAiLimit={isResolvingAiLimit}
                      aiError={aiError}
                      hasGeneratedExercises={generatedExercises.length > 0}
                      hasUnconfirmedGeneratedExercise={hasUnconfirmedGeneratedExercise}
                      unconfirmedGeneratedExerciseMessage={unconfirmedGeneratedExerciseMessage}
                      generatedExerciseEditors={generatedExerciseEditors}
                      onDifficultyToggle={handleDifficultyToggle}
                      onDecreaseExerciseCount={handleDecreaseExerciseCount}
                      onExerciseCountInputChange={handleExerciseCountInputChange}
                      onIncreaseExerciseCount={handleIncreaseExerciseCount}
                      onGenerateAi={handleGenerateAiClick}
                    />
                  ) : (
                    <ManualExerciseEditorCard
                      draft={draft}
                      isConfirmed={isManualExerciseConfirmed}
                      canConfirm={canConfirmManualExercise}
                      disabled={controlsDisabled}
                      dragDropEditorRef={dragDropEditorRef}
                      writeCodeEditorRef={writeCodeEditorRef}
                      onQuestionChange={handleQuestionChange}
                      onReset={() => handleResetManualExercise("Clear the current exercise?")}
                      onToggleConfirm={() =>
                        setIsManualExerciseConfirmed((currentValue) => !currentValue)
                      }
                      onInsertDragDropBlank={() =>
                        insertSnippetIntoEditor(
                          dragDropEditorRef.current,
                          draft.type === "drag_drop_code" ? draft.content.code_template : "",
                          AUTHOR_BLANK_TOKEN,
                          (nextValue) =>
                            updateDragDropContent((content) => ({
                              ...content,
                              code_template: nextValue,
                            }))
                        )
                      }
                      onDragDropCodeTemplateChange={(value) =>
                        updateDragDropContent((content) => ({
                          ...content,
                          code_template: value,
                        }))
                      }
                      onDragDropCorrectChange={(blankIndex, value) =>
                        updateDragDropBlank(blankIndex, (currentBlank) => ({
                          ...currentBlank,
                          correct: value,
                        }))
                      }
                      onDragDropDistractorChange={(blankIndex, distractorIndex, value) =>
                        updateDragDropBlank(blankIndex, (currentBlank) => ({
                          ...currentBlank,
                          distractors: currentBlank.distractors.map(
                            (currentDistractor, currentDistractorIndex) =>
                              currentDistractorIndex === distractorIndex
                                ? value
                                : currentDistractor
                          ),
                        }))
                      }
                      onRemoveDragDropDistractor={(blankIndex, distractorIndex) =>
                        updateDragDropBlank(blankIndex, (currentBlank) => ({
                          ...currentBlank,
                          distractors: currentBlank.distractors.filter(
                            (_, currentDistractorIndex) =>
                              currentDistractorIndex !== distractorIndex
                          ),
                        }))
                      }
                      onAddDragDropOption={(blankIndex) =>
                        updateDragDropBlank(blankIndex, (currentBlank) => ({
                          ...currentBlank,
                          distractors: [...currentBlank.distractors, ""],
                        }))
                      }
                      onInsertWriteCodeAnswerSlot={() => {
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
                            updateWriteCodeContent((content) => ({
                              ...content,
                              initial_code: nextValue,
                            }))
                        );
                      }}
                      onWriteCodeInitialCodeChange={(value) =>
                        updateWriteCodeContent((content) => ({
                          ...content,
                          initial_code: value,
                        }))
                      }
                      onWriteCodeExpectedAnswerChange={(value) =>
                        updateWriteCodeContent((content) => ({
                          ...content,
                          expected_answer: value,
                        }))
                      }
                      showCreateAnotherButton={activeExerciseId === null}
                      onCreateAnother={() =>
                        handleResetManualExercise(
                          "Clear the current exercise and start a new one?"
                        )
                      }
                    />
                  )}
                </div>
            </section>
          </div>
        </div>

          <div className="border-t border-slate-200 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {errorMessage ? (
                <p className="text-sm font-medium text-rose-600">{errorMessage}</p>
              ) : (
                <span />
              )}

              <Button
                onClick={() => onSave(sanitizeExerciseDraftForSave(normalizeDraft(draft)))}
                disabled={!canSave || isSaving}
                className="h-11 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : saveLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
