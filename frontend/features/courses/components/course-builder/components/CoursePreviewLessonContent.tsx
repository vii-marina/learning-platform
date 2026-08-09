import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { Lesson, Module } from "../../../api/index";
import {
  hasLessonContent,
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
import { CoursePreviewTestRunner } from "./CoursePreviewTestRunner";
import {
  getNavigationButtonClassName,
  type ActiveContentType,
  type NavigationTone,
} from "./coursePreviewContentHelpers";

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
  onSelectExercise: (exerciseId: string) => void;
  onResolveExercise: (exerciseId: string) => Promise<void> | void;
  onCompleteTest: (
    testId: string,
    selectedAnswers: Record<string, number[]>
  ) => Promise<TestCompletionSummary | void> | TestCompletionSummary | void;
  gradeLocally?: boolean;
  isCurrentLessonCompleted?: boolean;
  isCompletingLesson?: boolean;
  onCompleteLesson?: () => void;
};

// Graded-test results shown after submission. per_question is right/wrong only —
// never the correct answer — so a graded test still hides the answer key.
export type TestCompletionSummary = {
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  perQuestion: Record<string, boolean>;
};

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
  onSelectExercise,
  onResolveExercise,
  onCompleteTest,
  gradeLocally = false,
}: CoursePreviewLessonContentProps) {
  const [showSourceLesson, setShowSourceLesson] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number[]>>({});
  const [checkedQuestionResults, setCheckedQuestionResults] = useState<
    Record<string, "correct" | "incorrect">
  >({});
  const [revealedCorrectAnswers, setRevealedCorrectAnswers] = useState<Record<string, boolean>>({});
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  // Graded tests: server-graded (or locally-computed for the teacher preview) summary,
  // shown on the results screen after the test is submitted.
  const [gradedResult, setGradedResult] = useState<TestCompletionSummary | null>(null);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);
  const [prevSourceKey, setPrevSourceKey] = useState(
    `${activeContentType}|${activeExerciseId}|${activeTestId}|${lesson?.id}`
  );
  const [prevResetTestId, setPrevResetTestId] = useState<string | null>(null);

  // Collapse the source-lesson panel when the active item changes.
  const sourceKey = `${activeContentType}|${activeExerciseId}|${activeTestId}|${lesson?.id}`;
  if (sourceKey !== prevSourceKey) {
    setPrevSourceKey(sourceKey);
    setShowSourceLesson(false);
  }

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
    currentTest !== null && module !== null
      ? getCoursePreviewTestTitle(module.order, lessons, currentTest)
      : "";
  const currentQuestion = currentTest?.questions[currentQuestionIndex] ?? null;
  const totalAnswered = currentTest
    ? currentTest.questions.filter(
        (question) => (selectedAnswers[question.id] ?? []).length > 0
      ).length
    : 0;
  const score =
    currentTest
      ? currentTest.questions.filter(
          (question) => checkedQuestionResults[question.id] === "correct"
        ).length
      : 0;
  const currentQuestionResult = currentQuestion
    ? checkedQuestionResults[currentQuestion.id] ?? null
    : null;
  const isCurrentCorrectAnswerRevealed = currentQuestion
    ? Boolean(revealedCorrectAnswers[currentQuestion.id])
    : false;
  const isGradedTest = currentTest?.isGraded ?? false;

  // Reset the attempt when the active test changes.
  const resetTestId = currentTest?.id ?? null;
  if (resetTestId !== prevResetTestId) {
    setPrevResetTestId(resetTestId);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setCheckedQuestionResults({});
    setRevealedCorrectAnswers({});
    setGradedResult(null);
    setIsTestSubmitted(false);
    setIsSubmittingTest(false);
  }

  if (!module || !lesson) {
    return (
      <div className="mx-auto flex min-h-[24rem] w-full max-w-[44rem] items-center justify-center px-6 py-8">
        <div className="w-full rounded-xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
          Оберіть урок у сайдбарі, щоб відкрити матеріал для читання.
        </div>
      </div>
    );
  }

  const lessonEmbedUrl = getYouTubeEmbedUrl(lesson.video_url);

  // Practice tests only: the client has the answer key, so it checks locally.
  function handleCheckCurrentQuestion() {
    if (!currentQuestion) {
      return;
    }

    const selectedIndexes = selectedAnswers[currentQuestion.id] ?? [];
    const correctIndexes = currentQuestion.correctOptionIndexes;
    const isCorrect =
      selectedIndexes.length === correctIndexes.length &&
      selectedIndexes.every((selectedIndex) => correctIndexes.includes(selectedIndex));

    setCheckedQuestionResults((currentResults) => ({
      ...currentResults,
      [currentQuestion.id]: isCorrect ? "correct" : "incorrect",
    }));
  }

  function handleRetryCurrentQuestion() {
    if (!currentQuestion) {
      return;
    }

    setSelectedAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: [],
    }));
    setCheckedQuestionResults((currentResults) => {
      const nextResults = { ...currentResults };

      delete nextResults[currentQuestion.id];

      return nextResults;
    });
    setRevealedCorrectAnswers((currentRevealedAnswers) => {
      const nextRevealedAnswers = { ...currentRevealedAnswers };

      delete nextRevealedAnswers[currentQuestion.id];

      return nextRevealedAnswers;
    });
  }

  function handleRevealCorrectAnswer() {
    if (!currentQuestion) {
      return;
    }

    setRevealedCorrectAnswers((currentRevealedAnswers) => ({
      ...currentRevealedAnswers,
      [currentQuestion.id]: true,
    }));
  }

  function computeLocalGradedResult(test: CourseTest): TestCompletionSummary {
    const perQuestion: Record<string, boolean> = {};
    let correct = 0;
    for (const question of test.questions) {
      const selected = selectedAnswers[question.id] ?? [];
      const isCorrect =
        selected.length === question.correctOptionIndexes.length &&
        selected.every((index) => question.correctOptionIndexes.includes(index));
      perQuestion[question.id] = isCorrect;
      if (isCorrect) {
        correct += 1;
      }
    }
    const total = test.questions.length;
    return {
      scorePercent: total > 0 ? Math.round((correct / total) * 100) : 0,
      correctCount: correct,
      totalQuestions: total,
      perQuestion,
    };
  }

  function handleRestartTest() {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setCheckedQuestionResults({});
    setRevealedCorrectAnswers({});
    setGradedResult(null);
    setIsTestSubmitted(false);
  }

  async function handleGoToNextQuestion() {
    if (!currentTest) {
      return;
    }

    if (currentQuestionIndex < currentTest.questions.length - 1) {
      setCurrentQuestionIndex((currentValue) => currentValue + 1);
      return;
    }
if (!currentTest.isGraded) {
      setIsTestSubmitted(true);
      await onCompleteTest(currentTest.id, selectedAnswers);
      return;
    }

    if (gradeLocally) {
      setGradedResult(computeLocalGradedResult(currentTest));
      setIsTestSubmitted(true);
      await onCompleteTest(currentTest.id, selectedAnswers);
      return;
    }

    setIsSubmittingTest(true);
    try {
      const summary = await onCompleteTest(currentTest.id, selectedAnswers);
      if (summary) {
        setGradedResult(summary);
        setIsTestSubmitted(true);
      }
    } finally {
      setIsSubmittingTest(false);
    }
  }

  return (
    <div id="course-preview-main" className="flex min-w-0 flex-col bg-[#f1f0ff] lg:flex-1">
      <div
        className={`flex w-full flex-col lg:h-full lg:min-h-0 ${
          activeContentType === "exercise" ? "" : ""
        }`}
      >
        <div
          className={`px-4 py-4 md:px-6 md:py-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto ${
            activeContentType === "exercise" ? "" : "mx-auto w-full max-w-[58rem]"
          }`}
        >
        {activeContentType === "lesson" ? (
          <>
            <div className="pb-2">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-[#6d6a9f]">
                  <span>{`Модуль ${module.order}`}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>{`Урок ${module.order}.${lesson.order}`}</span>
                </p>
                <h2 className="mt-1.5 text-xl font-bold tracking-tight text-[#1f1b4d] md:text-2xl">
                  {lesson.title}
                </h2>
              </div>
            </div>

            {lessonEmbedUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                <div className="aspect-video">
                  <iframe
                    src={lessonEmbedUrl}
                    title={`Відео уроку ${lesson.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              </div>
            ) : null}

            {hasLessonContent(lesson.content) ? (
              <div
                className="prose prose-slate mt-3 max-w-none text-slate-700 prose-headings:text-[#1f1b4d] prose-a:text-[#5549f1]"
                dangerouslySetInnerHTML={{ __html: lesson.content ?? "" }}
              />
            ) : (
              <p className="mt-3 text-sm leading-7 text-slate-500">
                У цього уроку поки немає опублікованого контенту.
              </p>
            )}

            {hasGeneratedPractice ? (
              <div className="mt-5 rounded-xl border border-[#dedcff] bg-white px-4 py-3 text-sm text-[#6d6a9f]">
                Ці запитання згенеровані AI. Перевірте правильність із викладачем.
              </div>
            ) : null}

          </>
        ) : null}

        {activeContentType === "exercise" ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#dedcff] px-1 pb-5">
              <div>
                <p className="text-sm font-semibold text-[#6d6a9f]">
                  {`Урок ${module.order}.${lesson.order} · Практика`}
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1f1b4d]">
                  Практичні вправи
                </h2>
              </div>

              {exercises.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {exercises.map((exercise, index) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => {
                        onSelectExercise(exercise.id);
                      }}
                      className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                        exercise.id === currentExercise?.id
                          ? "bg-[#5549f1] text-white shadow-[0_12px_26px_rgba(85,73,241,0.22)]"
                          : "bg-white text-[#6d6a9f] hover:bg-[#e7e4ff]"
                      }`}
                    >
                      {`Вправа ${index + 1}`}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {showSourceLesson ? (
              <div className="mt-6">
                <CoursePreviewSourceLessonPanel module={module} lesson={lesson} tone="exercise" />
              </div>
            ) : null}

            {currentExercise ? (
              <div className="mt-6">
                <CoursePreviewExerciseBlock
                  module={module}
                  lesson={lesson}
                  exercise={currentExercise}
                  isGenerated={isGeneratedCoursePreviewItem(currentExercise.id)}
                  isHighlighted
                  onAskTeacher={onAskTeacher}
                  onResolved={onResolveExercise}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#dedcff] bg-white px-5 py-6 text-sm text-[#6d6a9f]">
                Для цього уроку поки немає вправ.
              </div>
            )}
          </>
        ) : null}

        {activeContentType === "test" && currentTest ? (
          <CoursePreviewTestRunner
            module={module}
            lesson={lesson}
            currentTest={currentTest}
            currentTestTitle={currentTestTitle}
            currentQuestion={currentQuestion}
            currentQuestionIndex={currentQuestionIndex}
            setCurrentQuestionIndex={setCurrentQuestionIndex}
            selectedAnswers={selectedAnswers}
            setSelectedAnswers={setSelectedAnswers}
            checkedQuestionResults={checkedQuestionResults}
            currentQuestionResult={currentQuestionResult}
            isCurrentCorrectAnswerRevealed={isCurrentCorrectAnswerRevealed}
            isGradedTest={isGradedTest}
            isTestSubmitted={isTestSubmitted}
            isSubmittingTest={isSubmittingTest}
            gradedResult={gradedResult}
            score={score}
            totalAnswered={totalAnswered}
            showSourceLesson={showSourceLesson}
            onCheckCurrentQuestion={handleCheckCurrentQuestion}
            onRetryCurrentQuestion={handleRetryCurrentQuestion}
            onRevealCorrectAnswer={handleRevealCorrectAnswer}
            onGoToNextQuestion={handleGoToNextQuestion}
            onRestartTest={handleRestartTest}
          />
        ) : null}

        {activeContentType === "test" && !currentTest ? (
          <div className="rounded-xl border border-dashed border-[#dedcff] bg-white px-5 py-6 text-sm text-[#6d6a9f]">
            Для цього уроку поки немає тесту.
          </div>
        ) : null}
        </div>

        <div className="shrink-0 border-t border-[#dedcff] bg-white/95 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
    </div>
  );
}
