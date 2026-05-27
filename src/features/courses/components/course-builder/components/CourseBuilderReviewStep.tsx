import { BadgeCheck, TriangleAlert } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import { CoursePreviewPage } from "./CoursePreviewPage";

type CourseBuilderReviewStepProps = {
  title: string;
  publishBlockingIssues: string[];
  courseId: string | null;
  currentCourseName: string;
  courseDescription: string;
  courseThumbnailPath: string | null;
  courseThumbnailUrl: string | null;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
  onSaveDraft: () => void;
  onPublish: () => void;
  canPublish: boolean;
};

export function CourseBuilderReviewStep({
  title,
  publishBlockingIssues,
  courseId,
  currentCourseName,
  courseDescription,
  courseThumbnailPath,
  courseThumbnailUrl,
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
  onSaveDraft,
  onPublish,
  canPublish,
}: CourseBuilderReviewStepProps) {
  return (
    <section className="mx-auto w-full max-w-[72rem]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          {title}
        </h1>

        
      </div>

      <div className="mt-8">
        <CoursePreviewPage
          courseId={courseId}
          courseTitle={currentCourseName}
          courseDescription={courseDescription}
          courseThumbnailPath={courseThumbnailPath}
          courseThumbnailUrl={courseThumbnailUrl}
          modules={modules}
          lessonsByModule={lessonsByModule}
          testsByModule={testsByModule}
          exercisesByModule={exercisesByModule}
        />

        <div className="mt-8 flex flex-col gap-5 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2.5">
            {publishBlockingIssues.length === 0 ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#13daec]/10 px-4 py-2 text-sm font-semibold text-[#0f8ea0]">
                <BadgeCheck className="h-4 w-4" />
                Ready to publish
              </span>
            ) : (
              publishBlockingIssues.map((issue) => (
                <span
                  key={issue}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700"
                >
                  <TriangleAlert className="h-4 w-4" />
                  {issue}
                </span>
              ))
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onSaveDraft}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="accent"
              size="lg"
              onClick={onPublish}
              disabled={!canPublish}
            >
              Publish Now
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
