import { Plus, X } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import type { Lesson } from "../../api";
import type { CourseTestQuestion } from "./courseBuilderUiTypes";
import { TestQuestionEditor } from "./TestQuestionEditor";

type TestCreateModalProps = {
  isOpen: boolean;
  heading?: string;
  saveLabel?: string;
  title: string;
  lessons: Lesson[];
  selectedAfterLessonId: string | null;
  questions: CourseTestQuestion[];
  canSave: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: () => void;
  onTitleChange: (value: string) => void;
  onAfterLessonChange: (lessonId: string | null) => void;
  onAddQuestion: () => void;
  onQuestionChange: (questionId: string, nextQuestion: CourseTestQuestion) => void;
  onDeleteQuestion: (questionId: string) => void;
};

export function TestCreateModal({
  isOpen,
  heading = "Create Test",
  saveLabel = "Save Test",
  title,
  lessons,
  selectedAfterLessonId,
  questions,
  canSave,
  isSaving = false,
  onClose,
  onSave,
  onTitleChange,
  onAfterLessonChange,
  onAddQuestion,
  onQuestionChange,
  onDeleteQuestion,
}: TestCreateModalProps) {
  if (!isOpen) {
    return null;
  }

  const modulePlacementLabel = "This Module";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold text-slate-900">{heading}</h3>
          <button type="button" onClick={onClose} aria-label="Close test modal">
            <X className="h-6 w-6 text-slate-900" />
          </button>
        </div>

        <div className="mt-6">
          <label className="text-base font-semibold text-slate-900">Test Title *</label>
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="New Test"
            className="mt-2 h-11 rounded-xl border-0 bg-slate-100 px-4 text-base"
            autoFocus
          />
        </div>

        <div className="mt-6">
          <label className="text-base font-semibold text-slate-900">Add this test after:</label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAfterLessonChange(null)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                selectedAfterLessonId === null
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200"
              }`}
            >
              {modulePlacementLabel}
            </button>

            {lessons.map((lesson, index) => {
              const isActive = selectedAfterLessonId === lesson.id;

              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => onAfterLessonChange(lesson.id)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {`Lesson ${index + 1}`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-2xl font-semibold text-slate-900">Questions</h4>
            <Button onClick={onAddQuestion}>
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Question
              </span>
            </Button>
          </div>

          <div className="mt-5 space-y-4">
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
        </div>

        <div className="mt-8 border-t border-slate-200 pt-5">
          <div className="flex justify-end gap-4">
            <Button
              variant="secondary"
              onClick={onClose}
              className="rounded-xl px-5 py-2 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={!canSave || isSaving}
              className="rounded-xl bg-blue-600 px-5 py-2 text-base text-white hover:bg-blue-700"
            >
              {isSaving ? "Saving..." : saveLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
