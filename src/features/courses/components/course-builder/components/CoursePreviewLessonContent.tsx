import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { Lesson, Module } from "../../../api/index";
import {
  hasLessonContent,
  studentQuestionTypeLabels,
} from "../lib/courseBuilderPageUtils";
import type { CourseExercise, CourseTest } from "../types/courseBuilderUiTypes";
import { getYouTubeEmbedUrl } from "../lib/youtube";
import type { CoursePreviewChatContext } from "./CoursePreviewAskTeacherModal";
import {
  getCoursePreviewTestTitle,
  isGeneratedCoursePreviewItem,
} from "../lib/coursePreviewUtils";
import { CoursePreviewExerciseBlock } from "./CoursePreviewExerciseBlock";
import { CoursePreviewSourceLessonPanel } from "./CoursePreviewSourceLessonPanel";

type ActiveContentType = "lesson" | "exercise" | "test";
type NavigationTone = "lesson" | "exercise" | "test" | null;

type TestQuestionPreviewCardProps = {
  question: CourseTest["questions"][number];
  index: number;
};

type CoursePreviewLessonContentProps = {
  module: Module | null;
  lesson: Lesson | null;
  lessons: Lesson[];
  exercises: CourseExercise[];
  tests: CourseTest[];
  activeContentType: ActiveContentType;
  activeExerciseId: string | null;
  activeTestId: string | null;
  canGoToPreviousItem: boolean;
  canGoToNextItem: boolean;
  previousButtonLabel: string;
  nextButtonLabel: string;
  previousButtonTone: NavigationTone;
  nextButtonTone: NavigationTone;
  onGoToPreviousItem: () => void;
  onGoToNextItem: () => void;
  onAskTeacher: (context: CoursePreviewChatContext) => void;
  onResolveExercise: (exerciseId: string) => void;
};

function getNavigationButtonClassName(tone: NavigationTone, alignment: "start" | "end") {
  const baseClassName =
    alignment === "start" ? "min-w-[11rem] justify-start" : "min-w-[11rem] justify-end";

  if (tone === "exercise") {
    return `${baseClassName} border-orange-200 text-orange-800 hover:border-orange-300 hover:bg-orange-50`;
  }

  if (tone === "test") {
    return `${baseClassName} border-violet-200 text-violet-800 hover:border-violet-300 hover:bg-violet-50`;
  }

  return baseClassName;
}

