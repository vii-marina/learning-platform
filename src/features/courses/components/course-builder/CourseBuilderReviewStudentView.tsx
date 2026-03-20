import type { CSSProperties } from "react";
import {
  BadgeCheck,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Play,
} from "lucide-react";
import type { Lesson, Module } from "../../api";
import type { CourseTest } from "./courseBuilderUiTypes";
import {
  buildOrderedModuleItems,
  getGeneratedCourseTestTitle,
  hasLessonContent,
  studentQuestionTypeLabels,
  type ReviewPreviewData,
  type ReviewPreviewSelection,
} from "./courseBuilderPageUtils";

type CourseBuilderReviewStudentViewProps = {
  currentCourseName: string;
  reviewDescription: string;
  courseThumbnailUrl: string | null;
  courseThumbnailKind: "image" | "video" | "file";
  heroBackgroundStyle?: CSSProperties;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  totalModules: number;
  totalLessons: number;
  totalTests: number;
  hasPublishingIssues: boolean;
  expandedReviewModuleId: string | null;
  resolvedReviewSelection: ReviewPreviewSelection | null;
  reviewPreviewData: ReviewPreviewData | null;
  currentLessonEmbedUrl: string | null;
  currentLessonPosition: number;
  currentTestLinkedLesson: Lesson | null;
  onModuleToggle: (moduleId: string) => void;
  onItemSelect: (selection: ReviewPreviewSelection) => void;
};

