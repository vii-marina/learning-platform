import { forwardRef, useImperativeHandle } from "react";
import { LoadingState } from "../../components/ui/LoadingState";
import { CourseBuilderContentStep } from "../../features/courses/components/course-builder/components/CourseBuilderContentStep";
import { CourseBuilderCourseInfoStep } from "../../features/courses/components/course-builder/components/CourseBuilderCourseInfoStep";
import { CourseBuilderHeader } from "../../features/courses/components/course-builder/components/CourseBuilderHeader";
import { CourseBuilderModals } from "../../features/courses/components/course-builder/components/CourseBuilderModals";
import { CourseBuilderReviewStep } from "../../features/courses/components/course-builder/components/CourseBuilderReviewStep";
import { useCourseBuilder } from "../../features/courses/components/course-builder/hooks/useCourseBuilder";
import {
  courseBuilderSteps,
  type BuilderStep,
} from "../../features/courses/components/course-builder/lib/courseBuilderPageUtils";

export type CourseBuilderPageHandle = {
  hasUnsavedChanges: boolean;
  canSaveDraft: boolean;
  isSavingDraft: boolean;
  saveDraft: () => Promise<boolean>;
};

export const CourseBuilderPage = forwardRef<
  CourseBuilderPageHandle,
  {
    embedded?: boolean;
    initialCourseId?: string | null;
    initialStep?: BuilderStep;
    onBackToCourses?: () => void;
    onCoursePublished?: () => void;
  }
