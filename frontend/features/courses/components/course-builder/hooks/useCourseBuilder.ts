/**
 * The course builder's whole state layer, assembled in one place.
 *
 * The builder is six cooperating hooks — content data, persistence, media, and one editor each
 * for lessons, tests and exercises — plus the state they all read from. Wiring them together is
 * a job in itself, and it used to sit on top of the page's JSX, which is why that file grew past
 * 800 lines. `CourseBuilderPage` now renders what this returns.
 *
 * Each editor hook's result is returned whole (`lessonEditor`, `testEditor`, …) rather than
 * spread across dozens of top-level keys: the modals take those objects directly, so the props
 * never have to be enumerated a third time.
 *
 * Note the deliberate hoisting: `handleModuleDeletedUiCleanup` is a function *declaration* passed
 * to `useCourseBuilderContentData` above the editor hooks it closes over. It is only ever called
 * after a module delete, long after those bindings are initialised.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppToast } from "../../../../../components/ui/appToastContext";
import { useCourseBuilderContentData } from "./useCourseBuilderContentData";
import { useCourseBuilderExerciseEditor } from "./useCourseBuilderExerciseEditor";
import { useCourseBuilderLessonEditor } from "./useCourseBuilderLessonEditor";
import { useCourseBuilderLifecycle } from "./useCourseBuilderLifecycle";
import { useCourseBuilderMedia } from "./useCourseBuilderMedia";
import { useCourseBuilderPersistence } from "./useCourseBuilderPersistence";
import { useCourseBuilderTestEditor } from "./useCourseBuilderTestEditor";
import {
  getCourseBuilderStepDescription,
  getCourseBuilderStepTitle,
  type BuilderStep,
  createLocalEntityId,
  type SavedCourseSnapshot,
} from "../lib/courseBuilderPageUtils";

export function useCourseBuilder({
  initialCourseId = null,
  initialStep = 1,
  onBackToCourses,
  onCoursePublished,
}: {
  initialCourseId?: string | null;
  initialStep?: BuilderStep;
  onBackToCourses?: () => void;
  onCoursePublished?: () => void;
}) {
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
  // Identifies this editing session before the course exists server-side; media and lesson
  // drafts are filed under it. Lazy initial state rather than a ref: same "computed once, never
  // changes" guarantee, but the id is a value the render is allowed to read.
  const [draftCourseSessionId] = useState(() => createLocalEntityId("draft-course"));

  // Course basics state.
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  const media = useCourseBuilderMedia({
    currentCourseId,
    draftCourseSessionId,
    courseTitle,
    courseDescription,
    setMessage,
    setSavedCourseSnapshot,
  });
  const { courseThumbnailPath, setCourseThumbnailPath } = media;

  const content = useCourseBuilderContentData({
    currentCourseId,
    draftCourseSessionId,
    setMessage,
    onModuleDeleted: handleModuleDeletedUiCleanup,
  });
  const {
    modules,
    hasFetchedModules,
    modulesLoadState,
    isNewModuleComposerOpen,
    newModuleTitle,
    editModuleId,
    editModuleTitle,
    lessonsByModule,
    testsByModule,
    exercisesByModule,
    setModules,
    setHasFetchedModules,
    setModulesLoadState,
    setLessonsByModule,
    setTestsByModule,
    setExercisesByModule,
    setModuleContentLoadStateByModule,
    fetchModules,
    fetchLessons,
    fetchTests,
    fetchExercises,
    openNewModuleComposer,
    setExpandedModuleId,
  } = content;

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

  const lessonEditor = useCourseBuilderLessonEditor({
    currentCourseId,
    draftCourseSessionId,
    lessonsByModule,
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
    pendingLessonDraft,
    shouldGuardLessonDraft,
    setPendingLessonDraft,
    setExpandedLessonIds,
  } = lessonEditor;

  const testEditor = useCourseBuilderTestEditor({
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
  const { isTestDirty, setExpandedTestIds } = testEditor;

  const exerciseEditor = useCourseBuilderExerciseEditor({
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
  const { exerciseEditorModuleId, setExpandedExerciseIds, closeCreateExerciseModal } =
    exerciseEditor;

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

  // Course actions.
  const handleSaveDraft = async () => {
    const courseId = await persistCourseAtFinalStep("draft");
    return Boolean(courseId);
  };
  // Latest-ref so the two long-lived callers — the Cmd+S listener and the imperative handle the
  // dashboard holds — stay stable while still invoking this render's closure.
  const handleSaveDraftRef = useRef(handleSaveDraft);
  useEffect(() => {
    handleSaveDraftRef.current = handleSaveDraft;
  });
  const saveDraft = useCallback(() => handleSaveDraftRef.current(), []);

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

  const handleBackToCourses = () => {
    if (onBackToCourses) {
      onBackToCourses();
      return;
    }

    navigate("/teacher/dashboard");
  };

  const currentCourseName = courseTitle.trim() || "Untitled course";
  const isEditingExistingCourse = Boolean(initialCourseId || currentCourseId);

  return {
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
    currentStepTitle: getCourseBuilderStepTitle(activeStep, isEditingExistingCourse),
    currentStepDescription: getCourseBuilderStepDescription(activeStep),
    builderContentKey: currentCourseId ?? draftCourseSessionId,

    saveDraft,
    handleSaveDraft,
    handlePublishCourse,
    handleBackToCourses,
  };
}
