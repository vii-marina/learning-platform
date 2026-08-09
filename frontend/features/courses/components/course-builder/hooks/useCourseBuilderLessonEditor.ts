import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  createLesson,
  deleteLesson,
  listLessonBlocksByLesson,
  updateLesson,
  upsertLessonPrimaryRichTextBlock,
} from "../../../api/index";
import {
  getCourseMediaPublicUrl,
  uploadLessonContentImage,
} from "../../../api/courseMediaStorage";
import type { Lesson } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import {
  EMPTY_LESSON_EDITOR_DRAFT,
  createLocalEntityId,
  hasLessonContent,
  type LessonEditorDraft,
} from "../lib/courseBuilderPageUtils";

type UseCourseBuilderLessonEditorArgs = {
  currentCourseId: string | null;
  draftCourseSessionId: string;
  lessonsByModule: Record<string, Lesson[]>;
  setLessonsByModule: Dispatch<SetStateAction<Record<string, Lesson[]>>>;
  setTestsByModule: Dispatch<SetStateAction<Record<string, CourseTest[]>>>;
  fetchLessons: (moduleId: string) => Promise<Lesson[] | null>;
  fetchTests: (moduleId: string) => Promise<CourseTest[] | null>;
  fetchExercises: (moduleId: string) => Promise<CourseExercise[] | null>;
  persistDraftCourse: () => Promise<string | null>;
  isPersistingCourse: boolean;
  setMessage: Dispatch<SetStateAction<string>>;
};

export function useCourseBuilderLessonEditor({
  currentCourseId,
  draftCourseSessionId,
  lessonsByModule,
  setLessonsByModule,
  setTestsByModule,
  fetchLessons,
  fetchTests,
  fetchExercises,
  persistDraftCourse,
  isPersistingCourse,
  setMessage,
}: UseCourseBuilderLessonEditorArgs) {
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
  const [shouldPersistDraftAfterLessonSave, setShouldPersistDraftAfterLessonSave] =
    useState(false);
  const lessonLoadRequestRef = useRef(0);

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

  useEffect(() => {
    if (!shouldPersistDraftAfterLessonSave || currentCourseId !== null || isPersistingCourse) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      await persistDraftCourse();

      if (!isCancelled) {
        setShouldPersistDraftAfterLessonSave(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trigger-flag effect; persistDraftCourse is recreated each render and must not re-run it
  }, [currentCourseId, isPersistingCourse, shouldPersistDraftAfterLessonSave]);

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

  const updatePendingLessonDraft = (draft: LessonEditorDraft) => {
    if (editingLessonId === null && lessonEditorModuleId) {
      setPendingLessonDraft({
        moduleId: lessonEditorModuleId,
        draft,
      });
    }

    if (lessonEditorNotice) {
      setLessonEditorNotice("");
    }
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
    updatePendingLessonDraft({
      title: value,
      content: lessonContent,
      videoUrl: lessonVideoUrl,
    });
  };

  const handleLessonContentChange = (value: string) => {
    setLessonContent(value);
    updatePendingLessonDraft({
      title: lessonTitle,
      content: value,
      videoUrl: lessonVideoUrl,
    });
  };

  const handleLessonVideoUrlChange = (value: string) => {
    setLessonVideoUrl(value);
    updatePendingLessonDraft({
      title: lessonTitle,
      content: lessonContent,
      videoUrl: value,
    });
  };

  const handleLessonEditorSelectLesson = (moduleId: string, lesson: Lesson) => {
    if (editingLessonId === lesson.id) {
      return;
    }

    if (editingLessonId === null && lessonEditorModuleId) {
      setPendingLessonDraft({
        moduleId: lessonEditorModuleId,
        draft: {
          title: lessonTitle,
          content: lessonContent,
          videoUrl: lessonVideoUrl,
        },
      });
      void openEditLessonModal(moduleId, lesson);
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
            lesson.id === editingLessonId ? updatedLesson : lesson
          ),
        }));
        setShouldPersistDraftAfterLessonSave(true);
        closeCreateLessonModal();
        setMessage("");
        return {
          moduleId,
          lesson: updatedLesson,
        };
      }

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
      }

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
    if (!window.confirm("Delete this lesson?")) {
      return;
    }

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
      // deleteLessonById unlinks both tests AND exercises server-side, in one place, before the
      // delete. This used to unlink only the tests, from here, one request each — half the job and
      // N+1 round-trips. See the unlink comment in backend courseBuilderService: it is what stops
      // the after_lesson_id cascade from taking the tests with the lesson.
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

  return {
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
  };
}
