import { Plus, Trash2 } from "lucide-react";
import { Input } from "../../../../components/ui/Input";
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

function reindexCorrectAnswers(correctOptionIndexes: number[], removedIndex: number) {
  return correctOptionIndexes
    .filter((index) => index !== removedIndex)
    .map((index) => (index > removedIndex ? index - 1 : index));
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
    <div className="rounded-[1.5rem] border border-slate-200 bg-[#f9fbfd] p-6">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-[#14213d]">
          {`Question ${index + 1}`}
        </div>
        <button
          type="button"
          onClick={() => onDelete(question.id)}
          aria-label={`Delete question ${index + 1}`}
          disabled={!canDelete}
          className="rounded-xl p-1.5 text-slate-500 transition hover:bg-white hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-base font-semibold text-[#14213d]">Type</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {questionTypeOptions.map((option) => {
              const isActive = question.type === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTypeChange(option.value)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border-[#8b5cf6] bg-[#8b5cf6] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[#a78bfa]/40 hover:bg-[#f5f3ff]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-base font-semibold text-[#14213d]">Text</label>
          <textarea
            value={question.questionText}
            onChange={(event) =>
              onChange(question.id, { ...question, questionText: event.target.value })
            }
            placeholder="Enter your question here..."
            className="mt-2 h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 outline-none transition focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/15"
          />
        </div>

        {isTrueFalse ? (
          <div>
            <label className="text-base font-semibold text-[#14213d]">Correct Answer</label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  onChange(question.id, {
                    ...question,
                    correctOptionIndexes: [0],
                  })
                }
                className={`rounded-2xl border px-4 py-3 text-base font-semibold transition ${
                  question.correctOptionIndexes.includes(0)
                    ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                    : "border-emerald-100 bg-emerald-50 text-emerald-700"
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
                className={`rounded-2xl border px-4 py-3 text-base font-semibold transition ${
                  question.correctOptionIndexes.includes(1)
                    ? "border-rose-400 bg-rose-100 text-rose-800"
                    : "border-rose-100 bg-rose-50 text-rose-700"
                }`}
              >
                False
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-base font-semibold text-[#14213d]">Answer Options</label>
            <div className="mt-2 space-y-3">
              {question.options.map((option, optionIndex) => (
                <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-3">
                  <input
                    type={isSingleChoice ? "radio" : "checkbox"}
                    name={`question-${question.id}-correct`}
                    checked={question.correctOptionIndexes.includes(optionIndex)}
                    onChange={() => handleToggleCorrectOption(optionIndex)}
                    className="h-4 w-4"
                  />
                  <Input
                    value={option}
                    onChange={(event) =>
                      handleOptionTextChange(optionIndex, event.target.value)
                    }
                    placeholder={`Option ${optionIndex + 1}`}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-base text-[#14213d] focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/15"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(optionIndex)}
                    aria-label={`Remove option ${optionIndex + 1}`}
                    disabled={question.options.length <= 2}
                    className="rounded-xl p-1.5 text-slate-500 transition hover:bg-white hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddOption}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#c4b5fd]/60 bg-white px-4 py-2 text-sm font-medium text-[#7c3aed] transition hover:bg-[#f5f3ff]"
            >
              <Plus className="h-4 w-4" />
              Add option
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
