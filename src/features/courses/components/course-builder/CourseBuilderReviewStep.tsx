import type { CSSProperties } from "react";
import { BadgeCheck, TriangleAlert } from "lucide-react";
import type { Lesson, Module } from "../../api";
import type { CourseTest } from "./courseBuilderUiTypes";
import { CourseBuilderReviewInstructorView } from "./CourseBuilderReviewInstructorView";
import { CourseBuilderReviewStudentView } from "./CourseBuilderReviewStudentView";
import { CourseBuilderStepHeading } from "./CourseBuilderStepHeading";
import type {
  ReviewPreviewData,
  ReviewPreviewMode,
  ReviewPreviewSelection,
} from "./courseBuilderPageUtils";

type CourseBuilderReviewStepProps = {
  stepLabel: string;
  title: string;
  reviewDescription: string;
  reviewPreviewMode: ReviewPreviewMode;
  onReviewPreviewModeChange: (mode: ReviewPreviewMode) => void;
  isReviewContentLoading: boolean;
  publishBlockingIssues: string[];
  currentCourseName: string;
  courseThumbnailUrl: string | null;
  courseThumbnailKind: "image" | "video" | "file";
  courseThumbnailLabel: string;
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
  currentLessonPreviewText: string;
  currentTestLinkedLesson: Lesson | null;
  onModuleToggle: (moduleId: string) => void;
  onItemSelect: (selection: ReviewPreviewSelection) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  canPublish: boolean;
};

export function CourseBuilderReviewStep({
  stepLabel,
  title,
  reviewDescription,
  reviewPreviewMode,
  onReviewPreviewModeChange,
  isReviewContentLoading,
  publishBlockingIssues,
  currentCourseName,
  courseThumbnailUrl,
  courseThumbnailKind,
  courseThumbnailLabel,
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
  currentLessonPreviewText,
  currentTestLinkedLesson,
  onModuleToggle,
  onItemSelect,
  onSaveDraft,
  onPublish,
  canPublish,
}: CourseBuilderReviewStepProps) {
  const hasPublishingIssues = publishBlockingIssues.length > 0;

  return (
    <section className="mx-auto w-full max-w-[72rem]">
      <CourseBuilderStepHeading
        stepLabel={stepLabel}
        title={title}
        description={reviewDescription}
      />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-2xl bg-[#e8eef7] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <button
            type="button"
            onClick={() => onReviewPreviewModeChange("instructor")}
            className={`rounded-[1rem] px-5 py-3 text-sm font-bold transition ${
              reviewPreviewMode === "instructor"
                ? "bg-white text-[#14213d] shadow-[0_10px_20px_rgba(15,23,42,0.12)]"
                : "text-slate-500 hover:text-[#14213d]"
            }`}
          >
            Instructor View
          </button>
          <button
            type="button"
            onClick={() => onReviewPreviewModeChange("student")}
            className={`rounded-[1rem] px-5 py-3 text-sm font-bold transition ${
              reviewPreviewMode === "student"
                ? "bg-white text-[#14213d] shadow-[0_10px_20px_rgba(15,23,42,0.12)]"
                : "text-slate-500 hover:text-[#14213d]"
            }`}
          >
            Student View
          </button>
        </div>

        {isReviewContentLoading ? (
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500">
            Loading preview...
          </div>
        ) : hasPublishingIssues ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
            <TriangleAlert className="h-4 w-4" />
            Publishing needs fixes
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
            <BadgeCheck className="h-4 w-4" />
            Ready to publish
          </div>
        )}
      </div>

      {reviewPreviewMode === "student" ? (
        <CourseBuilderReviewStudentView
          currentCourseName={currentCourseName}
          reviewDescription={reviewDescription}
          courseThumbnailUrl={courseThumbnailUrl}
          courseThumbnailKind={courseThumbnailKind}
          heroBackgroundStyle={heroBackgroundStyle}
          modules={modules}
          lessonsByModule={lessonsByModule}
          testsByModule={testsByModule}
          totalModules={totalModules}
          totalLessons={totalLessons}
          totalTests={totalTests}
          hasPublishingIssues={hasPublishingIssues}
          expandedReviewModuleId={expandedReviewModuleId}
          resolvedReviewSelection={resolvedReviewSelection}
          reviewPreviewData={reviewPreviewData}
          currentLessonEmbedUrl={currentLessonEmbedUrl}
          currentLessonPosition={currentLessonPosition}
          currentTestLinkedLesson={currentTestLinkedLesson}
          onModuleToggle={onModuleToggle}
          onItemSelect={onItemSelect}
        />
      ) : (
        <CourseBuilderReviewInstructorView
          currentCourseName={currentCourseName}
          reviewDescription={reviewDescription}
          courseThumbnailUrl={courseThumbnailUrl}
          courseThumbnailKind={courseThumbnailKind}
          courseThumbnailLabel={courseThumbnailLabel}
          modules={modules}
          lessonsByModule={lessonsByModule}
          testsByModule={testsByModule}
          totalModules={totalModules}
          totalLessons={totalLessons}
          totalTests={totalTests}
          isReviewContentLoading={isReviewContentLoading}
          publishBlockingIssues={publishBlockingIssues}
          reviewPreviewData={reviewPreviewData}
          currentLessonPreviewText={currentLessonPreviewText}
          currentTestLinkedLesson={currentTestLinkedLesson}
        />
      )}

      <div className="mt-8 rounded-[1.75rem] border border-[#13daec]/25 bg-[#dcfbff] px-6 py-6 shadow-[0_18px_36px_rgba(19,218,236,0.1)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[1.45rem] font-extrabold tracking-tight text-[#14213d]">
              Looks good? Let&apos;s go live!
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              You can still edit the course content later, but this is the final student-facing
              preview before publishing.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSaveDraft}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={!canPublish}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#13daec] px-8 text-base font-black text-[#0f172a] shadow-[0_18px_36px_rgba(19,218,236,0.22)] transition hover:bg-[#10c6d7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Publish Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