>(function CourseBuilderPage(
  {
    embedded = false,
    initialCourseId = null,
    initialStep = 1,
    onBackToCourses,
    onCoursePublished,
  }: {
    embedded?: boolean;
    initialCourseId?: string | null;
    initialStep?: BuilderStep;
    onBackToCourses?: () => void;
    onCoursePublished?: () => void;
  },
  ref
) {
  const builder = useCourseBuilder({
    initialCourseId,
    initialStep,
    onBackToCourses,
    onCoursePublished,
  });
  const {
    media,
    content,
    lessonEditor,
    testEditor,
    exerciseEditor,
    message,
    activeStep,
    setActiveStep,
    currentCourseId,
    isPersistingCourse,
    isHydratingCourse,
    courseTitle,
    setCourseTitle,
    courseDescription,
    setCourseDescription,
    isBasicsComplete,
    canSaveDraft,
    hasUnsavedChanges,
    isReviewContentLoading,
    publishBlockingIssues,
    currentCourseName,
    currentStepTitle,
    currentStepDescription,
    builderContentKey,
    saveDraft,
    handleSaveDraft,
    handlePublishCourse,
    handleBackToCourses,
  } = builder;

  useImperativeHandle(
    ref,
    () => ({
      hasUnsavedChanges,
      canSaveDraft,
      isSavingDraft: isPersistingCourse,
      saveDraft,
    }),
    [canSaveDraft, hasUnsavedChanges, isPersistingCourse, saveDraft]
  );

  return (
    <div
      className={`${embedded ? "min-h-0 bg-transparent" : "min-h-screen bg-[#f6f7fb]"} text-[#0f172a]`}
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      <CourseBuilderHeader
        steps={courseBuilderSteps}
        activeStep={activeStep}
        currentCourseName={currentCourseName}
        canRunPrimaryAction={canSaveDraft}
        primaryActionLabel={isPersistingCourse ? "Збереження..." : "Зберегти чернетку"}
        canNavigateToStep={(step) => step === 1 || isBasicsComplete}
        onBackToCourses={handleBackToCourses}
        onStepChange={setActiveStep}
        onPrimaryAction={() => {
          void handleSaveDraft();
        }}
        embedded={embedded}
      />

      <main
        className={`flex w-full flex-col gap-8 ${
          embedded
            ? "px-4 py-6 md:px-6 md:py-8 xl:px-8"
            : "mx-auto max-w-[92rem] px-4 py-6 md:px-6 md:py-8 lg:px-10"
        }`}
      >
        {message ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {message}
          </div>
        ) : null}

        {isHydratingCourse ? (
          <LoadingState variant="section" />
        ) : activeStep === 1 ? (
          <CourseBuilderCourseInfoStep
            title={currentStepTitle}
            description={currentStepDescription}
            courseTitle={courseTitle}
            courseDescription={courseDescription}
            courseThumbnailPath={media.courseThumbnailPath}
            courseThumbnailUrl={media.courseThumbnailUrl}
            isBasicsComplete={isBasicsComplete}
            isUploadingCourseMedia={media.isUploadingCourseMedia}
            currentCourseId={builderContentKey}
            onCourseTitleChange={setCourseTitle}
            onCourseDescriptionChange={setCourseDescription}
            onCourseMediaSelect={media.handleCourseMediaSelect}
            onCourseMediaRemove={() => {
              void media.handleCourseMediaRemove();
            }}
            onNext={() => {
              setActiveStep(2);
            }}
          />
        ) : null}

        {activeStep === 2 ? (
          <CourseBuilderContentStep
            title={currentStepTitle}
            modules={content.modules}
            modulesLoadState={content.modulesLoadState}
            isCreatingModule={content.isCreatingModule}
            isNewModuleComposerOpen={content.isNewModuleComposerOpen}
            newModuleTitle={content.newModuleTitle}
            nextModuleOrder={content.nextModuleOrder}
            lessonsByModule={content.lessonsByModule}
            testsByModule={content.testsByModule}
            exercisesByModule={content.exercisesByModule}
            moduleContentLoadStateByModule={content.moduleContentLoadStateByModule}
            expandedModuleId={content.expandedModuleId}
            editModuleId={content.editModuleId}
            editModuleTitle={content.editModuleTitle}
            currentCourseId={builderContentKey}
            isPersistedCourse={currentCourseId !== null}
            expandedLessonIds={lessonEditor.expandedLessonIds}
            expandedTestIds={testEditor.expandedTestIds}
            expandedExerciseIds={exerciseEditor.expandedExerciseIds}
            isPreparingExercise={exerciseEditor.isPreparingExerciseEditor}
            onNewModuleTitleChange={content.setNewModuleTitle}
            onSaveNewModule={content.handleSaveNewModule}
            onToggleModule={(moduleId) => {
              void content.toggleModule(moduleId);
            }}
            onRetryModules={() => {
              if (!currentCourseId) {
                return;
              }

              void content.fetchModules(currentCourseId);
            }}
            onRetryModuleContent={(moduleId) => {
              void content.fetchModuleContent(moduleId);
            }}
            onStartEditModule={(moduleId, title) => {
              content.setEditModuleId(moduleId);
              content.setEditModuleTitle(title);
            }}
            onEditModuleTitleChange={content.setEditModuleTitle}
            onSaveModule={() => {
              void content.handleUpdateModule();
            }}
            onCancelEditModule={() => {
              content.setEditModuleId(null);
              content.setEditModuleTitle("");
            }}
            onDeleteModule={(moduleId) => {
              void content.handleDeleteModule(moduleId);
            }}
            onToggleLesson={lessonEditor.toggleLessonPreview}
            onEditLesson={(moduleId, lesson) => {
              void lessonEditor.openEditLessonModal(moduleId, lesson);
            }}
            onDeleteLesson={(moduleId, lessonId) => {
              void lessonEditor.handleDeleteLesson(moduleId, lessonId);
            }}
            onToggleTest={testEditor.toggleTestPreview}
            onEditTest={testEditor.openEditTestModal}
            onDeleteTest={(moduleId, testId) => {
              void testEditor.handleDeleteTest(moduleId, testId);
            }}
            onToggleExercise={exerciseEditor.toggleExercisePreview}
            onEditExercise={(moduleId, exercise) => {
              void exerciseEditor.openEditExerciseModal(moduleId, exercise);
            }}
            onDeleteExercise={(moduleId, exerciseId) => {
              void exerciseEditor.handleDeleteExercise(moduleId, exerciseId);
            }}
            onCreateLesson={lessonEditor.openCreateLessonModal}
            onCreateTest={testEditor.handleOpenCreateTestModal}
            onCreateExercise={exerciseEditor.handleOpenExerciseCreationChoice}
            onCreateModule={content.openNewModuleComposer}
            onBack={() => setActiveStep(1)}
            onContinueToReview={() => setActiveStep(3)}
          />
        ) : null}

        {activeStep === 3 ? (
          <CourseBuilderReviewStep
            title="Фінальний перегляд"
            publishBlockingIssues={publishBlockingIssues}
            courseId={currentCourseId}
            currentCourseName={currentCourseName}
            courseDescription={courseDescription}
            courseThumbnailPath={media.courseThumbnailPath}
            courseThumbnailUrl={media.courseThumbnailUrl}
            modules={content.modules}
            lessonsByModule={content.lessonsByModule}
            testsByModule={content.testsByModule}
            exercisesByModule={content.exercisesByModule}
            onSaveDraft={() => {
              void handleSaveDraft();
            }}
            onPublish={() => {
              void handlePublishCourse();
            }}
            canPublish={
              !isReviewContentLoading &&
              isBasicsComplete &&
              publishBlockingIssues.length === 0
            }
          />
        ) : null}
      </main>

      <CourseBuilderModals
        currentCourseName={currentCourseName}
        modules={content.modules}
        lessonsByModule={content.lessonsByModule}
        testsByModule={content.testsByModule}
        exercisesByModule={content.exercisesByModule}
        media={media}
        lessonEditor={lessonEditor}
        testEditor={testEditor}
        exerciseEditor={exerciseEditor}
      />
    </div>
  );
});

CourseBuilderPage.displayName = "CourseBuilderPage";
