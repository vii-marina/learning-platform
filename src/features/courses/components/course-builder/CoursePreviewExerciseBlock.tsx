import { useEffect, useMemo, useState } from "react";
import { Code2, MessageSquareText } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import type { Lesson, Module } from "../../api";
import type { CourseExercise } from "./courseBuilderUiTypes";
import type { CoursePreviewChatContext } from "./CoursePreviewAskTeacherModal";

type CoursePreviewExerciseBlockProps = {
  module: Module;
  lesson: Lesson;
  exercise: CourseExercise;
  isGenerated: boolean;
  isHighlighted: boolean;
  onAskTeacher: (context: CoursePreviewChatContext) => void;
  onResolved: (exerciseId: string) => void;
};

const DRAG_DROP_SLOT_PATTERN = /(___|{{blank_\d+}})/g;
const DRAG_DROP_SLOT_FRAGMENT_PATTERN = /^(___|{{blank_\d+}})$/;
const WRITE_CODE_SLOT_PATTERN = /(___|{{blank_\d+}}|{{answer}})/g;
const WRITE_CODE_SLOT_FRAGMENT_PATTERN = /^(___|{{blank_\d+}}|{{answer}})$/;

function hasWriteCodeSlot(template: string) {
  return template.match(WRITE_CODE_SLOT_PATTERN) !== null;
}

function getExerciseTypeLabel(exercise: CourseExercise) {
  return exercise.type === "drag_drop_code" ? "Fill Missing Code" : "Write Code";
}

function getInitialWriteCodeValue(exercise: CourseExercise) {
  if (exercise.content.type !== "write_code") {
    return "";
  }

  return hasWriteCodeSlot(exercise.content.initial_code) ? "" : exercise.content.initial_code;
}

function normalizeWriteCodeValue(value: string, matchMode: "strict" | "flexible" = "strict") {
  const normalizedLineEndings = value.trim().replace(/\r\n/g, "\n");

  if (matchMode === "flexible") {
    return normalizedLineEndings.replace(/\s+/g, " ");
  }

  return normalizedLineEndings;
}