export function CourseBuilderReviewStudentView({
  currentCourseName,
  reviewDescription,
  courseThumbnailUrl,
  courseThumbnailKind,
  heroBackgroundStyle,
  modules,
  lessonsByModule,
  testsByModule,
  totalModules,
  totalLessons,
  totalTests,
  hasPublishingIssues,
  expandedReviewModuleId,
  resolvedReviewSelection,
  reviewPreviewData,
  currentLessonEmbedUrl,
  currentLessonPosition,
  currentTestLinkedLesson,
  onModuleToggle,
  onItemSelect,
}: CourseBuilderReviewStudentViewProps) {
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
    <section className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div
        className={`relative min-h-[20rem] overflow-hidden ${
          heroBackgroundStyle
            ? "bg-[#0f172a]"
            : "bg-[radial-gradient(circle_at_top_left,_rgba(19,218,236,0.35),_transparent_30%),linear-gradient(135deg,_#1f2937_0%,_#111827_45%,_#0f172a_100%)]"
        }`}
        style={heroBackgroundStyle}
      >
        {!heroBackgroundStyle ? (
          <>
            <div className="absolute right-[-4rem] top-10 h-52 w-52 rounded-[2.5rem] border border-white/10 bg-white/5" />
            <div className="absolute bottom-[-3rem] left-10 h-40 w-40 rounded-full bg-[#13daec]/15 blur-2xl" />
          </>
        ) : null}

        <div className="relative flex h-full flex-col justify-end px-6 py-8 md:px-8">
          <span className="inline-flex w-fit items-center rounded-full bg-[#13daec] px-4 py-1.5 text-xs font-bold text-[#0f172a]">
            {hasPublishingIssues ? "Draft Course" : "Ready to Publish"}
          </span>
          <h2 className="mt-4 max-w-3xl text-[2rem] font-extrabold leading-tight text-white md:text-[2.8rem]">
            {currentCourseName}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80">
            {reviewDescription}
          </p>
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
        <aside className="border-r border-slate-200 bg-[#f8fafc] p-5 md:p-6">
          <h3 className="text-xl font-bold text-[#14213d]">Course Content</h3>

          <div className="mt-5 space-y-3">
            {modules.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                Add modules and lessons to see the final preview.
              </div>
            ) : (
              modules.map((module) => {
                const lessons = lessonsByModule[module.id] || [];
                const tests = testsByModule[module.id] || [];
                const orderedItems = buildOrderedModuleItems(lessons, tests);
                const isExpanded = expandedReviewModuleId === module.id;

                return (
                  <div
                    key={module.id}
                    className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => onModuleToggle(module.id)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                        isExpanded ? "bg-[#13daec]/10" : "hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <p className="text-base font-semibold text-[#14213d]">
                          {`${module.order}. ${module.title}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {`${lessons.length} lessons • ${tests.length} tests`}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                    </button>

                    {isExpanded ? (
                      <div className="border-t border-slate-100 px-3 py-3">
                        {orderedItems.length === 0 ? (
                          <div className="rounded-xl bg-[#f8fafc] px-3 py-3 text-sm text-slate-500">
                            This module does not contain lessons or tests yet.
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {orderedItems.map((item) => {
                              const isActive =
                                resolvedReviewSelection?.moduleId === module.id &&
                                resolvedReviewSelection.itemId ===
                                  (item.type === "lesson"
                                    ? item.lesson.id
                                    : item.test.id) &&
                                resolvedReviewSelection.itemType === item.type;

                              return (
                                <button
                                  key={
                                    item.type === "lesson"
                                      ? item.lesson.id
                                      : item.test.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    onItemSelect(
                                      item.type === "lesson"
                                        ? {
                                            moduleId: module.id,
                                            itemType: "lesson",
                                            itemId: item.lesson.id,
                                          }
                                        : {
                                            moduleId: module.id,
                                            itemType: "test",
                                            itemId: item.test.id,
                                          }
                                    )
                                  }
                                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                    isActive
                                      ? "bg-[#14213d] text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]"
                                      : "text-slate-600 hover:bg-slate-50 hover:text-[#14213d]"
                                  }`}
                                >
                                  {item.type === "lesson" ? (
                                    <Play
                                      className={`h-4 w-4 ${
                                        isActive ? "text-[#13daec]" : "text-[#08bfd4]"
                                      }`}
                                    />
                                  ) : (
                                    <BadgeCheck
                                      className={`h-4 w-4 ${
                                        isActive ? "text-[#13daec]" : "text-[#08bfd4]"
                                      }`}
                                    />
                                  )}
                                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                    {item.type === "lesson"
                                      ? item.lesson.title
                                      : getGeneratedCourseTestTitle({
                                          moduleOrder: module.order,
                                          lessons,
                                          afterLessonId: item.test.afterLessonId,
                                          fallbackTitle: item.test.title,
                                        })}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <div className="bg-white p-6 md:p-8">
          {!reviewPreviewData ? (
            <div className="flex min-h-[26rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-[#f8fafc] px-6 text-center text-sm text-slate-500">
              Add content to see how this course will look to students.
            </div>
          ) : reviewPreviewData.itemType === "lesson" ? (
            <div>
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.1)]">
                {currentLessonEmbedUrl ? (
                  <div className="aspect-video">
                    <iframe
                      src={currentLessonEmbedUrl}
                      title={`${reviewPreviewData.lesson.title} preview video`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                ) : courseThumbnailUrl && courseThumbnailKind === "image" ? (
                  <div className="aspect-video">
                    <img
                      src={courseThumbnailUrl}
                      alt={`${currentCourseName} preview`}
                      className="h-full w-full object-cover brightness-75"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(19,218,236,0.28),_transparent_28%),linear-gradient(135deg,_#64748b_0%,_#475569_50%,_#334155_100%)]">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#13daec]/90 text-[#0f172a] shadow-[0_20px_40px_rgba(19,218,236,0.25)]">
                      <Play className="h-10 w-10" />
                    </div>
                  </div>
                )}

                <div className="bg-[#0f172a] px-5 py-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-[#13daec]"
                      style={{
                        width: `${Math.max(
                          15,
                          (currentLessonPosition /
                            Math.max(1, reviewPreviewData.lessons.length)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#13daec]/12 px-3 py-1 text-xs font-semibold text-[#08bfd4]">
                  {`Module ${reviewPreviewData.module.order}`}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {`Lesson ${currentLessonPosition}`}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {currentLessonEmbedUrl ? "Video lesson" : "Text lesson"}
                </span>
              </div>

              <h3 className="mt-5 text-[2rem] font-extrabold tracking-tight text-[#14213d]">
                {`${reviewPreviewData.module.order}.${currentLessonPosition} ${reviewPreviewData.lesson.title}`}
              </h3>

              {hasLessonContent(reviewPreviewData.lesson.content) ? (
                <div
                  className="prose prose-slate mt-5 max-w-none text-slate-600"
                  dangerouslySetInnerHTML={{
                    __html: reviewPreviewData.lesson.content ?? "",
                  }}
                />
              ) : (
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                  This lesson does not have written content yet.
                </p>
              )}

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.25rem] border border-slate-200 bg-[#f9fbfd] p-4">
                  <p className="text-sm font-semibold text-slate-400">Lesson Format</p>
                  <p className="mt-2 text-base font-semibold text-[#14213d]">
                    {currentLessonEmbedUrl ? "Video + rich text" : "Rich text lesson"}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-[#f9fbfd] p-4">
                  <p className="text-sm font-semibold text-slate-400">Module Flow</p>
                  <p className="mt-2 text-base font-semibold text-[#14213d]">
                    {`${reviewPreviewData.lessons.length} lessons in this module`}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-[#f9fbfd] p-4">
                  <p className="text-sm font-semibold text-slate-400">Assessment</p>
                  <p className="mt-2 text-base font-semibold text-[#14213d]">
                    {`${reviewPreviewData.tests.length} tests linked here`}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(135deg,_rgba(19,218,236,0.14),_rgba(15,23,42,0.02))] p-6">
                          <span className="inline-flex rounded-full bg-[#13daec]/12 px-3 py-1 text-xs font-semibold text-[#08bfd4]">
                            Interactive Test
                          </span>
                          <h3 className="mt-4 text-[2rem] font-extrabold tracking-tight text-[#14213d]">
                            {selectedTestTitle}
                          </h3>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                  {currentTestLinkedLesson
                    ? `This test appears after "${currentTestLinkedLesson.title}" inside Module ${reviewPreviewData.module.order}.`
                    : `This test appears at the module level in Module ${reviewPreviewData.module.order}.`}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-white/70 bg-white/80 p-4">
                    <p className="text-sm font-semibold text-slate-400">Questions</p>
                    <p className="mt-2 text-2xl font-bold text-[#14213d]">
                      {reviewPreviewData.test.questions.length}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/70 bg-white/80 p-4">
                    <p className="text-sm font-semibold text-slate-400">Placement</p>
                    <p className="mt-2 text-base font-semibold text-[#14213d]">
                      {currentTestLinkedLesson ? "After lesson" : "Module level"}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/70 bg-white/80 p-4">
                    <p className="text-sm font-semibold text-slate-400">Question Type</p>
                    <p className="mt-2 text-base font-semibold text-[#14213d]">
                      {studentQuestionTypeLabels[
                        reviewPreviewData.test.questions[0]?.type ?? "single_choice"
                      ]}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {reviewPreviewData.test.questions.map((question, questionIndex) => (
                  <div
                    key={question.id}
                    className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-[#14213d]">
                        {`Question ${questionIndex + 1}`}
                      </div>
                      <span className="rounded-full bg-[#13daec]/12 px-3 py-1 text-xs font-semibold text-[#08bfd4]">
                        {studentQuestionTypeLabels[question.type]}
                      </span>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-700">
                      {question.questionText}
                    </p>

                    <div className="mt-5 space-y-2">
                      {question.type === "true_false" ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                            True
                          </div>
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                            False
                          </div>
                        </div>
                      ) : (
                        question.options.map((option, optionIndex) => (
                          <div
                            key={`${question.id}-${optionIndex}`}
                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-[#f9fbfd] px-4 py-3 text-sm text-slate-700"
                          >
                            <span
                              className={`flex h-4 w-4 items-center justify-center border border-slate-300 ${
                                question.type === "multiple_choice"
                                  ? "rounded-[4px]"
                                  : "rounded-full"
                              }`}
                            />
                            <span>{option}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
