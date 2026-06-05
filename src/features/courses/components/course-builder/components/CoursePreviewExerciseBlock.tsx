import { useEffect,  useState } from "react";
import { Code2  } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { Lesson, Module } from "../../../api/index";
import type { CourseExercise } from "../types/courseBuilderUiTypes";
import type { CoursePreviewChatContext } from "./CoursePreviewAskTeacherModal";

type CoursePreviewExerciseBlockProps = {
  module: Module;
  lesson: Lesson;
  exercise: CourseExercise;
  isGenerated: boolean;
  isHighlighted: boolean;
  onAskTeacher: (context: CoursePreviewChatContext) => void;
  onResolved: (exerciseId: string) => Promise<void> | void;
};

const DRAG_DROP_SLOT_PATTERN = /(___|{{blank_\d+}})/g;
const DRAG_DROP_SLOT_FRAGMENT_PATTERN = /^(___|{{blank_\d+}})$/;
const WRITE_CODE_SLOT_PATTERN = /(___|{{blank_\d+}}|{{answer}})/g;
const WRITE_CODE_SLOT_FRAGMENT_PATTERN = /^(___|{{blank_\d+}}|{{answer}})$/;

function hasWriteCodeSlot(template: string) {
  return template.match(WRITE_CODE_SLOT_PATTERN) !== null;
}

