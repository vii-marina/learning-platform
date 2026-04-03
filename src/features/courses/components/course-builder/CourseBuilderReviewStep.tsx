import type { CSSProperties } from "react";
import { BadgeCheck, TriangleAlert } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import type { Lesson, Module } from "../../api";
import type { CourseTest } from "./courseBuilderUiTypes";
import type { ReviewPreviewData, ReviewPreviewSelection } from "./courseBuilderPageUtils";
import { CourseBuilderStepHeading } from "./CourseBuilderStepHeading";
import { StudentCoursePreview } from "./StudentCoursePreview";

type CourseBuilderReviewStepProps = {
  title: string;
  publishBlockingIssues: string[];
  currentCourseName: string;
  courseThumbnailUrl: string | null;
  courseThumbnailKind: "image" | "video" | "file";
  heroBackgroundStyle?: CSSProperties;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  totalModules: number;
  totalLessons: number;
  totalTests: number;
  expandedReviewModuleId: string | null;
  resolvedReviewSelection: ReviewPreviewSelection | null;
  reviewPreviewData: ReviewPreviewData | null;
  currentLessonEmbedUrl: string | null;
  currentLessonPosition: number;
  currentTestLinkedLesson: Lesson | null;
  onModuleToggle: (moduleId: string) => void;
  onItemSelect: (selection: ReviewPreviewSelection) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  canPublish: boolean;
};

export function CourseBuilderReviewStep({
  title,
  publishBlockingIssues,
  currentCourseName,
  courseThumbnailUrl,
  courseThumbnailKind,
  heroBackgroundStyle,
  modules,
  lessonsByModule,
  testsByModule,
  totalModules,
  totalLessons,
  totalTests,
  expandedReviewModuleId,
  resolvedReviewSelection,
  reviewPreviewData,
  currentLessonEmbedUrl,
  currentLessonPosition,
  currentTestLinkedLesson,
  onModuleToggle,
  onItemSelect,
  onSaveDraft,
  onPublish,
  canPublish,
}: CourseBuilderReviewStepProps) {
  return (
    <section className="mx-auto w-full max-w-[64rem]">
      <CourseBuilderStepHeading title={title} />

      <div className="mt-8">
        <StudentCoursePreview
          currentCourseName={currentCourseName}
          courseThumbnailUrl={courseThumbnailUrl}
          courseThumbnailKind={courseThumbnailKind}
          heroBackgroundStyle={heroBackgroundStyle}
          modules={modules}
          lessonsByModule={lessonsByModule}
          testsByModule={testsByModule}
          totalModules={totalModules}
          totalLessons={totalLessons}
          totalTests={totalTests}
          expandedReviewModuleId={expandedReviewModuleId}
          resolvedReviewSelection={resolvedReviewSelection}
          reviewPreviewData={reviewPreviewData}
          currentLessonEmbedUrl={currentLessonEmbedUrl}
          currentLessonPosition={currentLessonPosition}
          currentTestLinkedLesson={currentTestLinkedLesson}
          onModuleToggle={onModuleToggle}
          onItemSelect={onItemSelect}
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
