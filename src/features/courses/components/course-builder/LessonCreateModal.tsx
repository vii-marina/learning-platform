import { Play, X } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { RichTextEditor } from "./RichTextEditor";

type LessonCreateModalProps = {
  isOpen: boolean;
  heading?: string;
  saveLabel?: string;
  title: string;
  content: string;
  videoUrl: string;
  isSaving?: boolean;
  onClose: () => void;
  onSave: () => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onVideoUrlChange: (value: string) => void;
};

export function LessonCreateModal({
  isOpen,
  heading = "Create Lesson",
  saveLabel = "Save Lesson",
  title,
  content,
  videoUrl,
  isSaving = false,
  onClose,
  onSave,
  onTitleChange,
  onContentChange,
  onVideoUrlChange,
}: LessonCreateModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-8">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <Play className="h-6 w-6 text-slate-900" />
            <h3 className="text-2xl font-semibold text-slate-900">{heading}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close lesson modal">
            <X className="h-6 w-6 text-slate-900" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label className="text-base font-semibold text-slate-900">Lesson Title *</label>
            <Input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="New Lesson"
              className="mt-2 h-11 rounded-xl border-0 bg-slate-100 px-4 text-base"
              autoFocus
            />
          </div>

          <div>
            <label className="text-base font-semibold text-slate-900">Lesson Content</label>
            <div className="mt-2">
              <RichTextEditor
                value={content}
                onChange={onContentChange}
                placeholder="Write your lesson content here. You can include text, instructions, and explanations."
              />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              This is the main content students will read during the lesson.
            </p>
          </div>

          <div>
            <label className="text-base font-semibold text-slate-900">Lesson Video</label>
            <Input
              value={videoUrl}
              onChange={(event) => onVideoUrlChange(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="mt-2 h-11 rounded-xl border-0 bg-slate-100 px-4 text-base"
            />
            <p className="mt-2 text-sm text-slate-600">
              Optional: Add a YouTube link to accompany this lesson content
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex justify-end gap-4">
            <Button
              variant="secondary"
              onClick={onClose}
              className="rounded-xl px-5 py-2 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={!title.trim() || isSaving}
              className="rounded-xl bg-blue-600 px-5 py-2 text-base text-white hover:bg-blue-700"
            >
              {isSaving ? "Saving..." : saveLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