function TestQuestionPreviewCard({ question, index }: TestQuestionPreviewCardProps) {
  const optionLabels = question.type === "true_false" ? ["True", "False"] : question.options;
  const isMultipleChoice = question.type === "multiple_choice";

  return (
    <div className="rounded-[1.25rem] border border-violet-200 bg-[#faf7ff] p-5 shadow-[0_14px_32px_rgba(139,92,246,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-300 bg-violet-50 text-sm font-bold text-violet-700">
            {index + 1}
          </div>
          <p className="min-w-0 whitespace-pre-wrap pt-0.5 text-sm font-semibold leading-6 text-[#14213d]">
            {question.questionText.trim() || `Question ${index + 1}`}
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold text-violet-700">
          {studentQuestionTypeLabels[question.type]}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {optionLabels.map((option, optionIndex) => {
          const isCorrect = question.correctOptionIndexes.includes(optionIndex);

          return (
            <div
              key={`${question.id}-${optionIndex}`}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                isCorrect
                  ? "border-violet-200 bg-violet-50 text-violet-800"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center border border-violet-300 ${
                  isMultipleChoice ? "rounded-[4px]" : "rounded-full"
                } ${isCorrect ? "bg-violet-500" : "bg-white"}`}
              />
              <span className="min-w-0 flex-1">{option}</span>
            </div>
          );
        })}
      </div>

      {question.hint?.trim() ? (
        <div className="mt-4 rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
          <span className="font-semibold text-slate-700">Hint:</span> {question.hint.trim()}
        </div>
      ) : null}
    </div>
  );
}

export function CoursePreviewLessonContent({
  module,
  lesson,
  lessons,
  exercises,
  tests,
  activeContentType,
  activeExerciseId,
  activeTestId,
  canGoToPreviousItem,
  canGoToNextItem,
  previousButtonLabel,
  nextButtonLabel,
  previousButtonTone,
  nextButtonTone,
  onGoToPreviousItem,
  onGoToNextItem,
  onAskTeacher,
  onResolveExercise,
}: CoursePreviewLessonContentProps) {
  const [showSourceLesson, setShowSourceLesson] = useState(false);

  useEffect(() => {
    setShowSourceLesson(false);
  }, [activeContentType, activeExerciseId, activeTestId, lesson?.id]);

  if (!module || !lesson) {
    return (
      <div className="mx-auto flex min-h-[24rem] w-full max-w-[44rem] items-center justify-center px-6 py-8">
        <div className="w-full rounded-xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
          Select a lesson from the sidebar to open the reading view.
        </div>
      </div>
    );
  }

  const lessonEmbedUrl = getYouTubeEmbedUrl(lesson.video_url);
  const hasGeneratedPractice =
    exercises.some((exercise) => isGeneratedCoursePreviewItem(exercise.id)) ||
    tests.some((test) => isGeneratedCoursePreviewItem(test.id));
  const currentExercise =
    activeContentType === "exercise"
      ? exercises.find((exercise) => exercise.id === activeExerciseId) ?? exercises[0] ?? null
      : null;
  const currentTest =
    activeContentType === "test"
      ? tests.find((test) => test.id === activeTestId) ?? tests[0] ?? null
      : null;
  const currentTestTitle =
    currentTest !== null ? getCoursePreviewTestTitle(module.order, lessons, currentTest) : "";

  return (
    <div id="course-preview-main" className="min-w-0 flex-1 bg-white">
      <div className="mx-auto w-full max-w-[58rem] px-6 py-8">
        {activeContentType === "lesson" ? (
          <>
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  {`Lesson ${module.order}.${lesson.order}`}
                </p>
                <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-slate-950 md:text-[1.7rem]">
                  {lesson.title}
                </h2>
              </div>
            </div>

            {lessonEmbedUrl ? (
              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                <div className="aspect-video">
                  <iframe
                    src={lessonEmbedUrl}
                    title={`${lesson.title} video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              </div>
            ) : null}

            {hasLessonContent(lesson.content) ? (
              <div
                className="prose prose-slate mt-8 max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: lesson.content ?? "" }}
              />
            ) : (
              <p className="mt-8 text-sm leading-7 text-slate-500">
                This lesson does not have published content yet.
              </p>
            )}

            {hasGeneratedPractice ? (
              <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                These questions were generated by AI. Verify correctness with your teacher.
              </div>
            ) : null}

          </>
        ) : null}

        {activeContentType === "exercise" ? (
          <>
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-[1.55rem] font-semibold tracking-tight text-slate-950 md:text-[1.7rem]">
                  {exercises.length === 1
                    ? currentExercise?.title || "Practice Exercise"
                    : `Exercise | Lesson ${module.order}.${lesson.order}`}
                </h2>
              </div>
            </div>

            

            {showSourceLesson ? (
              <div className="mt-6">
                <CoursePreviewSourceLessonPanel module={module} lesson={lesson} tone="exercise" />
              </div>
            ) : null}

            <div className="mt-6 space-y-5">
              {exercises.map((exercise) => (
                <CoursePreviewExerciseBlock
                  key={exercise.id}
                  module={module}
                  lesson={lesson}
                  exercise={exercise}
                  isGenerated={isGeneratedCoursePreviewItem(exercise.id)}
                  isHighlighted={exercise.id === currentExercise?.id}
                  onAskTeacher={onAskTeacher}
                  onResolved={onResolveExercise}
                />
              ))}
            </div>
          </>
        ) : null}

        {activeContentType === "test" && currentTest ? (
          <>
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
              

              <div>
                <h2 className="text-[1.55rem] font-semibold tracking-tight text-slate-950 md:text-[1.7rem]">
                  {currentTestTitle}
                </h2>
              </div>
            </div>

            

            {showSourceLesson ? (
              <div className="mt-6">
                <CoursePreviewSourceLessonPanel module={module} lesson={lesson} tone="test" />
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              {currentTest.questions.length > 0 ? (
                currentTest.questions.map((question, index) => (
                  <TestQuestionPreviewCard key={question.id} question={question} index={index} />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/30 px-5 py-6 text-sm text-slate-500">
                  This test does not have any questions yet.
                </div>
              )}
            </div>
          </>
        ) : null}

        <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onGoToPreviousItem}
            disabled={!canGoToPreviousItem}
            className={getNavigationButtonClassName(previousButtonTone, "start")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{previousButtonLabel}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={onGoToNextItem}
            disabled={!canGoToNextItem}
            className={getNavigationButtonClassName(nextButtonTone, "end")}
          >
            <span>{nextButtonLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
