/**
 * The four editors the course builder opens over itself: lesson, test, exercise and the
 * thumbnail cropper.
 *
 * Each one is driven entirely by its editor hook's result, so this takes those objects whole
 * instead of re-declaring some fifty individual props. Whether a modal is open is derived from
 * that state too — `lessonEditorModuleId !== null` and friends — which is why there is no
 * separate `isOpen` flag to keep in step.
 */

import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import type { useCourseBuilderExerciseEditor } from "../hooks/useCourseBuilderExerciseEditor";
import type { useCourseBuilderLessonEditor } from "../hooks/useCourseBuilderLessonEditor";
import type { useCourseBuilderMedia } from "../hooks/useCourseBuilderMedia";
import type { useCourseBuilderTestEditor } from "../hooks/useCourseBuilderTestEditor";
import { CourseThumbnailCropModal } from "./CourseThumbnailCropModal";
import { ExerciseCreateModal } from "./ExerciseCreateModal";
import { LessonCreateModal } from "./LessonCreateModal";
import { TestCreateModal } from "./TestCreateModal";

export function CourseBuilderModals({
  currentCourseName,
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  media,
  lessonEditor,
  testEditor,
  exerciseEditor,
}: {
  currentCourseName: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  media: ReturnType<typeof useCourseBuilderMedia>;
  lessonEditor: ReturnType<typeof useCourseBuilderLessonEditor>;
  testEditor: ReturnType<typeof useCourseBuilderTestEditor>;
  exerciseEditor: ReturnType<typeof useCourseBuilderExerciseEditor>;
}) {
  return (
    <>
      <LessonCreateModal
        isOpen={lessonEditor.lessonEditorModuleId !== null}
        heading={lessonEditor.editingLessonId ? "Редагувати урок" : "Створити урок"}
        saveLabel={lessonEditor.editingLessonId ? "Зберегти зміни" : "Зберегти урок"}
        courseTitle={currentCourseName}
        modules={modules}
        lessonsByModule={lessonsByModule}
        testsByModule={testsByModule}
        exercisesByModule={exercisesByModule}
        activeModuleId={lessonEditor.lessonEditorModuleId}
        activeLessonId={lessonEditor.editingLessonId}
        draftLessonModuleId={lessonEditor.pendingLessonDraft?.moduleId ?? null}
        draftLessonTitle={lessonEditor.pendingLessonDraft?.draft.title ?? ""}
        title={lessonEditor.lessonTitle}
        content={lessonEditor.lessonContent}
        videoUrl={lessonEditor.lessonVideoUrl}
        notice={lessonEditor.lessonEditorNotice}
        isSaving={lessonEditor.isCreatingLesson}
        isLoadingLesson={lessonEditor.isLoadingLessonDraft}
        isDirty={lessonEditor.shouldGuardLessonDraft}
        onClose={lessonEditor.handleLessonEditorClose}
        onSave={() => {
          void lessonEditor.handleCreateLesson();
        }}
        onSelectLesson={lessonEditor.handleLessonEditorSelectLesson}
        onSelectDraftLesson={lessonEditor.handleLessonEditorSelectDraft}
        onTitleChange={lessonEditor.handleLessonTitleChange}
        onContentChange={lessonEditor.handleLessonContentChange}
        onVideoUrlChange={lessonEditor.handleLessonVideoUrlChange}
        onImageUpload={lessonEditor.handleLessonContentImageUpload}
      />

      <TestCreateModal
        key={
          testEditor.testEditorModuleId === null
            ? "test-editor-closed"
            : `${testEditor.testEditorModuleId}-${testEditor.editingTestId ?? "new"}-${
                testEditor.testCreateInitialMode ?? "auto"
              }`
        }
        isOpen={testEditor.testEditorModuleId !== null}
        initialMode={testEditor.testCreateInitialMode}
        heading={testEditor.editingTestId ? "Edit Test" : "Create Test"}
        saveLabel={testEditor.editingTestId ? "Save Changes" : "Save Test"}
        courseTitle={currentCourseName}
        modules={modules}
        lessonsByModule={lessonsByModule}
        testsByModule={testsByModule}
        exercisesByModule={exercisesByModule}
        activeModuleId={testEditor.testEditorModuleId}
        activeTestId={testEditor.editingTestId}
        lessons={testEditor.activeTestModuleLessons}
        selectedAfterLessonId={testEditor.testAfterLessonId}
        questions={testEditor.testQuestions}
        canSave={testEditor.canSaveCurrentTest}
        isSaving={testEditor.isSavingTest}
        aiGenerationMode={testEditor.testAiGenerationMode}
        aiQuestionCount={testEditor.testAiQuestionCount}
        maxAiQuestionCount={testEditor.testAiQuestionLimit}
        canGenerateAi={testEditor.canGenerateTestAi}
        isGeneratingAi={testEditor.isGeneratingAiQuestions}
        onClose={testEditor.closeCreateTestModal}
        onSave={() => {
          void testEditor.handleCreateTest();
        }}
        onGenerateAi={testEditor.handleGenerateTestQuestionsWithAi}
        onAiGenerationModeChange={testEditor.setTestAiGenerationMode}
        onAiQuestionCountChange={testEditor.setTestAiQuestionCount}
        onAfterLessonChange={testEditor.setTestAfterLessonId}
        isGraded={testEditor.testIsGraded}
        onIsGradedChange={testEditor.setTestIsGraded}
        onAddQuestion={testEditor.handleAddTestQuestion}
        onQuestionChange={testEditor.handleChangeTestQuestion}
        onDeleteQuestion={testEditor.handleDeleteTestQuestion}
      />

      <ExerciseCreateModal
        key={
          exerciseEditor.exerciseEditorModuleId === null
            ? "exercise-editor-closed"
            : `${exerciseEditor.exerciseEditorModuleId}-${
                exerciseEditor.editingExerciseId ?? "new"
              }-${exerciseEditor.exerciseEditorInitialDraft?.type ?? "drag_drop_code"}-${
                exerciseEditor.exerciseEditorInitialDraft?.afterLessonId ?? "module"
              }`
        }
        isOpen={exerciseEditor.exerciseEditorModuleId !== null}
        initialMode={exerciseEditor.exerciseCreateInitialMode}
        heading={exerciseEditor.editingExerciseId ? "Редагувати вправу" : "Створити вправу"}
        saveLabel={exerciseEditor.editingExerciseId ? "Зберегти зміни" : "Зберегти вправу"}
        courseTitle={currentCourseName}
        modules={modules}
        lessonsByModule={lessonsByModule}
        testsByModule={testsByModule}
        exercisesByModule={exercisesByModule}
        activeModuleId={exerciseEditor.exerciseEditorModuleId}
        activeExerciseId={exerciseEditor.editingExerciseId}
        lessons={
          exerciseEditor.exerciseEditorModuleId
            ? lessonsByModule[exerciseEditor.exerciseEditorModuleId] || []
            : []
        }
        initialDraft={exerciseEditor.exerciseEditorInitialDraft}
        isSaving={exerciseEditor.isSavingExercise}
        errorMessage={exerciseEditor.exerciseEditorError}
        onClose={exerciseEditor.closeCreateExerciseModal}
        onGenerateAi={exerciseEditor.handleGenerateExerciseWithAi}
        onSave={(draft) => {
          void exerciseEditor.handleSaveExercise(draft);
        }}
      />

      <CourseThumbnailCropModal
        isOpen={media.pendingThumbnailCropFile !== null}
        sourceFile={media.pendingThumbnailCropFile}
        isUploading={media.isUploadingCourseMedia}
        onClose={media.handleCourseThumbnailCropClose}
        onConfirm={media.handleCourseThumbnailCropConfirm}
      />
    </>
  );
}
