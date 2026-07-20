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
import { supabase } from "../../lib/supabase";
import {
  createCourse,
  createLesson,
  createModule,
  createTestAnswer,
  createTestEntity,
  createTestQuestion,
  deleteTestQuestion,
  getCourseById,
  listLessonsByModule,
  type HydratedTestEntityResponse,
  listModuleContent,
  listModulesByCourse,
  listTestQuestions,
  publishCourse,
  upsertLessonPrimaryRichTextBlock,
  updateCourse,
} from "../../features/courses/api";
import {
  deleteCourseMedia,
  getCourseMediaPublicUrl,
  isAllowedCourseThumbnailFile,
  uploadCourseMedia,
} from "../../features/courses/api/courseMediaStorage";
import type {
  Exercise,
} from "../../features/courses/api";
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
import { useCourseBuilderTestEditor } from "../../features/courses/components/course-builder/hooks/useCourseBuilderTestEditor";
import type {
  CourseExercise,
  CourseTest,
  CourseTestQuestion,
} from "../../features/courses/components/course-builder/types/courseBuilderUiTypes";
import {
  courseBuilderSteps,
  type BuilderStep,
  buildAnswerPayloads,
  createLocalEntityId,
  getGeneratedCourseTestTitle,
  mapQuestionToCourseTestQuestion,
  type SavedCourseSnapshot,
} from "../../features/courses/components/course-builder/lib/courseBuilderPageUtils";

export type CourseBuilderPageHandle = {
  hasUnsavedChanges: boolean;
  canSaveDraft: boolean;
  isSavingDraft: boolean;
  saveDraft: () => Promise<boolean>;
};

// Local mapping helpers keep persisted models separate from editor drafts.
function mapExerciseToCourseExercise(exercise: Exercise): CourseExercise {
  return {
    id: exercise.id,
    title: exercise.title,
    description: exercise.description,
    afterLessonId: exercise.after_lesson_id,
    type: exercise.type,
    content: exercise.content,
    createdAt: exercise.created_at,
    updatedAt: exercise.updated_at,
  };
}

function mapHydratedTestsToCourseTests(tests: HydratedTestEntityResponse[]): CourseTest[] {
  return tests.map((test) => ({
    id: test.id,
    title: test.title,
    afterLessonId: test.after_lesson_id,
    order: test.order,
    isGraded: test.is_graded,
    questions: test.questions.map((question) =>
      mapQuestionToCourseTestQuestion(question, question.answers)
    ),
  }));
}
export const CourseBuilderPage = forwardRef<
  CourseBuilderPageHandle,
  {
    embedded?: boolean;
    initialCourseId?: string | null;
    initialStep?: BuilderStep;
    onBackToCourses?: () => void;
  }
