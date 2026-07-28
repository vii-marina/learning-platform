import { useEffect, type Dispatch, type SetStateAction } from "react";
import type {
  ExerciseEditorDraft,
  GeneratedExerciseAiDraft,
} from "../types/courseBuilderUiTypes";
import {
  coerceGeneratedExerciseAiDraft,
  normalizeDraft,
} from "../components/exerciseCreateModalUtils";

type PersistedAiExerciseState = {
  generatedExercises: GeneratedExerciseAiDraft[];
  selectedGeneratedExerciseId: string | null;
  acceptedGeneratedExerciseId?: string | null;
};

type UseAiDraftPersistenceInput = {
  isOpen: boolean;
  isAiMode: boolean;
  aiDraftStorageKey: string;
  generatedExercises: GeneratedExerciseAiDraft[];
  selectedGeneratedExerciseId: string | null;
  acceptedGeneratedExerciseId: string | null;
  setGeneratedExercises: Dispatch<SetStateAction<GeneratedExerciseAiDraft[]>>;
  setSelectedGeneratedExerciseId: Dispatch<SetStateAction<string | null>>;
  setAcceptedGeneratedExerciseId: Dispatch<SetStateAction<string | null>>;
  setDraft: Dispatch<SetStateAction<ExerciseEditorDraft>>;
};

// Load-on-open + save-on-change of the AI-generated drafts, keyed by
// course/module/lesson/type so drafts survive an accidental modal close.
export function useAiDraftPersistence({
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
}: UseAiDraftPersistenceInput) {
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
      const persistedExercises = rawPersistedExercises
        .map((exercise) => coerceGeneratedExerciseAiDraft(exercise))
        .filter((exercise): exercise is GeneratedExerciseAiDraft => exercise !== null);

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
  }, [
    aiDraftStorageKey,
    isAiMode,
    isOpen,
    setAcceptedGeneratedExerciseId,
    setDraft,
    setGeneratedExercises,
    setSelectedGeneratedExerciseId,
  ]);

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
}
