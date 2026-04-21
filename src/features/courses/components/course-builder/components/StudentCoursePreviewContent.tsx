import type { Lesson } from "../../../api/index";
import { getGeneratedCourseTestTitle, hasLessonContent, studentQuestionTypeLabels, type ReviewPreviewData } from "../lib/courseBuilderPageUtils";

type StudentCoursePreviewContentProps = {
  reviewPreviewData: ReviewPreviewData | null;
  currentLessonEmbedUrl: string | null;
  currentLessonPosition: number;
  currentTestLinkedLesson: Lesson | null;
};

export function StudentCoursePreviewContent({
  reviewPreviewData,
  currentLessonEmbedUrl,
  currentLessonPosition,
  currentTestLinkedLesson,
}: StudentCoursePreviewContentProps) {
  const selectedTestTitle =
    reviewPreviewData && reviewPreviewData.itemType === "test"
      ? getGeneratedCourseTestTitle({
          moduleOrder: reviewPreviewData.module.order,
          lessons: reviewPreviewData.lessons,
          afterLessonId: reviewPreviewData.test.afterLessonId,
          fallbackTitle: reviewPreviewData.test.title,
        })
      : "";

  if (!reviewPreviewData) {
    return (
      <div className="bg-white p-6 md:p-8">
        <div className="flex min-h-[26rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-[#f8fafc] px-6 text-center text-sm text-slate-500">
          Add content to see the student preview.
        </div>
      </div>
    );
  }

  if (reviewPreviewData.itemType === "lesson") {
    return (
      <div className="bg-white p-6 md:p-8">
        {currentLessonEmbedUrl ? (
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.1)]">
            <div className="aspect-video">
              <iframe
                src={currentLessonEmbedUrl}
                title={`${reviewPreviewData.lesson.title} preview video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        ) : null}

        <h3
          className={`text-[2rem] font-extrabold tracking-tight text-[#14213d] ${
            currentLessonEmbedUrl ? "mt-6" : ""
          }`}
        >
          {`${reviewPreviewData.module.order}.${currentLessonPosition} ${reviewPreviewData.lesson.title}`}
        </h3>

        {hasLessonContent(reviewPreviewData.lesson.content) ? (
          <div
            className="prose prose-slate mt-5 max-w-none text-slate-600"
            dangerouslySetInnerHTML={{
              __html: reviewPreviewData.lesson.content ?? "",
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8">
      <h3 className="text-[2rem] font-extrabold tracking-tight text-[#14213d]">
        {selectedTestTitle}
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {`${reviewPreviewData.test.questions.length} questions`}
        </span>
        {currentTestLinkedLesson ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {`After ${currentTestLinkedLesson.title}`}
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Module level
          </span>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {reviewPreviewData.test.questions.map((question, questionIndex) => (
          <div
            key={question.id}
            className="rounded-[1.5rem] border border-slate-200 bg-[#f9fbfd] p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#14213d]">
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
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                    True
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                    False
                  </div>
                </div>
              ) : (
                question.options.map((option, optionIndex) => (
                  <div
                    key={`${question.id}-${optionIndex}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
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
  );
}
