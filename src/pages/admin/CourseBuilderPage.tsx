import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { supabase } from "../../lib/supabase";
import {
  BadgeCheck,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Pencil,
  Play,
  Plus,
  TriangleAlert,
  Trash2,
} from "lucide-react";
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
} from "../../features/courses/api/courseMediaStorage";
import { CourseMediaUpload } from "../../features/courses/components/course-builder/CourseMediaUpload";
import type {
  Course,
  Lesson,
  Module,
  TestAnswer,
  TestEntity,
  TestQuestion,
} from "../../features/courses/api";
import { CreateModuleModal } from "../../features/courses/components/course-builder/CreateModuleModal";
import { LessonCreateModal } from "../../features/courses/components/course-builder/LessonCreateModal";
import { ModuleLessonsSection } from "../../features/courses/components/course-builder/ModuleLessonsSection";
import { ModuleTestsSection } from "../../features/courses/components/course-builder/ModuleTestsSection";
import { TestCreateModal } from "../../features/courses/components/course-builder/TestCreateModal";
import type {
  CourseTest,
  CourseTestQuestion,
} from "../../features/courses/components/course-builder/courseBuilderUiTypes";
import { getYouTubeEmbedUrl } from "../../features/courses/components/course-builder/youtube";

const steps = [
  { id: 1, label: "Basics", helper: "Course information" },
  { id: 2, label: "Course Content", helper: "Modules, lessons & tests" },
  { id: 3, label: "Review & Publish", helper: "Launch course" },
];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createEmptyTestQuestion = (): CourseTestQuestion => ({
  id: createId(),
  type: "single_choice",
  questionText: "",
  options: ["Option 1", "Option 2"],
  correctOptionIndexes: [],
  hint: null,
});

const cloneTestQuestion = (question: CourseTestQuestion): CourseTestQuestion => ({
  ...question,
  options: [...question.options],
  correctOptionIndexes: [...question.correctOptionIndexes],
  hint: question.hint ?? null,
});

const TRUE_FALSE_OPTIONS = ["True", "False"] as const;

const buildQuestionOptions = (question: TestQuestion, answers: TestAnswer[]) => {
  if (question.type === "true_false") {
    return [...TRUE_FALSE_OPTIONS];
  }

  return answers.map((answer) => answer.answer_text);
};

const buildCorrectOptionIndexes = (question: TestQuestion, answers: TestAnswer[]) => {
  if (question.type === "true_false") {
    const correctAnswer = answers.find((answer) => answer.is_correct);

    if (!correctAnswer) {
      return [];
    }

    return correctAnswer.answer_text.trim().toLowerCase() === "false" ? [1] : [0];
  }

  return answers.reduce<number[]>((indexes, answer, index) => {
    if (answer.is_correct) {
      indexes.push(index);
    }

    return indexes;
  }, []);
};

const mapQuestionToCourseTestQuestion = (
  question: TestQuestion,
  answers: TestAnswer[]
): CourseTestQuestion => ({
  id: question.id,
  type: question.type,
  questionText: question.question_text,
  options: buildQuestionOptions(question, answers),
  correctOptionIndexes: buildCorrectOptionIndexes(question, answers),
  hint: question.hint,
});

const buildAnswerPayloads = (question: CourseTestQuestion) => {
  const options =
    question.type === "true_false" ? [...TRUE_FALSE_OPTIONS] : question.options.map((option) => option.trim());

  return options.map((answerText, index) => ({
    answer_text: answerText,
    is_correct: question.correctOptionIndexes.includes(index),
  }));
};

const isQuestionValid = (question: CourseTestQuestion) => {
  if (!question.questionText.trim()) {
    return false;
  }

  if (question.type === "true_false") {
    return (
      question.correctOptionIndexes.length === 1 &&
      (question.correctOptionIndexes[0] === 0 || question.correctOptionIndexes[0] === 1)
    );
  }

  if (question.options.length < 2 || question.options.some((option) => !option.trim())) {
    return false;
  }

  if (question.correctOptionIndexes.length === 0) {
    return false;
  }

  if (
    question.correctOptionIndexes.some(
      (optionIndex) => optionIndex < 0 || optionIndex >= question.options.length
    )
  ) {
    return false;
  }

  if (question.type === "single_choice" && question.correctOptionIndexes.length !== 1) {
    return false;
  }

  return true;
};

