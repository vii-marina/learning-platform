import { ArrowRight } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
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
  onCourseMediaRemove: () => void;
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
  onCourseMediaRemove,
  onNext,
}: CourseBuilderCourseInfoStepProps) {
  return (
    <section className="mx-auto w-full max-w-[72rem]">
      <CourseBuilderStepHeading title={title} description={description} />

      <div className="mt-8 rounded-[0.75rem] border border-[#13daec] bg-[#13daec]/5 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.82fr)]">
          <div className="space-y-5">
            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-slate-950">
                Заголовок курсу
              </label>
              <Input
                value={courseTitle}
                onChange={(event) => onCourseTitleChange(event.target.value)}
                placeholder="Наприклад, Основи сучасного JavaScript"
                className="h-14 rounded-2xl border-slate-200 bg-white px-4 font-semibold text-base shadow-sm"
              />
            </div>

            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-slate-950">
                Детальний опис 
              </label>
              <textarea
                value={courseDescription}
                onChange={(event) => onCourseDescriptionChange(event.target.value)}
                placeholder="Що студенти вивчать? Опишіть навчальний шлях..."
                maxLength={2000}
                className="min-h-[220px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base leading-7 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/12"
              />
              <div className="flex items-center justify-end text-xs font-medium text-slate-400">
                <span>{`${courseDescription.length} / 2000`}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-2.5 text-sm font-semibold text-slate-950">
                Головне фото курсу
              </p>
              <CourseMediaUpload
                disabled={!currentCourseId && !isBasicsComplete}
                isUploading={isUploadingCourseMedia}
                mediaPath={courseThumbnailPath}
                mediaUrl={courseThumbnailUrl}
                onFileSelect={onCourseMediaSelect}
                onRemove={onCourseMediaRemove}
              />
            </div>

            <Button
              type="button"
              variant="accent"
              size="lg"
              disabled={!isBasicsComplete}
              onClick={onNext}
              className="h-12 w-full rounded-2xl shadow-[0_12px_28px_rgba(19,218,236,0.22)]"
            >
              Наступний крок
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
