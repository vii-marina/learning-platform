import type { Lesson } from "../types/types";
import { LessonEditPanel } from "./LessonEditPanel";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { ReorderButtons } from "./ReorderButtons";

type LessonListProps = {
  lessons: Lesson[];
  editLessonId: string | null;
  editTitle: string;
  editContent: string;
  editContentType: string;
  onEditStart: (lesson: Lesson) => void;
  onDelete: (lessonId: string) => void;
  onMoveUp: (lessonId: string) => void;
  onMoveDown: (lessonId: string) => void;
  onEditTitleChange: (value: string) => void;
  onEditContentChange: (value: string) => void;
  onEditContentTypeChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
};

export function LessonList({
  lessons,
  editLessonId,
  editTitle,
  editContent,
  editContentType,
  onEditStart,
  onDelete,
  onMoveUp,
  onMoveDown,
  onEditTitleChange,
  onEditContentChange,
  onEditContentTypeChange,
  onEditSave,
  onEditCancel,
}: LessonListProps) {
  return (
    <div className="flex flex-col gap-2">
      {lessons.map((lesson) => (
        <div
          key={lesson.id}
          className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-600"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-900">{lesson.title}</span>
            <div className="flex gap-2 text-xs text-slate-500">
              <ReorderButtons
                onMoveUp={() => onMoveUp(lesson.id)}
                onMoveDown={() => onMoveDown(lesson.id)}
              />
              <button type="button" onClick={() => onEditStart(lesson)}>
                Edit
              </button>
              <ConfirmDeleteButton
                className="text-xs text-slate-500"
                confirmText="Delete this lesson?"
                onConfirm={() => onDelete(lesson.id)}
              />
            </div>
          </div>
          {editLessonId === lesson.id ? (
            <LessonEditPanel
              title={editTitle}
              content={editContent}
              contentType={editContentType}
              onTitleChange={onEditTitleChange}
              onContentChange={onEditContentChange}
              onContentTypeChange={onEditContentTypeChange}
              onSave={onEditSave}
              onCancel={onEditCancel}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
