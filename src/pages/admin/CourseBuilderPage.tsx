import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  createCourse,
  createLesson,
  createModule,
  createTestAnswer,
  createTestEntity,
  createTestQuestion,
  deleteLesson,
  deleteModule,
  deleteTestEntity,
  deleteTestQuestion,
  listCourses,
  listLessonBlocksByLesson,
  listLessonsByModule,
  listModulesByCourse,
  listTestAnswers,
  listTestQuestions,
  listTestsByModule,
  publishCourse,
  upsertLessonPrimaryRichTextBlock,
  updateCourse,
  updateLesson,
  updateTestEntity,
  updateModule,
} from "../../features/courses/api";
import {
  getCourseMediaKind,
  getCourseMediaLabel,
  getCourseMediaPublicUrl,
  uploadCourseMedia,
  uploadLessonContentImage,
} from "../../features/courses/api/courseMediaStorage";
import type {
  Course,
  Lesson,
  Module,
  TestEntity,
} from "../../features/courses/api";
import { CourseBuilderContentStep } from "../../features/courses/components/course-builder/CourseBuilderContentStep";
import { CourseBuilderCourseInfoStep } from "../../features/courses/components/course-builder/CourseBuilderCourseInfoStep";
import { CourseBuilderHeader } from "../../features/courses/components/course-builder/CourseBuilderHeader";
import { CourseBuilderReviewStep } from "../../features/courses/components/course-builder/CourseBuilderReviewStep";
import { LessonCreateModal } from "../../features/courses/components/course-builder/LessonCreateModal";
import { TestCreateModal } from "../../features/courses/components/course-builder/TestCreateModal";
import { useCourseBuilderReviewState } from "../../features/courses/components/course-builder/useCourseBuilderReviewState";
import type {
  CourseTest,
  CourseTestQuestion,
} from "../../features/courses/components/course-builder/courseBuilderUiTypes";
import {
  courseBuilderSteps,
  EMPTY_LESSON_EDITOR_DRAFT,
  type BuilderStep,
  buildAnswerPayloads,
  canSaveTestDraft,
  cloneTestQuestion,
  createEmptyTestQuestion,
  getGeneratedCourseTestTitle,
  hasLessonContent,
  mapQuestionToCourseTestQuestion,
  type LessonEditorDraft,
} from "../../features/courses/components/course-builder/courseBuilderPageUtils";