export function CoursePreviewExerciseBlock({
  module,
  lesson,
  exercise,
  isGenerated,
  isHighlighted,
  onAskTeacher,
  onResolved,
}: CoursePreviewExerciseBlockProps) {
  const [activeBlankIndex, setActiveBlankIndex] = useState<number | null>(null);
  const [dragDropSelections, setDragDropSelections] = useState<string[]>([]);
  const [result, setResult] = useState<"correct" | "incorrect" | "revealed" | null>(null);
  const [writeCodeValue, setWriteCodeValue] = useState(getInitialWriteCodeValue(exercise));

  useEffect(() => {
    if (exercise.content.type === "drag_drop_code") {
      const blankCount = exercise.content.code_template
        .split(DRAG_DROP_SLOT_PATTERN)
        .filter((part) => DRAG_DROP_SLOT_FRAGMENT_PATTERN.test(part)).length;

      setActiveBlankIndex(blankCount > 0 ? 0 : null);
      setDragDropSelections(Array.from({ length: blankCount }, () => ""));
      setResult(null);
      setWriteCodeValue("");
      return;
    }

    setActiveBlankIndex(null);
    setDragDropSelections([]);
    setResult(null);
    setWriteCodeValue(getInitialWriteCodeValue(exercise));
  }, [exercise]);

  const askTeacherContext = useMemo<CoursePreviewChatContext>(
    () => ({
      reference: `Module ${module.order} • Lesson ${module.order}.${lesson.order} • Exercise`,
      title: exercise.title,
      description: "Your teacher will receive the current exercise reference with this message.",
    }),
    [exercise.title, lesson.order, module.order]
  );

  const feedbackLabel =
    result === "correct"
      ? "Answer checked."
      : result === "incorrect"
        ? "That answer is not correct yet."
        : result === "revealed"
          ? "Answer revealed."
          : null;

  if (exercise.content.type === "drag_drop_code") {
    const templateParts = exercise.content.code_template.split(DRAG_DROP_SLOT_PATTERN);
    const correctAnswer = exercise.content.correct_answer.map((token) => token.trim());
    const tokenBank =
      exercise.content.tokens.map((token) => token.trim()).filter(Boolean).length > 0
        ? exercise.content.tokens.map((token) => token.trim()).filter(Boolean)
        : correctAnswer.filter(Boolean);
    let blankIndex = 0;

    const handleTokenSelect = (token: string) => {
      setDragDropSelections((currentSelections) => {
        if (currentSelections.length === 0) {
          return currentSelections;
        }

        const targetIndex =
          activeBlankIndex !== null
            ? activeBlankIndex
            : currentSelections.findIndex((value) => !value.trim());
        const resolvedIndex =
          targetIndex >= 0 ? targetIndex : Math.max(0, currentSelections.length - 1);
        const nextSelections = [...currentSelections];

        nextSelections[resolvedIndex] = token;

        const nextBlankIndex = nextSelections.findIndex((value) => !value.trim());
        setActiveBlankIndex(nextBlankIndex >= 0 ? nextBlankIndex : resolvedIndex);
        setResult(null);

        return nextSelections;
      });
    };

    return (
      <section
        id={`course-preview-exercise-${exercise.id}`}
        className={`rounded-xl border bg-white px-5 py-5 ${
          isHighlighted
            ? "border-[#13daec] shadow-[0_0_0_4px_rgba(19,218,236,0.08)]"
            : "border-slate-200"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <Code2 className="h-3.5 w-3.5" />
                <span>{getExerciseTypeLabel(exercise)}</span>
              </span>
              {isGenerated ? (
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                  AI Practice
                </span>
              ) : null}
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                {exercise.title}
              </h3>
              {exercise.description?.trim() ? (
                <p className="mt-2 text-sm leading-6 text-slate-500">{exercise.description}</p>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAskTeacher(askTeacherContext)}
          >
            <MessageSquareText className="h-4 w-4" />
            <span>Ask Teacher</span>
          </Button>
        </div>

        {exercise.content.question.trim() ? (
          <p className="mt-4 text-sm leading-6 text-slate-700">{exercise.content.question}</p>
        ) : null}

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-4 font-mono text-sm leading-7 text-slate-700">
          {templateParts.map((part, index) => {
            if (!DRAG_DROP_SLOT_FRAGMENT_PATTERN.test(part)) {
              return (
                <span key={`exercise-text-${index}`} className="whitespace-pre-wrap">
                  {part}
                </span>
              );
            }

            const currentBlankIndex = blankIndex;
            blankIndex += 1;

            return (
              <button
                key={`exercise-blank-${index}`}
                type="button"
                onClick={() => {
                  setActiveBlankIndex(currentBlankIndex);
                  setResult(null);
                }}
                className={`mx-1 inline-flex min-w-[6.5rem] items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                  activeBlankIndex === currentBlankIndex
                    ? "border-[#13daec] bg-white text-[#0f172a]"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                {dragDropSelections[currentBlankIndex]?.trim() || "___"}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tokenBank.length > 0 ? (
            tokenBank.map((token, index) => (
              <button
                key={`${token}-${index}`}
                type="button"
                onClick={() => handleTokenSelect(token)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-[#13daec]/40 hover:bg-slate-50 hover:text-[#0f172a]"
              >
                {token}
              </button>
            ))
          ) : (
            <span className="text-sm text-slate-400">
              Add tokens in the builder to preview the student interaction here.
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={() => {
                const isCorrect =
                  dragDropSelections.length === correctAnswer.length &&
                  dragDropSelections.every(
                    (selection, index) => selection.trim() === (correctAnswer[index] ?? "").trim()
                  );

                if (isCorrect) {
                  onResolved(exercise.id);
                }

                setResult(isCorrect ? "correct" : "incorrect");
              }}
              disabled={dragDropSelections.some((selection) => !selection.trim())}
            >
              Check Answer
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setDragDropSelections(Array.from({ length: correctAnswer.length }, () => ""));
                setActiveBlankIndex(correctAnswer.length > 0 ? 0 : null);
                setResult(null);
              }}
            >
              Try Again
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDragDropSelections(correctAnswer);
                setActiveBlankIndex(null);
                setResult("revealed");
                onResolved(exercise.id);
              }}
            >
              Show Answer
            </Button>
          </div>

          {feedbackLabel ? (
            <p className="text-sm font-medium text-slate-600">{feedbackLabel}</p>
          ) : null}
        </div>

        {result === "revealed" ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Answer
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {correctAnswer.map((token, index) => (
                <span
                  key={`${exercise.id}-${index}`}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700"
                >
                  {token}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  const initialCodeParts = exercise.content.initial_code.split(WRITE_CODE_SLOT_PATTERN);
  const hasInlineInput = hasWriteCodeSlot(exercise.content.initial_code);
  const writeCodeContent = exercise.content;
  const expectedAnswer = normalizeWriteCodeValue(
    writeCodeContent.expected_answer,
    writeCodeContent.match_mode
  );
  let inlineSlotIndex = 0;

  return (
    <section
      id={`course-preview-exercise-${exercise.id}`}
      className={`rounded-xl border bg-white px-5 py-5 ${
        isHighlighted
          ? "border-[#13daec] shadow-[0_0_0_4px_rgba(19,218,236,0.08)]"
          : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <Code2 className="h-3.5 w-3.5" />
                <span>{getExerciseTypeLabel(exercise)}</span>
              </span>
            {isGenerated ? (
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                AI Practice
              </span>
            ) : null}
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">
              {exercise.title}
            </h3>
            {exercise.description?.trim() ? (
              <p className="mt-2 text-sm leading-6 text-slate-500">{exercise.description}</p>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onAskTeacher(askTeacherContext)}
        >
          <MessageSquareText className="h-4 w-4" />
          <span>Ask Teacher</span>
        </Button>
      </div>

      {exercise.content.question.trim() ? (
        <p className="mt-4 text-sm leading-6 text-slate-700">{exercise.content.question}</p>
      ) : null}

      <div className="mt-5 rounded-xl border border-slate-200 bg-[#f8fafc]">
        {hasInlineInput ? (
          <div className="overflow-x-auto px-4 py-4 font-mono text-sm leading-7 text-slate-700">
            {initialCodeParts.map((part, index) =>
              WRITE_CODE_SLOT_FRAGMENT_PATTERN.test(part) ? (
                <span
                  key={`exercise-inline-slot-${index}`}
                  className="mx-1 inline-flex min-w-[8rem] translate-y-[0.15rem] items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
                >
                  <input
                    value={writeCodeValue}
                    onChange={(event) => {
                      setWriteCodeValue(event.target.value);
                      setResult(null);
                    }}
                    className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                    placeholder={`Answer ${++inlineSlotIndex}`}
                  />
                </span>
              ) : (
                <span key={`exercise-inline-code-${index}`} className="whitespace-pre-wrap">
                  {part}
                </span>
              )
            )}
          </div>
        ) : (
          <textarea
            value={writeCodeValue}
            onChange={(event) => {
              setWriteCodeValue(event.target.value);
              setResult(null);
            }}
            className="min-h-[15rem] w-full rounded-xl bg-transparent px-4 py-4 font-mono text-sm leading-6 text-slate-700 outline-none"
            spellCheck={false}
          />
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={() => {
              const normalizedInput = normalizeWriteCodeValue(
                writeCodeValue,
                writeCodeContent.match_mode
              );
              const isCorrect = normalizedInput === expectedAnswer;

              if (isCorrect) {
                onResolved(exercise.id);
              }

              setResult(isCorrect ? "correct" : "incorrect");
            }}
            disabled={!writeCodeValue.trim()}
          >
            Check Answer
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setWriteCodeValue(getInitialWriteCodeValue(exercise));
              setResult(null);
            }}
          >
            Try Again
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setWriteCodeValue(writeCodeContent.expected_answer);
              setResult("revealed");
              onResolved(exercise.id);
            }}
          >
            Show Answer
          </Button>
        </div>

        {feedbackLabel ? (
          <p className="text-sm font-medium text-slate-600">{feedbackLabel}</p>
        ) : null}
      </div>

      {result === "revealed" ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Answer
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-6 text-slate-700">
            {writeCodeContent.expected_answer}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
