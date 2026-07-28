import { ChevronDown, ChevronRight, Pencil, Play } from "lucide-react";
import type { Lesson, Module } from "../../../../api/index";
import {
  lessonSidebarIconClassNames,
  type AccentClasses,
  type PreviewAccentClasses,
} from "./constants";

type LessonRowProps = {
  module: Module;
  lesson: Lesson;
  activeLessonId: string | null;
  selectedAfterLessonId: string | null;
  previewLessonId: string | null;
  isActiveModule: boolean;
  isDirty: boolean;
  showTestSourcePreview: boolean;
  isCleanAccent: boolean;
  accentClasses: AccentClasses;
  previewAccentClasses: PreviewAccentClasses;
  registerRef: (node: HTMLElement | null) => void;
  onSelectLesson?: (moduleId: string, lesson: Lesson) => void;
  // Prepared by the orchestrator: clears manual preview selections + collapses the module.
  onSelectPreviewLesson?: (moduleId: string, lessonId: string) => void;
};

export function LessonRow({
  module,
  lesson,
  activeLessonId,
  selectedAfterLessonId,
  previewLessonId,
  isActiveModule,
  isDirty,
  showTestSourcePreview,
  isCleanAccent,
  accentClasses,
  previewAccentClasses,
  registerRef,
  onSelectLesson,
  onSelectPreviewLesson,
}: LessonRowProps) {
  const isPlacementLesson = lesson.id === selectedAfterLessonId;
  const isPreviewLesson =
    showTestSourcePreview &&
    selectedAfterLessonId === null &&
    lesson.id === previewLessonId;
  const isActiveLesson =
    lesson.id === activeLessonId || isPlacementLesson || isPreviewLesson;
  const badgeLabel = lesson.id === activeLessonId && isDirty ? "Unsaved" : null;
  const activeRowClass = `border-l-4 ${accentClasses.itemActiveBorder} ${accentClasses.itemActiveBg} text-[#14213d]`;
  const rowClass = isActiveLesson
    ? activeRowClass
    : isCleanAccent
      ? "border-l-4 border-transparent text-slate-500"
      : "text-slate-500";
  const canSelectPreviewLesson =
    showTestSourcePreview && isActiveModule && Boolean(onSelectPreviewLesson);
  const showLessonEditButton = showTestSourcePreview && Boolean(onSelectLesson);
  const lessonIconClassName = isActiveLesson
    ? lessonSidebarIconClassNames.active
    : lessonSidebarIconClassNames.inactive;
  const baseRowContent = (
    <>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] ${lessonIconClassName}`}
      >
        <Play className="ml-0.5 h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {`${module.order}.${lesson.order} ${lesson.title}`}
      </span>
      {badgeLabel ? (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          {badgeLabel}
        </span>
      ) : null}
    </>
  );

  if (canSelectPreviewLesson && onSelectPreviewLesson) {
    return (
      <div
        ref={registerRef}
        className={`flex w-full items-center gap-2 rounded-[1rem] border px-3 py-2.5 transition ${
          isActiveLesson
            ? previewAccentClasses.rowActive
            : previewAccentClasses.rowInactive
        }`}
      >
        <button
          type="button"
          onClick={() => onSelectPreviewLesson(module.id, lesson.id)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {baseRowContent}
          {showTestSourcePreview ? (
            isActiveLesson ? (
              <ChevronDown className={`h-4 w-4 shrink-0 ${previewAccentClasses.chevron}`} />
            ) : (
              <ChevronRight className={`h-4 w-4 shrink-0 ${previewAccentClasses.chevron}`} />
            )
          ) : null}
        </button>
        {showLessonEditButton && onSelectLesson ? (
          <button
            type="button"
            onClick={() => onSelectLesson(module.id, lesson)}
            aria-label={`Edit ${lesson.title}`}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition ${previewAccentClasses.editButton}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    );
  }

  if (onSelectLesson) {
    return (
      <button
        ref={registerRef}
        type="button"
        onClick={() => onSelectLesson(module.id, lesson)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
          isActiveLesson
            ? rowClass
            : isCleanAccent
              ? "border-l-4 border-transparent text-slate-500 hover:text-[#14213d]"
              : "text-slate-500 hover:bg-slate-100 hover:text-[#14213d]"
        }`}
      >
        {baseRowContent}
      </button>
    );
  }

  return (
    <div
      ref={registerRef}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowClass}`}
    >
      {baseRowContent}
    </div>
  );
}
