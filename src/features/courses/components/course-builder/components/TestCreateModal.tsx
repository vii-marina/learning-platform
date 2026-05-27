import { useState } from "react";
import { Minus, PenSquare, Plus, Sparkles, X, BadgeCheck } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import type { AiQuestionGenerationMode, Lesson, Module } from "../../../api/index";
import type {
  CourseExercise,
  CourseTest,
  CourseTestQuestion,
} from "../types/courseBuilderUiTypes";
import type { CreateContentMode } from "../lib/courseBuilderPageUtils";
import { hasMeaningfulTestQuestionDraft } from "../lib/courseBuilderPageUtils";
import { CourseStructureSidebar } from "./CourseStructureSidebar";
import { TestQuestionEditor } from "./TestQuestionEditor";
import { aiQuestionGenerationModeOptions } from "./testQuestionTypeOptions";

type TestCreateModalProps = {
  isOpen: boolean;
  initialMode?: CreateContentMode | null;
  heading?: string;
  saveLabel?: string;
  courseTitle: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  exercisesByModule: Record<string, CourseExercise[]>;
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

export function TestCreateModal({
  isOpen,
  initialMode = null,
  heading = "Створити тест",
  saveLabel = "Зберегти тест",
  courseTitle,
  modules,
  lessonsByModule,
  testsByModule,
  exercisesByModule,
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
  const [manualPreviewLessonId, setManualPreviewLessonId] = useState<string | null>(null);
  const hasMeaningfulQuestions = hasMeaningfulTestQuestionDraft(questions);
  const initialResolvedMode: CreateContentMode | null =
    activeTestId || hasMeaningfulQuestions
      ? "manual"
      : initialMode ?? null;
  const [mode, setMode] = useState<CreateContentMode | null>(initialResolvedMode);
  const [showAiQuestions, setShowAiQuestions] = useState(false);
  const [aiQuestionCountLimitError, setAiQuestionCountLimitError] = useState(false);

  const previewLessonId =
    selectedAfterLessonId ??
    (manualPreviewLessonId && lessons.some((lesson) => lesson.id === manualPreviewLessonId)
      ? manualPreviewLessonId
      : null) ??
    lessons[0]?.id ??
    null;
  const isModeSelectionPending = mode === null;
  const controlsDisabled = isSaving || isModeSelectionPending;
  const canSaveCurrentMode =
    mode === "manual" ? canSave : mode === "ai" ? canSave && showAiQuestions : false;

  const sectionClassName = "rounded-xl border border-slate-200 bg-white px-5 py-4";
  const sectionStepClassName =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-violet-600";
  const stageTitleClassName = "text-base font-semibold text-slate-600";
  const surfaceControlClassName =
    "h-12 w-full rounded-xl border border-slate-200 bg-[#f9fbfd] px-4 text-sm text-[#14213d] outline-none transition placeholder:text-slate-400 focus:border-violet-200 focus:ring-4 focus:ring-violet-50 disabled:cursor-not-allowed disabled:opacity-60";
  const aiActionButtonClassName =
    "inline-flex h-10 items-center justify-center rounded-xl border border-violet-400 bg-violet-600 px-5 text-sm font-semibold text-white shadow-[0_0_18px_rgba(124,58,237,0.5),0_0_34px_rgba(139,92,246,0.24)] transition hover:bg-violet-700 hover:shadow-[0_0_22px_rgba(124,58,237,0.68),0_0_42px_rgba(139,92,246,0.32)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
  const showQuestionToolbar = mode === "manual" || showAiQuestions;
  const canAdjustAiQuestionCount =
    maxAiQuestionCount > 0 && !controlsDisabled && !isGeneratingAi;
  const aiQuestionInputValue = maxAiQuestionCount > 0 ? String(aiQuestionCount) : "0";

  if (!isOpen) {
    return null;
  }

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

  const handleAiQuestionCountChange = (value: number) => {
    onAiQuestionCountChange(value);
    setShowAiQuestions(false);
  };

  const applyAiQuestionCount = (nextValue: number, markLimitError = false) => {
    if (maxAiQuestionCount <= 0) {
      setAiQuestionCountLimitError(markLimitError);
      return;
    }

    const safeValue = Math.min(Math.max(nextValue, 1), maxAiQuestionCount);
    setAiQuestionCountLimitError(markLimitError || nextValue > maxAiQuestionCount);
    handleAiQuestionCountChange(safeValue);
  };

  const handleAiQuestionInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");

    if (!digitsOnly) {
      setAiQuestionCountLimitError(false);
      return;
    }

    const parsedValue = Number(digitsOnly);

    if (parsedValue > maxAiQuestionCount && maxAiQuestionCount > 0) {
      applyAiQuestionCount(maxAiQuestionCount, true);
      return;
    }

    applyAiQuestionCount(parsedValue);
  };

  const handleIncreaseAiQuestionCount = () => {
    if (!canAdjustAiQuestionCount) {
      return;
    }

    if (aiQuestionCount >= maxAiQuestionCount) {
      setAiQuestionCountLimitError(true);
      return;
    }

    applyAiQuestionCount(aiQuestionCount + 1);
  };

  const handleDecreaseAiQuestionCount = () => {
    if (!canAdjustAiQuestionCount) {
      return;
    }

    applyAiQuestionCount(aiQuestionCount - 1);
  };

  const placementControls = (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <button
        type="button"
        onClick={() => handlePlacementChange(null)}
        className={`h-12 w-full rounded-xl border px-4 text-sm font-medium transition ${
          selectedAfterLessonId === null
            ? "border-violet-200 bg-violet-50 text-violet-700"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
        disabled={controlsDisabled}
      >
        This Module
      </button>

      <select
        value={selectedAfterLessonId ?? ""}
        onChange={(event) => handlePlacementChange(event.target.value || null)}
        disabled={lessons.length === 0 || controlsDisabled}
        className={`${surfaceControlClassName} px-4 ${
          selectedAfterLessonId !== null
            ? "border-violet-200 bg-violet-50 text-violet-700"
            : "text-slate-700"
        }`}
      >
        <option value="" disabled>
          {lessons.length === 0 ? "Немає доступних уроків" : "Оберіть урок"}
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

  const creationMethodCards = (
    <div className="mt-5 grid gap-3 xl:grid-cols-2">
      <button
        type="button"
        onClick={() => setMode("ai")}
        aria-pressed={mode === "ai"}
        disabled={isSaving}
        className={`rounded-xl border p-4 text-left transition ${
          mode === "ai"
            ? "border-violet-200 bg-violet-50"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              mode === "ai"
                ? "bg-white text-violet-600"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h4 className="text-base font-semibold text-[#14213d]">
              Generate with AI
            </h4>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => setMode("manual")}
        aria-pressed={mode === "manual"}
        disabled={isSaving}
        className={`rounded-xl border p-4 text-left transition ${
          mode === "manual"
            ? "border-violet-200 bg-violet-50"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              mode === "manual"
                ? "bg-white text-violet-600"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <PenSquare className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h4 className="text-base font-semibold text-[#14213d]">
              Create manually
            </h4>
          </div>
        </div>
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-h-[94vh] w-full max-w-[98rem] overflow-hidden rounded-[0.75rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
        <CourseStructureSidebar
          courseTitle={courseTitle}
          modules={modules}
          lessonsByModule={lessonsByModule}
          testsByModule={testsByModule}
          exercisesByModule={exercisesByModule}
          accent="test"
          isResizable
          restrictToActiveModule
          activeModuleId={activeModuleId}
          activeTestId={activeTestId}
          selectedAfterLessonId={selectedAfterLessonId}
          previewLessonId={previewLessonId}
          showTestSourcePreview
          onSelectPreviewLesson={setManualPreviewLessonId}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-[108px] items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <BadgeCheck className="h-4 w-4 text-[#8b5cf6]" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight text-[#14213d]">
                  {heading}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити модальне вікно тесту"
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-4">
              <section className={sectionClassName}>
                <div className="flex items-center gap-3">
                  <span className={sectionStepClassName}>
                    1
                  </span>
                  <h4 className={stageTitleClassName}>Як створити цей тест?</h4>
                </div>
                {creationMethodCards}

              </section>

              <section className={`${sectionClassName} ${isModeSelectionPending ? "opacity-45" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className={sectionStepClassName}>
                    2
                  </span>
                  <h4 className={stageTitleClassName}>Розмістити тест після:</h4>
                </div>
                {placementControls}
              </section>

              <section className={`${sectionClassName} ${isModeSelectionPending ? "opacity-45" : ""}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className={sectionStepClassName}>
                      3
                    </span>
                    <h4 className={stageTitleClassName}>
                      {mode === "ai" ? "Згенерувати запитання" : "Створити запитання"}
                    </h4>
                  </div>

                  {showQuestionToolbar ? (
                    <button
                      type="button"
                      onClick={onAddQuestion}
                      className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      disabled={controlsDisabled}
                    >
                      <Plus className="h-4 w-4 text-violet-600" />
                      <span>Додати запитання</span>
                    </button>
                  ) : null}
                </div>

                {mode === "ai" ? (
                  <div className="space-y-5 pt-2">
                    {!canGenerateAi ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                        Щоб генерувати питання, агенту штучного інтелекту потрібен зміст уроку або модуля.
                      </div>
                    ) : null}


                    <div>
                      <p className="text-sm font-semibold text-[#14213d]">
                        Виберіть тип запитання:
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {aiQuestionGenerationModeOptions.map((option) => {
                          const isActive = aiGenerationMode === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleAiGenerationModeChange(option.value)}
                              disabled={controlsDisabled || isGeneratingAi}
                              className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-4 py-2 text-center text-sm font-medium transition ${
                                isActive
                                  ? "border-violet-200 bg-violet-50 text-violet-700"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-[#14213d]">
                        Кількість запитань
                      </p>
                      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                        <div className="min-w-[16rem]">
                          <div
                            className={`inline-flex h-10 items-center overflow-hidden rounded-xl border ${
                              aiQuestionCountLimitError
                                ? "border-rose-200 bg-rose-50"
                                : "border-slate-200 bg-[#f9fbfd]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={handleDecreaseAiQuestionCount}
                              disabled={!canAdjustAiQuestionCount || aiQuestionCount <= 1}
                              aria-label="Зменшити кількість запитань"
                              className="inline-flex h-full w-10 items-center justify-center border-r border-slate-200 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:text-slate-300"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={aiQuestionInputValue}
                              onChange={(event) =>
                                handleAiQuestionInputChange(event.target.value)
                              }
                              disabled={!canAdjustAiQuestionCount}
                              aria-label="Кількість запитань"
                              className="h-full w-20 bg-transparent px-3 text-center text-sm font-semibold text-[#14213d] outline-none disabled:cursor-not-allowed disabled:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={handleIncreaseAiQuestionCount}
                              disabled={!canAdjustAiQuestionCount}
                              aria-label="Збільшити кількість запитань"
                              className="inline-flex h-full w-10 items-center justify-center border-l border-slate-200 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:text-slate-300"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            void handleGenerateAi();
                          }}
                          disabled={!canGenerateAi || controlsDisabled || isGeneratingAi}
                          className={aiActionButtonClassName}
                        >
                          {isGeneratingAi ? "Генерація..." : "Згенерувати"}
                        </button>
                      </div>
                      <p
                        className={`mt-2 text-sm ${
                          aiQuestionCountLimitError
                            ? "font-medium text-rose-600"
                            : "text-slate-500"
                        }`}
                      >
                        {`Максимальна кількість: ${maxAiQuestionCount}`}
                      </p>
                    </div>

                    {showAiQuestions ? <div className="pt-4">{questionList}</div> : null}
                  </div>
                ) : mode === "manual" ? (
                  <div className="pt-4">{questionList}</div>
                ) : (
                  <p className="pt-4 text-sm text-slate-500">
                    Select a creation method above to continue.
                  </p>
                )}
              </section>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-5">
            <div className="flex justify-end gap-4">
              <Button
                variant="secondary"
                onClick={onClose}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={onSave}
                disabled={!canSaveCurrentMode || isSaving}
                className="h-11 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700"
              >
                {isSaving ? "Збереження..." : saveLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
