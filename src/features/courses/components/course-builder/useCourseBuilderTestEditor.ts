import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  createTestEntity,
  deleteTestEntity,
  generateTestQuestionsWithAi,
  updateTestEntity,
} from "../../api";
import type { AiQuestionGenerationMode, Lesson, Module } from "../../api";
import type { CourseTest, CourseTestQuestion } from "./courseBuilderUiTypes";
import {
  areTestDraftsEqual,
  canSaveTestDraft,
  cloneTestQuestion,
  createEmptyTestEditorDraft,
  createEmptyTestQuestion,
  createLocalEntityId,
  getDefaultAiQuestionCount,
  getGeneratedCourseTestTitle,
  getLessonAiQuestionLimit,
  getModuleAiQuestionLimit,
  hasMeaningfulTestQuestionDraft,
  mapGeneratedQuestionsToCourseTestQuestions,
  type CreateContentMode,
  type TestEditorDraft,
} from "./courseBuilderPageUtils";

type UseCourseBuilderTestEditorArgs = {
  currentCourseId: string | null;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  setTestsByModule: Dispatch<SetStateAction<Record<string, CourseTest[]>>>;
  fetchTests: (moduleId: string) => Promise<CourseTest[] | null>;
  persistTestQuestions: (
    testId: string,
    questions: CourseTestQuestion[]
  ) => Promise<void>;
  resolveAiGenerationTarget: (args: {
    moduleId: string;
    afterLessonId: string | null;
  }) => Promise<{
    moduleId: string;
    afterLessonId: string | null;
  }>;
  setMessage: Dispatch<SetStateAction<string>>;
};

export function useCourseBuilderTestEditor({
  currentCourseId,
  modules,
  lessonsByModule,
  testsByModule,
  setTestsByModule,
  fetchTests,
  persistTestQuestions,
  resolveAiGenerationTarget,
  setMessage,
}: UseCourseBuilderTestEditorArgs) {
  const [testEditorModuleId, setTestEditorModuleId] = useState<string | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [isGeneratingAiQuestions, setIsGeneratingAiQuestions] = useState(false);
  const [testAfterLessonId, setTestAfterLessonId] = useState<string | null>(null);
  const [testQuestions, setTestQuestions] = useState<CourseTestQuestion[]>([]);
  const [testInitialDraft, setTestInitialDraft] = useState<TestEditorDraft | null>(null);
  const [testAiGenerationMode, setTestAiGenerationMode] =
    useState<AiQuestionGenerationMode>("single_choice");
  const [testAiQuestionCount, setTestAiQuestionCount] = useState(5);
  const [expandedTestIds, setExpandedTestIds] = useState<Record<string, boolean>>({});
  const [testCreateInitialMode, setTestCreateInitialMode] =
    useState<CreateContentMode | null>(null);

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
  const isTestDirty = useMemo(() => {
    if (!testInitialDraft || testEditorModuleId === null) {
      return false;
    }

    return !areTestDraftsEqual(testInitialDraft, {
      afterLessonId: testAfterLessonId,
      questions: testQuestions,
    });
  }, [testAfterLessonId, testEditorModuleId, testInitialDraft, testQuestions]);

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

  const closeCreateTestModal = () => {
    setTestEditorModuleId(null);
    setEditingTestId(null);
    setTestAfterLessonId(null);
    setTestQuestions([]);
    setTestInitialDraft(null);
    setTestCreateInitialMode(null);
    setTestAiGenerationMode("single_choice");
  };

  const openCreateTestModal = (
    moduleId: string,
    options?: {
      afterLessonId?: string | null;
      initialMode?: CreateContentMode;
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
    setTestCreateInitialMode(options?.initialMode ?? "manual");
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
    setTestCreateInitialMode("manual");
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

  const handleOpenTestCreationChoice = (moduleId: string, mode: CreateContentMode) => {
    openCreateTestModal(moduleId, { initialMode: mode });
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
    if (!testEditorModuleId || !canSaveCurrentTest) {
      return;
    }

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

  const handleDeleteTest = async (moduleId: string, testId: string) => {
    if (!window.confirm("Delete this test?")) {
      return;
    }

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

  const toggleTestPreview = (testId: string) => {
    setExpandedTestIds((prev) => ({ ...prev, [testId]: !prev[testId] }));
  };

  return {
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
  };
}
