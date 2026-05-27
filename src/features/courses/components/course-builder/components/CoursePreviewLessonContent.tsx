import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from "lucide-react";
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

type ActiveContentType = "lesson" | "exercise" | "test";
type NavigationTone = "lesson" | "exercise" | "test" | null;

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
  onResolveExercise: (exerciseId: string) => void;
  onCompleteTest: (testId: string) => void;
  isCurrentLessonCompleted?: boolean;
  isCompletingLesson?: boolean;
  onCompleteLesson?: () => void;
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

function getQuestionOptions(question: CourseTest["questions"][number]) {
  if (question.type === "true_false" && question.options.length === 0) {
    return ["Правда", "Неправда"];
  }

  return question.options;
}

function isMultipleAnswerQuestion(question: CourseTest["questions"][number]) {
  return question.type === "multiple_choice";
}

function getAnswerModeLabel(question: CourseTest["questions"][number]) {
  return isMultipleAnswerQuestion(question)
    ? "Кілька правильних відповідей"
    : "Одна правильна відповідь";
}

function getAnswerModeHint(question: CourseTest["questions"][number]) {
  return isMultipleAnswerQuestion(question)
    ? "Можна обрати кілька варіантів"
    : "Оберіть один варіант";
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
  onSelectExercise,
  onResolveExercise,
  onCompleteTest,
}: CoursePreviewLessonContentProps) {
  const [showSourceLesson, setShowSourceLesson] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number[]>>({});
  const [checkedQuestionResults, setCheckedQuestionResults] = useState<
    Record<string, "correct" | "incorrect">
  >({});
  const [revealedCorrectAnswers, setRevealedCorrectAnswers] = useState<Record<string, boolean>>({});
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);

  useEffect(() => {
    setShowSourceLesson(false);
  }, [activeContentType, activeExerciseId, activeTestId, lesson?.id]);

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
    ? currentTest.questions.filter((question) => checkedQuestionResults[question.id] !== undefined)
        .length
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

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setCheckedQuestionResults({});
    setRevealedCorrectAnswers({});
    setIsTestSubmitted(false);
  }, [currentTest?.id]);

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

  function handleGoToNextQuestion() {
    if (!currentTest) {
      return;
    }

    if (currentQuestionIndex < currentTest.questions.length - 1) {
      setCurrentQuestionIndex((currentValue) => currentValue + 1);
      return;
    }

    setIsTestSubmitted(true);
    onCompleteTest(currentTest.id);
  }

  return (
    <div id="course-preview-main" className="flex min-w-0 flex-1 flex-col bg-[#f1f0ff]">
      <div
        className={`flex h-full min-h-0 w-full flex-col ${
          activeContentType === "exercise" ? "" : ""
        }`}
      >
        <div
          className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${
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
          <>
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-[#6d6a9f]">
                  {`Урок ${module.order}.${lesson.order} · Перевірка знань`}
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1f1b4d]">
                  {currentTestTitle}
                </h2>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4 font-mono text-xs font-semibold text-[#6d6a9f]">
                  <span>{`Запитання ${Math.min(currentQuestionIndex + 1, currentTest.questions.length)} з ${currentTest.questions.length}`}</span>
                  <span>{`${totalAnswered} відповідей`}</span>
                </div>
                <div className="flex overflow-hidden rounded-xl border border-[#dedcff] bg-[#e7e4ff]">
                  {currentTest.questions.map((question, index) => {
                    const questionResult = checkedQuestionResults[question.id] ?? null;
                    const isActive = index === currentQuestionIndex;

                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`flex h-9 min-w-0 flex-1 items-center justify-center border-r border-white/70 text-sm font-bold transition last:border-r-0 ${
                          questionResult === "correct"
                            ? "bg-emerald-500 text-white"
                            : questionResult === "incorrect"
                              ? "bg-rose-500 text-white"
                              : isActive
                                ? "bg-[#5549f1] text-white"
                                : "text-[#6d6a9f] hover:bg-white/50"
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isTestSubmitted ? (
                <div className="rounded-[1.5rem] border border-[#dedcff] bg-white p-8 text-center shadow-[0_20px_48px_rgba(31,27,77,0.08)]">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-3xl font-extrabold text-emerald-700">
                    {currentTest.questions.length > 0
                      ? `${Math.round((score / currentTest.questions.length) * 100)}%`
                      : "0%"}
                  </div>
                  <h3 className="mt-5 text-2xl font-extrabold text-[#1f1b4d]">
                    Тест завершено
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-[#6d6a9f]">
                    {`Правильних відповідей: ${score} з ${currentTest.questions.length}`}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-6 border-[#dedcff] text-[#5549f1] hover:bg-[#f1f0ff]"
                    onClick={() => {
                      setCurrentQuestionIndex(0);
                      setSelectedAnswers({});
                      setCheckedQuestionResults({});
                      setRevealedCorrectAnswers({});
                      setIsTestSubmitted(false);
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Пройти ще раз
                  </Button>
                </div>
              ) : currentQuestion ? (
                <div className="relative overflow-hidden rounded-[1.25rem] border border-[#dedcff] bg-white p-5 shadow-[0_16px_34px_rgba(31,27,77,0.07)]">
                  {currentQuestionResult ? (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 px-4 backdrop-blur-[3px]">
                      <div className="flex w-full max-w-[32rem] flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-[#dedcff] bg-white/90 px-5 py-6 text-center shadow-[0_18px_40px_rgba(31,27,77,0.16)]">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full ${
                            currentQuestionResult === "correct"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {currentQuestionResult === "correct" ? (
                            <CheckCircle2 className="h-7 w-7" />
                          ) : (
                            <XCircle className="h-7 w-7" />
                          )}
                        </div>
                        <p className="text-base font-bold text-[#1f1b4d]">
                          {currentQuestionResult === "correct"
                            ? "Правильна відповідь"
                            : isCurrentCorrectAnswerRevealed
                              ? "Правильну відповідь показано"
                              : "Відповідь неправильна"}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                          {currentQuestionResult === "incorrect" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={handleRetryCurrentQuestion}
                              className="border-[#dedcff] text-[#5549f1] hover:bg-[#f1f0ff]"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Спробувати ще раз
                            </Button>
                          ) : null}

                          {currentQuestionResult === "incorrect" &&
                          !isCurrentCorrectAnswerRevealed ? (
                            <Button
                              type="button"
                              variant="primary"
                              onClick={handleRevealCorrectAnswer}
                              className="bg-[#5549f1] hover:bg-[#4035d6]"
                            >
                              <span>Показати правильну</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="primary"
                              onClick={handleGoToNextQuestion}
                              className="bg-[#5549f1] hover:bg-[#4035d6]"
                            >
                              <span>
                                {currentQuestionIndex < currentTest.questions.length - 1
                                  ? "Наступне запитання"
                                  : "Завершити тест"}
                              </span>
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#f1f0ff] px-3 py-1 text-xs font-bold text-[#5549f1]">
                      <span
                        className={`h-3.5 w-3.5 border-2 border-current ${
                          isMultipleAnswerQuestion(currentQuestion) ? "rounded-[4px]" : "rounded-full"
                        }`}
                      />
                      {getAnswerModeLabel(currentQuestion)}
                    </div>
                    <span className="text-xs font-semibold text-[#6d6a9f]">
                      {getAnswerModeHint(currentQuestion)}
                    </span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-lg font-semibold leading-7 text-[#1f1b4d]">
                    {currentQuestion.questionText}
                  </p>

                  <div className="mt-5 space-y-2.5">
                    {getQuestionOptions(currentQuestion).map((option, optionIndex) => {
                      const selectedIndexes = selectedAnswers[currentQuestion.id] ?? [];
                      const isSelected = selectedIndexes.includes(optionIndex);
                      const isMultipleChoice = isMultipleAnswerQuestion(currentQuestion);
                      const showCorrectAnswer =
                        currentQuestionResult === "correct" || isCurrentCorrectAnswerRevealed;

                      return (
                        <button
                          key={`${currentQuestion.id}-${optionIndex}`}
                          type="button"
                          disabled={currentQuestionResult !== null}
                          onClick={() => {
                            setSelectedAnswers((currentAnswers) => {
                              const currentSelections =
                                currentAnswers[currentQuestion.id] ?? [];
                              const nextSelections = isMultipleChoice
                                ? currentSelections.includes(optionIndex)
                                  ? currentSelections.filter((value) => value !== optionIndex)
                                  : [...currentSelections, optionIndex]
                                : [optionIndex];

                              return {
                                ...currentAnswers,
                                [currentQuestion.id]: nextSelections,
                              };
                            });
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${
                            showCorrectAnswer &&
                            currentQuestion.correctOptionIndexes.includes(optionIndex)
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : currentQuestionResult === "incorrect" && isSelected
                                ? "border-rose-300 bg-rose-50 text-rose-800"
                                : isSelected
                              ? "border-[#5549f1] bg-[#f1f0ff] text-[#5549f1]"
                              : "border-[#dedcff] bg-white text-[#1f1b4d] hover:border-[#b9b3ff]"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 text-xs font-bold ${
                              isMultipleChoice ? "rounded-[7px]" : "rounded-full"
                            } ${
                              showCorrectAnswer &&
                              currentQuestion.correctOptionIndexes.includes(optionIndex)
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : currentQuestionResult === "incorrect" && isSelected
                                  ? "border-rose-500 bg-rose-500 text-white"
                                  : isSelected
                                ? "border-[#5549f1] bg-[#5549f1] text-white"
                                : "border-[#dedcff] text-[#6d6a9f]"
                            }`}
                          >
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>

                  {!currentQuestionResult ? (
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleCheckCurrentQuestion}
                        disabled={(selectedAnswers[currentQuestion.id] ?? []).length === 0}
                        className="bg-[#5549f1] hover:bg-[#4035d6]"
                      >
                        <span>Перевірити відповідь</span>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-violet-200 bg-white px-5 py-6 text-sm text-slate-500">
                  У цьому тесті поки немає запитань.
                </div>
              )}

            {showSourceLesson ? (
              <div className="mt-6">
                <CoursePreviewSourceLessonPanel module={module} lesson={lesson} tone="test" />
              </div>
            ) : null}
            </div>
          </>
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
