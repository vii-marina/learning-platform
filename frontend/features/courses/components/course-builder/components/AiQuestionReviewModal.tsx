import { useId } from "react";
import { Modal } from "../../../../../components/ui/Modal";
import { Plus, Sparkles, X } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { CourseTestQuestion } from "../types/courseBuilderUiTypes";
import { TestQuestionEditor } from "./TestQuestionEditor";
import { canSaveTestDraft } from "../lib/courseBuilderPageUtils";

type AiQuestionReviewModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  questions: CourseTestQuestion[];
  onClose: () => void;
  onApply: () => void;
  onAddQuestion: () => void;
  onQuestionChange: (questionId: string, nextQuestion: CourseTestQuestion) => void;
  onDeleteQuestion: (questionId: string) => void;
};

export function AiQuestionReviewModal({
  isOpen,
  title,
  description,
  questions,
  onClose,
  onApply,
  onAddQuestion,
  onQuestionChange,
  onDeleteQuestion,
}: AiQuestionReviewModalProps) {
  const headingId = useId();
  if (!isOpen) {
    return null;
  }

  const canApply = canSaveTestDraft(questions);

  return (
    <Modal
      isOpen
      onClose={onClose}
      labelledById={headingId}
      overlayClassName="z-[100]"
      panelClassName="mx-auto flex h-full max-h-[94vh] w-full max-w-[72rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.24)]"
    >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#13daec]/15 text-[#08bfd4]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 id={headingId} className="text-3xl font-extrabold tracking-tight text-[#14213d]">
                {title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити модальне вікно перегляду AI-запитань"
            className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-[#f9fbfd] p-5">
              <div>
                <h6 className="text-xl font-bold tracking-tight text-[#14213d]">
                  Generated Questions
                </h6>
                <p className="mt-1 text-sm text-slate-500">
                  Review the AI draft, edit anything you need, then apply it to the test
                  form.
                </p>
              </div>
              <Button
                onClick={onAddQuestion}
                className="h-11 rounded-2xl bg-[#13daec] px-5 text-sm font-bold text-[#0f172a] hover:bg-[#10c6d7]"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Question
                </span>
              </Button>
            </div>

            <div className="space-y-4">
              {questions.map((question, index) => (
                <TestQuestionEditor
                  key={question.id}
                  question={question}
                  index={index}
                  canDelete={questions.length > 1}
                  onChange={onQuestionChange}
                  onDelete={onDeleteQuestion}
                />
              ))}
            </div>

            {!canApply ? (
              <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Fill in all question texts, options, and correct answers before applying
                them to the test.
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-5">
          <div className="flex justify-end gap-4">
            <Button
              variant="secondary"
              onClick={onClose}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={onApply}
              disabled={!canApply}
              className="h-11 rounded-2xl bg-[#13daec] px-5 text-sm font-bold text-[#0f172a] hover:bg-[#10c6d7]"
            >
              Apply to Test
            </Button>
          </div>
        </div>
    </Modal>
  );
}
