import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card } from "../../components/ui/Card";
import { useAppToast } from "../../components/ui/AppToastProvider";
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
  listExercisesByModule,
  listLessonsByModule,
  listModulesByCourse,
  listTestAnswers,
  listTestQuestions,
  listTestsByModule,
  publishCourse,
  upsertLessonPrimaryRichTextBlock,
  updateCourse,
} from "../../features/courses/api";
import {
  getCourseMediaKind,
  getCourseMediaPublicUrl,
  uploadCourseMedia,
} from "../../features/courses/api/courseMediaStorage";
import type {
  Exercise,
  TestEntity,
} from "../../features/courses/api";
import { CourseBuilderContentStep } from "../../features/courses/components/course-builder/CourseBuilderContentStep";
import { CourseBuilderCourseInfoStep } from "../../features/courses/components/course-builder/CourseBuilderCourseInfoStep";
import { CourseBuilderHeader } from "../../features/courses/components/course-builder/CourseBuilderHeader";
import { CourseBuilderReviewStep } from "../../features/courses/components/course-builder/CourseBuilderReviewStep";
import { ExerciseCreateModal } from "../../features/courses/components/course-builder/ExerciseCreateModal";
import { LessonCreateModal } from "../../features/courses/components/course-builder/LessonCreateModal";
import { TestCreateModal } from "../../features/courses/components/course-builder/TestCreateModal";
import { useCourseBuilderContentData } from "../../features/courses/components/course-builder/useCourseBuilderContentData";
import { useCourseBuilderExerciseEditor } from "../../features/courses/components/course-builder/useCourseBuilderExerciseEditor";
import { useCourseBuilderLessonEditor } from "../../features/courses/components/course-builder/useCourseBuilderLessonEditor";
import { useCourseBuilderTestEditor } from "../../features/courses/components/course-builder/useCourseBuilderTestEditor";
import { useCourseBuilderReviewState } from "../../features/courses/components/course-builder/useCourseBuilderReviewState";
import type {
  CourseExercise,
  CourseTest,
  CourseTestQuestion,
} from "../../features/courses/components/course-builder/courseBuilderUiTypes";
import {
  courseBuilderSteps,
  type BuilderStep,
  buildAnswerPayloads,
  createLocalEntityId,
  getGeneratedCourseTestTitle,
  mapQuestionToCourseTestQuestion,
  type SavedCourseSnapshot,
} from "../../features/courses/components/course-builder/courseBuilderPageUtils";

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
export const CourseBuilderPage = forwardRef<
  CourseBuilderPageHandle,
  {
    embedded?: boolean;
    initialCourseId?: string | null;
    initialStep?: BuilderStep;
  }
