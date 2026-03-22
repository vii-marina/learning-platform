import { Plus, X } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import type { Lesson, Module } from "../../api";
import type { CourseTest, CourseTestQuestion } from "./courseBuilderUiTypes";
import { CourseStructureSidebar } from "./CourseStructureSidebar";
import { TestQuestionEditor } from "./TestQuestionEditor";

type TestCreateModalProps = {
  isOpen: boolean;
  heading?: string;
  saveLabel?: string;
  courseTitle: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  activeModuleId: string | null;
  activeTestId?: string | null;
  lessons: Lesson[];
  selectedAfterLessonId: string | null;
  questions: CourseTestQuestion[];
  canSave: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: () => void;
  onAfterLessonChange: (lessonId: string | null) => void;
  onAddQuestion: () => void;
  onQuestionChange: (questionId: string, nextQuestion: CourseTestQuestion) => void;
  onDeleteQuestion: (questionId: string) => void;
};

export function TestCreateModal({
  isOpen,
  heading = "Create Test",
  saveLabel = "Save Test",
  courseTitle,
  modules,
  lessonsByModule,
  testsByModule,
  activeModuleId,
  activeTestId = null,
  lessons,
  selectedAfterLessonId,
  questions,
  canSave,
  isSaving = false,
  onClose,
  onSave,
  onAfterLessonChange,
  onAddQuestion,
  onQuestionChange,
  onDeleteQuestion,
}: TestCreateModalProps) {
  if (!isOpen) {
    return null;
  }

  const modulePlacementLabel = "This Module";
  const activeModule = modules.find((module) => module.id === activeModuleId) || null;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-h-[94vh] w-full max-w-[92rem] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
        <CourseStructureSidebar
          courseTitle={courseTitle}
          modules={modules}
          lessonsByModule={lessonsByModule}
          testsByModule={testsByModule}
          activeModuleId={activeModuleId}
          activeTestId={activeTestId}
          selectedAfterLessonId={selectedAfterLessonId}
          showModulePlacementHint
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h3 className="mt-1 text-3xl font-extrabold tracking-tight text-[#14213d]">
                {heading}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {activeModule
                  ? `Inside Module ${activeModule.order}: ${activeModule.title}.`
                  : "Choose placement and build one or more questions below."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close test modal"
              className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-8">
              <div>
                <label className="text-sm font-semibold text-[#14213d]">
                  Place This Test After
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onAfterLessonChange(null)}
                    className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                      selectedAfterLessonId === null
                        ? "border-[#13daec] bg-[#13daec] text-[#0f172a]"
                        : "border-slate-200 bg-[#f9fbfd] text-slate-700 hover:border-[#13daec]/30 hover:bg-[#13daec]/5"
                    }`}
                    disabled={isSaving}
                  >
                    {modulePlacementLabel}
                  </button>

                  {lessons.map((lesson) => {
                    const isActive = selectedAfterLessonId === lesson.id;

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => onAfterLessonChange(lesson.id)}
                        className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? "border-[#13daec] bg-[#13daec] text-[#0f172a]"
                            : "border-slate-200 bg-[#f9fbfd] text-slate-700 hover:border-[#13daec]/30 hover:bg-[#13daec]/5"
                        }`}
                        disabled={isSaving}
                      >
                        {`${lesson.order}. ${lesson.title}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h4 className="text-2xl font-bold tracking-tight text-[#14213d]">
                      Questions
                    </h4>
                  </div>
                  <Button
                    onClick={onAddQuestion}
                    className="h-11 rounded-2xl bg-[#13daec] px-5 text-sm font-bold text-[#0f172a] hover:bg-[#10c6d7]"
                    disabled={isSaving}
                  >
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
              </section>
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
                onClick={onSave}
                disabled={!canSave || isSaving}
                className="h-11 rounded-2xl bg-[#13daec] px-5 text-sm font-bold text-[#0f172a] hover:bg-[#10c6d7]"
              >
                {isSaving ? "Saving..." : saveLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
