import { BadgeCheck, Code2, FileText, Layers3, PlayCircle } from "lucide-react";
import type { Lesson, Module } from "../../../../api/index";
import type { CourseExercise, CourseTest } from "../../types/courseBuilderUiTypes";
import { ExercisePreview } from "../ExercisePreview";
import {
  getGeneratedCourseTestTitle,
  hasLessonContent,
} from "../../lib/courseBuilderPageUtils";
import { getYouTubeEmbedUrl } from "../../lib/youtube";
import { moduleHeaderIconClassName } from "./constants";
import { TestQuestionPreview } from "./TestQuestionPreview";

type PreviewPanelProps = {
  activeModule: Module;
  activeModuleLessons: Lesson[];
  previewLesson: Lesson | null;
  previewTest: CourseTest | null;
  previewExercise: CourseExercise | null;
  isCleanAccent: boolean;
};

export function PreviewPanel({
  activeModule,
  activeModuleLessons,
  previewLesson,
  previewTest,
  previewExercise,
  isCleanAccent,
}: PreviewPanelProps) {
  const previewLessonEmbedUrl = previewLesson
    ? getYouTubeEmbedUrl(previewLesson.video_url)
    : null;
  const previewTestTitle = previewTest
    ? getGeneratedCourseTestTitle({
        moduleOrder: activeModule.order,
        lessons: activeModuleLessons,
        afterLessonId: previewTest.afterLessonId,
        fallbackTitle: previewTest.title,
      })
    : null;
  const hasPreviewContent = Boolean(previewLesson || previewTest || previewExercise);

  return (
    <section
      className={`rounded-[1.25rem] border border-slate-200 p-4 ${
        isCleanAccent
          ? "bg-transparent shadow-none"
          : "bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            previewExercise
              ? "bg-orange-50 text-orange-500"
              : previewTest
              ? "bg-violet-50 text-violet-600"
              : previewLesson
                ? "bg-emerald-50 text-emerald-600"
                : moduleHeaderIconClassName
          }`}
        >
          {previewExercise ? (
            <Code2 className="h-4 w-4" />
          ) : previewTest ? (
            <BadgeCheck className="h-4 w-4" />
          ) : previewLesson ? (
            <FileText className="h-4 w-4" />
          ) : (
            <Layers3 className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <h6 className="mt-1 text-base font-bold text-[#14213d]">
            {previewExercise
              ? previewExercise.title
              : previewTest
              ? previewTestTitle
              : previewLesson
              ? `${activeModule.order}.${previewLesson.order} ${previewLesson.title}`
              : `Модуль ${activeModule.order}: ${activeModule.title}`}
          </h6>
        </div>
      </div>

      {hasPreviewContent ? (
        <div
          className={`mt-4 ${
            isCleanAccent
              ? ""
              : "rounded-[1rem] border border-slate-200 bg-[#f9fbfd] p-4"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold  text-slate-400">
            {previewExercise ? (
              <Code2 className="h-3.5 w-3.5" />
            ) : previewTest ? (
              <BadgeCheck className="h-3.5 w-3.5" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" />
            )}
            {previewExercise
              ? "Превʼю вправи"
              : previewTest
                ? "Запитання тесту"
                : previewLesson
                  ? "Вміст уроку"
                  : "Вміст модуля"}
          </div>
          <div className="mt-3 max-h-[28rem] overflow-y-auto pr-2">
            {previewExercise ? (
              <ExercisePreview
                content={previewExercise.content}
                description={previewExercise.description}
                compact
              />
            ) : previewTest ? (
              <TestQuestionPreview questions={previewTest.questions} />
            ) : previewLesson ? (
              <>
                {previewLessonEmbedUrl ? (
                  <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                    <div className="aspect-video">
                      <iframe
                        src={previewLessonEmbedUrl}
                        title={`${previewLesson.title} video`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                ) : null}

                {hasLessonContent(previewLesson.content) ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-600"
                    dangerouslySetInnerHTML={{
                      __html: previewLesson.content ?? "",
                    }}
                  />
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    This lesson does not have content yet.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                Choose a lesson, test, or exercise to preview its content.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`mt-4 rounded-[1rem] border border-slate-200 px-3 py-3 text-sm text-slate-500 ${
            isCleanAccent ? "bg-transparent" : "bg-[#f9fbfd]"
          }`}
        >
          Add lessons, tests, or exercises to this module to preview their content here.
        </div>
      )}
    </section>
  );
}
