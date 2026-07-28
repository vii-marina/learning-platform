import type { CSSProperties } from "react";
import { BookOpen, Play, BadgeCheck } from "lucide-react";
import type { Lesson, Module } from "../../../api/index";
import type { CourseTest } from "../types/courseBuilderUiTypes";
import type { ReviewPreviewData, ReviewPreviewSelection } from "../lib/courseBuilderPageUtils";
import { StudentCourseOutline } from "./StudentCourseOutline";
import { StudentCoursePreviewContent } from "./StudentCoursePreviewContent";

type StudentCoursePreviewProps = {
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
};

export function StudentCoursePreview({
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
}: StudentCoursePreviewProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div
        className={`relative min-h-[20rem] overflow-hidden ${
          heroBackgroundStyle
            ? "bg-[#0f172a]"
            : "bg-[radial-gradient(circle_at_top_left,_rgba(19,218,236,0.25),_transparent_28%),linear-gradient(135deg,_#1f2937_0%,_#111827_45%,_#0f172a_100%)]"
        }`}
        style={heroBackgroundStyle}
      >
        {!heroBackgroundStyle && courseThumbnailUrl && courseThumbnailKind === "image" ? (
          <img
            src={courseThumbnailUrl}
            alt={currentCourseName}
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        ) : null}

        <div className="relative flex h-full flex-col justify-end px-6 py-8 md:px-8">
          <h2 className="max-w-3xl text-[2rem] font-extrabold leading-tight text-white md:text-[2.8rem]">
            {currentCourseName}
          </h2>
          <div className="mt-6 flex flex-wrap gap-5 text-sm text-white/85">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#13daec]" />
              <span>{`${totalModules} modules`}</span>
            </div>
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-[#13daec]" />
              <span>{`${totalLessons} lessons`}</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-[#13daec]" />
              <span>{`${totalTests} tests`}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
        <StudentCourseOutline
          modules={modules}
          lessonsByModule={lessonsByModule}
          testsByModule={testsByModule}
          expandedModuleId={expandedReviewModuleId}
          resolvedReviewSelection={resolvedReviewSelection}
          onModuleToggle={onModuleToggle}
          onItemSelect={onItemSelect}
        />

        <StudentCoursePreviewContent
          reviewPreviewData={reviewPreviewData}
          currentLessonEmbedUrl={currentLessonEmbedUrl}
          currentLessonPosition={currentLessonPosition}
          currentTestLinkedLesson={currentTestLinkedLesson}
        />
      </div>
    </section>
  );
}
