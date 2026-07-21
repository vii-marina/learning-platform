import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAppToast } from "../../components/ui/appToastContext";
import { LoadingState } from "../../components/ui/LoadingState";
import { CourseBuilderContentStep } from "../../features/courses/components/course-builder/components/CourseBuilderContentStep";
import { CourseBuilderCourseInfoStep } from "../../features/courses/components/course-builder/components/CourseBuilderCourseInfoStep";
import { CourseBuilderHeader } from "../../features/courses/components/course-builder/components/CourseBuilderHeader";
import { CourseBuilderReviewStep } from "../../features/courses/components/course-builder/components/CourseBuilderReviewStep";
import { CourseThumbnailCropModal } from "../../features/courses/components/course-builder/components/CourseThumbnailCropModal";
import { ExerciseCreateModal } from "../../features/courses/components/course-builder/components/ExerciseCreateModal";
import { LessonCreateModal } from "../../features/courses/components/course-builder/components/LessonCreateModal";
import { TestCreateModal } from "../../features/courses/components/course-builder/components/TestCreateModal";
import { useCourseBuilderContentData } from "../../features/courses/components/course-builder/hooks/useCourseBuilderContentData";
import { useCourseBuilderExerciseEditor } from "../../features/courses/components/course-builder/hooks/useCourseBuilderExerciseEditor";
import { useCourseBuilderLessonEditor } from "../../features/courses/components/course-builder/hooks/useCourseBuilderLessonEditor";
import { useCourseBuilderLifecycle } from "../../features/courses/components/course-builder/hooks/useCourseBuilderLifecycle";
import { useCourseBuilderMedia } from "../../features/courses/components/course-builder/hooks/useCourseBuilderMedia";
import { useCourseBuilderPersistence } from "../../features/courses/components/course-builder/hooks/useCourseBuilderPersistence";
import { useCourseBuilderTestEditor } from "../../features/courses/components/course-builder/hooks/useCourseBuilderTestEditor";
import {
  courseBuilderSteps,
  type BuilderStep,
  createLocalEntityId,
  type SavedCourseSnapshot,
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
  const navigate = useNavigate();
  // Course shell state.
  const [message, setMessage] = useState("");
  const { showSuccessToast } = useAppToast();
  const [activeStep, setActiveStep] = useState<BuilderStep>(initialStep);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [isPersistingCourse, setIsPersistingCourse] = useState(false);
  const [isHydratingCourse, setIsHydratingCourse] = useState(Boolean(initialCourseId));
  const [savedCourseSnapshot, setSavedCourseSnapshot] =
    useState<SavedCourseSnapshot | null>(null);
  const draftCourseSessionIdRef = useRef(createLocalEntityId("draft-course"));
  const draftCourseSessionId = draftCourseSessionIdRef.current;

  // Course basics state.
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  const {
    courseThumbnailPath,
    setCourseThumbnailPath,
    courseThumbnailUrl,
    pendingThumbnailCropFile,
    isUploadingCourseMedia,
    handleCourseMediaSelect,
    handleCourseThumbnailCropClose,
    handleCourseThumbnailCropConfirm,
    handleCourseMediaRemove,
  } = useCourseBuilderMedia({
    currentCourseId,
    draftCourseSessionId,
    courseTitle,
    courseDescription,
    setMessage,
    setSavedCourseSnapshot,
  });

  const {
    modules,
    hasFetchedModules,
    modulesLoadState,
    expandedModuleId,
    isNewModuleComposerOpen,
    isCreatingModule,
    newModuleTitle,
    editModuleId,
    editModuleTitle,
    lessonsByModule,
    testsByModule,
    exercisesByModule,
    moduleContentLoadStateByModule,
    nextModuleOrder,
    setModules,
    setHasFetchedModules,
    setModulesLoadState,
    setNewModuleTitle,
    setEditModuleId,
    setEditModuleTitle,
    setLessonsByModule,
    setTestsByModule,
    setExercisesByModule,
    setModuleContentLoadStateByModule,
    fetchModules,
    fetchLessons,
    fetchTests,
    fetchExercises,
    fetchModuleContent,
    openNewModuleComposer,
    handleSaveNewModule,
    handleUpdateModule,
    handleDeleteModule,
    toggleModule,
    setExpandedModuleId,
  } = useCourseBuilderContentData({
    currentCourseId,
    draftCourseSessionId,
    setMessage,
    onModuleDeleted: handleModuleDeletedUiCleanup,
  });

  // Derived state.
  const isBasicsComplete =
    courseTitle.trim().length > 0 && courseDescription.trim().length > 0;
  const currentCourseSnapshot = useMemo<SavedCourseSnapshot>(
    () => ({
      title: courseTitle.trim(),
      description: courseDescription.trim(),
      thumbnailPath: courseThumbnailPath,
    }),
    [courseDescription, courseThumbnailPath, courseTitle]
  );
  const isNewModuleComposerDirty =
    isNewModuleComposerOpen && newModuleTitle.trim().length > 0;
  const isModuleEditDirty = useMemo(() => {
    if (!editModuleId) {
      return false;
    }

    const activeModule = modules.find((module) => module.id === editModuleId);

    if (!activeModule) {
      return false;
    }

    return editModuleTitle.trim() !== activeModule.title.trim();
  }, [editModuleId, editModuleTitle, modules]);
  const hasStartedCourseDraft = useMemo(
    () =>
      currentCourseSnapshot.title.length > 0 ||
      currentCourseSnapshot.description.length > 0 ||
      Boolean(currentCourseSnapshot.thumbnailPath) ||
      modules.length > 0 ||
      Object.values(lessonsByModule).some((lessons) => lessons.length > 0) ||
      Object.values(testsByModule).some((tests) => tests.length > 0),
    [currentCourseSnapshot, lessonsByModule, modules.length, testsByModule]
  );
  const hasUnsavedCourseBasics =
    currentCourseId === null
      ? hasStartedCourseDraft
      : savedCourseSnapshot !== null &&
        (savedCourseSnapshot.title !== currentCourseSnapshot.title ||
          savedCourseSnapshot.description !== currentCourseSnapshot.description ||
          savedCourseSnapshot.thumbnailPath !== currentCourseSnapshot.thumbnailPath);
  const canSaveDraft =
    !isPersistingCourse &&
    !isHydratingCourse &&
    (hasStartedCourseDraft || currentCourseId !== null);

  // Review state.
  const totalLessons = useMemo(
    () =>
      modules.reduce((sum, module) => sum + (lessonsByModule[module.id]?.length || 0), 0),
    [lessonsByModule, modules]
  );
  const isReviewContentLoading = useMemo(
    () =>
      modules.some(
        (module) =>
          lessonsByModule[module.id] === undefined ||
          testsByModule[module.id] === undefined ||
          exercisesByModule[module.id] === undefined
      ),
    [exercisesByModule, lessonsByModule, modules, testsByModule]
  );
  const publishBlockingIssues = useMemo(() => {
    const issues: string[] = [];

    if (modules.length === 0) {
      issues.push("Додайте принаймні один модуль перед публікацією курсу.");
      return issues;
    }

    if (!isReviewContentLoading && totalLessons === 0) {
      issues.push("Додайте принаймні один урок, щоб принаймні один модуль містив зміст уроку.");
    }

    return issues;
  }, [isReviewContentLoading, modules.length, totalLessons]);

  const {
    persistTestQuestions,
    persistCourseAtFinalStep,
    resolveAiGenerationTarget,
    resolveExerciseEditorModuleId,
  } = useCourseBuilderPersistence({
    currentCourseId,
    setCurrentCourseId,
    isPersistingCourse,
    setIsPersistingCourse,
    courseTitle,
    courseDescription,
    courseThumbnailPath,
    currentCourseSnapshot,
    setSavedCourseSnapshot,
    isBasicsComplete,
    canSaveDraft,
    modules,
    lessonsByModule,
    testsByModule,
    setModules,
    setLessonsByModule,
    setTestsByModule,
    setExercisesByModule,
    setHasFetchedModules,
    setModulesLoadState,
    setModuleContentLoadStateByModule,
    setMessage,
    showSuccessToast,
  });

  const {
    lessonEditorModuleId,
    editingLessonId,
    isCreatingLesson,
    isLoadingLessonDraft,
    lessonEditorNotice,
    lessonTitle,
    lessonContent,
    lessonVideoUrl,
    pendingLessonDraft,
    expandedLessonIds,
    shouldGuardLessonDraft,
    setPendingLessonDraft,
    setExpandedLessonIds,
    openCreateLessonModal,
    openEditLessonModal,
    handleLessonTitleChange,
    handleLessonContentChange,
    handleLessonVideoUrlChange,
    handleLessonEditorSelectLesson,
    handleLessonEditorSelectDraft,
    handleLessonEditorClose,
    handleLessonContentImageUpload,
    handleCreateLesson,
    handleDeleteLesson,
    toggleLessonPreview,
  } = useCourseBuilderLessonEditor({
    currentCourseId,
    draftCourseSessionId,
    lessonsByModule,
    testsByModule,
    setLessonsByModule,
    setTestsByModule,
    fetchLessons,
    fetchTests,
    fetchExercises,
    persistDraftCourse: () => persistCourseAtFinalStep("draft"),
    isPersistingCourse,
    setMessage,
  });

  const {
    testEditorModuleId,
    editingTestId,
    isSavingTest,
    isGeneratingAiQuestions,
    testAfterLessonId,
    testIsGraded,
    setTestIsGraded,
    testQuestions,
    testAiGenerationMode,
    testAiQuestionCount,
    expandedTestIds,
    testCreateInitialMode,
    activeTestModuleLessons,
    testAiQuestionLimit,
    canSaveCurrentTest,
    canGenerateTestAi,
    isTestDirty,
    setTestAiGenerationMode,
    setTestAiQuestionCount,
    setTestAfterLessonId,
    setExpandedTestIds,
    closeCreateTestModal,
    openEditTestModal,
    handleOpenCreateTestModal,
    handleAddTestQuestion,
    handleChangeTestQuestion,
    handleDeleteTestQuestion,
    handleGenerateTestQuestionsWithAi,
    handleCreateTest,
    handleDeleteTest,
    toggleTestPreview,
  } = useCourseBuilderTestEditor({
    currentCourseId,
    modules,
    lessonsByModule,
    testsByModule,
    setTestsByModule,
    fetchTests,
    persistTestQuestions,
    resolveAiGenerationTarget,
    setMessage,
  });

  const {
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
  } = useCourseBuilderExerciseEditor({
    currentCourseId,
    lessonsByModule,
    exercisesByModule,
    setExercisesByModule,
    fetchLessons,
    fetchExercises,
    resolveExerciseEditorModuleId,
    resolveAiGenerationTarget,
    setMessage,
  });

  function handleModuleDeletedUiCleanup({
    moduleId,
    lessonIds,
    testIds,
    exerciseIds,
  }: {
    moduleId: string;
    lessonIds: string[];
    testIds: string[];
    exerciseIds: string[];
  }) {
    setExpandedLessonIds((prev) => {
      const next = { ...prev };
      lessonIds.forEach((lessonId) => {
        delete next[lessonId];
      });
      return next;
    });
    setExpandedTestIds((prev) => {
      const next = { ...prev };
      testIds.forEach((testId) => {
        delete next[testId];
      });
      return next;
    });
    setExpandedExerciseIds((prev) => {
      const next = { ...prev };
      exerciseIds.forEach((exerciseId) => {
        delete next[exerciseId];
      });
      return next;
    });

    if (pendingLessonDraft?.moduleId === moduleId) {
      setPendingLessonDraft(null);
    }

    if (exerciseEditorModuleId === moduleId) {
      closeCreateExerciseModal();
    }
  }

  const hasUnsavedChanges =
    hasUnsavedCourseBasics ||
    isNewModuleComposerDirty ||
    isModuleEditDirty ||
    shouldGuardLessonDraft ||
    isTestDirty;

  useImperativeHandle(
    ref,
    () => ({
      hasUnsavedChanges,
      canSaveDraft,
      isSavingDraft: isPersistingCourse,
      saveDraft: () => handleSaveDraftRef.current(),
    }),
    [canSaveDraft, hasUnsavedChanges, isPersistingCourse]
  );

  // Course actions.
  const handleSaveDraft = async () => {
    const courseId = await persistCourseAtFinalStep("draft");
    return Boolean(courseId);
  };
  const handleSaveDraftRef = useRef(handleSaveDraft);
  // eslint-disable-next-line react-hooks/immutability -- latest-ref pattern (pre-existing): the closure now captures hook-returned persistCourseAtFinalStep, which the rule treats as frozen; behavior is unchanged
  handleSaveDraftRef.current = handleSaveDraft;

  useCourseBuilderLifecycle({
    initialCourseId,
    activeStep,
    currentCourseId,
    hasFetchedModules,
    modulesLoadState,
    modules,
    lessonsByModule,
    testsByModule,
    exercisesByModule,
    isNewModuleComposerOpen,
    hasUnsavedChanges,
    setActiveStep,
    setIsHydratingCourse,
    setCurrentCourseId,
    setSavedCourseSnapshot,
    setCourseTitle,
    setCourseDescription,
    setCourseThumbnailPath,
    setMessage,
    setModules,
    setLessonsByModule,
    setTestsByModule,
    setExercisesByModule,
    setHasFetchedModules,
    setModulesLoadState,
    setModuleContentLoadStateByModule,
    setExpandedModuleId,
    fetchModules,
    openNewModuleComposer,
  });

  // Global keyboard shortcut.
  useEffect(() => {
    const handleSaveDraftShortcut = (event: KeyboardEvent) => {
      const isSaveShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";

      if (!isSaveShortcut) {
        return;
      }

      event.preventDefault();

      if (!canSaveDraft || isPersistingCourse) {
        return;
      }

      void handleSaveDraftRef.current();
    };

    window.addEventListener("keydown", handleSaveDraftShortcut);

    return () => {
      window.removeEventListener("keydown", handleSaveDraftShortcut);
    };
  }, [canSaveDraft, isPersistingCourse]);

  // View model and final actions.
  const handlePublishCourse = async () => {
    if (publishBlockingIssues.length > 0) {
      setMessage("Виправте блокуючі проблеми перед публікацією курсу.");
      return;
    }

    const publishedCourseId = await persistCourseAtFinalStep("publish");

    if (!publishedCourseId) {
      return;
    }

    if (onCoursePublished) {
      onCoursePublished();
      return;
    }

    navigate("/teacher/dashboard", { state: { section: "courses" } });
  };

  const currentCourseName = courseTitle.trim() || "Untitled course";
  const currentStepTitle =
    activeStep === 1
      ? initialCourseId || currentCourseId
        ? "Редагування курсу"
        : "Створіть свій курс"
      : activeStep === 2
        ? "Зміст курсу"
        : "Огляд та публікація";
  const currentStepDescription =
    activeStep === 1
      ? ""
      : activeStep === 2
        ? ""
        : "Виконайте фінальну перевірку структури та публікуйте, коли все буде готово.";
  const canRunHeaderAction = canSaveDraft;
  const builderContentKey = currentCourseId ?? draftCourseSessionId;
  const handleBackToCourses = () => {
    if (onBackToCourses) {
      onBackToCourses();
      return;
    }

    navigate("/teacher/dashboard");
  };

  return (
    <div
      className={`${embedded ? "min-h-0 bg-transparent" : "min-h-screen bg-[#f6f7fb]"} text-[#0f172a]`}
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      <CourseBuilderHeader
        steps={courseBuilderSteps}
        activeStep={activeStep}
        currentCourseName={currentCourseName}
        canRunPrimaryAction={canRunHeaderAction}
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
            courseThumbnailPath={courseThumbnailPath}
            courseThumbnailUrl={courseThumbnailUrl}
            isBasicsComplete={isBasicsComplete}
            isUploadingCourseMedia={isUploadingCourseMedia}
            currentCourseId={builderContentKey}
            onCourseTitleChange={setCourseTitle}
            onCourseDescriptionChange={setCourseDescription}
            onCourseMediaSelect={handleCourseMediaSelect}
            onCourseMediaRemove={() => {
              void handleCourseMediaRemove();
            }}
            onNext={() => {
              setActiveStep(2);
            }}
          />
        ) : null}

        {activeStep === 2 ? (
          <CourseBuilderContentStep
            title={currentStepTitle}
            modules={modules}
            modulesLoadState={modulesLoadState}
            isCreatingModule={isCreatingModule}
            isNewModuleComposerOpen={isNewModuleComposerOpen}
            newModuleTitle={newModuleTitle}
            nextModuleOrder={nextModuleOrder}
            lessonsByModule={lessonsByModule}
            testsByModule={testsByModule}
            exercisesByModule={exercisesByModule}
            moduleContentLoadStateByModule={moduleContentLoadStateByModule}
            expandedModuleId={expandedModuleId}
            editModuleId={editModuleId}
            editModuleTitle={editModuleTitle}
            currentCourseId={builderContentKey}
            isPersistedCourse={currentCourseId !== null}
            expandedLessonIds={expandedLessonIds}
            expandedTestIds={expandedTestIds}
            expandedExerciseIds={expandedExerciseIds}
            isPreparingExercise={isPreparingExerciseEditor}
            onNewModuleTitleChange={setNewModuleTitle}
            onSaveNewModule={handleSaveNewModule}
            onToggleModule={(moduleId) => {
              void toggleModule(moduleId);
            }}
            onRetryModules={() => {
              if (!currentCourseId) {
                return;
              }

              void fetchModules(currentCourseId);
            }}
            onRetryModuleContent={(moduleId) => {
              void fetchModuleContent(moduleId);
            }}
            onStartEditModule={(moduleId, title) => {
              setEditModuleId(moduleId);
              setEditModuleTitle(title);
            }}
            onEditModuleTitleChange={setEditModuleTitle}
            onSaveModule={() => {
              void handleUpdateModule();
            }}
            onCancelEditModule={() => {
              setEditModuleId(null);
              setEditModuleTitle("");
            }}
            onDeleteModule={(moduleId) => {
              void handleDeleteModule(moduleId);
            }}
            onToggleLesson={toggleLessonPreview}
            onEditLesson={(moduleId, lesson) => {
              void openEditLessonModal(moduleId, lesson);
            }}
            onDeleteLesson={(moduleId, lessonId) => {
              void handleDeleteLesson(moduleId, lessonId);
            }}
            onToggleTest={toggleTestPreview}
            onEditTest={openEditTestModal}
            onDeleteTest={(moduleId, testId) => {
              void handleDeleteTest(moduleId, testId);
            }}
            onToggleExercise={toggleExercisePreview}
            onEditExercise={(moduleId, exercise) => {
              void openEditExerciseModal(moduleId, exercise);
            }}
            onDeleteExercise={(moduleId, exerciseId) => {
              void handleDeleteExercise(moduleId, exerciseId);
            }}
            onCreateLesson={openCreateLessonModal}
            onCreateTest={handleOpenCreateTestModal}
            onCreateExercise={handleOpenExerciseCreationChoice}
            onCreateModule={openNewModuleComposer}
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
            courseThumbnailPath={courseThumbnailPath}
            courseThumbnailUrl={courseThumbnailUrl}
            modules={modules}
            lessonsByModule={lessonsByModule}
            testsByModule={testsByModule}
            exercisesByModule={exercisesByModule}
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

      <LessonCreateModal
        isOpen={lessonEditorModuleId !== null}
        heading={editingLessonId ? "Редагувати урок" : "Створити урок"}
        saveLabel={editingLessonId ? "Зберегти зміни" : "Зберегти урок"}
        courseTitle={currentCourseName}
        modules={modules}
        lessonsByModule={lessonsByModule}
        testsByModule={testsByModule}
        exercisesByModule={exercisesByModule}
        activeModuleId={lessonEditorModuleId}
        activeLessonId={editingLessonId}
        draftLessonModuleId={pendingLessonDraft?.moduleId ?? null}
        draftLessonTitle={pendingLessonDraft?.draft.title ?? ""}
        title={lessonTitle}
        content={lessonContent}
        videoUrl={lessonVideoUrl}
        notice={lessonEditorNotice}
        isSaving={isCreatingLesson}
        isLoadingLesson={isLoadingLessonDraft}
        isDirty={shouldGuardLessonDraft}
        onClose={handleLessonEditorClose}
        onSave={() => {
          void handleCreateLesson();
        }}
        onSelectLesson={handleLessonEditorSelectLesson}
        onSelectDraftLesson={handleLessonEditorSelectDraft}
        onTitleChange={handleLessonTitleChange}
        onContentChange={handleLessonContentChange}
        onVideoUrlChange={handleLessonVideoUrlChange}
        onImageUpload={handleLessonContentImageUpload}
      />

      <TestCreateModal
        key={
          testEditorModuleId === null
            ? "test-editor-closed"
            : `${testEditorModuleId}-${editingTestId ?? "new"}-${
                testCreateInitialMode ?? "auto"
              }`
        }
        isOpen={testEditorModuleId !== null}
        initialMode={testCreateInitialMode}
        heading={editingTestId ? "Edit Test" : "Create Test"}
        saveLabel={editingTestId ? "Save Changes" : "Save Test"}
        courseTitle={currentCourseName}
        modules={modules}
        lessonsByModule={lessonsByModule}
        testsByModule={testsByModule}
        exercisesByModule={exercisesByModule}
        activeModuleId={testEditorModuleId}
        activeTestId={editingTestId}
        lessons={activeTestModuleLessons}
        selectedAfterLessonId={testAfterLessonId}
        questions={testQuestions}
        canSave={canSaveCurrentTest}
        isSaving={isSavingTest}
        aiGenerationMode={testAiGenerationMode}
        aiQuestionCount={testAiQuestionCount}
        maxAiQuestionCount={testAiQuestionLimit}
        canGenerateAi={canGenerateTestAi}
        isGeneratingAi={isGeneratingAiQuestions}
        onClose={closeCreateTestModal}
        onSave={() => {
          void handleCreateTest();
        }}
        onGenerateAi={handleGenerateTestQuestionsWithAi}
        onAiGenerationModeChange={setTestAiGenerationMode}
        onAiQuestionCountChange={setTestAiQuestionCount}
        onAfterLessonChange={setTestAfterLessonId}
        isGraded={testIsGraded}
        onIsGradedChange={setTestIsGraded}
        onAddQuestion={handleAddTestQuestion}
        onQuestionChange={handleChangeTestQuestion}
        onDeleteQuestion={handleDeleteTestQuestion}
      />

      <ExerciseCreateModal
        key={
          exerciseEditorModuleId === null
            ? "exercise-editor-closed"
            : `${exerciseEditorModuleId}-${editingExerciseId ?? "new"}-${
                exerciseEditorInitialDraft?.type ?? "drag_drop_code"
              }-${exerciseEditorInitialDraft?.afterLessonId ?? "module"}`
        }
        isOpen={exerciseEditorModuleId !== null}
        initialMode={exerciseCreateInitialMode}
        heading={editingExerciseId ? "Редагувати вправу" : "Створити вправу"}
        saveLabel={editingExerciseId ? "Зберегти зміни" : "Зберегти вправу"}
        courseTitle={currentCourseName}
        modules={modules}
        lessonsByModule={lessonsByModule}
        testsByModule={testsByModule}
        exercisesByModule={exercisesByModule}
        activeModuleId={exerciseEditorModuleId}
        activeExerciseId={editingExerciseId}
        lessons={exerciseEditorModuleId ? lessonsByModule[exerciseEditorModuleId] || [] : []}
        initialDraft={exerciseEditorInitialDraft}
        isSaving={isSavingExercise}
        errorMessage={exerciseEditorError}
        onClose={closeCreateExerciseModal}
        onGenerateAi={handleGenerateExerciseWithAi}
        onSave={(draft) => {
          void handleSaveExercise(draft);
        }}
      />
      <CourseThumbnailCropModal
        isOpen={pendingThumbnailCropFile !== null}
        sourceFile={pendingThumbnailCropFile}
        isUploading={isUploadingCourseMedia}
        onClose={handleCourseThumbnailCropClose}
        onConfirm={handleCourseThumbnailCropConfirm}
      />
    </div>
  );
});

CourseBuilderPage.displayName = "CourseBuilderPage";
