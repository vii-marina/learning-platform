import { Play, X } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import type { Lesson, Module } from "../../api";
import type { CourseTest } from "./courseBuilderUiTypes";
import { CourseStructureSidebar } from "./CourseStructureSidebar";
import { RichTextEditor } from "./RichTextEditor";

type LessonCreateModalProps = {
  isOpen: boolean;
  heading?: string;
  saveLabel?: string;
  courseTitle: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  activeModuleId: string | null;
  activeLessonId: string | null;
  draftLessonModuleId: string | null;
  draftLessonTitle: string;
  title: string;
  content: string;
  videoUrl: string;
  notice?: string;
  isSaving?: boolean;
  isLoadingLesson?: boolean;
  isDirty?: boolean;
  onClose: () => void;
  onSave: () => void;
  onSelectLesson: (moduleId: string, lesson: Lesson) => void;
  onSelectDraftLesson: (moduleId: string) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onVideoUrlChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
};

export function LessonCreateModal({
  isOpen,
  heading = "Create Lesson",
  saveLabel = "Save Lesson",
  courseTitle,
  modules,
  lessonsByModule,
  testsByModule,
  activeModuleId,
  activeLessonId,
  draftLessonModuleId,
  draftLessonTitle,
  title,
  content,
  videoUrl,
  notice = "",
  isSaving = false,
  isLoadingLesson = false,
  isDirty = false,
  onClose,
  onSave,
  onSelectLesson,
  onSelectDraftLesson,
  onTitleChange,
  onContentChange,
  onVideoUrlChange,
  onImageUpload,
}: LessonCreateModalProps) {
  if (!isOpen) {
    return null;
  }

  const activeModule = modules.find((module) => module.id === activeModuleId) || null;
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-h-[94vh] w-full max-w-[92rem] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
        <CourseStructureSidebar
          courseTitle={courseTitle}
          modules={modules}
          lessonsByModule={lessonsByModule}
          testsByModule={testsByModule}
          restrictToActiveModule
          activeModuleId={activeModuleId}
          activeLessonId={activeLessonId}
          draftLessonModuleId={draftLessonModuleId}
          draftLessonTitle={draftLessonTitle}
          isDirty={isDirty}
          onSelectLesson={onSelectLesson}
          onSelectDraftLesson={onSelectDraftLesson}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#13daec]/15 text-[#08bfd4]">
                <Play className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-3xl font-extrabold tracking-tight text-[#14213d]">
                  {heading}
                </h3>
                {activeModule ? (
                  <p className="mt-1 text-sm text-slate-500">{`Inside Module ${activeModule.order}: ${activeModule.title}`}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close lesson modal"
              className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-8">
              {notice ? (
                <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  {notice}
                </div>
              ) : null}

              {isLoadingLesson ? (
                <div className="rounded-[1rem] border border-slate-200 bg-[#f9fbfd] px-4 py-3 text-sm text-slate-500">
                  Loading lesson content...
                </div>
              ) : null}

              <div>
                <label className="text-sm font-semibold text-[#14213d]">
                  Lesson Title
                </label>
                <Input
                  value={title}
                  onChange={(event) => onTitleChange(event.target.value)}
                  placeholder="New Lesson"
                  className="mt-3 h-14 rounded-2xl border border-slate-200 bg-[#f9fbfd] px-5 text-2xl font-semibold text-[#14213d] focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/15"
                  disabled={isLoadingLesson || isSaving}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#14213d]">
                  Video Lesson Link (Optional)
                </label>
                <Input
                  value={videoUrl}
                  onChange={(event) => onVideoUrlChange(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-3 h-14 rounded-2xl border border-slate-200 bg-[#f9fbfd] px-5 text-lg text-[#14213d] focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/15"
                  disabled={isLoadingLesson || isSaving}
                />
                <p className="mt-2 text-sm text-slate-500">
                  Supported: YouTube, Vimeo, Loom, or MP4 direct link.
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#14213d]">
                  Lesson Content
                </label>
                <div className="mt-3">
                  <RichTextEditor
                    value={content}
                    onChange={onContentChange}
                    placeholder="Start typing your lesson content here..."
                    disabled={isLoadingLesson || isSaving}
                    onImageUpload={onImageUpload}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-5">
            <div className="flex justify-end gap-4">
              <Button
                variant="secondary"
                onClick={onClose}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={onSave}
                disabled={!title.trim() || isSaving || isLoadingLesson}
                className="h-11 rounded-2xl bg-[#0f172a] px-6 text-sm font-bold text-white hover:bg-[#111f39]"
              >
                {isSaving ? "Saving..." : saveLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