export function CourseBuilderPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState("");
  const [activeStep, setActiveStep] = useState<BuilderStep>(1);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);

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
  const [testAfterLessonId, setTestAfterLessonId] = useState<string | null>(null);
  const [testQuestions, setTestQuestions] = useState<CourseTestQuestion[]>([]);
  const [expandedTestIds, setExpandedTestIds] = useState<Record<string, boolean>>({});
  const lessonLoadRequestRef = useRef(0);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === currentCourseId) || null,
    [courses, currentCourseId]
  );

  const activeTestModuleLessons = useMemo(
    () => (testEditorModuleId ? lessonsByModule[testEditorModuleId] || [] : []),
    [lessonsByModule, testEditorModuleId]
  );
  const activeTestModule = useMemo(
    () => modules.find((module) => module.id === testEditorModuleId) || null,
    [modules, testEditorModuleId]
  );

  const canSaveCurrentTest = useMemo(
    () => canSaveTestDraft(testQuestions),
    [testQuestions]
  );
  const courseThumbnailUrl = useMemo(
    () => getCourseMediaPublicUrl(courseThumbnailPath),
    [courseThumbnailPath]
  );
  const courseThumbnailKind = useMemo(
    () => getCourseMediaKind(courseThumbnailPath),
    [courseThumbnailPath]
  );
  const courseThumbnailLabel = useMemo(
    () => getCourseMediaLabel(courseThumbnailPath),
    [courseThumbnailPath]
  );
  const generatedTestTitle = useMemo(
    () =>
      activeTestModule
        ? getGeneratedCourseTestTitle({
            moduleOrder: activeTestModule.order,
            lessons: activeTestModuleLessons,
            afterLessonId: testAfterLessonId,
          })
        : "",
    [activeTestModule, activeTestModuleLessons, testAfterLessonId]
  );

  const isBasicsComplete =
    courseTitle.trim().length > 0 && courseDescription.trim().length > 0;
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
  const {
    reviewPreviewMode,
    setReviewPreviewMode,
    totalModules,
    totalLessons,
    totalTests,
    expandedReviewModuleId,
    resolvedReviewSelection,
    reviewPreviewData,
    isReviewContentLoading,
    publishBlockingIssues,
    heroBackgroundStyle,
    reviewDescription,
    currentLessonPreviewText,
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
    courseDescription,
    courseThumbnailUrl,
    courseThumbnailKind,
  });

  const fetchCourses = async () => {
    try {
      const data = await listCourses();
      setCourses(data);
      setMessage("");
    } catch {
      setMessage("Unable to load courses.");
    }
  };

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

  const getCurrentTeacherId = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error("Unable to resolve current teacher.");
    }
    return data.user.id;
  };

  useEffect(() => {
    queueMicrotask(() => {
      void fetchCourses();
    });
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      queueMicrotask(() => {
        setCourseTitle(selectedCourse.title);
        setCourseDescription(selectedCourse.description || "");
        setCourseThumbnailPath(selectedCourse.thumbnail_path);
      });
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (currentCourseId) {
      setHasFetchedModules(false);
      queueMicrotask(() => {
        void fetchModules(currentCourseId);
      });
    } else {
      queueMicrotask(() => {
        setModules([]);
        setHasFetchedModules(false);
        setLessonsByModule({});
        setTestsByModule({});
        setCourseThumbnailPath(null);
      });
    }
  }, [currentCourseId]);

  useEffect(() => {
    if (
      activeStep !== 2 ||
      !currentCourseId ||
      !hasFetchedModules ||
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
  }, [lessonsByModule, modules]);

  useEffect(() => {
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
  }, [modules, testsByModule]);

  const persistCourseDraft = async () => {
    if (!isBasicsComplete) return null;
    try {
      if (currentCourseId) {
        await updateCourse(currentCourseId, {
          title: courseTitle.trim(),
          description: courseDescription.trim() || null,
          thumbnail_path: courseThumbnailPath,
        });
        await fetchCourses();
        setMessage("");
        return currentCourseId;
      } else {
        const teacherId = await getCurrentTeacherId();
        const course = await createCourse({
          teacher_id: teacherId,
          title: courseTitle.trim(),
          description: courseDescription.trim() || null,
          thumbnail_path: courseThumbnailPath,
          is_published: false,
        });
        setCurrentCourseId(course.id);
        await fetchCourses();
        setMessage("");
        return course.id;
      }
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return null;
      }
      setMessage(currentCourseId ? "Unable to update course." : "Unable to create course.");
      return null;
    }
  };

  const handleSaveDraft = async () => {
    const courseId = await persistCourseDraft();
    return Boolean(courseId);
  };

  const handleCourseMediaUpload = async (file: File) => {
    if (!currentCourseId && !isBasicsComplete) {
      setMessage("Add the course title and description before uploading media.");
      return;
    }

    let courseId = currentCourseId;

    if (!courseId) {
      const createdCourseId = await persistCourseDraft();
      if (!createdCourseId) {
        return;
      }

      courseId = createdCourseId;
    }

    try {
      setIsUploadingCourseMedia(true);
      const uploadedPath = await uploadCourseMedia(courseId, file);
      setCourseThumbnailPath(uploadedPath);
      await updateCourse(courseId, {
        thumbnail_path: uploadedPath,
      });
      await fetchCourses();
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
    if (!currentCourseId || isNewModuleComposerOpen) {
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
    if (!currentCourseId || !newModuleTitle.trim()) return;

    try {
      setIsCreatingModule(true);
      const module = await createModule({
        course_id: currentCourseId,
        title: newModuleTitle.trim(),
      });
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
    try {
      await updateModule(editModuleId, { title: editModuleTitle.trim() });
      setEditModuleId(null);
      setEditModuleTitle("");
      if (currentCourseId) {
        await fetchModules(currentCourseId);
      }
      setMessage("");
    } catch {
      setMessage("Unable to update module.");
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm("Delete this module?")) return;
    try {
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
    setExpandedTestIds((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((testId) => {
        if ((testsByModule[moduleId] || []).some((test) => test.id === testId)) {
          delete next[testId];
        }
      });
      return next;
    });
    if (expandedModuleId === moduleId) {
      setExpandedModuleId(null);
    }
    if (currentCourseId) {
      await fetchModules(currentCourseId);
    }
    setMessage("");
  };

  const toggleModule = async (moduleId: string) => {
    const nextId = expandedModuleId === moduleId ? null : moduleId;
    setExpandedModuleId(nextId);
    if (nextId && !lessonsByModule[nextId]) {
      await fetchLessons(nextId);
    }
    if (nextId && !testsByModule[nextId]) {
      await fetchTests(nextId);
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
    if (!currentCourseId) {
      throw new Error("Save the course before uploading lesson images.");
    }

    const imagePath = await uploadLessonContentImage(currentCourseId, file);
    const imageUrl = getCourseMediaPublicUrl(imagePath);

    if (!imageUrl) {
      throw new Error("Unable to resolve lesson image URL.");
    }

    return imageUrl;
  };

  const handleCreateLesson = async () => {
    if (!lessonEditorModuleId || !lessonTitle.trim()) return;
    const moduleId = lessonEditorModuleId;

    try {
      setIsCreatingLesson(true);
      if (editingLessonId) {
        await updateLesson(editingLessonId, {
          title: lessonTitle.trim(),
          content: lessonContent,
          video_url: lessonVideoUrl.trim() || null,
          content_type: "rich_text",
        });
        await upsertLessonPrimaryRichTextBlock(editingLessonId, lessonContent);
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
      }
      await fetchLessons(moduleId);
      closeCreateLessonModal();
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return;
      }
      setMessage(editingLessonId ? "Unable to update lesson." : "Unable to create lesson.");
    } finally {
      setIsCreatingLesson(false);
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!window.confirm("Delete this lesson?")) return;

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

  const closeCreateTestModal = () => {
    setTestEditorModuleId(null);
    setEditingTestId(null);
    setTestAfterLessonId(null);
    setTestQuestions([]);
  };

  const openCreateTestModal = (moduleId: string) => {
    setTestEditorModuleId(moduleId);
    setEditingTestId(null);
    setTestAfterLessonId(null);
    setTestQuestions([createEmptyTestQuestion()]);
  };

  const openEditTestModal = (moduleId: string, test: CourseTest) => {
    setTestEditorModuleId(moduleId);
    setEditingTestId(test.id);
    setTestAfterLessonId(test.afterLessonId);
    setTestQuestions(test.questions.map(cloneTestQuestion));
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
    if (!window.confirm("Delete this test?")) return;

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

  const handlePublishCourse = async () => {
    if (!currentCourseId) {
      setMessage("Create a draft course before publishing.");
      return;
    }

    if (publishBlockingIssues.length > 0) {
      setMessage("Resolve the blocking issues before publishing the course.");
      return;
    }

    try {
      await publishCourse(currentCourseId);
      await fetchCourses();
      setMessage("");
    } catch {
      setMessage("Unable to publish course.");
    }
  };

  const currentCourseName = courseTitle.trim() || "Untitled course";
  const currentStepTitle =
    activeStep === 1
      ? "Create Your Course"
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
    activeStep === 3
      ? Boolean(currentCourseId) &&
        !isReviewContentLoading &&
        publishBlockingIssues.length === 0
      : isBasicsComplete;

  return (
    <div
      className="min-h-screen bg-[#f6f8f8] text-[#0f172a]"
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      <CourseBuilderHeader
        steps={courseBuilderSteps}
        activeStep={activeStep}
        currentCourseName={currentCourseName}
        canRunPrimaryAction={canRunHeaderAction}
        primaryActionLabel={activeStep === 3 ? "Publish Course" : "Save Draft"}
        canNavigateToStep={(step) => step === 1 || Boolean(currentCourseId)}
        onStepChange={setActiveStep}
        onPrimaryAction={() => {
          if (activeStep === 3) {
            void handlePublishCourse();
            return;
          }

          void handleSaveDraft();
        }}
      />

      <main className="mx-auto flex w-full max-w-[92rem] flex-col gap-8 px-6 py-8 lg:px-10">
        {message ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {message}
          </div>
        ) : null}

        {activeStep === 1 ? (
          <CourseBuilderCourseInfoStep
            stepLabel={`Step ${activeStep} of ${courseBuilderSteps.length}`}
            title={currentStepTitle}
            description={currentStepDescription}
            courseTitle={courseTitle}
            courseDescription={courseDescription}
            courseThumbnailPath={courseThumbnailPath}
            courseThumbnailUrl={courseThumbnailUrl}
            isBasicsComplete={isBasicsComplete}
            isUploadingCourseMedia={isUploadingCourseMedia}
            currentCourseId={currentCourseId}
            onCourseTitleChange={setCourseTitle}
            onCourseDescriptionChange={setCourseDescription}
            onCourseMediaSelect={(file) => {
              void handleCourseMediaUpload(file);
            }}
            onNext={async () => {
              const wasSaved = await handleSaveDraft();
              if (wasSaved) {
                setActiveStep(2);
              }
            }}
          />
        ) : null}

        {activeStep === 2 ? (
          <CourseBuilderContentStep
            stepLabel={`Step ${activeStep} of ${courseBuilderSteps.length}`}
            title={currentStepTitle}
            modules={modules}
            isCreatingModule={isCreatingModule}
            isNewModuleComposerOpen={isNewModuleComposerOpen}
            newModuleTitle={newModuleTitle}
            nextModuleOrder={modules.length + 1}
            lessonsByModule={lessonsByModule}
            testsByModule={testsByModule}
            expandedModuleId={expandedModuleId}
            editModuleId={editModuleId}
            editModuleTitle={editModuleTitle}
            currentCourseId={currentCourseId}
            expandedLessonIds={expandedLessonIds}
            expandedTestIds={expandedTestIds}
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
            onCreateLesson={openCreateLessonModal}
            onCreateTest={openCreateTestModal}
            onCreateModule={openNewModuleComposer}
            onBack={() => setActiveStep(1)}
            onContinueToReview={() => setActiveStep(3)}
          />
        ) : null}

        {activeStep === 3 ? (
          <CourseBuilderReviewStep
            stepLabel={`Step ${activeStep} of ${courseBuilderSteps.length}`}
            title="Final Preview"
            reviewDescription={reviewDescription}
            reviewPreviewMode={reviewPreviewMode}
            onReviewPreviewModeChange={setReviewPreviewMode}
            isReviewContentLoading={isReviewContentLoading}
            publishBlockingIssues={publishBlockingIssues}
            currentCourseName={currentCourseName}
            courseThumbnailUrl={courseThumbnailUrl}
            courseThumbnailKind={courseThumbnailKind}
            courseThumbnailLabel={courseThumbnailLabel}
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
            currentLessonPreviewText={currentLessonPreviewText}
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
              Boolean(currentCourseId) &&
              !isReviewContentLoading &&
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
        generatedTitle={generatedTestTitle}
        lessons={activeTestModuleLessons}
        selectedAfterLessonId={testAfterLessonId}
        questions={testQuestions}
        canSave={canSaveCurrentTest}
        isSaving={isSavingTest}
        onClose={closeCreateTestModal}
        onSave={() => {
          void handleCreateTest();
        }}
        onAfterLessonChange={setTestAfterLessonId}
        onAddQuestion={handleAddTestQuestion}
        onQuestionChange={handleChangeTestQuestion}
        onDeleteQuestion={handleDeleteTestQuestion}
      />
    </div>
  );
}
