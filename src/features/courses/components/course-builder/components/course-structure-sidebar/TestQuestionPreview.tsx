import type { CourseTestQuestion } from "../../types/courseBuilderUiTypes";
import { studentQuestionTypeLabels } from "../../lib/courseBuilderPageUtils";

type TestQuestionPreviewProps = {
  questions: CourseTestQuestion[];
};

export function TestQuestionPreview({ questions }: TestQuestionPreviewProps) {
  if (questions.length === 0) {
    return (
      <p className="text-sm leading-6 text-slate-500">
        This test does not have any questions yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <div
          key={question.id}
          className="rounded-[1rem] border border-[#ede9fe] bg-[#faf7ff] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d8b4fe] bg-[#f5f3ff] text-sm font-bold text-[#7c3aed]">
                {index + 1}
              </div>
              <p className="min-w-0 whitespace-pre-wrap pt-0.5 text-sm font-semibold leading-6 text-[#14213d]">
                {question.questionText.trim() || `Question ${index + 1}`}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[#ddd6fe] bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-700">
              {studentQuestionTypeLabels[question.type]}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {(question.type === "true_false"
              ? ["True", "False"]
              : question.options
            ).map((option, optionIndex) => {
              const isCorrect = question.correctOptionIndexes.includes(optionIndex);

              return (
                <div
                  key={`${question.id}-${optionIndex}`}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                    isCorrect
                      ? "border-[#d8b4fe] bg-[#f5f3ff] text-violet-800"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center border border-[#c4b5fd] ${
                      question.type === "multiple_choice"
                        ? "rounded-[4px]"
                        : "rounded-full"
                    } ${isCorrect ? "bg-[#8b5cf6]" : "bg-white"}`}
                  />
                  <span className="min-w-0 flex-1">{option}</span>
                </div>
              );
            })}
          </div>

          {question.hint?.trim() ? (
            <div className="mt-4 rounded-xl border border-[#ede9fe] bg-white px-4 py-3 text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-700">Підказка:</span>{" "}
              {question.hint.trim()}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
