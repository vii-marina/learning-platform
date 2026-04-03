import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, MessageSquareText, X } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import type { Lesson, Module } from "../../api";
import { studentQuestionTypeLabels } from "./courseBuilderPageUtils";
import type { CourseTest } from "./courseBuilderUiTypes";
import type { CoursePreviewChatContext } from "./CoursePreviewAskTeacherModal";
import { getCoursePreviewTestTitle } from "./coursePreviewUtils";

type CoursePreviewTestModalProps = {
  isOpen: boolean;
  module: Module | null;
  lesson: Lesson | null;
  lessons: Lesson[];
  test: CourseTest | null;
  isGenerated: boolean;
  onClose: () => void;
  onAskTeacher: (context: CoursePreviewChatContext) => void;
  onComplete: (testId: string) => void;
};

function areSelectionsEqual(left: number[], right: number[]) {
  if (left.length !== right.length) {
    return false;
  }

  const sortedLeft = [...left].sort((first, second) => first - second);
  const sortedRight = [...right].sort((first, second) => first - second);

  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

export function CoursePreviewTestModal({
  isOpen,
  module,
  lesson,
  lessons,
  test,
  isGenerated,
  onClose,
  onAskTeacher,
  onComplete,
}: CoursePreviewTestModalProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOptionIndexes, setSelectedOptionIndexes] = useState<number[]>([]);
  const [result, setResult] = useState<"correct" | "incorrect" | "revealed" | null>(null);

  useEffect(() => {
    if (!isOpen || !test) {
      return;
    }

    setQuestionIndex(0);
    setSelectedOptionIndexes([]);
    setResult(null);
  }, [isOpen, test]);

  const currentQuestion = test?.questions[questionIndex] ?? null;
  const canClose =
    questionIndex > 0 || selectedOptionIndexes.length > 0 || result !== null;
  const title =
    module && test
      ? getCoursePreviewTestTitle(module.order, lessons, test)
      : "Practice test";
  const askTeacherContext = useMemo<CoursePreviewChatContext | null>(() => {
    if (!module || !test) {
      return null;
    }

    const referenceParts = [`Module ${module.order}`, "Test"];

    if (lesson) {
      referenceParts.splice(1, 0, `Lesson ${module.order}.${lesson.order}`);
    }

    return {
      reference: referenceParts.join(" • "),
      title,
      description: "Your teacher will receive the current test reference with this message.",
    };
  }, [lesson, module, test, title]);

  if (!isOpen || !module || !test || !currentQuestion) {
    return null;
  }

  const isMultipleChoice = currentQuestion.type === "multiple_choice";
  const isLastQuestion = questionIndex === test.questions.length - 1;

  return (
    <div
      className="fixed inset-0 z-[125] bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && canClose) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  <span>Practice Test</span>
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                  {`Question ${questionIndex + 1} of ${test.questions.length}`}
                </span>
                {lesson ? (
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                    {`${module.order}.${lesson.order} ${lesson.title}`}
                  </span>
                ) : null}
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select an answer before closing this modal.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={!canClose}
              className="w-10 px-0"
              aria-label="Close test modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="px-5 py-5">
            {isGenerated ? (
              <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                These questions were generated by AI. Verify correctness with your teacher.
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="flex-1 whitespace-pre-wrap text-base font-medium leading-7 text-slate-800">
                  {currentQuestion.questionText}
                </p>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                  {studentQuestionTypeLabels[currentQuestion.type]}
                </span>
              </div>

              <div className="mt-5 space-y-2">
                {currentQuestion.options.map((option, optionIndex) => {
                  const isSelected = selectedOptionIndexes.includes(optionIndex);
                  const showCorrect =
                    result === "revealed" &&
                    currentQuestion.correctOptionIndexes.includes(optionIndex);

                  return (
                    <button
                      key={`${currentQuestion.id}-${optionIndex}`}
                      type="button"
                      onClick={() => {
                        setResult(null);

                        if (isMultipleChoice) {
                          setSelectedOptionIndexes((currentSelections) =>
                            currentSelections.includes(optionIndex)
                              ? currentSelections.filter((value) => value !== optionIndex)
                              : [...currentSelections, optionIndex]
                          );
                          return;
                        }

                        setSelectedOptionIndexes([optionIndex]);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                        isSelected || showCorrect
                          ? "border-[#13daec] bg-white text-[#0f172a]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                          isMultipleChoice ? "rounded-[4px]" : "rounded-full"
                        } ${
                          isSelected || showCorrect
                            ? "border-[#13daec] bg-[#13daec]"
                            : "border-slate-300"
                        }`}
                      />
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>

              {currentQuestion.hint?.trim() && result !== null ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                  <span className="font-semibold text-slate-700">Hint:</span>{" "}
                  {currentQuestion.hint.trim()}
                </div>
              ) : null}
            </div>

            {result ? (
              <p className="mt-4 text-sm font-medium text-slate-600">
                {result === "correct"
                  ? "Correct answer selected."
                  : result === "incorrect"
                    ? "That answer is not correct."
                    : "The correct answer is shown below."}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (askTeacherContext) {
                    onAskTeacher(askTeacherContext);
                  }
                }}
              >
                <MessageSquareText className="h-4 w-4" />
                <span>Ask Teacher</span>
              </Button>

              <div className="flex flex-wrap gap-3">
                {result === null ? (
                  <Button
                    type="button"
                    variant="accent"
                    onClick={() => {
                      const isCorrect = areSelectionsEqual(
                        selectedOptionIndexes,
                        currentQuestion.correctOptionIndexes
                      );

                      setResult(isCorrect ? "correct" : "incorrect");
                    }}
                    disabled={selectedOptionIndexes.length === 0}
                  >
                    Check Answer
                  </Button>
                ) : null}

                {result === "incorrect" ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSelectedOptionIndexes([]);
                        setResult(null);
                      }}
                    >
                      Retry
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSelectedOptionIndexes(currentQuestion.correctOptionIndexes);
                        setResult("revealed");
                      }}
                    >
                      Show Correct
                    </Button>
                  </>
                ) : null}

                {result === "correct" || result === "revealed" ? (
                  <Button
                    type="button"
                    variant="accent"
                    onClick={() => {
                      if (isLastQuestion) {
                        onComplete(test.id);
                        onClose();
                        return;
                      }

                      setQuestionIndex((currentIndex) => currentIndex + 1);
                      setSelectedOptionIndexes([]);
                      setResult(null);
                    }}
                  >
                    {isLastQuestion ? "Finish Test" : "Next Question"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
