import { useId } from "react";
import { Modal } from "../../../../../components/ui/Modal";
import { Code2, X } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { ExerciseDifficulty, Lesson, Module } from "../../../api/index";
import type {
  CourseExercise,
  CourseTest,
  ExerciseEditorDraft,
  GeneratedExerciseAiDraft,
} from "../types/courseBuilderUiTypes";
import { CourseStructureSidebar } from "./CourseStructureSidebar";
import { type CreateContentMode } from "../lib/courseBuilderPageUtils";
import { useExerciseCreateModal } from "../hooks/useExerciseCreateModal";
import { ExerciseAiBuildSection } from "./ExerciseAiBuildSection";
import { ExerciseCreateSetupSections } from "./ExerciseCreateSetupSections";
import { GeneratedExerciseEditorList } from "./GeneratedExerciseEditorList";
import { ManualExerciseEditorCard } from "./ManualExerciseEditorCard";

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

export function ExerciseCreateModal({
  isOpen,
  initialMode = null,
  heading = "Створити вправу",
  saveLabel = "Зберегти вправу",
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
  const headingId = useId();
  const modal = useExerciseCreateModal({
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
  });

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      labelledById={headingId}
      overlayClassName="z-[90]"
      panelClassName="mx-auto flex h-full max-h-[94vh] w-full max-w-[98rem] overflow-hidden rounded-[0.75rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]"
    >
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
          selectedAfterLessonId={modal.draft.afterLessonId}
          previewLessonId={modal.previewLessonId}
          showTestSourcePreview
          onSelectPreviewLesson={modal.setManualPreviewLessonId}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-[108px] items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <Code2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3 id={headingId} className="text-2xl font-extrabold tracking-tight text-[#14213d]">
                  {heading}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={modal.handleCloseAttempt}
              aria-label="Закрити модальне вікно вправи"
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-4">
              <ExerciseCreateSetupSections
                creationMode={modal.creationMode}
                isSaving={isSaving}
                isStepTwoLocked={modal.isStepTwoLocked}
                isStepThreeLocked={modal.isStepThreeLocked}
                lessons={lessons}
                afterLessonId={modal.draft.afterLessonId}
                isExerciseTypeSelected={modal.isExerciseTypeSelected}
                selectedExerciseType={modal.draft.type}
                onCreationModeChange={modal.handleCreationModeChange}
                onSelectModulePlacement={modal.handleSelectModulePlacement}
                onSelectLessonPlacement={modal.handleSelectLessonPlacement}
                onExerciseTypeChange={modal.handleTypeChange}
              />

              <section
                className={`rounded-xl border border-slate-200 bg-white px-5 py-4 ${
                  modal.isBuildLocked ? "opacity-45" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-orange-600">
                    4
                  </span>
                  <h4 className="text-base font-semibold text-slate-600">Створення вправи</h4>
                </div>

                <div className="mt-5 space-y-5">
                  {modal.isAiMode ? (
                    <ExerciseAiBuildSection
                      selectedDifficulties={modal.selectedDifficulties}
                      isDisabled={modal.controlsDisabled}
                      exerciseCountLimitError={modal.exerciseCountLimitError}
                      exerciseCountInputValue={modal.exerciseCountInputValue}
                      exerciseAiCountLimit={modal.exerciseAiCountLimit}
                      canAdjustExerciseCount={modal.canAdjustExerciseCount}
                      canSubmitAiGeneration={modal.canSubmitAiGeneration}
                      canGenerateAi={modal.canGenerateAi}
                      isGeneratingAi={modal.isGeneratingAi}
                      isResolvingAiLimit={modal.isResolvingAiLimit}
                      aiError={modal.aiError}
                      hasGeneratedExercises={modal.generatedExercises.length > 0}
                      hasUnconfirmedGeneratedExercise={modal.hasUnconfirmedGeneratedExercise}
                      unconfirmedGeneratedExerciseMessage={
                        modal.unconfirmedGeneratedExerciseMessage
                      }
                      generatedExerciseEditors={
                        <GeneratedExerciseEditorList
                          exercises={modal.generatedExercises}
                          acceptedGeneratedExerciseId={modal.acceptedGeneratedExerciseId}
                          editingGeneratedCodeExerciseId={
                            modal.editingGeneratedCodeExerciseId
                          }
                          generatedOptionOrderByExerciseId={
                            modal.generatedOptionOrderByExerciseId
                          }
                          isDisabled={modal.generatedEditorDisabled}
                          onQuestionChange={modal.handleGeneratedQuestionChange}
                          onDelete={modal.handleDeleteGeneratedExercise}
                          onAccept={modal.handleAcceptGeneratedExercise}
                          onStartCodeEdit={modal.startGeneratedCodeEdit}
                          onFinishCodeEdit={modal.finishGeneratedCodeEdit}
                          onCodeTemplateChange={modal.handleGeneratedCodeTemplateChange}
                          onDragDropCorrectChange={
                            modal.handleGeneratedDragDropCorrectChange
                          }
                          onDragDropDistractorChange={
                            modal.handleGeneratedDragDropDistractorChange
                          }
                          onRemoveDragDropDistractor={
                            modal.handleRemoveGeneratedDragDropDistractor
                          }
                          onShuffleOptions={modal.handleShuffleGeneratedOptions}
                          onAddOption={modal.handleAddGeneratedOption}
                          onWriteCodeInitialCodeChange={
                            modal.handleGeneratedWriteCodeInitialCodeChange
                          }
                          onWriteCodeExpectedAnswerChange={
                            modal.handleGeneratedWriteCodeExpectedAnswerChange
                          }
                        />
                      }
                      onDifficultyToggle={modal.handleDifficultyToggle}
                      onDecreaseExerciseCount={modal.handleDecreaseExerciseCount}
                      onExerciseCountInputChange={modal.handleExerciseCountInputChange}
                      onIncreaseExerciseCount={modal.handleIncreaseExerciseCount}
                      onGenerateAi={modal.handleGenerateAiClick}
                    />
                  ) : (
                    <ManualExerciseEditorCard
                      draft={modal.draft}
                      isConfirmed={modal.isManualExerciseConfirmed}
                      canConfirm={modal.canConfirmManualExercise}
                      disabled={modal.controlsDisabled}
                      dragDropEditorRef={modal.dragDropEditorRef}
                      writeCodeEditorRef={modal.writeCodeEditorRef}
                      onQuestionChange={modal.handleQuestionChange}
                      onReset={() =>
                        modal.handleResetManualExercise("Очистити поточну вправу?")
                      }
                      onToggleConfirm={modal.toggleManualExerciseConfirmed}
                      onInsertDragDropBlank={modal.handleInsertDragDropBlank}
                      onDragDropCodeTemplateChange={modal.handleDragDropCodeTemplateChange}
                      onDragDropCorrectChange={modal.handleDragDropCorrectChange}
                      onDragDropDistractorChange={modal.handleDragDropDistractorChange}
                      onRemoveDragDropDistractor={modal.handleRemoveDragDropDistractor}
                      onAddDragDropOption={modal.handleAddDragDropOption}
                      onInsertWriteCodeAnswerSlot={modal.handleInsertWriteCodeAnswerSlot}
                      onWriteCodeInitialCodeChange={modal.handleWriteCodeInitialCodeChange}
                      onWriteCodeExpectedAnswerChange={
                        modal.handleWriteCodeExpectedAnswerChange
                      }
                      showCreateAnotherButton={activeExerciseId === null}
                      onCreateAnother={() =>
                        modal.handleResetManualExercise(
                          "Очистити поточну вправу й почати нову?"
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
                onClick={modal.handleSave}
                disabled={!modal.canSave || isSaving}
                className="h-11 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Збереження..." : saveLabel}
              </Button>
            </div>
          </div>
        </div>
    </Modal>
  );
}
