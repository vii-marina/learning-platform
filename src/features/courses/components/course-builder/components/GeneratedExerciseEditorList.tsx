import type { GeneratedExerciseAiDraft } from "../types/courseBuilderUiTypes";
import { GeneratedExerciseEditorCard } from "./GeneratedExerciseEditorCard";
import { buildGeneratedAnswerOptions } from "./exerciseCreateModalUtils";

type GeneratedExerciseEditorListProps = {
  exercises: GeneratedExerciseAiDraft[];
  acceptedGeneratedExerciseId: string | null;
  editingGeneratedCodeExerciseId: string | null;
  generatedOptionOrderByExerciseId: Record<string, string[]>;
  isDisabled: boolean;
  onQuestionChange: (generatedExerciseId: string, value: string) => void;
  onDelete: (generatedExerciseId: string) => void;
  onAccept: (generatedExerciseId: string) => void;
  onStartCodeEdit: (generatedExerciseId: string) => void;
  onFinishCodeEdit: () => void;
  onCodeTemplateChange: (generatedExerciseId: string, value: string) => void;
  onDragDropCorrectChange: (
    generatedExerciseId: string,
    blankIndex: number,
    value: string
  ) => void;
  onDragDropDistractorChange: (
    generatedExerciseId: string,
    blankIndex: number,
    distractorIndex: number,
    value: string
  ) => void;
  onRemoveDragDropDistractor: (
    generatedExerciseId: string,
    blankIndex: number,
    distractorIndex: number
  ) => void;
  onShuffleOptions: (generatedExerciseId: string) => void;
  onAddOption: (generatedExerciseId: string) => void;
  onWriteCodeInitialCodeChange: (generatedExerciseId: string, value: string) => void;
  onWriteCodeExpectedAnswerChange: (generatedExerciseId: string, value: string) => void;
};

export function GeneratedExerciseEditorList({
  exercises,
  acceptedGeneratedExerciseId,
  editingGeneratedCodeExerciseId,
  generatedOptionOrderByExerciseId,
  isDisabled,
  onQuestionChange,
  onDelete,
  onAccept,
  onStartCodeEdit,
  onFinishCodeEdit,
  onCodeTemplateChange,
  onDragDropCorrectChange,
  onDragDropDistractorChange,
  onRemoveDragDropDistractor,
  onShuffleOptions,
  onAddOption,
  onWriteCodeInitialCodeChange,
  onWriteCodeExpectedAnswerChange,
}: GeneratedExerciseEditorListProps) {
  return (
    <>
      {exercises.map((generatedExercise, index) => (
        <GeneratedExerciseEditorCard
          key={generatedExercise.id}
          exercise={generatedExercise}
          index={index}
          isAccepted={acceptedGeneratedExerciseId === generatedExercise.id}
          isDisabled={isDisabled}
          isEditingCode={editingGeneratedCodeExerciseId === generatedExercise.id}
          answerOptions={buildGeneratedAnswerOptions(
            generatedExercise,
            generatedOptionOrderByExerciseId[generatedExercise.id]
          )}
          onQuestionChange={(value) => onQuestionChange(generatedExercise.id, value)}
          onDelete={() => onDelete(generatedExercise.id)}
          onAccept={() => onAccept(generatedExercise.id)}
          onStartCodeEdit={() => onStartCodeEdit(generatedExercise.id)}
          onFinishCodeEdit={onFinishCodeEdit}
          onCodeTemplateChange={(value) => onCodeTemplateChange(generatedExercise.id, value)}
          onDragDropCorrectChange={(blankIndex, value) =>
            onDragDropCorrectChange(generatedExercise.id, blankIndex, value)
          }
          onDragDropDistractorChange={(blankIndex, distractorIndex, value) =>
            onDragDropDistractorChange(
              generatedExercise.id,
              blankIndex,
              distractorIndex,
              value
            )
          }
          onRemoveDragDropDistractor={(blankIndex, distractorIndex) =>
            onRemoveDragDropDistractor(generatedExercise.id, blankIndex, distractorIndex)
          }
          onShuffleOptions={() => onShuffleOptions(generatedExercise.id)}
          onAddOption={() => onAddOption(generatedExercise.id)}
          onWriteCodeInitialCodeChange={(value) =>
            onWriteCodeInitialCodeChange(generatedExercise.id, value)
          }
          onWriteCodeExpectedAnswerChange={(value) =>
            onWriteCodeExpectedAnswerChange(generatedExercise.id, value)
          }
        />
      ))}
    </>
  );
}