function getExerciseTypeLabel(exercise: CourseExercise) {
  return exercise.type === "drag_drop_code" ? "Заповнити пропуски в коді" : "Написати код";
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


  exercise,
  isGenerated,
  isHighlighted,
  onResolved,
}: CoursePreviewExerciseBlockProps) {
  const [activeBlankIndex, setActiveBlankIndex] = useState<number | null>(null);
  const [dragDropSelections, setDragDropSelections] = useState<string[]>([]);
  const [result, setResult] = useState<"correct" | "incorrect" | "revealed" | null>(null);
  const [writeCodeValue, setWriteCodeValue] = useState(getInitialWriteCodeValue(exercise));
  const exerciseTypeLabel = getExerciseTypeLabel(exercise);
  const showExerciseTitle =
    exercise.title.trim().length > 0 &&
    exercise.title.trim().toLowerCase() !== exerciseTypeLabel.toLowerCase();
  const accentButtonClassName =
    "border-orange-500 bg-orange-500 text-white hover:border-orange-400 hover:bg-orange-400";
  const secondaryButtonClassName =
    "border-orange-200 text-orange-800 hover:border-orange-300 hover:bg-orange-50";
  const ghostButtonClassName = "text-orange-700 hover:bg-orange-50 hover:text-orange-900";

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

  

  const feedbackLabel =
    result === "correct"
      ? "Усе правильно."
      : result === "incorrect"
        ? "Відповідь неправильна."
        : result === "revealed"
          ? "Відповідь показано."
          : null;
  const feedbackClassName =
    result === "correct"
      ? "text-emerald-700"
      : result === "incorrect"
        ? "text-rose-700"
        : "text-orange-700";

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
            ? "border-orange-300 shadow-[0_0_0_4px_rgba(251,146,60,0.12)]"
            : "border-slate-200"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                <Code2 className="h-3.5 w-3.5" />
                <span>{exerciseTypeLabel}</span>
              </span>
              {isGenerated ? (
                <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-600">
                  AI-практика
                </span>
              ) : null}
            </div>
            <div>
              {showExerciseTitle ? (
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                  {exercise.title}
                </h3>
              ) : null}
              {exercise.description?.trim() ? (
                <p className={`${showExerciseTitle ? "mt-2" : ""} text-sm leading-6 text-slate-500`}>
                  {exercise.description}
                </p>
              ) : null}
            </div>
          </div>

          
        </div>

        {exercise.content.question.trim() ? (
          <p className="mt-4 text-sm leading-6 text-slate-700">{exercise.content.question}</p>
        ) : null}

        <div className="mt-5 overflow-x-auto rounded-[1.25rem] border border-slate-800 bg-[#0f172a] px-4 py-4 font-mono text-sm leading-7 text-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
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
                    ? "border-orange-300 bg-white text-[#14213d]"
                    : "border-white/20 bg-white/90 text-[#14213d] hover:border-orange-200"
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
                className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
              >
                {token}
              </button>
            ))
          ) : (
            <span className="text-sm text-slate-400">
              Додайте токени в конструкторі, щоб переглянути взаємодію студента.
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="accent"
              size="sm"
              className={accentButtonClassName}
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
              Перевірити відповідь
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={secondaryButtonClassName}
              onClick={() => {
                setDragDropSelections(Array.from({ length: correctAnswer.length }, () => ""));
                setActiveBlankIndex(correctAnswer.length > 0 ? 0 : null);
                setResult(null);
              }}
            >
              Спробувати ще раз
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={ghostButtonClassName}
              onClick={() => {
                setDragDropSelections(correctAnswer);
                setActiveBlankIndex(null);
                setResult("revealed");
                onResolved(exercise.id);
              }}
            >
              Показати відповідь
            </Button>
          </div>

          {feedbackLabel ? (
            <p className={`text-sm font-semibold ${feedbackClassName}`}>{feedbackLabel}</p>
          ) : null}
        </div>

        {result === "revealed" ? (
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/40 px-4 py-4">
            <p className="text-xs font-semibold text-orange-600">
              Відповідь
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {correctAnswer.map((token, index) => (
                <span
                  key={`${exercise.id}-${index}`}
                  className="rounded-full border border-orange-200 bg-white px-3 py-1 text-sm font-medium text-orange-800"
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
          ? "border-orange-300 shadow-[0_0_0_4px_rgba(251,146,60,0.12)]"
          : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <Code2 className="h-3.5 w-3.5" />
              <span>{exerciseTypeLabel}</span>
            </span>
            {isGenerated ? (
              <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-600">
                AI-практика
              </span>
            ) : null}
          </div>
          <div>
            {showExerciseTitle ? (
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                {exercise.title}
              </h3>
            ) : null}
            {exercise.description?.trim() ? (
              <p className={`${showExerciseTitle ? "mt-2" : ""} text-sm leading-6 text-slate-500`}>
                {exercise.description}
              </p>
            ) : null}
          </div>
        </div>

        
      </div>

      {exercise.content.question.trim() ? (
        <p className="mt-4 text-sm leading-6 text-slate-700">{exercise.content.question}</p>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-slate-800 bg-[#0f172a] shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
        {hasInlineInput ? (
          <div className="overflow-x-auto px-4 py-4 font-mono text-sm leading-7 text-slate-100">
            {initialCodeParts.map((part, index) =>
              WRITE_CODE_SLOT_FRAGMENT_PATTERN.test(part) ? (
                <span
                  key={`exercise-inline-slot-${index}`}
                  className="mx-1 inline-flex min-w-[8rem] translate-y-[0.15rem] items-center rounded-lg border border-orange-200 bg-white px-2.5 py-1.5"
                >
                  <input
                    value={writeCodeValue}
                    onChange={(event) => {
                      setWriteCodeValue(event.target.value);
                      setResult(null);
                    }}
                    className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                    placeholder={`Відповідь ${++inlineSlotIndex}`}
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
            className="min-h-[15rem] w-full rounded-[1.25rem] bg-slate-950 px-4 py-4 font-mono text-sm leading-6 text-slate-100 outline-none"
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
            className={accentButtonClassName}
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
            Перевірити відповідь
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={secondaryButtonClassName}
            onClick={() => {
              setWriteCodeValue(getInitialWriteCodeValue(exercise));
              setResult(null);
            }}
          >
            Спробувати ще раз
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={ghostButtonClassName}
            onClick={() => {
              setWriteCodeValue(writeCodeContent.expected_answer);
              setResult("revealed");
              onResolved(exercise.id);
            }}
          >
            Показати відповідь
          </Button>
        </div>

        {feedbackLabel ? (
          <p className={`text-sm font-semibold ${feedbackClassName}`}>{feedbackLabel}</p>
        ) : null}
      </div>

      {result === "revealed" ? (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/40 px-4 py-4">
          <p className="text-sm font-semibold text-orange-600">
            Відповідь
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-950 px-4 py-4 font-mono text-sm leading-6 text-slate-100">
            {writeCodeContent.expected_answer}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
