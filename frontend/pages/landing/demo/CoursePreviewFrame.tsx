import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, ListTodo, X } from "lucide-react";
import { getCourseMediaPublicUrl } from "../../../features/courses/api/courseMediaStorage";
import type { PreviewMode, PublicLandingPreview } from "../types";
import { LessonPreviewContent, PreviewSidebar, PreviewTabs } from "./previewParts";
import { TestPreviewContent } from "./TestPreview";
import { ExercisePreviewContent } from "./ExercisePreview";

export function CoursePreviewFrame({
  mode,
  preview,
  onModeChange,
  compact = false,
}: {
  mode: PreviewMode;
  preview: PublicLandingPreview;
  onModeChange?: (mode: PreviewMode) => void;
  compact?: boolean;
}) {
  const [isMobileOutlineOpen, setIsMobileOutlineOpen] = useState(false);
  const canOpenExercise = Boolean(preview.exercise);
  const canOpenTest = Boolean(preview.test);
  const previousMode =
    mode === "test"
      ? canOpenExercise
        ? "exercise"
        : "lesson"
      : mode === "exercise"
        ? "lesson"
        : null;
  const nextMode =
    mode === "lesson"
      ? canOpenExercise
          ? "exercise"
          : canOpenTest
            ? "test"
            : null
      : mode === "exercise"
        ? canOpenTest
          ? "test"
          : null
        : null;

  return (
    <>
      <div
        className={`mx-auto h-[38rem] w-full overflow-hidden rounded-[1.5rem] border border-[#dedcff] bg-white text-left shadow-[0_24px_70px_rgba(31,27,77,0.08)] md:h-[34rem] ${
          compact ? "mt-8 max-w-5xl" : "mt-0 max-w-6xl rounded-t-none border-t-0"
        }`}
      >
        <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[320px_minmax(0,1fr)] md:grid-rows-1">
          <PreviewSidebar mode={mode} onModeChange={onModeChange} preview={preview} />
          <div className="space-y-3 border-b border-[#5549f1]/15 p-4 md:hidden">
            <PreviewTabs mode={mode} onModeChange={onModeChange} preview={preview} />
            <button
              type="button"
              onClick={() => setIsMobileOutlineOpen(true)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#dedcff] bg-white px-4 py-3 text-left text-sm font-extrabold text-[#5549f1]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <ListTodo className="h-4 w-4 shrink-0" />
                <span className="truncate">Зміст курсу</span>
              </span>
              <span className="min-w-0 truncate text-xs text-[#6d6a9f]">
                {`${preview.module.order}.${preview.lesson.order} ${preview.lesson.title}`}
              </span>
            </button>
          </div>
          <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#f1f0ff] md:h-full">
          <div
            className={`min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 md:py-5 ${
              mode === "exercise" ? "" : "w-full max-w-[58rem] md:mx-auto"
            }`}
          >
            {mode === "lesson" ? (
              <LessonPreviewContent preview={preview} />
            ) : mode === "test" ? (
              <TestPreviewContent preview={preview} />
            ) : (
              <ExercisePreviewContent preview={preview} />
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#dedcff] bg-white px-4 py-3 md:gap-4 md:px-6 md:py-4">
            <button
              type="button"
              disabled={!previousMode}
              onClick={() => {
                if (previousMode) {
                  onModeChange?.(previousMode);
                }
              }}
              className="inline-flex min-w-0 flex-1 items-center justify-start gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 md:min-w-[11rem] md:flex-none md:px-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="truncate">Попередній урок</span>
            </button>
            <button
              type="button"
              disabled={!nextMode}
              onClick={() => {
                if (nextMode) {
                  onModeChange?.(nextMode);
                }
              }}
              className={`inline-flex min-w-0 flex-1 items-center justify-end gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition md:min-w-[11rem] md:flex-none md:px-4 ${
                mode === "lesson"
                  ? "border-orange-200 bg-white text-orange-800 hover:bg-orange-50"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="truncate">
                {mode === "lesson"
                  ? "Відкрити вправи"
                  : mode === "test"
                    ? "Наступний урок"
                    : "Наступна вправа"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          </main>
        </div>
      </div>

      {isMobileOutlineOpen ? (
        <div
          className="fixed inset-0 z-50 bg-slate-950/45 px-3 py-4 backdrop-blur-sm md:hidden"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsMobileOutlineOpen(false);
            }
          }}
        >
          <div className="mx-auto flex h-full max-w-md items-start pt-8">
            <div className="flex h-[82vh] w-full flex-col overflow-hidden rounded-[1.5rem] border border-[#dedcff] bg-white shadow-2xl">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#dedcff] px-4 py-3">
                <div>
                  <h3 className="text-lg font-extrabold text-[#1f1b4d]">
                    Зміст курсу
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileOutlineOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                  aria-label="Закрити зміст курсу"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <PreviewSidebar
                mode={mode}
                onModeChange={onModeChange}
                preview={preview}
                className="min-h-0 flex-1 overflow-y-auto bg-white"
                onSelect={() => setIsMobileOutlineOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function LandingCourseSummary({ preview }: { preview: PublicLandingPreview }) {
  const thumbnailUrl = getCourseMediaPublicUrl(preview.course.thumbnail_path);
  const description =
    preview.course.description?.trim() ||
    "Курс показано у форматі, близькому до реального проходження студентом: урок, тест і практика в одному потоці.";

  return (
    <div className="mx-auto mt-12 max-w-6xl rounded-t-xl border border-b-0 border-[#dedcff] bg-white p-3 text-left shadow-[0_18px_54px_rgba(31,27,77,0.06)] sm:p-5 md:p-6">
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-5 md:items-center">
        <div className="aspect-video overflow-hidden rounded-[1rem] border border-[#dedcff] bg-[#1f1b4d]">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={preview.course.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#1f1b4d] text-white">
              <BookOpen className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold leading-tight tracking-tight text-[#1f1b4d] sm:mt-2 sm:text-xl">
            {preview.course.title}
          </h2>
          <p className="mt-1.5 max-h-20 overflow-y-auto pr-2 text-xs font-semibold leading-5 text-[#6d6a9f] sm:mt-3 sm:max-h-28 sm:text-sm sm:leading-7">
            {description}
          </p>

        </div>
      </div>
    </div>
  );
}
