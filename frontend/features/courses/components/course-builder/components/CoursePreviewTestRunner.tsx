/**
 * The test-taking surface inside the course preview.
 *
 * Split out of the content pane because taking a test is a different job from reading a
 * lesson: it owns a question cursor, a set of selections, and — for practice tests — local
 * marking. All of that state lives in `useCoursePreviewTestRunner` and arrives here as one
 * object, so this file stays a renderer.
 *
 * Practice and graded tests differ in where the answer key lives. A practice test has it on
 * the client and marks locally; a graded test never receives it and is scored by the server
 * on submit.
 */

import { ArrowRight, Check, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { Lesson, Module } from "../../../api/index";
import { Button } from "../../../../../components/ui/button";
import type { CourseTest } from "../types/courseBuilderUiTypes";
import { CoursePreviewSourceLessonPanel } from "./CoursePreviewSourceLessonPanel";
import {
  getAnswerModeHint,
  getAnswerModeLabel,
  getQuestionOptions,
  isMultipleAnswerQuestion,
} from "./coursePreviewContentHelpers";
import type { TestCompletionSummary } from "./CoursePreviewLessonContent";

export type CoursePreviewTestRunnerProps = {
  module: Module;
  lesson: Lesson;
  currentTest: CourseTest;
  currentTestTitle: string;
  currentQuestion: CourseTest["questions"][number] | null;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: Dispatch<SetStateAction<number>>;
  selectedAnswers: Record<string, number[]>;
  setSelectedAnswers: Dispatch<SetStateAction<Record<string, number[]>>>;
  checkedQuestionResults: Record<string, "correct" | "incorrect">;
  currentQuestionResult: "correct" | "incorrect" | null;
  isCurrentCorrectAnswerRevealed: boolean;
  isGradedTest: boolean;
  isTestSubmitted: boolean;
  isSubmittingTest: boolean;
  gradedResult: TestCompletionSummary | null;
  score: number;
  totalAnswered: number;
  showSourceLesson: boolean;
  onCheckCurrentQuestion: () => void;
  onRetryCurrentQuestion: () => void;
  onRevealCorrectAnswer: () => void;
  /** Advances to the next question, or submits the test when on the last one. */
  onGoToNextQuestion: () => void;
  /** Clears the attempt so the student can take the test again. */
  onRestartTest: () => void;
};

export function CoursePreviewTestRunner({
  module,
  lesson,
  currentTest,
  currentTestTitle,
  currentQuestion,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  selectedAnswers,
  setSelectedAnswers,
  checkedQuestionResults,
  currentQuestionResult,
  isCurrentCorrectAnswerRevealed,
  isGradedTest,
  isTestSubmitted,
  isSubmittingTest,
  gradedResult,
  score,
  totalAnswered,
  showSourceLesson,
  // Aliased to the names the markup already used, so the moved JSX is unchanged.
  onCheckCurrentQuestion: handleCheckCurrentQuestion,
  onRetryCurrentQuestion: handleRetryCurrentQuestion,
  onRevealCorrectAnswer: handleRevealCorrectAnswer,
  onGoToNextQuestion: handleGoToNextQuestion,
  onRestartTest,
}: CoursePreviewTestRunnerProps) {
  return (
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
                    const isAnswered = (selectedAnswers[question.id] ?? []).length > 0;

                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`flex h-9 min-w-0 flex-1 items-center justify-center border-r border-white/70 text-sm font-bold transition last:border-r-0 ${
                          !isGradedTest && questionResult === "correct"
                            ? "bg-emerald-500 text-white"
                            : !isGradedTest && questionResult === "incorrect"
                              ? "bg-rose-500 text-white"
                              : isActive
                                ? "bg-[#5549f1] text-white"
                                : isGradedTest && isAnswered
                                  ? "bg-[#c7c2ff] text-[#1f1b4d]"
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
                    {gradedResult
                      ? `${gradedResult.scorePercent}%`
                      : currentTest.questions.length > 0
                        ? `${Math.round((score / currentTest.questions.length) * 100)}%`
                        : "0%"}
                  </div>
                  <h3 className="mt-5 text-2xl font-extrabold text-[#1f1b4d]">
                    Тест завершено
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-[#6d6a9f]">
                    {`Правильних відповідей: ${
                      gradedResult ? gradedResult.correctCount : score
                    } з ${
                      gradedResult ? gradedResult.totalQuestions : currentTest.questions.length
                    }`}
                  </p>

                  {gradedResult ? (
                    <div className="mt-6 space-y-2 text-left">
                      {currentTest.questions.map((question, index) => {
                        const isCorrect = gradedResult.perQuestion[question.id] ?? false;

                        return (
                          <div
                            key={question.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[#dedcff] bg-[#f8f7ff] px-4 py-2.5"
                          >
                            <span className="text-sm font-semibold text-[#1f1b4d]">
                              {`Запитання ${index + 1}`}
                            </span>
                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                                <CheckCircle2 className="h-4 w-4" />
                                Правильно
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-700">
                                <XCircle className="h-4 w-4" />
                                Неправильно
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-6 border-[#dedcff] text-[#5549f1] hover:bg-[#f1f0ff]"
                    onClick={onRestartTest}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Пройти ще раз
                  </Button>
                </div>
              ) : currentQuestion ? (
                <div className="relative overflow-hidden rounded-[1.25rem] border border-[#dedcff] bg-white p-5 shadow-[0_16px_34px_rgba(31,27,77,0.07)]">
                  {currentQuestionResult && !isCurrentCorrectAnswerRevealed ? (
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

                  {isGradedTest ? (
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleGoToNextQuestion}
                        disabled={
                          (selectedAnswers[currentQuestion.id] ?? []).length === 0 ||
                          isSubmittingTest
                        }
                        className="bg-[#5549f1] hover:bg-[#4035d6]"
                      >
                        <span>
                          {currentQuestionIndex < currentTest.questions.length - 1
                            ? "Наступне запитання"
                            : isSubmittingTest
                              ? "Надсилання…"
                              : "Завершити тест"}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : !currentQuestionResult ? (
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

                  {currentQuestionResult === "incorrect" && isCurrentCorrectAnswerRevealed ? (
                    <div className="mt-5  gap-3 rounded-xl border border-violet-100 bg-[#f8f7ff] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="flex justify-between gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleRetryCurrentQuestion}
                          className="border-[#dedcff] text-[#5549f1] hover:bg-[#f1f0ff]"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Спробувати ще раз
                        </Button>
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
                      </div>
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
  );
}
