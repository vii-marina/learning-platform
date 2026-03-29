import { ArrowRight } from "lucide-react";
import { Input } from "../../../../components/ui/Input";
import { CourseMediaUpload } from "./CourseMediaUpload";
import { CourseBuilderStepHeading } from "./CourseBuilderStepHeading";

type CourseBuilderCourseInfoStepProps = {
  title: string;
  description?: string;
  courseTitle: string;
  courseDescription: string;
  courseThumbnailPath: string | null;
  courseThumbnailUrl: string | null;
  isBasicsComplete: boolean;
  isUploadingCourseMedia: boolean;
  currentCourseId: string | null;
  onCourseTitleChange: (value: string) => void;
  onCourseDescriptionChange: (value: string) => void;
  onCourseMediaSelect: (file: File) => void;
  onNext: () => void;
};

export function CourseBuilderCourseInfoStep({
  title,
  description = "",
  courseTitle,
  courseDescription,
  courseThumbnailPath,
  courseThumbnailUrl,
  isBasicsComplete,
  isUploadingCourseMedia,
  currentCourseId,
  onCourseTitleChange,
  onCourseDescriptionChange,
  onCourseMediaSelect,
  onNext,
}: CourseBuilderCourseInfoStepProps) {
  return (
    <section className="mx-auto w-full max-w-[64rem]">
      <CourseBuilderStepHeading title={title} description={description} />

      <div className="mt-8 grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.62fr)]">
        <div className="flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-5">
          <div className="flex h-full flex-col space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#14213d]">
                Course Title
              </label>
              <Input
                value={courseTitle}
                onChange={(event) => onCourseTitleChange(event.target.value)}
                placeholder="e.g. Master Modern Web UI Design"
                className="h-12 rounded-xl border border-slate-200 bg-[#f4f7fb] px-4 text-base font-medium text-[#0f172a] placeholder:font-normal placeholder:text-slate-400 focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/15"
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col space-y-2">
              <label className="block text-sm font-semibold text-[#14213d]">
                Detailed Description
              </label>
              <textarea
                value={courseDescription}
                onChange={(event) => onCourseDescriptionChange(event.target.value)}
                placeholder="What will students learn? Describe the journey..."
                maxLength={2000}
                className="min-h-[150px] flex-1 resize-none rounded-xl border border-slate-200 bg-[#f4f7fb] px-4 py-3 text-base leading-6 text-[#0f172a] outline-none transition placeholder:text-slate-400 focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/15"
              />
              <div className="flex items-center justify-end text-xs text-slate-500">
                <span>{`${courseDescription.length} / 2000`}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-2.5 text-sm font-semibold text-[#14213d]">
              Course Thumbnail
            </p>
            <CourseMediaUpload
              disabled={!currentCourseId && !isBasicsComplete}
              isUploading={isUploadingCourseMedia}
              mediaPath={courseThumbnailPath}
              mediaUrl={courseThumbnailUrl}
              onFileSelect={onCourseMediaSelect}
            />
          </div>

          <button
            type="button"
            disabled={!isBasicsComplete}
            onClick={onNext}
            className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#13daec] px-6 text-base font-bold text-[#0f172a] shadow-[0_12px_24px_rgba(19,218,236,0.22)] transition hover:bg-[#10c6d7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next: Course content
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
