import { useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "../../../../components/ui/input";
import type { TestQuestionType } from "../../api";
import type { CourseTestQuestion } from "./courseBuilderUiTypes";

type TestQuestionEditorProps = {
  question: CourseTestQuestion;
  index: number;
  canDelete: boolean;
  onChange: (questionId: string, nextQuestion: CourseTestQuestion) => void;
  onDelete: (questionId: string) => void;
};

const questionTypeOptions: { value: TestQuestionType; label: string }[] = [
  { value: "true_false", label: "True/False" },
  { value: "single_choice", label: "Multiple Choice (Single)" },
  { value: "multiple_choice", label: "Multiple Choice (Multiple)" },
];

const surfaceFieldClassName =
  "mt-2 w-full rounded-xl border border-transparent bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-200 focus:ring-4 focus:ring-violet-50";
const questionIndexClassName =
  "flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-white px-2 text-xs font-semibold text-violet-700 shadow-[0_8px_18px_rgba(139,92,246,0.08)]";
const iconButtonClassName =
  "rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300";
const answerOptionFieldClassName =
  "h-11 rounded-xl border-transparent bg-white px-4 text-sm text-[#14213d] shadow-none focus:border-violet-200 focus:ring-4 focus:ring-violet-50";

function reindexCorrectAnswers(correctOptionIndexes: number[], removedIndex: number) {
  return correctOptionIndexes
    .filter((index) => index !== removedIndex)
    .map((index) => (index > removedIndex ? index - 1 : index));
}

function resizeQuestionTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "0px";

  const computedStyle = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 24;
  const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
  const maxHeight = lineHeight * 2 + paddingTop + paddingBottom;
  const nextHeight = Math.min(textarea.scrollHeight, maxHeight);

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}

export function TestQuestionEditor({
  question,
  index,
  canDelete,
  onChange,
  onDelete,
}: TestQuestionEditorProps) {
  const isTrueFalse = question.type === "true_false";
  const isSingleChoice = question.type === "single_choice";
  const questionTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (questionTextareaRef.current) {
      resizeQuestionTextarea(questionTextareaRef.current);
    }
  }, [question.questionText]);

  const handleTypeChange = (value: TestQuestionType) => {
    if (value === question.type) {
      return;
    }

    if (value === "true_false") {
      onChange(question.id, {
        ...question,
        type: value,
        options: ["True", "False"],
        correctOptionIndexes: [],
      });
      return;
    }

    if (question.type === "true_false") {
      onChange(question.id, {
        ...question,
        type: value,
        options: ["Option 1", "Option 2"],
        correctOptionIndexes: [],
      });
      return;
    }

    onChange(question.id, {
      ...question,
      type: value,
      correctOptionIndexes:
        value === "single_choice"
          ? question.correctOptionIndexes.slice(0, 1)
          : question.correctOptionIndexes,
    });
  };

  const handleOptionTextChange = (optionIndex: number, value: string) => {
    const nextOptions = [...question.options];
    nextOptions[optionIndex] = value;
    onChange(question.id, { ...question, options: nextOptions });
  };

  const handleToggleCorrectOption = (optionIndex: number) => {
    if (isSingleChoice) {
      onChange(question.id, { ...question, correctOptionIndexes: [optionIndex] });
      return;
    }

    const exists = question.correctOptionIndexes.includes(optionIndex);
    onChange(question.id, {
      ...question,
      correctOptionIndexes: exists
        ? question.correctOptionIndexes.filter((index) => index !== optionIndex)
        : [...question.correctOptionIndexes, optionIndex],
    });
  };

  const handleAddOption = () => {
    onChange(question.id, {
      ...question,
      options: [...question.options, `Option ${question.options.length + 1}`],
    });
  };

  const handleRemoveOption = (optionIndex: number) => {
    const nextOptions = question.options.filter((_, index) => index !== optionIndex);
    onChange(question.id, {
      ...question,
      options: nextOptions,
      correctOptionIndexes: reindexCorrectAnswers(question.correctOptionIndexes, optionIndex),
    });
  };

  return (
    <div className="rounded-[1.25rem] border border-violet-200 bg-slate-50 p-4 shadow-[0_14px_30px_rgba(139,92,246,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <span className={questionIndexClassName}>{index + 1}</span>
        <button
          type="button"
          onClick={() => onDelete(question.id)}
          aria-label={`Delete question ${index + 1}`}
          disabled={!canDelete}
          className={iconButtonClassName}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label className="text-sm font-semibold text-[#14213d]">Type</label>
          <div className="mt-2 grid gap-2 rounded-2xl bg-white/80 p-1 sm:grid-cols-3">
            {questionTypeOptions.map((option) => {
              const isActive = question.type === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTypeChange(option.value)}
                  className={`rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-violet-50 text-violet-700 shadow-[0_8px_20px_rgba(139,92,246,0.12)]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-[#14213d]">Text</label>
          <textarea
            ref={questionTextareaRef}
            rows={1}
            value={question.questionText}
            onChange={(event) => {
              resizeQuestionTextarea(event.target);
              onChange(question.id, { ...question, questionText: event.target.value });
            }}
            placeholder="Enter your question here..."
            className={`${surfaceFieldClassName} resize-none`}
          />
        </div>

        {isTrueFalse ? (
          <div>
            <label className="text-sm font-semibold text-[#14213d]">Correct Answer</label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  onChange(question.id, {
                    ...question,
                    correctOptionIndexes: [0],
                  })
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  question.correctOptionIndexes.includes(0)
                    ? "bg-emerald-200 text-emerald-950 shadow-[0_8px_20px_rgba(16,185,129,0.14)]"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                True
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(question.id, {
                    ...question,
                    correctOptionIndexes: [1],
                  })
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  question.correctOptionIndexes.includes(1)
                    ? "bg-rose-200 text-rose-950 shadow-[0_8px_20px_rgba(244,63,94,0.14)]"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                False
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-sm font-semibold text-[#14213d]">Answer Options</label>
            <div className="mt-2 space-y-3">
              {question.options.map((option, optionIndex) => (
                <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-3">
                  <input
                    type={isSingleChoice ? "radio" : "checkbox"}
                    name={`question-${question.id}-correct`}
                    checked={question.correctOptionIndexes.includes(optionIndex)}
                    onChange={() => handleToggleCorrectOption(optionIndex)}
                    className="h-4 w-4 accent-violet-600"
                  />
                  <Input
                    value={option}
                    onChange={(event) =>
                      handleOptionTextChange(optionIndex, event.target.value)
                    }
                    placeholder={`Option ${optionIndex + 1}`}
                    className={answerOptionFieldClassName}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(optionIndex)}
                    aria-label={`Remove option ${optionIndex + 1}`}
                    disabled={question.options.length <= 2}
                    className={iconButtonClassName}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddOption}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Plus className="h-4 w-4 text-violet-600" />
              Add option
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
