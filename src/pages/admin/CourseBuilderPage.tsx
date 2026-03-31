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
  createExercise,
  createLesson,
  createModule,
  createTestAnswer,
  createTestEntity,
  createTestQuestion,
  deleteExercise,
  deleteLesson,
  deleteModule,
  deleteTestEntity,
  deleteTestQuestion,
  generateTestQuestionsWithAi,
  getCourseById,
  listExercisesByModule,
  listLessonBlocksByLesson,
  listLessonsByModule,
  listModulesByCourse,
  listTestAnswers,
  listTestQuestions,
  listTestsByModule,
  publishCourse,
  upsertLessonPrimaryRichTextBlock,
  updateCourse,
  updateExercise,
  updateLesson,
  updateTestEntity,
  updateModule,
} from "../../features/courses/api";
import {
  getCourseMediaKind,
  getCourseMediaPublicUrl,
  uploadCourseMedia,
  uploadLessonContentImage,
} from "../../features/courses/api/courseMediaStorage";
import type {
  AiQuestionGenerationMode,
  Exercise,
  ExerciseContent,
  Lesson,
  Module,
  TestEntity,
} from "../../features/courses/api";
import { CourseBuilderContentStep } from "../../features/courses/components/course-builder/CourseBuilderContentStep";
import { CourseBuilderCourseInfoStep } from "../../features/courses/components/course-builder/CourseBuilderCourseInfoStep";
import { CourseBuilderHeader } from "../../features/courses/components/course-builder/CourseBuilderHeader";
import { CourseBuilderReviewStep } from "../../features/courses/components/course-builder/CourseBuilderReviewStep";
import { ExerciseCreateModal } from "../../features/courses/components/course-builder/ExerciseCreateModal";
import { LessonCreateModal } from "../../features/courses/components/course-builder/LessonCreateModal";
import { TestCreateModal } from "../../features/courses/components/course-builder/TestCreateModal";
import { useCourseBuilderReviewState } from "../../features/courses/components/course-builder/useCourseBuilderReviewState";
import type {
  CourseExercise,
  CourseTest,
  CourseTestQuestion,
  ExerciseEditorDraft,
} from "../../features/courses/components/course-builder/courseBuilderUiTypes";
import {
  courseBuilderSteps,
  EMPTY_LESSON_EDITOR_DRAFT,
  type BuilderStep,
  buildAnswerPayloads,
  canSaveTestDraft,
  cloneTestQuestion,
  createEmptyTestQuestion,
  getDefaultAiQuestionCount,
  getGeneratedCourseTestTitle,
  getLessonAiQuestionLimit,
  getModuleAiQuestionLimit,
  hasLessonContent,
  mapGeneratedQuestionsToCourseTestQuestions,
  mapQuestionToCourseTestQuestion,
  type LessonEditorDraft,
} from "../../features/courses/components/course-builder/courseBuilderPageUtils";

