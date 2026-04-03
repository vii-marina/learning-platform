import { useEffect, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import type { AiQuestionGenerationMode, Lesson, Module } from "../../api";
import type { CourseTest, CourseTestQuestion } from "./courseBuilderUiTypes";
import type { CreateContentMode } from "./courseBuilderPageUtils";
import { hasMeaningfulTestQuestionDraft } from "./courseBuilderPageUtils";
import { CourseStructureSidebar } from "./CourseStructureSidebar";
import { TestQuestionEditor } from "./TestQuestionEditor";

type TestCreateModalProps = {
  isOpen: boolean;
  initialMode?: CreateContentMode | null;
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
  aiGenerationMode: AiQuestionGenerationMode;
  aiQuestionCount: number;
  maxAiQuestionCount: number;
  canGenerateAi: boolean;
  isGeneratingAi?: boolean;
  onClose: () => void;
  onSave: () => void;
  onGenerateAi: () => Promise<boolean>;
  onAiGenerationModeChange: (value: AiQuestionGenerationMode) => void;
  onAiQuestionCountChange: (value: number) => void;
  onAfterLessonChange: (lessonId: string | null) => void;
  onAddQuestion: () => void;
  onQuestionChange: (questionId: string, nextQuestion: CourseTestQuestion) => void;
  onDeleteQuestion: (questionId: string) => void;
};

type TestCreateMode = CreateContentMode | null;

const aiGenerationModeOptions: Array<{
  value: AiQuestionGenerationMode;
  label: string;
}> = [
  { value: "true_false", label: "True / False" },
  { value: "single_choice", label: "One Correct Answer" },
  { value: "multiple_choice", label: "Multiple Correct Answers" },
  { value: "mixed", label: "Mixed" },
];

export function TestCreateModal({
  isOpen,
  initialMode = null,
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
  aiGenerationMode,
  aiQuestionCount,
  maxAiQuestionCount,
  canGenerateAi,
  isGeneratingAi = false,
  onClose,
  onSave,
  onGenerateAi,
  onAiGenerationModeChange,
  onAiQuestionCountChange,
  onAfterLessonChange,
  onAddQuestion,
  onQuestionChange,
  onDeleteQuestion,
}: TestCreateModalProps) {
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [mode, setMode] = useState<TestCreateMode>(null);
  const [showAiQuestions, setShowAiQuestions] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setMode(null);
      setShowAiQuestions(false);
      return;
    }

    if (activeTestId || hasMeaningfulTestQuestionDraft(questions)) {
      setMode("manual");
      setShowAiQuestions(false);
      return;
    }

    setMode(initialMode);
    setShowAiQuestions(false);
  }, [activeTestId, initialMode, isOpen, questions]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (selectedAfterLessonId) {
      setPreviewLessonId(selectedAfterLessonId);
      return;
    }

    setPreviewLessonId((currentValue) => {
      if (currentValue && lessons.some((lesson) => lesson.id === currentValue)) {
        return currentValue;
      }

      return lessons[0]?.id ?? null;
    });
  }, [isOpen, lessons, selectedAfterLessonId]);

  if (!isOpen) {
    return null;
  }

  const title =
    mode === "ai"
      ? "Generate Questions with AI"
      : heading;

  const handlePlacementChange = (lessonId: string | null) => {
    onAfterLessonChange(lessonId);

    if (mode === "ai") {
      setShowAiQuestions(false);
    }
  };

  const handleGenerateAi = async () => {
    const didGenerate = await onGenerateAi();

    if (didGenerate) {
      setShowAiQuestions(true);
    }
  };

  const handleAiGenerationModeChange = (value: AiQuestionGenerationMode) => {
    onAiGenerationModeChange(value);
    setShowAiQuestions(false);
  };

  const placementControls = (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => handlePlacementChange(null)}
        className={`h-12 w-full rounded-2xl border px-5 text-sm font-semibold transition ${
          selectedAfterLessonId === null
            ? "border-[#8b5cf6] bg-[#8b5cf6] text-white"
            : "border-slate-200 bg-[#f9fbfd] text-slate-700 hover:border-[#a78bfa]/40 hover:bg-[#f5f3ff]"
        }`}
        disabled={isSaving}
      >
        This Module
      </button>

      <select
        value={selectedAfterLessonId ?? ""}
        onChange={(event) => handlePlacementChange(event.target.value || null)}
        disabled={lessons.length === 0 || isSaving}
        className={`h-12 w-full rounded-2xl border px-4 text-sm font-semibold outline-none transition ${
          selectedAfterLessonId !== null
            ? "border-[#8b5cf6] bg-[#f5f3ff] text-[#6d28d9]"
            : "border-slate-200 bg-white text-slate-700 focus:border-[#a78bfa] focus:ring-4 focus:ring-[#8b5cf6]/15"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <option value="" disabled>
          {lessons.length === 0 ? "No lessons available" : "Select lesson"}
        </option>
        {lessons.map((lesson) => (
          <option key={lesson.id} value={lesson.id}>
            {`${lesson.order}. ${lesson.title}`}
          </option>
        ))}
      </select>
    </div>
  );

  const questionList = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAddQuestion}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#c4b5fd]/60 bg-white px-5 text-sm font-semibold text-[#7c3aed] transition hover:bg-[#f5f3ff]"
          disabled={isSaving}
        >
          <Plus className="h-4 w-4" />
          <span>Add Question</span>
        </button>
      </div>

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
  );

  const modeChoice = (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => setMode("ai")}
        className="inline-flex h-12 items-center gap-3 rounded-2xl bg-gradient-to-r from-[#a78bfa] via-[#8b5cf6] to-[#6d28d9] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(109,40,217,0.18)] transition hover:translate-y-[-1px] hover:shadow-[0_16px_28px_rgba(109,40,217,0.24)]"
      >
        <Sparkles className="h-4 w-4" />
        <span>Generate Questions with AI</span>
      </button>

      <button
        type="button"
        onClick={() => setMode("manual")}
        className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-[#14213d] transition hover:border-slate-300 hover:bg-slate-50"
      >
        Create Test Manually
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-h-[94vh] w-full max-w-[98rem] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
        <CourseStructureSidebar
          courseTitle={courseTitle}
          modules={modules}
          lessonsByModule={lessonsByModule}
          testsByModule={testsByModule}
          restrictToActiveModule
          activeModuleId={activeModuleId}
          activeTestId={activeTestId}
          selectedAfterLessonId={selectedAfterLessonId}
          previewLessonId={previewLessonId}
          showTestSourcePreview
          onSelectPreviewLesson={setPreviewLessonId}
        />

        <div className="relative flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close test modal"
            className="absolute right-6 top-6 z-10 rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="border-b border-slate-200 px-8 py-6 pr-24">
            <h3 className="text-3xl font-extrabold tracking-tight text-[#14213d]">
              {title}
            </h3>

          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            {mode === null ? (
              modeChoice
            ) : (
              <div className="space-y-6">
                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
                  <h6 className="text-2xl font-bold tracking-tight text-[#14213d]">
                    Place this test after:
                  </h6>
                  {placementControls}
                </section>

                {mode === "ai" ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {aiGenerationModeOptions.map((option) => {
                        const isActive = aiGenerationMode === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleAiGenerationModeChange(option.value)}
                            disabled={isSaving || isGeneratingAi}
                            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
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

                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={aiQuestionCount}
                        onChange={(event) =>
                          onAiQuestionCountChange(Number(event.target.value))
                        }
                        disabled={isSaving || isGeneratingAi || maxAiQuestionCount === 0}
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-[#14213d] outline-none transition focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/15"
                      >
                        {Array.from(
                          { length: Math.max(maxAiQuestionCount, 1) },
                          (_, index) => {
                            const value = index + 1;

                            return (
                              <option key={value} value={value}>
                                {`${value} question${value === 1 ? "" : "s"}`}
                              </option>
                            );
                          }
                        )}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          void handleGenerateAi();
                        }}
                        disabled={!canGenerateAi || isSaving || isGeneratingAi}
                        className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#6d28d9] px-6 text-sm font-bold text-white transition hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isGeneratingAi ? "Generating..." : "Generate"}
                      </button>
                    </div>

                    {showAiQuestions ? questionList : null}
                  </>
                ) : (
                  questionList
                )}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-8 py-5">
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
                className="h-11 rounded-2xl bg-[#6d28d9] px-5 text-sm font-bold text-white hover:bg-[#5b21b6]"
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
