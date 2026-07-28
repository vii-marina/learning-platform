import { BadgeCheck, BookOpen, TriangleAlert } from "lucide-react";
import { LoadingState } from "../../../../../components/ui/LoadingState";
import type { Lesson, Module } from "../../../api/index";
import type { CourseTest } from "../types/courseBuilderUiTypes";
import {
  getGeneratedCourseTestTitle,
  type ReviewPreviewData,
} from "../lib/courseBuilderPageUtils";

type CourseBuilderReviewInstructorViewProps = {
  currentCourseName: string;
  reviewDescription: string;
  courseThumbnailUrl: string | null;
  courseThumbnailKind: "image" | "video" | "file";
  courseThumbnailLabel: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  totalModules: number;
  totalLessons: number;
  totalTests: number;
  isReviewContentLoading: boolean;
  publishBlockingIssues: string[];
  reviewPreviewData: ReviewPreviewData | null;
  currentLessonPreviewText: string;
  currentTestLinkedLesson: Lesson | null;
};

export function CourseBuilderReviewInstructorView({
  currentCourseName,
  reviewDescription,
  courseThumbnailUrl,
  courseThumbnailKind,
  courseThumbnailLabel,
  modules,
  lessonsByModule,
  testsByModule,
  totalModules,
  totalLessons,
  totalTests,
  isReviewContentLoading,
  publishBlockingIssues,
  reviewPreviewData,
  currentLessonPreviewText,
  currentTestLinkedLesson,
}: CourseBuilderReviewInstructorViewProps) {
  const selectedTestTitle =
    reviewPreviewData && reviewPreviewData.itemType === "test"
      ? getGeneratedCourseTestTitle({
          moduleOrder: reviewPreviewData.module.order,
          lessons: reviewPreviewData.lessons,
          afterLessonId: reviewPreviewData.test.afterLessonId,
          fallbackTitle: reviewPreviewData.test.title,
        })
      : "";

  return (
    <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_320px]">
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-[#14213d]">
                Instructor Review
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Review the structure, scan the selected content, and confirm the course is ready
                for students.
              </p>
            </div>

            {publishBlockingIssues.length > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
                <TriangleAlert className="h-4 w-4" />
                Needs attention
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                <BadgeCheck className="h-4 w-4" />
                Ready for launch
              </div>
            )}
          </div>

          {publishBlockingIssues.length > 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-semibold text-amber-900">
                Fix these before publishing:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-800">
                {publishBlockingIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
              The course structure is complete and the preview is ready for publishing.
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-100 bg-[#f9fbfd] p-5">
              <p className="text-sm font-semibold text-slate-400">Модулі</p>
              <p className="mt-3 text-3xl font-bold text-[#14213d]">{totalModules}</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-100 bg-[#f9fbfd] p-5">
              <p className="text-sm font-semibold text-slate-400">Уроки</p>
              {isReviewContentLoading ? (
                <div className="mt-3">
                  <LoadingState
                    variant="inline"
                    size={80}
                    className="min-h-[7rem] border-0 bg-transparent px-0 py-0"
                    textClassName="text-[10px]"
                  />
                </div>
              ) : (
                <p className="mt-3 text-3xl font-bold text-[#14213d]">{totalLessons}</p>
              )}
            </div>
            <div className="rounded-[1.5rem] border border-slate-100 bg-[#f9fbfd] p-5">
              <p className="text-sm font-semibold text-slate-400">Тести</p>
              <p className="mt-3 text-3xl font-bold text-[#14213d]">{totalTests}</p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-[#f9fbfd] p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white text-slate-400">
                {courseThumbnailUrl ? (
                  courseThumbnailKind === "image" ? (
                    <img
                      src={courseThumbnailUrl}
                      alt={`${currentCourseName} media`}
                      className="h-full w-full object-cover"
                    />
                  ) : courseThumbnailKind === "video" ? (
                    <video
                      src={courseThumbnailUrl}
                      className="h-full w-full bg-slate-950 object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center px-3 text-center">
                      <BookOpen className="h-8 w-8" />
                      <span className="mt-1 max-h-8 overflow-hidden break-all text-[10px] font-medium text-slate-500">
                        {courseThumbnailLabel}
                      </span>
                    </div>
                  )
                ) : (
                  <BookOpen className="h-10 w-10" />
                )}
              </div>
              <div className="space-y-2">
                <h6 className="text-2xl font-bold tracking-tight text-[#14213d]">
                  {currentCourseName}
                </h6>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">
                  {reviewDescription}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <h3 className="text-2xl font-bold tracking-tight text-[#14213d]">
            Selected Preview
          </h3>
          {!reviewPreviewData ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 bg-[#f9fbfd] p-8 text-center text-sm text-slate-500">
              Add modules and lessons to see the preview details here.
            </div>
          ) : reviewPreviewData.itemType === "lesson" ? (
            <div className="mt-6">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#13daec]/12 px-3 py-1 text-xs font-semibold text-[#08bfd4]">
                  Lesson preview
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {`Модуль ${reviewPreviewData.module.order}`}
                </span>
              </div>
              <h6 className="mt-4 text-2xl font-bold tracking-tight text-[#14213d]">
                {reviewPreviewData.lesson.title}
              </h6>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {currentLessonPreviewText || "No written content yet."}
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#13daec]/12 px-3 py-1 text-xs font-semibold text-[#08bfd4]">
                  Test preview
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {`${reviewPreviewData.test.questions.length} questions`}
                </span>
              </div>
              <h6 className="mt-4 text-2xl font-bold tracking-tight text-[#14213d]">
                {selectedTestTitle}
              </h6>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {currentTestLinkedLesson
                  ? `Placed after "${currentTestLinkedLesson.title}" in the module flow.`
                  : "Placed at the module level before students continue forward."}
              </p>
            </div>
          )}
        </section>
      </div>

      <aside className="rounded-[1.75rem] border border-slate-200 bg-[#f9fbfd] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <h3 className="text-2xl font-bold tracking-tight text-[#14213d]">
          Module Checklist
        </h3>
        <div className="mt-5 space-y-3">
          {modules.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
              Start by adding your first module.
            </div>
          ) : (
            modules.map((module) => {
              const lessons = lessonsByModule[module.id] || [];
              const tests = testsByModule[module.id] || [];
              const isFocused = reviewPreviewData?.module.id === module.id;

              return (
                <div
                  key={module.id}
                  className={`rounded-[1.25rem] border px-4 py-4 ${
                    isFocused
                      ? "border-[#13daec]/35 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.05)]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[#14213d]">
                        {`Модуль ${module.order}`}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{module.title}</p>
                    </div>
                    {lessons.length > 0 ? (
                      <BadgeCheck className="h-5 w-5 text-[#08bfd4]" />
                    ) : (
                      <TriangleAlert className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-[#f8fafc] px-3 py-3">
                      <p className="font-semibold text-slate-400">Уроки</p>
                      <p className="mt-2 text-lg font-bold text-[#14213d]">
                        {lessons.length}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f8fafc] px-3 py-3">
                      <p className="font-semibold text-slate-400">Тести</p>
                      <p className="mt-2 text-lg font-bold text-[#14213d]">
                        {tests.length}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </section>
  );
}