const canSaveTestDraft = (title: string, questions: CourseTestQuestion[]) => {
  if (!title.trim() || questions.length === 0) {
    return false;
  }

  return questions.every(isQuestionValid);
};

const buildOrderedModuleItems = (lessons: Lesson[], tests: CourseTest[]) => {
  const items: Array<
    | { type: "lesson"; lesson: Lesson }
    | { type: "test"; test: CourseTest }
  > = [];

  lessons.forEach((lesson) => {
    items.push({ type: "lesson", lesson });

    tests
      .filter((test) => test.afterLessonId === lesson.id)
      .forEach((test) => {
        items.push({ type: "test", test });
      });
  });

  tests
    .filter((test) => !test.afterLessonId || !lessons.some((lesson) => lesson.id === test.afterLessonId))
    .forEach((test) => {
      items.push({ type: "test", test });
    });

  return items;
};

const studentQuestionTypeLabels: Record<CourseTestQuestion["type"], string> = {
  true_false: "True / False",
  single_choice: "One correct answer",
  multiple_choice: "Multiple correct answers",
};

const hasLessonContent = (content: string | null) =>
  Boolean(content?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim());

export function CourseBuilderPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState("");
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseThumbnailPath, setCourseThumbnailPath] = useState<string | null>(null);
  const [isUploadingCourseMedia, setIsUploadingCourseMedia] = useState(false);

  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [isCreateModuleModalOpen, setIsCreateModuleModalOpen] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");

  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({});
  const [lessonEditorModuleId, setLessonEditorModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [expandedLessonIds, setExpandedLessonIds] = useState<Record<string, boolean>>({});

  const [testsByModule, setTestsByModule] = useState<Record<string, CourseTest[]>>({});
  const [testEditorModuleId, setTestEditorModuleId] = useState<string | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [testAfterLessonId, setTestAfterLessonId] = useState<string | null>(null);
  const [testQuestions, setTestQuestions] = useState<CourseTestQuestion[]>([]);
  const [expandedTestIds, setExpandedTestIds] = useState<Record<string, boolean>>({});
  const [expandedStudentPreviewModuleIds, setExpandedStudentPreviewModuleIds] = useState<
    Record<string, boolean>
  >({});

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === currentCourseId) || null,
    [courses, currentCourseId]
  );

  const activeTestModuleLessons = useMemo(
    () => (testEditorModuleId ? lessonsByModule[testEditorModuleId] || [] : []),
    [lessonsByModule, testEditorModuleId]
  );

  const canSaveCurrentTest = useMemo(
    () => canSaveTestDraft(testTitle, testQuestions),
    [testQuestions, testTitle]
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

  const isBasicsComplete =
    courseTitle.trim().length > 0 && courseDescription.trim().length > 0;
  const totalModules = modules.length;
  const totalLessons = useMemo(
    () =>
      modules.reduce((sum, module) => sum + (lessonsByModule[module.id]?.length || 0), 0),
    [lessonsByModule, modules]
  );
  const totalTests = useMemo(
    () =>
      modules.reduce((sum, module) => sum + (testsByModule[module.id]?.length || 0), 0),
    [modules, testsByModule]
  );
  const isReviewContentLoading = modules.some(
    (module) => lessonsByModule[module.id] === undefined || testsByModule[module.id] === undefined
  );
  const publishBlockingIssues = useMemo(() => {
    const issues: string[] = [];

    if (modules.length === 0) {
      issues.push("Add at least one module before publishing the course.");
      return issues;
    }

    if (!isReviewContentLoading && totalLessons === 0) {
      issues.push("Add at least one lesson so at least one module contains lesson content.");
    }

    return issues;
  }, [isReviewContentLoading, modules.length, totalLessons]);

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
      queueMicrotask(() => {
        void fetchModules(currentCourseId);
      });
    } else {
      queueMicrotask(() => {
        setModules([]);
        setLessonsByModule({});
        setTestsByModule({});
        setCourseThumbnailPath(null);
      });
    }
  }, [currentCourseId]);

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

  const openCreateModuleModal = () => {
    setNewModuleTitle("");
    setIsCreateModuleModalOpen(true);
  };

  const closeCreateModuleModal = () => {
    setIsCreateModuleModalOpen(false);
    setNewModuleTitle("");
  };

  const handleSaveModuleModal = async () => {
    if (!currentCourseId || !newModuleTitle.trim()) return;

    try {
      setIsCreatingModule(true);
      const module = await createModule({
        course_id: currentCourseId,
        title: newModuleTitle.trim(),
      });
      await fetchModules(currentCourseId);
      setExpandedModuleId(module.id);
      closeCreateModuleModal();
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

  const closeCreateLessonModal = () => {
    setLessonEditorModuleId(null);
    setEditingLessonId(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonVideoUrl("");
  };

  const openCreateLessonModal = (moduleId: string) => {
    setLessonEditorModuleId(moduleId);
    setEditingLessonId(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonVideoUrl("");
  };

  const openEditLessonModal = (moduleId: string, lesson: Lesson) => {
    setLessonEditorModuleId(moduleId);
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content || "");
    setLessonVideoUrl(lesson.video_url || "");

    void (async () => {
      try {
        const blocks = await listLessonBlocksByLesson(lesson.id);
        const richTextBlock = blocks.find((block) => block.block_type === "rich_text");
        const html =
          richTextBlock && typeof richTextBlock.content.html === "string"
            ? richTextBlock.content.html
            : null;

        if (html !== null) {
          setLessonContent(html);
        }
      } catch {
        // Keep the lesson.content fallback if blocks fail to load.
      }
    })();
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
    setTestTitle("");
    setTestAfterLessonId(null);
    setTestQuestions([]);
  };

  const openCreateTestModal = (moduleId: string) => {
    setTestEditorModuleId(moduleId);
    setEditingTestId(null);
    setTestTitle("");
    setTestAfterLessonId(null);
    setTestQuestions([createEmptyTestQuestion()]);
  };

  const openEditTestModal = (moduleId: string, test: CourseTest) => {
    setTestEditorModuleId(moduleId);
    setEditingTestId(test.id);
    setTestTitle(test.title);
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

    try {
      setIsSavingTest(true);
      const existingTests = testsByModule[moduleId] ?? (await fetchTests(moduleId)) ?? [];

      const savedTest = editingTestId
        ? await updateTestEntity(editingTestId, {
            title: testTitle.trim(),
            after_lesson_id: testAfterLessonId,
            order:
              existingTests.find((test) => test.id === editingTestId)?.order ??
              existingTests.length + 1,
          })
        : await createTestEntity({
            module_id: moduleId,
            title: testTitle.trim(),
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

  const toggleStudentPreviewModule = (moduleId: string) => {
    setExpandedStudentPreviewModuleIds((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
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

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {courseTitle.trim() ? courseTitle.trim() : "Untitled course"}
        </h1>
        {message ? <p className="mt-3 text-xs text-red-600">{message}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
        <div className="flex items-center justify-between">
          {steps.map((step) => {
            const isActive = activeStep === step.id;
            const isCompleted = activeStep > step.id;
            const isEnabled = step.id === 1 || Boolean(currentCourseId);
            return (
              <button
                key={step.id}
                type="button"
                disabled={!isEnabled}
                onClick={() => setActiveStep(step.id as 1 | 2 | 3)}
                className="flex w-full flex-col items-center gap-2 text-center"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-blue-600 text-white"
                      : isEnabled
                      ? "border border-slate-300 text-slate-600"
                      : "border border-slate-200 text-slate-300"
                  }`}
                >
                  {step.id}
                </span>
                <div
                  className={`text-xs font-semibold ${
                    isCompleted
                      ? "text-emerald-600"
                      : isActive
                      ? "text-blue-600"
                      : "text-slate-700"
                  }`}
                >
                  {step.label}
                </div>
                <div
                  className={`text-[11px] ${
                    isCompleted
                      ? "text-emerald-500"
                      : isActive
                      ? "text-blue-500"
                      : "text-slate-400"
                  }`}
                >
                  {step.helper}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeStep === 1 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <label className="text-base font-semibold text-slate-900">
                Course title
              </label>
              <Input
                value={courseTitle}
                onChange={(event) => setCourseTitle(event.target.value)}
                placeholder="Untitled course"
                className="text-lg font-semibold placeholder:font-normal"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-slate-900">
                Course description
              </label>
              <textarea
                value={courseDescription}
                onChange={(event) => setCourseDescription(event.target.value)}
                placeholder="Describe the outcomes for this course"
                className="h-32 w-full rounded border border-slate-300 bg-white/85 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-slate-900">
                Course thumbnail / media
              </label>
              <CourseMediaUpload
                disabled={!currentCourseId && !isBasicsComplete}
                isUploading={isUploadingCourseMedia}
                mediaPath={courseThumbnailPath}
                mediaUrl={courseThumbnailUrl}
                onFileSelect={(file) => {
                  void handleCourseMediaUpload(file);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Complete the basics to unlock course content.
              </p>
              <Button
                onClick={async () => {
                  const wasSaved = await handleSaveDraft();
                  if (wasSaved) {
                    setActiveStep(2);
                  }
                }}
                disabled={!isBasicsComplete}
              >
                Continue to Course Content
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {activeStep === 2 ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Course Content
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Build modules, lessons, and tests.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={openCreateModuleModal} disabled={!currentCourseId}>
                  <span className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add module
                  </span>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {modules.map((module) => {
              const lessons = lessonsByModule[module.id] || [];
              const tests = testsByModule[module.id] || [];
              const isExpanded = expandedModuleId === module.id;
              return (
                <div
                  key={module.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    {editModuleId === module.id ? (
                      <div className="flex flex-1 flex-col gap-2">
                        <Input
                          value={editModuleTitle}
                          onChange={(event) =>
                            setEditModuleTitle(event.target.value)
                          }
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleUpdateModule}>Save</Button>
                          <Button
                            variant="secondary"
                            onClick={() => setEditModuleId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center gap-3 text-left">
                        <span className="text-sm text-slate-400">Module {module.order}</span>
                        <span className="text-base font-semibold text-slate-900">{module.title}</span>
                        <span className="text-sm text-slate-500">{lessons.length} lessons</span>
                        <span className="text-sm text-slate-500">{tests.length} tests</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={() => {
                          void toggleModule(module.id);
                        }}
                        aria-label={isExpanded ? "Collapse module" : "Expand module"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditModuleId(module.id);
                          setEditModuleTitle(module.title);
                        }}
                        aria-label="Edit module"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteModule(module.id)}
                        aria-label="Delete module"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-slate-100 px-6 py-6">
                      <div className="flex flex-col gap-6">
                        <ModuleLessonsSection
                          moduleId={module.id}
                          lessons={lessons}
                          expandedLessonIds={expandedLessonIds}
                          onOpenCreateLesson={openCreateLessonModal}
                          onToggleLesson={toggleLessonPreview}
                          onEditLesson={openEditLessonModal}
                          onDeleteLesson={(moduleId, lessonId) => {
                            void handleDeleteLesson(moduleId, lessonId);
                          }}
                        />

                        <ModuleTestsSection
                          moduleId={module.id}
                          lessons={lessons}
                          tests={tests}
                          expandedTestIds={expandedTestIds}
                          onOpenCreateTest={openCreateTestModal}
                          onToggleTest={toggleTestPreview}
                          onEditTest={openEditTestModal}
                          onDeleteTest={(nextModuleId, testId) => {
                            void handleDeleteTest(nextModuleId, testId);
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="flex justify-end">
              <Button onClick={() => setActiveStep(3)} disabled={!currentCourseId}>
                Continue to Review & Publish
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {activeStep === 3 ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Review & Publish
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review your course content and publish when everything is ready.
            </p>
            <div className="mt-6 space-y-6">
              {isReviewContentLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  Loading course content preview...
                </div>
              ) : publishBlockingIssues.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Please address these issues before publishing:
                      </p>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-800">
                        {publishBlockingIssues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="h-5 w-5" />
                    <p className="font-semibold">Course structure is ready for publishing.</p>
                  </div>
                </div>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-xl font-semibold text-slate-900">Course Overview</h3>

                <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white text-slate-400">
                      {courseThumbnailUrl ? (
                        courseThumbnailKind === "image" ? (
                          <img
                            src={courseThumbnailUrl}
                            alt={`${courseTitle.trim() || "Course"} media`}
                            className="h-full w-full object-cover"
                          />
                        ) : courseThumbnailKind === "video" ? (
                          <video
                            src={courseThumbnailUrl}
                            className="h-full w-full bg-slate-950 object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center px-3 text-center">
                            <BookOpen className="h-8 w-8" />
                            <span className="mt-1 max-h-8 overflow-hidden break-all text-[10px] font-medium text-slate-500">
                              {courseThumbnailLabel}
                            </span>
                          </div>
                        )
                      ) : (
                        <BookOpen className="h-10 w-10" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-2xl font-semibold text-slate-900">
                        {courseTitle.trim() || "Untitled course"}
                      </h4>
                      <p className="max-w-3xl text-sm leading-6 text-slate-600">
                        {courseDescription.trim() || "No description yet."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center">
                    <BookOpen className="mx-auto h-9 w-9 text-blue-600" />
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{totalModules}</p>
                    <p className="mt-1 text-sm text-slate-500">Modules</p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center">
                    <Play className="mx-auto h-9 w-9 text-emerald-600" />
                    <p className="mt-3 text-3xl font-semibold text-slate-900">
                      {isReviewContentLoading ? "..." : totalLessons}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Lessons</p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center">
                    <BadgeCheck className="mx-auto h-9 w-9 text-violet-600" />
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{totalTests}</p>
                    <p className="mt-1 text-sm text-slate-500">Tests</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-slate-900">Student Course Preview</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Approximate preview of how the course structure and lesson content will look to students.
                </p>

                <div className="mt-6 space-y-6">
                  {modules.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                      Add modules and lessons to see the course preview.
                    </div>
                  ) : (
                    modules.map((module) => {
                      const lessons = lessonsByModule[module.id] || [];
                      const tests = testsByModule[module.id] || [];
                      const orderedItems = buildOrderedModuleItems(lessons, tests);
                      const isPreviewExpanded = Boolean(expandedStudentPreviewModuleIds[module.id]);

                      return (
                        <article
                          key={module.id}
                          className="rounded-3xl border-2 border-slate-200 bg-slate-50 p-6"
                        >
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => toggleStudentPreviewModule(module.id)}
                              className="absolute right-0 top-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                            >
                              {isPreviewExpanded ? "Hide" : "Preview"}
                              {isPreviewExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>

                            <div className="text-center">
                              <p className="text-sm font-medium text-slate-500">Module {module.order}</p>
                              <h4 className="mt-2 text-2xl font-semibold text-slate-900">
                                {module.title}
                              </h4>
                            </div>
                          </div>

                          <div className="mt-5 space-y-4">
                            {orderedItems.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                                This module does not contain any lessons or tests yet.
                              </div>
                            ) : !isPreviewExpanded ? (
                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                {orderedItems.map((item, index) => (
                                  <div
                                    key={item.type === "lesson" ? item.lesson.id : item.test.id}
                                    className={`flex items-center gap-3 px-2 py-3 ${
                                      index < orderedItems.length - 1 ? "border-b border-slate-100" : ""
                                    }`}
                                  >
                                    {item.type === "lesson" ? (
                                      <Play className="h-4 w-4 text-slate-500" />
                                    ) : (
                                      <BadgeCheck className="h-4 w-4 text-slate-500" />
                                    )}
                                    <span className="text-sm font-medium text-slate-800">
                                      {item.type === "lesson" ? item.lesson.title : item.test.title}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              orderedItems.map((item) => {
                                if (item.type === "lesson") {
                                  const embedUrl = getYouTubeEmbedUrl(item.lesson.video_url);
                                  const lessonPosition =
                                    lessons.findIndex((lesson) => lesson.id === item.lesson.id) + 1;

                                  return (
                                    <div
                                      key={item.lesson.id}
                                      className="rounded-2xl border border-slate-200 bg-white p-5"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-100 bg-white text-sm font-semibold text-slate-700">
                                          {lessonPosition}
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                            Lesson
                                          </p>
                                          <h5 className="text-base font-semibold text-slate-900">
                                            {item.lesson.title}
                                          </h5>
                                        </div>
                                      </div>

                                      {hasLessonContent(item.lesson.content) ? (
                                        <div
                                          className="prose prose-sm mt-4 max-w-none text-slate-600"
                                          dangerouslySetInnerHTML={{
                                            __html: item.lesson.content ?? "",
                                          }}
                                        />
                                      ) : (
                                        <p className="mt-4 text-sm leading-6 text-slate-600">
                                          No lesson content yet.
                                        </p>
                                      )}

                                      {embedUrl ? (
                                        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                                          <div className="aspect-video">
                                            <iframe
                                              src={embedUrl}
                                              title={`${item.lesson.title} preview video`}
                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                              allowFullScreen
                                              className="h-full w-full"
                                            />
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={item.test.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-5"
                                  >
                                    <div className="flex flex-wrap items-center gap-3">
                                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                        Test
                                      </p>
                                      <h5 className="text-base font-semibold text-slate-900">
                                        {item.test.title}
                                      </h5>
                                    </div>

                                    <div className="mt-4 space-y-4">
                                      {item.test.questions.map((question, questionIndex) => (
                                        <div
                                          key={question.id}
                                          className="rounded-2xl border border-slate-100 bg-white p-4"
                                        >
                                          <div className="flex items-center justify-between gap-4">
                                            <p className="text-sm font-semibold text-slate-900">
                                              {questionIndex + 1}
                                            </p>
                                            <span className="text-xs font-medium text-slate-500">
                                              {studentQuestionTypeLabels[question.type]}
                                            </span>
                                          </div>

                                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                            {question.questionText}
                                          </p>

                                          {question.hint?.trim() ? (
                                            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                                              <span className="font-semibold">Hint:</span>{" "}
                                              {question.hint.trim()}
                                            </div>
                                          ) : null}

                                          <div className="mt-4 space-y-2">
                                            {question.type === "true_false" ? (
                                              <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                                                  True
                                                </div>
                                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                                                  False
                                                </div>
                                              </div>
                                            ) : (
                                              question.options.map((option, optionIndex) => (
                                                <div
                                                  key={`${question.id}-${optionIndex}`}
                                                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
                                                >
                                                  <span
                                                    className={`flex h-4 w-4 items-center justify-center border border-slate-300 ${
                                                      question.type === "multiple_choice"
                                                        ? "rounded-[4px]"
                                                        : "rounded-full"
                                                    }`}
                                                  />
                                                  <span>{option}</span>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handlePublishCourse}
                disabled={
                  !currentCourseId ||
                  isReviewContentLoading ||
                  publishBlockingIssues.length > 0
                }
              >
                Publish Course
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <LessonCreateModal
        isOpen={lessonEditorModuleId !== null}
        heading={editingLessonId ? "Edit Lesson" : "Create Lesson"}
        saveLabel={editingLessonId ? "Save Changes" : "Save Lesson"}
        title={lessonTitle}
        content={lessonContent}
        videoUrl={lessonVideoUrl}
        isSaving={isCreatingLesson}
        onClose={closeCreateLessonModal}
        onSave={() => {
          void handleCreateLesson();
        }}
        onTitleChange={setLessonTitle}
        onContentChange={setLessonContent}
        onVideoUrlChange={setLessonVideoUrl}
      />

      <TestCreateModal
        isOpen={testEditorModuleId !== null}
        heading={editingTestId ? "Edit Test" : "Create Test"}
        saveLabel={editingTestId ? "Save Changes" : "Save Test"}
        title={testTitle}
        lessons={activeTestModuleLessons}
        selectedAfterLessonId={testAfterLessonId}
        questions={testQuestions}
        canSave={canSaveCurrentTest}
        isSaving={isSavingTest}
        onClose={closeCreateTestModal}
        onSave={() => {
          void handleCreateTest();
        }}
        onTitleChange={setTestTitle}
        onAfterLessonChange={setTestAfterLessonId}
        onAddQuestion={handleAddTestQuestion}
        onQuestionChange={handleChangeTestQuestion}
        onDeleteQuestion={handleDeleteTestQuestion}
      />

      <CreateModuleModal
        isOpen={isCreateModuleModalOpen}
        title={newModuleTitle}
        isSaving={isCreatingModule}
        onTitleChange={setNewModuleTitle}
        onCancel={closeCreateModuleModal}
        onSave={() => {
          void handleSaveModuleModal();
        }}
      />
    </div>
  );
}