>(function CourseBuilderPage(
  {
    embedded = false,
    initialCourseId = null,
    initialStep = 1,
    onBackToCourses,
  }: {
    embedded?: boolean;
    initialCourseId?: string | null;
    initialStep?: BuilderStep;
    onBackToCourses?: () => void;
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
  const [courseThumbnailPath, setCourseThumbnailPath] = useState<string | null>(null);
  const [pendingThumbnailCropFile, setPendingThumbnailCropFile] = useState<File | null>(null);
  const [isUploadingCourseMedia, setIsUploadingCourseMedia] = useState(false);

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
  const courseThumbnailUrl = useMemo(
    () => getCourseMediaPublicUrl(courseThumbnailPath),
    [courseThumbnailPath]
  );
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

  // Persistence helpers.
  const hydratePersistedCourse = async (
    courseId: string,
    courseSnapshot?: SavedCourseSnapshot
  ) => {
    setHasFetchedModules(false);
    setModulesLoadState("loading");

    try {
      const persistedModules = await listModulesByCourse(courseId);
      const moduleContent = await Promise.all(
        persistedModules.map(async (module) => {
          const content = await listModuleContent(module.id);

          return {
            moduleId: module.id,
            lessons: content.lessons,
            tests: mapHydratedTestsToCourseTests(content.tests),
            exercises: content.exercises.map(mapExerciseToCourseExercise),
          };
        })
      );

      setModules(persistedModules);
      setLessonsByModule(
        Object.fromEntries(
          moduleContent.map(({ moduleId, lessons }) => [moduleId, lessons])
        )
      );
      setTestsByModule(
        Object.fromEntries(moduleContent.map(({ moduleId, tests }) => [moduleId, tests]))
      );
      setExercisesByModule(
        Object.fromEntries(moduleContent.map(({ moduleId, exercises }) => [moduleId, exercises]))
      );
      setHasFetchedModules(true);
      setModulesLoadState("ready");
      setModuleContentLoadStateByModule(
        Object.fromEntries(
          persistedModules.map((module) => [module.id, "ready" as const])
        )
      );
      setCurrentCourseId(courseId);
      setSavedCourseSnapshot(courseSnapshot ?? currentCourseSnapshot);
      setMessage("");
    } catch (error) {
      setModulesLoadState("error");

      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return;
      }

      setMessage("Не вдалося перезавантажити збережений курс.");
    }
  };

  const persistTestQuestions = async (testId: string, questions: CourseTestQuestion[]) => {
    const existingQuestions = await listTestQuestions(testId);

    for (const question of existingQuestions) {
      await deleteTestQuestion(question.id);
    }

    for (const [questionIndex, question] of questions.entries()) {
      const createdQuestion = await createTestQuestion({
        test_id: testId,
        type: question.type,
        question_text: question.questionText.trim(),
        order: questionIndex + 1,
        hint: question.hint ?? null,
      });

      const answers = buildAnswerPayloads(question);
      for (const answer of answers) {
        await createTestAnswer({
          question_id: createdQuestion.id,
          answer_text: answer.answer_text,
          is_correct: answer.is_correct,
        });
      }
    }
  };

  const persistLocalCourseContent = async (courseId: string) => {
    const sortedModules = [...modules].sort((left, right) => left.order - right.order);
    const lessonIdMap = new Map<string, string>();

    for (const module of sortedModules) {
      const createdModule = await createModule({
        course_id: courseId,
        title: module.title,
        order: module.order,
      });
      const moduleLessons = [...(lessonsByModule[module.id] || [])].sort(
        (left, right) => left.order - right.order
      );

      for (const lesson of moduleLessons) {
        const createdLesson = await createLesson({
          module_id: createdModule.id,
          title: lesson.title,
          content: lesson.content,
          video_url: lesson.video_url,
          content_type: lesson.content_type ?? "rich_text",
          order: lesson.order,
        });

        lessonIdMap.set(lesson.id, createdLesson.id);
        await upsertLessonPrimaryRichTextBlock(createdLesson.id, lesson.content ?? "");
      }

      const moduleTests = [...(testsByModule[module.id] || [])].sort(
        (left, right) => left.order - right.order
      );

      for (const test of moduleTests) {
        const persistedTest = await createTestEntity({
          module_id: createdModule.id,
          title: getGeneratedCourseTestTitle({
            moduleOrder: module.order,
            lessons: moduleLessons,
            afterLessonId: test.afterLessonId,
            fallbackTitle: test.title,
          }),
          after_lesson_id: test.afterLessonId
            ? lessonIdMap.get(test.afterLessonId) ?? null
            : null,
          order: test.order,
        });

        await persistTestQuestions(persistedTest.id, test.questions);
      }
    }
  };

  const persistCourseAtFinalStep = async (action: "draft" | "publish") => {
    if (isPersistingCourse) {
      return null;
    }

    if (action === "publish" && !isBasicsComplete) {
      return null;
    }

    if (action === "draft" && !canSaveDraft) {
      return null;
    }

    setIsPersistingCourse(true);

    try {
      const normalizedDraftTitle = courseTitle.trim() || "Курс без назви";
      const normalizedDescription = courseDescription.trim() || null;

      if (currentCourseId) {
        await updateCourse(currentCourseId, {
          title: action === "draft" ? normalizedDraftTitle : courseTitle.trim(),
          description: normalizedDescription,
          thumbnail_path: courseThumbnailPath,
        });

        if (action === "publish") {
          await publishCourse(currentCourseId);
        }

        setSavedCourseSnapshot(currentCourseSnapshot);
        setMessage("");
        showSuccessToast(action === "publish" ? "Курс опубліковано." : "Чернетка збережена.");
        return currentCourseId;
      }

      const teacherId = await getCurrentTeacherId();
      const createdCourse = await createCourse({
        teacher_id: teacherId,
        title: action === "draft" ? normalizedDraftTitle : courseTitle.trim(),
        description: normalizedDescription,
        thumbnail_path: courseThumbnailPath,
        is_published: false,
      });

      await persistLocalCourseContent(createdCourse.id);

      if (action === "publish") {
        await publishCourse(createdCourse.id);
      }

      await hydratePersistedCourse(createdCourse.id);
      setSavedCourseSnapshot(currentCourseSnapshot);
      setMessage("");
      showSuccessToast(action === "publish" ? "Курс опубліковано." : "Чернетка збережена.");
      return createdCourse.id;
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return null;
      }

      setMessage(
        action === "publish" ? "Не вдалося опублікувати курс." : "Не вдалося зберегти чернетку."
      );
      return null;
    } finally {
      setIsPersistingCourse(false);
    }
  };

  const getCurrentTeacherId = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error("Не вдалося знайти поточного викладача.");
    }
    return data.user.id;
  };

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

  // Lifecycle effects.
  useEffect(() => {
    if (!initialCourseId) {
      setIsHydratingCourse(false);
      return;
    }

    let isCancelled = false;
    const courseSnapshotFromDb = async () => {
      setIsHydratingCourse(true);
      setMessage("");
      setActiveStep(1);
      setHasFetchedModules(false);
      setModulesLoadState("idle");
      setModules([]);
      setLessonsByModule({});
      setTestsByModule({});
      setExercisesByModule({});
      setModuleContentLoadStateByModule({});
      setExpandedModuleId(null);
      setCurrentCourseId(null);

      try {
        const course = await getCourseById(initialCourseId);
        const snapshot: SavedCourseSnapshot = {
          title: course.title ?? "",
          description: course.description ?? "",
          thumbnailPath: course.thumbnail_path,
        };

        if (isCancelled) {
          return;
        }

        setCourseTitle(snapshot.title);
        setCourseDescription(snapshot.description);
        setCourseThumbnailPath(snapshot.thumbnailPath);
        setCurrentCourseId(initialCourseId);
        setSavedCourseSnapshot(snapshot);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error instanceof Error && error.message.trim()) {
          setMessage(error.message);
        } else {
          setMessage("Не вдалося завантажити вибраний курс.");
        }
      } finally {
        if (!isCancelled) {
          setIsHydratingCourse(false);
        }
      }
    };

    void courseSnapshotFromDb();

    return () => {
      isCancelled = true;
    };
  }, [
    initialCourseId,
    setExercisesByModule,
    setExpandedModuleId,
    setHasFetchedModules,
    setLessonsByModule,
    setModuleContentLoadStateByModule,
    setModules,
    setModulesLoadState,
    setTestsByModule,
  ]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

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

  useEffect(() => {
    if (!currentCourseId) {
      queueMicrotask(() => {
        setHasFetchedModules(false);
        setModulesLoadState("idle");
      });
      return;
    }

    if (hasFetchedModules) {
      return;
    }

    queueMicrotask(() => {
      void fetchModules(currentCourseId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch modules once per course; fetchModules is recreated each render and must not re-trigger this
  }, [currentCourseId, hasFetchedModules]);

  useEffect(() => {
    if (
      activeStep !== 2 ||
      (currentCourseId ? modulesLoadState !== "ready" : false) ||
      (currentCourseId ? !hasFetchedModules : false) ||
      modules.length > 0 ||
      isNewModuleComposerOpen
    ) {
      return;
    }

    openNewModuleComposer();
    setExpandedModuleId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openNewModuleComposer is recreated each render; this should only react to the step/module state below
  }, [
    activeStep,
    currentCourseId,
    hasFetchedModules,
    isNewModuleComposerOpen,
    modulesLoadState,
    modules.length,
  ]);

  useEffect(() => {
    if (activeStep !== 3 || !currentCourseId || !hasFetchedModules) {
      return;
    }

    const missingModuleIds = modules
      .filter(
        (module) =>
          lessonsByModule[module.id] === undefined ||
          testsByModule[module.id] === undefined ||
          exercisesByModule[module.id] === undefined
      )
      .map((module) => module.id);

    if (missingModuleIds.length === 0) {
      return;
    }

    let isCancelled = false;

    void Promise.all(
      missingModuleIds.map(async (moduleId) => ({
        moduleId,
        content: await listModuleContent(moduleId),
      }))
    )
      .then((results) => {
        if (isCancelled) {
          return;
        }

        const lessonsEntries = results.map(({ moduleId, content }) => [moduleId, content.lessons]);
        const testsEntries = results.map(({ moduleId, content }) => [
          moduleId,
          mapHydratedTestsToCourseTests(content.tests),
        ]);
        const exercisesEntries = results.map(({ moduleId, content }) => [
          moduleId,
          content.exercises.map(mapExerciseToCourseExercise),
        ]);

        setLessonsByModule((prev) => ({
          ...prev,
          ...Object.fromEntries(lessonsEntries),
        }));
        setTestsByModule((prev) => ({
          ...prev,
          ...Object.fromEntries(testsEntries),
        }));
        setExercisesByModule((prev) => ({
          ...prev,
          ...Object.fromEntries(exercisesEntries),
        }));
        setMessage("");
      })
      .catch((error) => {
        if (!isCancelled) {
          if (error instanceof Error && error.message.trim()) {
            setMessage(error.message);
          } else {
            setMessage("Не вдалося завантажити вміст модуля.");
          }
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [
    activeStep,
    currentCourseId,
    exercisesByModule,
    hasFetchedModules,
    lessonsByModule,
    modules,
    testsByModule,
    setExercisesByModule,
    setLessonsByModule,
    setTestsByModule,
  ]);

  // Course actions.
  const handleSaveDraft = async () => {
    const courseId = await persistCourseAtFinalStep("draft");
    return Boolean(courseId);
  };
    const handleSaveDraftRef = useRef(handleSaveDraft);
  handleSaveDraftRef.current = handleSaveDraft;

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

  const uploadCourseMediaFile = async (file: File) => {
    const mediaScopeId = currentCourseId ?? draftCourseSessionId;

    try {
      setIsUploadingCourseMedia(true);
      const uploadedPath = await uploadCourseMedia(mediaScopeId, file);
      setCourseThumbnailPath(uploadedPath);

      if (currentCourseId) {
        await updateCourse(currentCourseId, {
          thumbnail_path: uploadedPath,
        });
        setSavedCourseSnapshot((previousSnapshot) =>
          previousSnapshot
            ? {
                ...previousSnapshot,
                thumbnailPath: uploadedPath,
              }
            : {
                ...currentCourseSnapshot,
                thumbnailPath: uploadedPath,
              }
        );
      }

      setMessage("");
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Не вдалося завантажити медіа курсів.");
      }

      return false;
    } finally {
      setIsUploadingCourseMedia(false);
    }
  };

  const handleCourseMediaSelect = (file: File) => {
    if (!isAllowedCourseThumbnailFile(file)) {
      setMessage("Головне фото курсу повинно бути зображенням у форматі PNG, JPG або JPEG.");
      return;
    }

    setPendingThumbnailCropFile(file);
  };

  const handleCourseThumbnailCropClose = () => {
    if (isUploadingCourseMedia) {
      return;
    }

    setPendingThumbnailCropFile(null);
  };

  const handleCourseThumbnailCropConfirm = async (file: File) => {
    const didUploadSucceed = await uploadCourseMediaFile(file);

    if (didUploadSucceed) {
      setPendingThumbnailCropFile(null);
    }
  };

  const handleCourseMediaRemove = async () => {
    if (!courseThumbnailPath || isUploadingCourseMedia) {
      return;
    }

    const mediaPathToRemove = courseThumbnailPath;

    try {
      setIsUploadingCourseMedia(true);

      if (currentCourseId) {
        await updateCourse(currentCourseId, {
          thumbnail_path: null,
        });
      }

      let storageCleanupMessage = "";

      try {
        await deleteCourseMedia(mediaPathToRemove);
      } catch (error) {
        storageCleanupMessage =
          error instanceof Error && error.message.trim()
            ? `${error.message} Головне фото курсу було видалено, але старий файл не вдалося видалити.`
            : "Головне фото курсу було видалено, але старий файл не вдалося видалити.";
      }

      setCourseThumbnailPath(null);

      if (currentCourseId) {
        setSavedCourseSnapshot((previousSnapshot) =>
          previousSnapshot
            ? {
                ...previousSnapshot,
                thumbnailPath: null,
              }
            : {
                ...currentCourseSnapshot,
                thumbnailPath: null,
              }
        );
      }

      setMessage(storageCleanupMessage);
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Не вдалося видалити медіа курсу.");
      }
    } finally {
      setIsUploadingCourseMedia(false);
    }
  };

  // Shared persisted-target resolution for AI and exercise flows.
  async function resolveAiGenerationTarget({
    moduleId,
    afterLessonId,
  }: {
    moduleId: string;
    afterLessonId: string | null;
  }) {
    const activeModule = modules.find((module) => module.id === moduleId);

    if (!activeModule) {
      throw new Error("Не вдалося знайти вибраний модуль.");
    }

    const selectedLesson = afterLessonId
      ? (lessonsByModule[moduleId] || []).find((lesson) => lesson.id === afterLessonId) ?? null
      : null;

    if (afterLessonId && !selectedLesson) {
      throw new Error("Не вдалося знайти вибраний урок.");
    }

    if (currentCourseId) {
      return {
        moduleId,
        afterLessonId,
      };
    }

    const persistedCourseId = await persistCourseAtFinalStep("draft");

    if (!persistedCourseId) {
      throw new Error("Не вдалося зберегти чернетку перед створенням AI контенту.");
    }

    const persistedModules = await listModulesByCourse(persistedCourseId);
    const persistedModule =
      persistedModules.find((module) => module.order === activeModule.order) ?? null;

    if (!persistedModule) {
      throw new Error("Не вдалося знайти збережений модуль.");
    }

    if (!selectedLesson) {
      return {
        moduleId: persistedModule.id,
        afterLessonId: null,
      };
    }

    const persistedLessons = await listLessonsByModule(persistedModule.id);
    const persistedLesson =
      persistedLessons.find((lesson) => lesson.order === selectedLesson.order) ?? null;

    if (!persistedLesson) {
      throw new Error("Не вдалося знайти збережений урок.");
    }

    return {
      moduleId: persistedModule.id,
      afterLessonId: persistedLesson.id,
    };
  }

  async function resolveExerciseEditorModuleId(moduleId: string) {
    const activeModule = modules.find((module) => module.id === moduleId);

    if (!activeModule) {
      throw new Error("Не вдалося знайти вибраний модуль.");
    }

    if (currentCourseId) {
      return moduleId;
    }

    const persistedCourseId = await persistCourseAtFinalStep("draft");

    if (!persistedCourseId) {
      throw new Error("Не вдалося зберегти чернетку перед створенням вправи.");
    }

    const persistedModules = await listModulesByCourse(persistedCourseId);
    const persistedModule =
      persistedModules.find((module) => module.order === activeModule.order) ?? null;

    if (!persistedModule) {
      throw new Error("Не вдалося знайти збережений модуль.");
    }

    return persistedModule.id;
  }

  // View model and final actions.
  const handlePublishCourse = async () => {
    if (publishBlockingIssues.length > 0) {
      setMessage("Виправте блокуючі проблеми перед публікацією курсу.");
      return;
    }

    void persistCourseAtFinalStep("publish");
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
