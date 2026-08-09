import { useState, type Dispatch, type SetStateAction } from "react";
import { useConfirmDialog } from "../../../../../components/ui/confirmDialogContext";
import {
  createExercise,
  deleteExercise,
  generateExercisesWithAi,
  updateExercise,
} from "../../../api/index";
import type {
  ExerciseContent,
  ExerciseDifficulty,
  GeneratedExerciseWithDifficulty,
  Lesson,
} from "../../../api/index";
import type {
  CourseExercise,
  ExerciseEditorDraft,
  GeneratedExerciseAiDraft,
} from "../types/courseBuilderUiTypes";
import {
  createEmptyExerciseDraft,
  createLocalEntityId,
  type CreateContentMode,
} from "../lib/courseBuilderPageUtils";

type UseCourseBuilderExerciseEditorArgs = {
  currentCourseId: string | null;
  lessonsByModule: Record<string, Lesson[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  setExercisesByModule: Dispatch<SetStateAction<Record<string, CourseExercise[]>>>;
  fetchLessons: (moduleId: string) => Promise<Lesson[] | null>;
  fetchExercises: (moduleId: string) => Promise<CourseExercise[] | null>;
  resolveExerciseEditorModuleId: (moduleId: string) => Promise<string>;
  resolveAiGenerationTarget: (args: {
    moduleId: string;
    afterLessonId: string | null;
  }) => Promise<{
    moduleId: string;
    afterLessonId: string | null;
  }>;
  setMessage: Dispatch<SetStateAction<string>>;
};

function mapCourseExerciseToDraft(exercise: CourseExercise): ExerciseEditorDraft {
  return {
    afterLessonId: exercise.afterLessonId,
    type: exercise.type,
    title: exercise.title,
    description: exercise.description ?? "",
    content: exercise.content,
  } as ExerciseEditorDraft;
}

function mapGeneratedExerciseToDraft(
  baseDraft: ExerciseEditorDraft,
  generatedExercise: GeneratedExerciseWithDifficulty,
  afterLessonId: string | null
): GeneratedExerciseAiDraft {
  if (
    baseDraft.type === "drag_drop_code" &&
    generatedExercise.type === "drag_drop_code"
  ) {
    const { difficulty, ...content } = generatedExercise;

    return {
      id: createLocalEntityId("generated-exercise"),
      difficulty,
      draft: {
        ...baseDraft,
        afterLessonId,
        content,
      },
    };
  }

  if (
    baseDraft.type === "write_code" &&
    generatedExercise.type === "write_code"
  ) {
    const { difficulty, ...content } = generatedExercise;

    return {
      id: createLocalEntityId("generated-exercise"),
      difficulty,
      draft: {
        ...baseDraft,
        afterLessonId,
        content,
      },
    };
  }

  throw new Error("AI returned an exercise type that does not match the selected format.");
}

export function useCourseBuilderExerciseEditor({
  currentCourseId,
  lessonsByModule,
  exercisesByModule,
  setExercisesByModule,
  fetchLessons,
  fetchExercises,
  resolveExerciseEditorModuleId,
  resolveAiGenerationTarget,
  setMessage,
}: UseCourseBuilderExerciseEditorArgs) {
  const { confirm } = useConfirmDialog();
  const [exerciseEditorModuleId, setExerciseEditorModuleId] = useState<string | null>(null);
  const [exerciseCreateInitialMode, setExerciseCreateInitialMode] =
    useState<CreateContentMode | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseEditorInitialDraft, setExerciseEditorInitialDraft] =
    useState<ExerciseEditorDraft | null>(null);
  const [isSavingExercise, setIsSavingExercise] = useState(false);
  const [isPreparingExerciseEditor, setIsPreparingExerciseEditor] = useState(false);
  const [exerciseEditorError, setExerciseEditorError] = useState("");
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<Record<string, boolean>>({});

  const closeCreateExerciseModal = () => {
    setExerciseEditorModuleId(null);
    setEditingExerciseId(null);
    setExerciseEditorInitialDraft(null);
    setExerciseEditorError("");
    setExerciseCreateInitialMode(null);
  };

  const openCreateExerciseModal = async (
    moduleId: string,
    options?: {
      initialMode?: CreateContentMode | null;
    }
  ) => {
    if (isPreparingExerciseEditor) {
      return;
    }

    setExerciseEditorError("");
    setMessage("");
    setIsPreparingExerciseEditor(true);

    try {
      const resolvedModuleId = await resolveExerciseEditorModuleId(moduleId);

      await Promise.all([
        lessonsByModule[resolvedModuleId] ? Promise.resolve() : fetchLessons(resolvedModuleId),
        exercisesByModule[resolvedModuleId]
          ? Promise.resolve()
          : fetchExercises(resolvedModuleId),
      ]);

      setExerciseEditorModuleId(resolvedModuleId);
      setExerciseCreateInitialMode(options?.initialMode ?? null);
      setEditingExerciseId(null);
      setExerciseEditorInitialDraft(createEmptyExerciseDraft());
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Unable to open the exercise editor.");
      }
    } finally {
      setIsPreparingExerciseEditor(false);
    }
  };

  const openEditExerciseModal = async (moduleId: string, exercise: CourseExercise) => {
    setExerciseEditorError("");
    setMessage("");

    if (!lessonsByModule[moduleId] && currentCourseId) {
      await fetchLessons(moduleId);
    }

    setExerciseEditorModuleId(moduleId);
    setExerciseCreateInitialMode("manual");
    setEditingExerciseId(exercise.id);
    setExerciseEditorInitialDraft(mapCourseExerciseToDraft(exercise));
  };

  const handleOpenExerciseCreationChoice = async (
    moduleId: string,
    mode?: CreateContentMode | null
  ) => {
    await openCreateExerciseModal(moduleId, { initialMode: mode ?? null });
  };

  const handleGenerateExerciseWithAi = async (
    draft: ExerciseEditorDraft,
    options: {
      difficulties: ExerciseDifficulty[];
      count: number;
    }
  ): Promise<GeneratedExerciseAiDraft[]> => {
    if (!exerciseEditorModuleId) {
      throw new Error("Unable to resolve the selected module.");
    }

    const resolvedTarget = await resolveAiGenerationTarget({
      moduleId: exerciseEditorModuleId,
      afterLessonId: draft.afterLessonId,
    });

    const response = await generateExercisesWithAi({
      afterLessonId: resolvedTarget.afterLessonId ?? undefined,
      moduleId: resolvedTarget.afterLessonId ? undefined : resolvedTarget.moduleId,
      type: draft.type,
      difficulties: options.difficulties,
      count: options.count,
    });

    const generatedExercises = response.exercises ??
      (response.content
        ? [
            {
              ...response.content,
              difficulty:
                options.difficulties[options.difficulties.length - 1] ?? "medium",
            } as GeneratedExerciseWithDifficulty,
          ]
        : []);

    if (generatedExercises.length === 0) {
      throw new Error("AI did not return any exercises.");
    }

    return generatedExercises.map((generatedExercise) =>
      mapGeneratedExerciseToDraft(
        draft,
        generatedExercise,
        resolvedTarget.afterLessonId
      )
    );
  };

  const handleSaveExercise = async (draft: ExerciseEditorDraft) => {
    if (!exerciseEditorModuleId) {
      setExerciseEditorError("Unable to resolve the selected module.");
      return;
    }

    setExerciseEditorError("");

    try {
      setIsSavingExercise(true);
      const resolvedModuleId = exerciseEditorModuleId;
      const modulePayload =
        draft.afterLessonId === null
          ? {
              moduleId: resolvedModuleId,
            }
          : {};

      if (editingExerciseId) {
        await updateExercise(editingExerciseId, {
          afterLessonId: draft.afterLessonId,
          ...modulePayload,
          type: draft.type,
          title: draft.title,
          description: draft.description.trim() || null,
          content: draft.content as ExerciseContent,
        });
      } else {
        await createExercise({
          afterLessonId: draft.afterLessonId ?? undefined,
          ...modulePayload,
          type: draft.type,
          title: draft.title,
          description: draft.description.trim() || null,
          content: draft.content as ExerciseContent,
        });
      }

      await fetchExercises(resolvedModuleId);
      closeCreateExerciseModal();
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setExerciseEditorError(error.message);
      } else {
        setExerciseEditorError(
          editingExerciseId ? "Unable to update exercise." : "Unable to create exercise."
        );
      }
    } finally {
      setIsSavingExercise(false);
    }
  };

  const handleDeleteExercise = async (moduleId: string, exerciseId: string) => {
    const isConfirmed = await confirm({
      title: "Видалити вправу?",
      description: "Разом з вправою будуть видалені результати студентів по ній.",
      confirmLabel: "Видалити",
      tone: "danger",
    });

    if (!isConfirmed) {
      return;
    }

    if (!currentCourseId) {
      setExercisesByModule((prev) => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).filter((exercise) => exercise.id !== exerciseId),
      }));
      setExpandedExerciseIds((prev) => {
        const next = { ...prev };
        delete next[exerciseId];
        return next;
      });
      setMessage("");
      return;
    }

    try {
      await deleteExercise(exerciseId);
      await fetchExercises(moduleId);
      setExpandedExerciseIds((prev) => {
        const next = { ...prev };
        delete next[exerciseId];
        return next;
      });

      if (editingExerciseId === exerciseId) {
        closeCreateExerciseModal();
      }

      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Unable to delete exercise.");
      }
    }
  };

  const toggleExercisePreview = (exerciseId: string) => {
    setExpandedExerciseIds((prev) => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  };

  return {
    exerciseEditorModuleId,
    exerciseCreateInitialMode,
    editingExerciseId,
    exerciseEditorInitialDraft,
    isSavingExercise,
    isPreparingExerciseEditor,
    exerciseEditorError,
    expandedExerciseIds,
    setExpandedExerciseIds,
    closeCreateExerciseModal,
    openEditExerciseModal,
    handleOpenExerciseCreationChoice,
    handleGenerateExerciseWithAi,
    handleSaveExercise,
    handleDeleteExercise,
    toggleExercisePreview,
  };
}
