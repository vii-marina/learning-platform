import { useEffect, useState } from "react";
import { BadgeCheck, Lightbulb, X } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { Lesson, Module } from "../../../api/index";
import { studentQuestionTypeLabels } from "../lib/courseBuilderPageUtils";
import type { CourseTest } from "../types/courseBuilderUiTypes";
import type { CoursePreviewChatContext } from "./CoursePreviewAskTeacherModal";
import { getCoursePreviewTestTitle } from "../lib/coursePreviewUtils";

type CoursePreviewTestModalProps = {
  isOpen: boolean;
  module: Module | null;
  lesson: Lesson | null;
  lessons: Lesson[];
  test: CourseTest | null;
  isGenerated: boolean;
  onClose: () => void;
  onAskTeacher: (context: CoursePreviewChatContext) => void;
  onComplete: (testId: string, scorePercent: number) => Promise<void> | void;
};

function getQuestionOptions(question: CourseTest["questions"][number]) {
  if (question.type === "true_false" && question.options.length === 0) {
    return ["Правда", "Неправда"];
  }

  return question.options;
}

function getCorrectAnswerLabel(question: CourseTest["questions"][number]) {
  const options = getQuestionOptions(question);

  return question.correctOptionIndexes
    .map((optionIndex) => options[optionIndex])
    .filter(Boolean)
    .join(", ");
}

function isAnswerCorrect(
  question: CourseTest["questions"][number],
  selectedIndexes: number[]
) {
  const correctIndexes = question.correctOptionIndexes;

  return (
    selectedIndexes.length === correctIndexes.length &&
    selectedIndexes.every((selectedIndex) => correctIndexes.includes(selectedIndex))
  );
}

function getScorePercent(
  questions: CourseTest["questions"],
  selectedAnswers: Record<string, number[]>
) {
  if (questions.length === 0) {
    return 0;
  }

  const score = questions.filter((question) =>
    isAnswerCorrect(question, selectedAnswers[question.id] ?? [])
  ).length;

  return Math.round((score / questions.length) * 100);
}

export function CoursePreviewTestModal({
  isOpen,
  module,
  lesson,
  lessons,
  test,
  isGenerated,
  onClose,
  onComplete,
}: CoursePreviewTestModalProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number[]>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen || !test) {
      return;
    }

    setSelectedAnswers({});
    setRevealedHints({});
    setIsSubmitted(false);
  }, [isOpen, test]);

  const title =
    module && test
      ? getCoursePreviewTestTitle(module.order, lessons, test)
      : "Практичний тест";

  if (!isOpen || !module || !test) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[125] bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
        <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  <span>Практичний тест</span>
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                  {`${test.questions.length} запитань`}
                </span>
                {isGenerated ? (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    AI-практика
                  </span>
                ) : null}
                {lesson ? (
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                    {`${module.order}.${lesson.order} ${lesson.title}`}
                  </span>
                ) : null}
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                {title}
              </h2>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-15 px-0"
              aria-label="Закрити модальне вікно тесту"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-4">
              {test.questions.length > 0 ? (
                test.questions.map((question, questionIndex) => {
                  const options = getQuestionOptions(question);
                  const selectedIndexes = selectedAnswers[question.id] ?? [];
                  const isMultipleChoice = question.type === "multiple_choice";
                  const isHintRevealed = Boolean(revealedHints[question.id]);

                  return (
                    <section
                      key={question.id}
                      className="rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="flex-1 whitespace-pre-wrap text-base font-medium leading-7 text-slate-800">
                          {`${questionIndex + 1}. ${question.questionText}`}
                        </p>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                          {studentQuestionTypeLabels[question.type]}
                        </span>
                      </div>

                      <div className="mt-5 space-y-2">
                        {options.map((option, optionIndex) => {
                          const isSelected = selectedIndexes.includes(optionIndex);
                          const isCorrect = question.correctOptionIndexes.includes(optionIndex);
                          const showCorrect = isSubmitted && isCorrect;
                          const showIncorrect = isSubmitted && isSelected && !isCorrect;
                          const showHintCorrect = !isSubmitted && isHintRevealed && isCorrect;

                          return (
                            <button
                              key={`${question.id}-${optionIndex}`}
                              type="button"
                              disabled={isSubmitted}
                              onClick={() => {
                                setSelectedAnswers((currentAnswers) => {
                                  const currentSelections = currentAnswers[question.id] ?? [];
                                  const nextSelections = isMultipleChoice
                                    ? currentSelections.includes(optionIndex)
                                      ? currentSelections.filter((value) => value !== optionIndex)
                                      : [...currentSelections, optionIndex]
                                    : [optionIndex];

                                  return {
                                    ...currentAnswers,
                                    [question.id]: nextSelections,
                                  };
                                });
                              }}
                              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-default ${
                                showCorrect || showHintCorrect
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : showIncorrect
                                    ? "border-rose-200 bg-rose-50 text-rose-700"
                                    : isSelected
                                      ? "border-[#13daec] bg-white text-[#0f172a]"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                                  isMultipleChoice ? "rounded-[4px]" : "rounded-full"
                                } ${
                                  showCorrect || showHintCorrect
                                    ? "border-emerald-500 bg-emerald-500"
                                    : showIncorrect
                                      ? "border-rose-500 bg-rose-500"
                                      : isSelected
                                        ? "border-[#13daec] bg-[#13daec]"
                                        : "border-slate-300 bg-white"
                                }`}
                              />
                              <span>{option}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setRevealedHints((currentHints) => ({
                              ...currentHints,
                              [question.id]: true,
                            }))
                          }
                        >
                          <Lightbulb className="h-4 w-4" />
                          Підказка
                        </Button>

                        {isHintRevealed ? (
                          <p className="text-sm font-medium text-emerald-700">
                            Правильна відповідь: {getCorrectAnswerLabel(question)}
                          </p>
                        ) : null}
                      </div>
                    </section>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/30 px-5 py-6 text-sm text-slate-500">
                  У цьому тесті поки немає запитань.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
            {isSubmitted ? (
              <Button type="button" variant="secondary" onClick={onClose}>
                Закрити
              </Button>
            ) : null}
            <Button
              type="button"
              variant="accent"
              onClick={() => {
                setIsSubmitted(true);
                void onComplete(test.id, getScorePercent(test.questions, selectedAnswers));
              }}
              disabled={test.questions.length === 0 || isSubmitted}
            >
              Завершити тест
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