function createLocalEntityId(prefix: string) {
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${uniqueId}`;
}

type SavedCourseSnapshot = {
  title: string;
  description: string;
  thumbnailPath: string | null;
};

type TestEditorDraft = {
  afterLessonId: string | null;
  questions: CourseTestQuestion[];
};

export type CourseBuilderPageHandle = {
  hasUnsavedChanges: boolean;
  canSaveDraft: boolean;
  isSavingDraft: boolean;
  saveDraft: () => Promise<boolean>;
};

function createEmptyTestEditorDraft(): TestEditorDraft {
  return {
    afterLessonId: null,
    questions: [createEmptyTestQuestion()],
  };
}

function createEmptyExerciseDraft(): ExerciseEditorDraft {
  return {
    afterLessonId: null,
    type: "drag_drop_code",
    title: "Fill Missing Code Exercise",
    description: "",
    content: {
      type: "drag_drop_code",
      question: "",
      code_template: "",
      tokens: [],
      correct_answer: [],
      blanks: [],
    },
  };
}

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

function mapCourseExerciseToDraft(exercise: CourseExercise): ExerciseEditorDraft {
  return {
    afterLessonId: exercise.afterLessonId,
    type: exercise.type,
    title: exercise.title,
    description: exercise.description ?? "",
    content: exercise.content,
  } as ExerciseEditorDraft;
}

function areQuestionArraysEqual(
  leftQuestions: CourseTestQuestion[],
  rightQuestions: CourseTestQuestion[]
) {
  if (leftQuestions.length !== rightQuestions.length) {
    return false;
  }

  return leftQuestions.every((leftQuestion, index) => {
    const rightQuestion = rightQuestions[index];

    if (!rightQuestion) {
      return false;
    }

    if (
      leftQuestion.type !== rightQuestion.type ||
      leftQuestion.questionText !== rightQuestion.questionText ||
      (leftQuestion.hint ?? null) !== (rightQuestion.hint ?? null)
    ) {
      return false;
    }

    if (leftQuestion.options.length !== rightQuestion.options.length) {
      return false;
    }

    if (
      leftQuestion.options.some((option, optionIndex) => option !== rightQuestion.options[optionIndex])
    ) {
      return false;
    }

    if (leftQuestion.correctOptionIndexes.length !== rightQuestion.correctOptionIndexes.length) {
      return false;
    }

    return leftQuestion.correctOptionIndexes.every(
      (optionIndex, correctIndex) =>
        optionIndex === rightQuestion.correctOptionIndexes[correctIndex]
    );
  });
}

function areTestDraftsEqual(leftDraft: TestEditorDraft, rightDraft: TestEditorDraft) {
  return (
    leftDraft.afterLessonId === rightDraft.afterLessonId &&
    areQuestionArraysEqual(leftDraft.questions, rightDraft.questions)
  );
}

function hasMeaningfulQuestionDraft(question: CourseTestQuestion) {
  if (question.questionText.trim().length > 0) {
    return true;
  }

  if (question.correctOptionIndexes.length > 0) {
    return true;
  }

  return question.options.some((option, index) => {
    const trimmedOption = option.trim();

    if (!trimmedOption) {
      return false;
    }

    return trimmedOption !== `Option ${index + 1}`;
  });
}

function hasMeaningfulTestQuestionDraft(questions: CourseTestQuestion[]) {
  return questions.length > 1 || questions.some(hasMeaningfulQuestionDraft);
}

export const CourseBuilderPage = forwardRef<
  CourseBuilderPageHandle,
  {
    embedded?: boolean;
    initialCourseId?: string | null;
  }
>(function CourseBuilderPage(
  {
    embedded = false,
    initialCourseId = null,
  }: {
    embedded?: boolean;
    initialCourseId?: string | null;
  },
  ref
) {
  const [message, setMessage] = useState("");
  const { showSuccessToast } = useAppToast();
  const [activeStep, setActiveStep] = useState<BuilderStep>(1);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [isPersistingCourse, setIsPersistingCourse] = useState(false);
  const [isHydratingCourse, setIsHydratingCourse] = useState(Boolean(initialCourseId));
  const [savedCourseSnapshot, setSavedCourseSnapshot] =
    useState<SavedCourseSnapshot | null>(null);
  const draftCourseSessionIdRef = useRef(createLocalEntityId("draft-course"));
  const draftCourseSessionId = draftCourseSessionIdRef.current;

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseThumbnailPath, setCourseThumbnailPath] = useState<string | null>(null);
  const [isUploadingCourseMedia, setIsUploadingCourseMedia] = useState(false);

  const [modules, setModules] = useState<Module[]>([]);
  const [hasFetchedModules, setHasFetchedModules] = useState(false);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [isNewModuleComposerOpen, setIsNewModuleComposerOpen] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");

  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({});
  const [lessonEditorModuleId, setLessonEditorModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [isLoadingLessonDraft, setIsLoadingLessonDraft] = useState(false);
  const [lessonEditorNotice, setLessonEditorNotice] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonInitialDraft, setLessonInitialDraft] =
    useState<LessonEditorDraft>(EMPTY_LESSON_EDITOR_DRAFT);
  const [pendingLessonDraft, setPendingLessonDraft] = useState<{
    moduleId: string;
    draft: LessonEditorDraft;
  } | null>(null);
  const [expandedLessonIds, setExpandedLessonIds] = useState<Record<string, boolean>>({});

  const [testsByModule, setTestsByModule] = useState<Record<string, CourseTest[]>>({});
  const [testEditorModuleId, setTestEditorModuleId] = useState<string | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [isGeneratingAiQuestions, setIsGeneratingAiQuestions] = useState(false);
  const [shouldPersistDraftAfterLessonSave, setShouldPersistDraftAfterLessonSave] =
    useState(false);
  const [testAfterLessonId, setTestAfterLessonId] = useState<string | null>(null);
  const [testQuestions, setTestQuestions] = useState<CourseTestQuestion[]>([]);
  const [testInitialDraft, setTestInitialDraft] = useState<TestEditorDraft | null>(null);
  const [testAiGenerationMode, setTestAiGenerationMode] =
    useState<AiQuestionGenerationMode>("single_choice");
  const [testAiQuestionCount, setTestAiQuestionCount] = useState(5);
  const [expandedTestIds, setExpandedTestIds] = useState<Record<string, boolean>>({});
  const [exercisesByModule, setExercisesByModule] = useState<Record<string, CourseExercise[]>>(
    {}
  );
  const [exerciseEditorModuleId, setExerciseEditorModuleId] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseEditorInitialDraft, setExerciseEditorInitialDraft] =
    useState<ExerciseEditorDraft | null>(null);
  const [isSavingExercise, setIsSavingExercise] = useState(false);
  const [isPreparingExerciseEditor, setIsPreparingExerciseEditor] = useState(false);
  const [exerciseEditorError, setExerciseEditorError] = useState("");
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<Record<string, boolean>>({});
  const lessonLoadRequestRef = useRef(0);
  const hasShownExercisesPermissionWarningRef = useRef(false);
  const exercisesPermissionWarningMessage =
    "Exercises could not be loaded because the database permissions for the exercises table are misconfigured. The rest of the course content is still loaded.";

  const activeTestModuleLessons = useMemo(
    () => (testEditorModuleId ? lessonsByModule[testEditorModuleId] || [] : []),
    [lessonsByModule, testEditorModuleId]
  );
  const testAiQuestionLimit = useMemo(() => {
    if (!testEditorModuleId) {
      return 0;
    }

    if (testAfterLessonId) {
      const selectedLesson = activeTestModuleLessons.find(
        (lesson) => lesson.id === testAfterLessonId
      );

      return selectedLesson ? getLessonAiQuestionLimit(selectedLesson.content ?? "") : 0;
    }

    return getModuleAiQuestionLimit(activeTestModuleLessons);
  }, [activeTestModuleLessons, testAfterLessonId, testEditorModuleId]);
  const canSaveCurrentTest = useMemo(
    () => canSaveTestDraft(testQuestions),
    [testQuestions]
  );
  const canGenerateTestAi =
    testEditorModuleId !== null &&
    testAiQuestionLimit > 0;
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
  const nextModuleOrder = useMemo(
    () => modules.reduce((maxOrder, module) => Math.max(maxOrder, module.order), 0) + 1,
    [modules]
  );
  const isLessonDirty = useMemo(
    () =>
      lessonTitle !== lessonInitialDraft.title ||
      lessonContent !== lessonInitialDraft.content ||
      lessonVideoUrl !== lessonInitialDraft.videoUrl,
    [lessonContent, lessonInitialDraft, lessonTitle, lessonVideoUrl]
  );
  const hasMeaningfulNewLessonDraft = useMemo(
    () =>
      lessonTitle.trim().length > 0 ||
      hasLessonContent(lessonContent) ||
      lessonVideoUrl.trim().length > 0,
    [lessonContent, lessonTitle, lessonVideoUrl]
  );
  const shouldGuardLessonDraft =
    isLessonDirty && (editingLessonId !== null || hasMeaningfulNewLessonDraft);
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
  const isTestDirty = useMemo(() => {
    if (!testInitialDraft || testEditorModuleId === null) {
      return false;
    }

    return !areTestDraftsEqual(testInitialDraft, {
      afterLessonId: testAfterLessonId,
      questions: testQuestions,
    });
  }, [testAfterLessonId, testEditorModuleId, testInitialDraft, testQuestions]);
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
  const hasUnsavedChanges =
    hasUnsavedCourseBasics ||
    isNewModuleComposerDirty ||
    isModuleEditDirty ||
    shouldGuardLessonDraft ||
    isTestDirty;
  const canSaveDraft =
    !isPersistingCourse &&
    !isHydratingCourse &&
    (hasStartedCourseDraft || currentCourseId !== null);
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

  const fetchModules = async (courseId: string) => {
    try {
      const data = await listModulesByCourse(courseId);
      setModules(data);
      setMessage("");
    } catch {
      setMessage("Unable to load modules.");
    } finally {
      setHasFetchedModules(true);
    }
  };

  const fetchLessons = async (moduleId: string) => {
    try {
      const data = await listLessonsByModule(moduleId);
      setLessonsByModule((prev) => ({ ...prev, [moduleId]: data }));
      setMessage("");
      return data;
    } catch {
      setMessage("Unable to load lessons.");
      return null;
    }
  };

  const hydrateCourseTest = async (testEntity: TestEntity): Promise<CourseTest> => {
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
  };

  const fetchTests = async (moduleId: string) => {
    try {
      const entities = await listTestsByModule(moduleId);
      const tests = await Promise.all(entities.map(hydrateCourseTest));
      setTestsByModule((prev) => ({ ...prev, [moduleId]: tests }));
      setMessage("");
      return tests;
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Unable to load tests.");
      }
      return null;
    }
  };

  const fetchExercises = async (moduleId: string) => {
    try {
      const exercises = await listExercisesByModule(moduleId);
      const mappedExercises = exercises.map(mapExerciseToCourseExercise);
      setExercisesByModule((prev) => ({ ...prev, [moduleId]: mappedExercises }));
      setMessage((currentMessage) =>
        currentMessage === exercisesPermissionWarningMessage ? currentMessage : ""
      );
      return mappedExercises;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("permission denied for table exercises")
      ) {
        const mappedExercises: CourseExercise[] = [];
        setExercisesByModule((prev) => ({ ...prev, [moduleId]: mappedExercises }));
        if (!hasShownExercisesPermissionWarningRef.current) {
          setMessage(exercisesPermissionWarningMessage);
          hasShownExercisesPermissionWarningRef.current = true;
        }
        return mappedExercises;
      }

      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Unable to load exercises.");
      }
      return null;
    }
  };

  const hydratePersistedCourse = async (
    courseId: string,
    courseSnapshot?: SavedCourseSnapshot
  ) => {
    setHasFetchedModules(false);

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
      setCurrentCourseId(courseId);
      setSavedCourseSnapshot(courseSnapshot ?? currentCourseSnapshot);
      setMessage("");
    } catch (error) {
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

  const createLocalModuleDraft = (title: string): Module => {
    const timestamp = new Date().toISOString();

    return {
      id: createLocalEntityId("module"),
      course_id: draftCourseSessionId,
      title,
      order: nextModuleOrder,
      created_at: timestamp,
      updated_at: timestamp,
    };
  };

  const createLocalLessonDraft = (moduleId: string): Lesson => {
    const timestamp = new Date().toISOString();
    const nextOrder =
      (lessonsByModule[moduleId] || []).reduce(
        (maxOrder, lesson) => Math.max(maxOrder, lesson.order),
        0
      ) + 1;

    return {
      id: createLocalEntityId("lesson"),
      module_id: moduleId,
      title: lessonTitle.trim(),
      content: lessonContent,
      video_url: lessonVideoUrl.trim() || null,
      content_type: "rich_text",
      order: nextOrder,
      created_at: timestamp,
      updated_at: timestamp,
    };
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
        await hydratePersistedCourse(initialCourseId, snapshot);
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

  useEffect(() => {
    setTestAiQuestionCount((previousCount) => {
      if (testAiQuestionLimit <= 0) {
        return 1;
      }

      if (previousCount > testAiQuestionLimit) {
        return getDefaultAiQuestionCount(testAiQuestionLimit);
      }

      return previousCount;
    });
  }, [testAiQuestionLimit]);

  useEffect(() => {
    if (!shouldPersistDraftAfterLessonSave || currentCourseId !== null || isPersistingCourse) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      await persistCourseAtFinalStep("draft");

      if (!isCancelled) {
        setShouldPersistDraftAfterLessonSave(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [currentCourseId, isPersistingCourse, shouldPersistDraftAfterLessonSave]);

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
      (currentCourseId ? !hasFetchedModules : false) ||
      modules.length > 0 ||
      isNewModuleComposerOpen
    ) {
      return;
    }

    setNewModuleTitle("");
    setIsNewModuleComposerOpen(true);
    setExpandedModuleId(null);
  }, [
    activeStep,
    currentCourseId,
    hasFetchedModules,
    isNewModuleComposerOpen,
    modules.length,
  ]);

  useEffect(() => {
    if (!currentCourseId) {
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
  }, [currentCourseId, lessonsByModule, modules]);

  useEffect(() => {
    if (!currentCourseId) {
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
  }, [currentCourseId, modules, testsByModule]);

  useEffect(() => {
    if (!currentCourseId) {
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
  }, [currentCourseId, exercisesByModule, modules]);

  const handleSaveDraft = async () => {
    const courseId = await persistCourseAtFinalStep("draft");
    return Boolean(courseId);
  };

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

  const openNewModuleComposer = () => {
    if (isNewModuleComposerOpen) {
      return;
    }

    setNewModuleTitle("");
    setIsNewModuleComposerOpen(true);
  };

  const closeNewModuleComposer = () => {
    setIsNewModuleComposerOpen(false);
    setNewModuleTitle("");
  };

  const handleSaveNewModule = async () => {
    if (!newModuleTitle.trim()) return;

    if (!currentCourseId) {
      const module = createLocalModuleDraft(newModuleTitle.trim());
      setModules((prev) => [...prev, module]);
      setLessonsByModule((prev) => ({ ...prev, [module.id]: [] }));
      setTestsByModule((prev) => ({ ...prev, [module.id]: [] }));
      setExercisesByModule((prev) => ({ ...prev, [module.id]: [] }));
      setExpandedModuleId(module.id);
      closeNewModuleComposer();
      setMessage("");
      return;
    }

    try {
      setIsCreatingModule(true);
      const module = await createModule({
        course_id: currentCourseId,
        title: newModuleTitle.trim(),
      });
      setHasFetchedModules(false);
      await fetchModules(currentCourseId);
      setExpandedModuleId(module.id);
      closeNewModuleComposer();
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return;
      }
      setMessage("Unable to create module.");
    } finally {
      setIsCreatingModule(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!editModuleId || !editModuleTitle.trim()) return;

    if (!currentCourseId) {
      setModules((prev) =>
        prev.map((module) =>
          module.id === editModuleId
            ? {
                ...module,
                title: editModuleTitle.trim(),
                updated_at: new Date().toISOString(),
              }
            : module
        )
      );
      setEditModuleId(null);
      setEditModuleTitle("");
      setMessage("");
      return;
    }

    try {
      await updateModule(editModuleId, { title: editModuleTitle.trim() });
      setEditModuleId(null);
      setEditModuleTitle("");
      setHasFetchedModules(false);
      await fetchModules(currentCourseId);
      setMessage("");
    } catch {
      setMessage("Unable to update module.");
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm("Delete this module?")) return;

    if (!currentCourseId) {
      setModules((prev) => prev.filter((module) => module.id !== moduleId));
      setLessonsByModule((prev) => {
        const next = { ...prev };
        delete next[moduleId];
        return next;
      });
      setTestsByModule((prev) => {
        const next = { ...prev };
        delete next[moduleId];
        return next;
      });
      setExercisesByModule((prev) => {
        const next = { ...prev };
        delete next[moduleId];
        return next;
      });
      setExpandedLessonIds((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((lessonId) => {
          if ((lessonsByModule[moduleId] || []).some((lesson) => lesson.id === lessonId)) {
            delete next[lessonId];
          }
        });
        return next;
      });
      setExpandedTestIds((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((testId) => {
          if ((testsByModule[moduleId] || []).some((test) => test.id === testId)) {
            delete next[testId];
          }
        });
        return next;
      });
      setExpandedExerciseIds((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((exerciseId) => {
          if ((exercisesByModule[moduleId] || []).some((exercise) => exercise.id === exerciseId)) {
            delete next[exerciseId];
          }
        });
        return next;
      });
      if (expandedModuleId === moduleId) {
        setExpandedModuleId(null);
      }
      if (pendingLessonDraft?.moduleId === moduleId) {
        setPendingLessonDraft(null);
      }
      if (exerciseEditorModuleId === moduleId) {
        setExerciseEditorModuleId(null);
        setEditingExerciseId(null);
        setExerciseEditorInitialDraft(null);
        setExerciseEditorError("");
      }
      setMessage("");
      return;
    }

    try {
      const moduleExercises =
        exercisesByModule[moduleId] ?? (await fetchExercises(moduleId)) ?? [];
      for (const exercise of moduleExercises) {
        await deleteExercise(exercise.id);
      }
      const moduleTests = testsByModule[moduleId] ?? (await fetchTests(moduleId)) ?? [];
      for (const test of moduleTests) {
        await deleteTestEntity(test.id);
      }
      await deleteModule(moduleId);
    } catch {
      setMessage("Unable to delete module.");
      return;
    }
    setLessonsByModule((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
    setExpandedLessonIds((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((lessonId) => {
        if ((lessonsByModule[moduleId] || []).some((lesson) => lesson.id === lessonId)) {
          delete next[lessonId];
        }
      });
      return next;
    });
    setTestsByModule((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
    setExercisesByModule((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
    setExpandedTestIds((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((testId) => {
        if ((testsByModule[moduleId] || []).some((test) => test.id === testId)) {
          delete next[testId];
        }
      });
      return next;
    });
    setExpandedExerciseIds((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((exerciseId) => {
        if ((exercisesByModule[moduleId] || []).some((exercise) => exercise.id === exerciseId)) {
          delete next[exerciseId];
        }
      });
      return next;
    });
    if (expandedModuleId === moduleId) {
      setExpandedModuleId(null);
    }
    if (exerciseEditorModuleId === moduleId) {
      setExerciseEditorModuleId(null);
      setEditingExerciseId(null);
      setExerciseEditorInitialDraft(null);
      setExerciseEditorError("");
    }
    setHasFetchedModules(false);
    await fetchModules(currentCourseId);
    setMessage("");
  };

  const toggleModule = async (moduleId: string) => {
    const nextId = expandedModuleId === moduleId ? null : moduleId;
    setExpandedModuleId(nextId);
    if (currentCourseId && nextId && !lessonsByModule[nextId]) {
      await fetchLessons(nextId);
    }
    if (currentCourseId && nextId && !testsByModule[nextId]) {
      await fetchTests(nextId);
    }
    if (currentCourseId && nextId && !exercisesByModule[nextId]) {
      await fetchExercises(nextId);
    }
  };

  const applyLessonDraft = (
    moduleId: string,
    lessonId: string | null,
    draft: LessonEditorDraft
  ) => {
    setLessonEditorModuleId(moduleId);
    setEditingLessonId(lessonId);
    setLessonTitle(draft.title);
    setLessonContent(draft.content);
    setLessonVideoUrl(draft.videoUrl);
    setLessonInitialDraft(draft);
    setLessonEditorNotice("");
  };

  const openPendingLessonDraft = (moduleId: string) => {
    lessonLoadRequestRef.current += 1;
    setIsLoadingLessonDraft(false);
    const nextDraft =
      pendingLessonDraft?.moduleId === moduleId
        ? pendingLessonDraft.draft
        : EMPTY_LESSON_EDITOR_DRAFT;

    setPendingLessonDraft({
      moduleId,
      draft: nextDraft,
    });
    applyLessonDraft(moduleId, null, nextDraft);
  };

  const closeCreateLessonModal = () => {
    lessonLoadRequestRef.current += 1;
    setLessonEditorModuleId(null);
    setEditingLessonId(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonVideoUrl("");
    setLessonInitialDraft(EMPTY_LESSON_EDITOR_DRAFT);
    setPendingLessonDraft(null);
    setLessonEditorNotice("");
    setIsLoadingLessonDraft(false);
  };

  const openCreateLessonModal = (moduleId: string) => {
    openPendingLessonDraft(moduleId);
  };

  const openEditLessonModal = async (moduleId: string, lesson: Lesson) => {
    if (!currentCourseId) {
      const fallbackDraft: LessonEditorDraft = {
        title: lesson.title,
        content: lesson.content || "",
        videoUrl: lesson.video_url || "",
      };

      applyLessonDraft(moduleId, lesson.id, fallbackDraft);
      return;
    }

    const requestId = lessonLoadRequestRef.current + 1;
    lessonLoadRequestRef.current = requestId;

    const fallbackDraft: LessonEditorDraft = {
      title: lesson.title,
      content: lesson.content || "",
      videoUrl: lesson.video_url || "",
    };

    applyLessonDraft(moduleId, lesson.id, fallbackDraft);
    setIsLoadingLessonDraft(true);

    try {
      const blocks = await listLessonBlocksByLesson(lesson.id);

      if (lessonLoadRequestRef.current !== requestId) {
        return;
      }

      const richTextBlock = blocks.find((block) => block.block_type === "rich_text");
      const html =
        richTextBlock && typeof richTextBlock.content.html === "string"
          ? richTextBlock.content.html
          : null;
      const nextDraft =
        html !== null
          ? {
              ...fallbackDraft,
              content: html,
            }
          : fallbackDraft;

      setLessonContent(nextDraft.content);
      setLessonInitialDraft(nextDraft);
    } catch {
      // Keep the lesson.content fallback if blocks fail to load.
    } finally {
      if (lessonLoadRequestRef.current === requestId) {
        setIsLoadingLessonDraft(false);
      }
    }
  };

  const handleLessonTitleChange = (value: string) => {
    setLessonTitle(value);
    if (editingLessonId === null && lessonEditorModuleId) {
      setPendingLessonDraft({
        moduleId: lessonEditorModuleId,
        draft: {
          title: value,
          content: lessonContent,
          videoUrl: lessonVideoUrl,
        },
      });
    }
    if (lessonEditorNotice) {
      setLessonEditorNotice("");
    }
  };

  const handleLessonContentChange = (value: string) => {
    setLessonContent(value);
    if (editingLessonId === null && lessonEditorModuleId) {
      setPendingLessonDraft({
        moduleId: lessonEditorModuleId,
        draft: {
          title: lessonTitle,
          content: value,
          videoUrl: lessonVideoUrl,
        },
      });
    }
    if (lessonEditorNotice) {
      setLessonEditorNotice("");
    }
  };

  const handleLessonVideoUrlChange = (value: string) => {
    setLessonVideoUrl(value);
    if (editingLessonId === null && lessonEditorModuleId) {
      setPendingLessonDraft({
        moduleId: lessonEditorModuleId,
        draft: {
          title: lessonTitle,
          content: lessonContent,
          videoUrl: value,
        },
      });
    }
    if (lessonEditorNotice) {
      setLessonEditorNotice("");
    }
  };

  const handleLessonEditorSelectLesson = (moduleId: string, lesson: Lesson) => {
    if (editingLessonId === lesson.id) {
      return;
    }

    if (shouldGuardLessonDraft) {
      setLessonEditorNotice("Save or cancel the current lesson before switching to another one.");
      return;
    }

    void openEditLessonModal(moduleId, lesson);
  };

  const handleLessonEditorSelectDraft = (moduleId: string) => {
    if (lessonEditorModuleId === moduleId && editingLessonId === null) {
      return;
    }

    if (shouldGuardLessonDraft) {
      setLessonEditorNotice("Save or cancel the current lesson before switching to another one.");
      return;
    }

    openPendingLessonDraft(moduleId);
  };

  const handleLessonEditorClose = () => {
    if (shouldGuardLessonDraft && !window.confirm("Discard unsaved lesson changes?")) {
      return;
    }

    closeCreateLessonModal();
  };

  const handleLessonContentImageUpload = async (file: File) => {
    const imagePath = await uploadLessonContentImage(
      currentCourseId ?? draftCourseSessionId,
      file
    );
    const imageUrl = getCourseMediaPublicUrl(imagePath);

    if (!imageUrl) {
      throw new Error("Unable to resolve lesson image URL.");
    }

    return imageUrl;
  };

  const handleCreateLesson = async () => {
    if (!lessonEditorModuleId || !lessonTitle.trim()) {
      return null;
    }
    const moduleId = lessonEditorModuleId;

    if (!currentCourseId) {
      if (editingLessonId) {
        const existingLesson = (lessonsByModule[moduleId] || []).find(
          (lesson) => lesson.id === editingLessonId
        );

        if (!existingLesson) {
          setMessage("Unable to resolve the selected lesson.");
          return null;
        }

        const updatedLesson: Lesson = {
          ...existingLesson,
          title: lessonTitle.trim(),
          content: lessonContent,
          video_url: lessonVideoUrl.trim() || null,
          content_type: "rich_text",
          updated_at: new Date().toISOString(),
        };

        setLessonsByModule((prev) => ({
          ...prev,
          [moduleId]: (prev[moduleId] || []).map((lesson) =>
            lesson.id === editingLessonId
              ? updatedLesson
              : lesson
          ),
        }));
        setShouldPersistDraftAfterLessonSave(true);
        closeCreateLessonModal();
        setMessage("");
        return {
          moduleId,
          lesson: updatedLesson,
        };
      } else {
        const createdLesson = createLocalLessonDraft(moduleId);
        setLessonsByModule((prev) => ({
          ...prev,
          [moduleId]: [...(prev[moduleId] || []), createdLesson],
        }));
        setPendingLessonDraft(null);
        setShouldPersistDraftAfterLessonSave(true);
        closeCreateLessonModal();
        setMessage("");
        return {
          moduleId,
          lesson: createdLesson,
        };
      }
    }

    try {
      setIsCreatingLesson(true);
      if (editingLessonId) {
        const updatedLesson = await updateLesson(editingLessonId, {
          title: lessonTitle.trim(),
          content: lessonContent,
          video_url: lessonVideoUrl.trim() || null,
          content_type: "rich_text",
        });
        await upsertLessonPrimaryRichTextBlock(editingLessonId, lessonContent);
        await fetchLessons(moduleId);
        closeCreateLessonModal();
        setMessage("");
        return {
          moduleId,
          lesson: updatedLesson,
        };
      } else {
        const createdLesson = await createLesson({
          module_id: moduleId,
          title: lessonTitle.trim(),
          content: lessonContent,
          video_url: lessonVideoUrl.trim() || null,
          content_type: "rich_text",
        });
        await upsertLessonPrimaryRichTextBlock(createdLesson.id, lessonContent);
        setPendingLessonDraft(null);
        await fetchLessons(moduleId);
        closeCreateLessonModal();
        setMessage("");
        return {
          moduleId,
          lesson: createdLesson,
        };
      }
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return null;
      }
      setMessage(editingLessonId ? "Unable to update lesson." : "Unable to create lesson.");
      return null;
    } finally {
      setIsCreatingLesson(false);
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!window.confirm("Delete this lesson?")) return;

    if (!currentCourseId) {
      setLessonsByModule((prev) => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).filter((lesson) => lesson.id !== lessonId),
      }));
      setTestsByModule((prev) => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).map((test) =>
          test.afterLessonId === lessonId ? { ...test, afterLessonId: null } : test
        ),
      }));
      setExpandedLessonIds((prev) => {
        const next = { ...prev };
        delete next[lessonId];
        return next;
      });
      setMessage("");
      return;
    }

    try {
      const moduleTests = testsByModule[moduleId] ?? (await fetchTests(moduleId)) ?? [];
      const linkedTests = moduleTests.filter((test) => test.afterLessonId === lessonId);

      for (const test of linkedTests) {
        await updateTestEntity(test.id, {
          after_lesson_id: null,
        });
      }

      await deleteLesson(lessonId);
      await fetchLessons(moduleId);
      await fetchTests(moduleId);
      await fetchExercises(moduleId);
      setExpandedLessonIds((prev) => {
        const next = { ...prev };
        delete next[lessonId];
        return next;
      });
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return;
      }
      setMessage("Unable to delete lesson.");
    }
  };

  const toggleLessonPreview = (lessonId: string) => {
    setExpandedLessonIds((prev) => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  const resolveAiGenerationTarget = async ({
    moduleId,
    afterLessonId,
  }: {
    moduleId: string;
    afterLessonId: string | null;
  }) => {
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
      throw new Error("Unable to save the draft before generating questions.");
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
  };

  const resolveExerciseEditorModuleId = async (moduleId: string) => {
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
  };

  const closeCreateTestModal = () => {
    setTestEditorModuleId(null);
    setEditingTestId(null);
    setTestAfterLessonId(null);
    setTestQuestions([]);
    setTestInitialDraft(null);
    setTestAiGenerationMode("single_choice");
  };

  const closeCreateExerciseModal = () => {
    setExerciseEditorModuleId(null);
    setEditingExerciseId(null);
    setExerciseEditorInitialDraft(null);
    setExerciseEditorError("");
  };

  const openCreateTestModal = (
    moduleId: string,
    options?: {
      afterLessonId?: string | null;
    }
  ) => {
    const nextDraft = createEmptyTestEditorDraft();
    const nextAfterLessonId = options?.afterLessonId ?? nextDraft.afterLessonId;
    const moduleLessons = lessonsByModule[moduleId] || [];
    const nextAiQuestionLimit = nextAfterLessonId
      ? getLessonAiQuestionLimit(
          moduleLessons.find((lesson) => lesson.id === nextAfterLessonId)?.content ?? ""
        )
      : getModuleAiQuestionLimit(moduleLessons);

    setTestEditorModuleId(moduleId);
    setEditingTestId(null);
    setTestAfterLessonId(nextAfterLessonId);
    setTestQuestions(nextDraft.questions);
    setTestAiGenerationMode("single_choice");
    setTestAiQuestionCount(getDefaultAiQuestionCount(Math.max(nextAiQuestionLimit, 1)));
    setTestInitialDraft({
      afterLessonId: nextAfterLessonId,
      questions: nextDraft.questions.map(cloneTestQuestion),
    });
  };

  const openEditTestModal = (moduleId: string, test: CourseTest) => {
    const nextQuestions = test.questions.map(cloneTestQuestion);
    const moduleLessons = lessonsByModule[moduleId] || [];
    const nextAiQuestionLimit = test.afterLessonId
      ? getLessonAiQuestionLimit(
          moduleLessons.find((lesson) => lesson.id === test.afterLessonId)?.content ?? ""
        )
      : getModuleAiQuestionLimit(moduleLessons);

    setTestEditorModuleId(moduleId);
    setEditingTestId(test.id);
    setTestAfterLessonId(test.afterLessonId);
    setTestQuestions(nextQuestions);
    setTestAiGenerationMode("single_choice");
    setTestAiQuestionCount(getDefaultAiQuestionCount(Math.max(nextAiQuestionLimit, 1)));
    setTestInitialDraft({
      afterLessonId: test.afterLessonId,
      questions: nextQuestions.map(cloneTestQuestion),
    });
  };

  const openCreateExerciseModal = async (moduleId: string) => {
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
        exercisesByModule[resolvedModuleId] ? Promise.resolve() : fetchExercises(resolvedModuleId),
      ]);

      setExerciseEditorModuleId(resolvedModuleId);
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
    setEditingExerciseId(exercise.id);
    setExerciseEditorInitialDraft(mapCourseExerciseToDraft(exercise));
  };

  const handleAddTestQuestion = () => {
    setTestQuestions((prev) => [...prev, createEmptyTestQuestion()]);
  };

  const handleChangeTestQuestion = (
    questionId: string,
    nextQuestion: CourseTestQuestion
  ) => {
    setTestQuestions((prev) =>
      prev.map((question) => (question.id === questionId ? nextQuestion : question))
    );
  };

  const handleDeleteTestQuestion = (questionId: string) => {
    setTestQuestions((prev) => {
      const remaining = prev.filter((question) => question.id !== questionId);
      return remaining.length > 0 ? remaining : [createEmptyTestQuestion()];
    });
  };

  const handleGenerateTestQuestionsWithAi = async () => {
    if (!testEditorModuleId || !canGenerateTestAi || isGeneratingAiQuestions) {
      return false;
    }

    if (
      hasMeaningfulTestQuestionDraft(testQuestions) &&
      !window.confirm("Replace the current test questions with AI-generated ones?")
    ) {
      return false;
    }

    setMessage("");
    setIsGeneratingAiQuestions(true);

    try {
      const resolvedTarget = await resolveAiGenerationTarget({
        moduleId: testEditorModuleId,
        afterLessonId: testAfterLessonId,
      });
      const generatedQuestions = await generateTestQuestionsWithAi({
        afterLessonId: resolvedTarget.afterLessonId ?? undefined,
        moduleId: resolvedTarget.afterLessonId ? undefined : resolvedTarget.moduleId,
        questionCount: testAiQuestionCount,
        generationMode: testAiGenerationMode,
      });

      if (generatedQuestions.length === 0) {
        throw new Error("AI did not return any questions.");
      }

      const normalizedQuestions =
        mapGeneratedQuestionsToCourseTestQuestions(generatedQuestions);

      setTestEditorModuleId(resolvedTarget.moduleId);
      setTestAfterLessonId(resolvedTarget.afterLessonId);
      setTestQuestions(normalizedQuestions.map(cloneTestQuestion));
      setMessage("");
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Unable to generate questions with AI.");
      }
      return false;
    } finally {
      setIsGeneratingAiQuestions(false);
    }
  };

  const handleCreateTest = async () => {
    if (!testEditorModuleId || !canSaveCurrentTest) return;
    const moduleId = testEditorModuleId;
    const activeModule = modules.find((module) => module.id === moduleId);

    if (!activeModule) {
      setMessage("Unable to resolve the selected module.");
      return;
    }

    const nextTestTitle = getGeneratedCourseTestTitle({
      moduleOrder: activeModule.order,
      lessons: lessonsByModule[moduleId] || [],
      afterLessonId: testAfterLessonId,
    });

    if (!currentCourseId) {
      const existingTests = testsByModule[moduleId] || [];

      if (editingTestId) {
        setTestsByModule((prev) => ({
          ...prev,
          [moduleId]: (prev[moduleId] || []).map((test) =>
            test.id === editingTestId
              ? {
                  ...test,
                  title: nextTestTitle,
                  afterLessonId: testAfterLessonId,
                  questions: testQuestions.map(cloneTestQuestion),
                }
              : test
          ),
        }));
      } else {
        setTestsByModule((prev) => ({
          ...prev,
          [moduleId]: [
            ...(prev[moduleId] || []),
            {
              id: createLocalEntityId("test"),
              title: nextTestTitle,
              afterLessonId: testAfterLessonId,
              order:
                existingTests.reduce(
                  (maxOrder, test) => Math.max(maxOrder, test.order),
                  0
                ) + 1,
              questions: testQuestions.map(cloneTestQuestion),
            },
          ],
        }));
      }

      closeCreateTestModal();
      setMessage("");
      return;
    }

    try {
      setIsSavingTest(true);
      const existingTests = testsByModule[moduleId] ?? (await fetchTests(moduleId)) ?? [];

      const savedTest = editingTestId
        ? await updateTestEntity(editingTestId, {
            title: nextTestTitle,
            after_lesson_id: testAfterLessonId,
            order:
              existingTests.find((test) => test.id === editingTestId)?.order ??
              existingTests.length + 1,
          })
        : await createTestEntity({
            module_id: moduleId,
            title: nextTestTitle,
            after_lesson_id: testAfterLessonId,
            order: (existingTests.at(-1)?.order ?? 0) + 1,
          });

      await persistTestQuestions(savedTest.id, testQuestions);
      await fetchTests(moduleId);
      closeCreateTestModal();
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage(editingTestId ? "Unable to update test." : "Unable to create test.");
      }
    } finally {
      setIsSavingTest(false);
    }
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

  const handleDeleteTest = async (moduleId: string, testId: string) => {
    if (!window.confirm("Delete this test?")) return;

    if (!currentCourseId) {
      setTestsByModule((prev) => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).filter((test) => test.id !== testId),
      }));
      setExpandedTestIds((prev) => {
        const next = { ...prev };
        delete next[testId];
        return next;
      });
      setMessage("");
      return;
    }

    try {
      await deleteTestEntity(testId);
      await fetchTests(moduleId);
      setExpandedTestIds((prev) => {
        const next = { ...prev };
        delete next[testId];
        return next;
      });
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
      } else {
        setMessage("Unable to delete test.");
      }
    }
  };

  const handleDeleteExercise = async (moduleId: string, exerciseId: string) => {
    if (!window.confirm("Delete this exercise?")) return;

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

  const toggleTestPreview = (testId: string) => {
    setExpandedTestIds((prev) => ({ ...prev, [testId]: !prev[testId] }));
  };

  const toggleExercisePreview = (exerciseId: string) => {
    setExpandedExerciseIds((prev) => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  };

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
  const canRunHeaderAction =
    canSaveDraft;
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
            isCreatingModule={isCreatingModule}
            isNewModuleComposerOpen={isNewModuleComposerOpen}
            newModuleTitle={newModuleTitle}
            nextModuleOrder={nextModuleOrder}
            lessonsByModule={lessonsByModule}
            testsByModule={testsByModule}
            exercisesByModule={exercisesByModule}
            expandedModuleId={expandedModuleId}
            editModuleId={editModuleId}
            editModuleTitle={editModuleTitle}
            currentCourseId={builderContentKey}
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
            onCreateTest={openCreateTestModal}
            onCreateExercise={(moduleId) => {
              void openCreateExerciseModal(moduleId);
            }}
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
        onSave={(draft) => {
          void handleSaveExercise(draft);
        }}
      />
    </div>
  );
});

CourseBuilderPage.displayName = "CourseBuilderPage";