>(function CourseBuilderPage(
  {
    embedded = false,
    initialCourseId = null,
    initialStep = 1,
  }: {
    embedded?: boolean;
    initialCourseId?: string | null;
    initialStep?: BuilderStep;
  },
  ref
) {
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
    hydrateCourseTest,
    onModuleDeleted: handleModuleDeletedUiCleanup,
  });

  // Derived state.
  const courseThumbnailUrl = useMemo(
    () => getCourseMediaPublicUrl(courseThumbnailPath),
    [courseThumbnailPath]
  );
  const courseThumbnailKind = useMemo(
    () => getCourseMediaKind(courseThumbnailPath),
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
  const {
    totalModules,
    totalLessons,
    totalTests,
    expandedReviewModuleId,
    resolvedReviewSelection,
    reviewPreviewData,
    isReviewContentLoading,
    publishBlockingIssues,
    heroBackgroundStyle,
    currentLessonEmbedUrl,
    currentLessonPosition,
    currentTestLinkedLesson,
    handleReviewModuleToggle,
    handleReviewItemSelect,
  } = useCourseBuilderReviewState({
    activeStep,
    modules,
    lessonsByModule,
    testsByModule,
    courseThumbnailUrl,
    courseThumbnailKind,
  });

  async function hydrateCourseTest(testEntity: TestEntity): Promise<CourseTest> {
    const questions = await listTestQuestions(testEntity.id);
    const questionsWithAnswers = await Promise.all(
      questions.map(async (question) => ({
        question,
        answers: await listTestAnswers(question.id),
      }))
    );

    return {
      id: testEntity.id,
      title: testEntity.title,
      afterLessonId: testEntity.after_lesson_id,
      order: testEntity.order,
      questions: questionsWithAnswers.map(({ question, answers }) =>
        mapQuestionToCourseTestQuestion(question, answers)
      ),
    };
  }

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
          const [lessons, entities, exercises] = await Promise.all([
            listLessonsByModule(module.id),
            listTestsByModule(module.id),
            fetchExercises(module.id),
          ]);
          const tests = await Promise.all(entities.map(hydrateCourseTest));

          return {
            moduleId: module.id,
            lessons,
            tests,
            exercises: exercises ?? [],
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

      setMessage("Unable to reload the saved course.");
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
      const normalizedDraftTitle = courseTitle.trim() || "Untitled course";
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
        showSuccessToast(action === "publish" ? "Course published." : "Draft saved.");
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
      showSuccessToast(action === "publish" ? "Course published." : "Draft saved.");
      return createdCourse.id;
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return null;
      }

      setMessage(
        action === "publish" ? "Unable to publish course." : "Unable to save draft."
      );
      return null;
    } finally {
      setIsPersistingCourse(false);
    }
  };

  const getCurrentTeacherId = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error("Unable to resolve current teacher.");
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
    handleOpenTestCreationChoice,
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
          setMessage("Unable to load the selected course.");
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
  }, [initialCourseId]);

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
      saveDraft: handleSaveDraft,
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
      .filter((module) => lessonsByModule[module.id] === undefined)
      .map((module) => module.id);

    if (missingModuleIds.length === 0) {
      return;
    }

    let isCancelled = false;

    void Promise.all(
      missingModuleIds.map(async (moduleId) => ({
        moduleId,
        lessons: await listLessonsByModule(moduleId),
      }))
    )
      .then((results) => {
        if (isCancelled) {
          return;
        }

        setLessonsByModule((prev) => ({
          ...prev,
          ...Object.fromEntries(results.map(({ moduleId, lessons }) => [moduleId, lessons])),
        }));
        setMessage("");
      })
      .catch(() => {
        if (!isCancelled) {
          setMessage("Unable to load lessons.");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeStep, currentCourseId, hasFetchedModules, lessonsByModule, modules]);

  useEffect(() => {
    if (activeStep !== 3 || !currentCourseId || !hasFetchedModules) {
      return;
    }

    const missingModuleIds = modules
      .filter((module) => testsByModule[module.id] === undefined)
      .map((module) => module.id);

    if (missingModuleIds.length === 0) {
      return;
    }

    let isCancelled = false;

    void Promise.all(
      missingModuleIds.map(async (moduleId) => ({
        moduleId,
        tests: await (async () => {
          const entities = await listTestsByModule(moduleId);
          return Promise.all(entities.map(hydrateCourseTest));
        })(),
      }))
    )
      .then((results) => {
        if (isCancelled) {
          return;
        }

        setTestsByModule((prev) => ({
          ...prev,
          ...Object.fromEntries(results.map(({ moduleId, tests }) => [moduleId, tests])),
        }));
        setMessage("");
      })
      .catch((error) => {
        if (!isCancelled) {
          if (error instanceof Error && error.message.trim()) {
            setMessage(error.message);
          } else {
            setMessage("Unable to load tests.");
          }
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeStep, currentCourseId, hasFetchedModules, modules, testsByModule]);

  useEffect(() => {
    if (activeStep !== 3 || !currentCourseId || !hasFetchedModules) {
      return;
    }

    const missingModuleIds = modules
      .filter((module) => exercisesByModule[module.id] === undefined)
      .map((module) => module.id);

    if (missingModuleIds.length === 0) {
      return;
    }

    let isCancelled = false;

    void Promise.all(
      missingModuleIds.map(async (moduleId) => ({
        moduleId,
        exercises: await listExercisesByModule(moduleId),
      }))
    )
      .then((results) => {
        if (isCancelled) {
          return;
        }

        setExercisesByModule((prev) => ({
          ...prev,
          ...Object.fromEntries(
            results.map(({ moduleId, exercises }) => [
              moduleId,
              exercises.map(mapExerciseToCourseExercise),
            ])
          ),
        }));
        setMessage("");
      })
      .catch((error) => {
        if (!isCancelled) {
          if (error instanceof Error && error.message.trim()) {
            setMessage(error.message);
          } else {
            setMessage("Unable to load exercises.");
          }
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeStep, currentCourseId, exercisesByModule, hasFetchedModules, modules]);

  // Course actions.
  const handleSaveDraft = async () => {
    const courseId = await persistCourseAtFinalStep("draft");
    return Boolean(courseId);
  };

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

      void handleSaveDraft();
    };

    window.addEventListener("keydown", handleSaveDraftShortcut);

    return () => {
      window.removeEventListener("keydown", handleSaveDraftShortcut);
    };
  }, [canSaveDraft, handleSaveDraft, isPersistingCourse]);

  const handleCourseMediaUpload = async (file: File) => {
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
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Unable to upload course media.");
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
      throw new Error("Unable to resolve the selected module.");
    }

    const selectedLesson = afterLessonId
      ? (lessonsByModule[moduleId] || []).find((lesson) => lesson.id === afterLessonId) ?? null
      : null;

    if (afterLessonId && !selectedLesson) {
      throw new Error("Unable to resolve the selected lesson.");
    }

    if (currentCourseId) {
      return {
        moduleId,
        afterLessonId,
      };
    }

    const persistedCourseId = await persistCourseAtFinalStep("draft");

    if (!persistedCourseId) {
      throw new Error("Unable to save the draft before generating AI content.");
    }

    const persistedModules = await listModulesByCourse(persistedCourseId);
    const persistedModule =
      persistedModules.find((module) => module.order === activeModule.order) ?? null;

    if (!persistedModule) {
      throw new Error("Unable to resolve the saved module.");
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
      throw new Error("Unable to resolve the saved lesson.");
    }

    return {
      moduleId: persistedModule.id,
      afterLessonId: persistedLesson.id,
    };
  }

  async function resolveExerciseEditorModuleId(moduleId: string) {
    const activeModule = modules.find((module) => module.id === moduleId);

    if (!activeModule) {
      throw new Error("Unable to resolve the selected module.");
    }

    if (currentCourseId) {
      return moduleId;
    }

    const persistedCourseId = await persistCourseAtFinalStep("draft");

    if (!persistedCourseId) {
      throw new Error("Unable to save the draft before creating an exercise.");
    }

    const persistedModules = await listModulesByCourse(persistedCourseId);
    const persistedModule =
      persistedModules.find((module) => module.order === activeModule.order) ?? null;

    if (!persistedModule) {
      throw new Error("Unable to resolve the saved module.");
    }

    return persistedModule.id;
  }

  // View model and final actions.
  const handlePublishCourse = async () => {
    if (publishBlockingIssues.length > 0) {
      setMessage("Resolve the blocking issues before publishing the course.");
      return;
    }

    void persistCourseAtFinalStep("publish");
  };

  const currentCourseName = courseTitle.trim() || "Untitled course";
  const currentStepTitle =
    activeStep === 1
      ? initialCourseId || currentCourseId
        ? "Edit Course"
        : "Create Your Course"
      : activeStep === 2
        ? "Course Content"
        : "Review & Publish";
  const currentStepDescription =
    activeStep === 1
      ? ""
      : activeStep === 2
        ? ""
        : "Run a final pass on the structure and publish when everything is ready.";
  const canRunHeaderAction = canSaveDraft;
  const builderContentKey = currentCourseId ?? draftCourseSessionId;

  return (
    <div
      className={`${embedded ? "min-h-0 bg-transparent" : "min-h-screen bg-[#f6f8f8]"} text-[#0f172a]`}
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      <CourseBuilderHeader
        steps={courseBuilderSteps}
        activeStep={activeStep}
        currentCourseName={currentCourseName}
        canRunPrimaryAction={canRunHeaderAction}
        primaryActionLabel={isPersistingCourse ? "Saving..." : "Save Draft"}
        canNavigateToStep={(step) => step === 1 || isBasicsComplete}
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
            : "mx-auto max-w-[92rem] px-6 py-8 lg:px-10"
        }`}
      >
        {message ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {message}
          </div>
        ) : null}

        {isHydratingCourse ? (
          <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
            Loading course...
          </Card>
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
            onCourseMediaSelect={(file) => {
              void handleCourseMediaUpload(file);
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
            onSaveNewModule={() => {
              void handleSaveNewModule();
            }}
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
            onCreateTest={handleOpenTestCreationChoice}
            onCreateExercise={handleOpenExerciseCreationChoice}
            onCreateModule={openNewModuleComposer}
            onBack={() => setActiveStep(1)}
            onContinueToReview={() => setActiveStep(3)}
          />
        ) : null}

        {activeStep === 3 ? (
          <CourseBuilderReviewStep
            title="Final Preview"
            publishBlockingIssues={publishBlockingIssues}
            currentCourseName={currentCourseName}
            courseThumbnailUrl={courseThumbnailUrl}
            courseThumbnailKind={courseThumbnailKind}
            heroBackgroundStyle={heroBackgroundStyle}
            modules={modules}
            lessonsByModule={lessonsByModule}
            testsByModule={testsByModule}
            totalModules={totalModules}
            totalLessons={totalLessons}
            totalTests={totalTests}
            expandedReviewModuleId={expandedReviewModuleId}
            resolvedReviewSelection={resolvedReviewSelection}
            reviewPreviewData={reviewPreviewData}
            currentLessonEmbedUrl={currentLessonEmbedUrl}
            currentLessonPosition={currentLessonPosition}
            currentTestLinkedLesson={currentTestLinkedLesson}
            onModuleToggle={handleReviewModuleToggle}
            onItemSelect={handleReviewItemSelect}
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
        heading={editingLessonId ? "Edit Lesson" : "Create Lesson"}
        saveLabel={editingLessonId ? "Save Changes" : "Save Lesson"}
        courseTitle={currentCourseName}
        modules={modules}
        lessonsByModule={lessonsByModule}
        testsByModule={testsByModule}
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
        isOpen={testEditorModuleId !== null}
        initialMode={testCreateInitialMode}
        heading={editingTestId ? "Edit Test" : "Create Test"}
        saveLabel={editingTestId ? "Save Changes" : "Save Test"}
        courseTitle={currentCourseName}
        modules={modules}
        lessonsByModule={lessonsByModule}
        testsByModule={testsByModule}
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
        heading={editingExerciseId ? "Edit Exercise" : "Create Exercise"}
        saveLabel={editingExerciseId ? "Save Changes" : "Save Exercise"}
        courseTitle={currentCourseName}
        modules={modules}
        lessonsByModule={lessonsByModule}
        testsByModule={testsByModule}
        activeModuleId={exerciseEditorModuleId}
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

    </div>
  );
});

CourseBuilderPage.displayName = "CourseBuilderPage";
