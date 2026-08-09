/**
 * Ownership of the lesson-editor draft.
 *
 * All of the editor's in-flight state lives here in one place: which module and lesson are
 * open, the three edited fields, the snapshot they are compared against, and the unsaved
 * draft kept per module so switching away and back does not lose typing.
 *
 * `shouldGuardLessonDraft` is the flag the close handler asks before discarding work. It is
 * deliberately narrower than "dirty": a brand-new lesson with nothing meaningful typed into
 * it is not worth interrupting the user over.
 *
 * State stays single-owner — the containing hook reads and calls, it never holds a second
 * copy.
 */

import { useMemo, useRef, useState } from "react";
import type { Lesson } from "../../../api/index";
import {
  createLocalEntityId,
  EMPTY_LESSON_EDITOR_DRAFT,
  hasLessonContent,
  type LessonEditorDraft,
} from "../lib/courseBuilderPageUtils";

export function useLessonEditorDraft(lessonsByModule: Record<string, Lesson[]>) {
  const [lessonEditorModuleId, setLessonEditorModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
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

  return {
    lessonEditorModuleId,
    editingLessonId,
    isLoadingLessonDraft,
    setIsLoadingLessonDraft,
    lessonEditorNotice,
    setLessonEditorNotice,
    lessonTitle,
    setLessonTitle,
    lessonContent,
    setLessonContent,
    lessonVideoUrl,
    setLessonVideoUrl,
    pendingLessonDraft,
    setPendingLessonDraft,
    setLessonInitialDraft,
    lessonLoadRequestRef,
    isLessonDirty,
    shouldGuardLessonDraft,
    applyLessonDraft,
    openPendingLessonDraft,
    closeCreateLessonModal,
    updatePendingLessonDraft,
    createLocalLessonDraft,
  };
}
