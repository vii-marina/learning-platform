import { useEffect, useMemo, useState } from "react";
import { Code2, Plus, Trash2, X } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import type {
  DragDropCodeExerciseContent,
  ExerciseType,
  Lesson,
  Module,
  WriteCodeExerciseContent,
} from "../../api";
import type { CourseTest, ExerciseEditorDraft } from "./courseBuilderUiTypes";
import { CourseStructureSidebar } from "./CourseStructureSidebar";

type ExerciseCreateModalProps = {
  isOpen: boolean;
  heading?: string;
  saveLabel?: string;
  courseTitle: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  testsByModule: Record<string, CourseTest[]>;
  activeModuleId: string | null;
  lessons: Lesson[];
  initialDraft: ExerciseEditorDraft | null;
  isSaving?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSave: (draft: ExerciseEditorDraft) => void;
};

function createEmptyDragDropContent(
  question = ""
): DragDropCodeExerciseContent {
  return {
    type: "drag_drop_code",
    question,
    code_template: "",
    tokens: [""],
    correct_answer: [],
  };
}

function createEmptyWriteCodeContent(question = ""): WriteCodeExerciseContent {
  return {
    type: "write_code",
    question,
    initial_code: "",
    expected_answer: "",
  };
}

function createDefaultDraft(): ExerciseEditorDraft {
  return {
    afterLessonId: null,
    type: "drag_drop_code",
    title: "",
    description: "",
    content: createEmptyDragDropContent(),
  };
}

function sanitizeDragDropContent(
  content: DragDropCodeExerciseContent
): DragDropCodeExerciseContent {
  const nextTokens = content.tokens.length > 0 ? content.tokens : [""];
  const availableTokens = new Set(nextTokens.map((token) => token.trim()).filter(Boolean));

  return {
    ...content,
    tokens: nextTokens,
    correct_answer: content.correct_answer.filter((token) => availableTokens.has(token.trim())),
  };
}

function normalizeDraft(draft: ExerciseEditorDraft): ExerciseEditorDraft {
  if (draft.type === "drag_drop_code") {
    return {
      ...draft,
      content: sanitizeDragDropContent(draft.content),
    };
  }

  return draft;
}

function isExerciseDraftValid(draft: ExerciseEditorDraft) {
  if (!draft.title.trim()) {
    return false;
  }

  if (draft.type === "drag_drop_code" && draft.content.type === "drag_drop_code") {
    const tokens = draft.content.tokens.map((token) => token.trim()).filter(Boolean);
    const correctAnswer = draft.content.correct_answer
      .map((token) => token.trim())
      .filter(Boolean);

    return (
      Boolean(draft.content.question.trim()) &&
      Boolean(draft.content.code_template.trim()) &&
      tokens.length > 0 &&
      correctAnswer.length > 0 &&
      correctAnswer.every((token) => tokens.includes(token))
    );
  }

  if (draft.type === "write_code" && draft.content.type === "write_code") {
    return (
      Boolean(draft.content.question.trim()) &&
      Boolean(draft.content.initial_code.trim()) &&
      Boolean(draft.content.expected_answer.trim())
    );
  }

  return false;
}

export function ExerciseCreateModal({
  isOpen,
  heading = "Create Exercise",
  saveLabel = "Save Exercise",
  courseTitle,
  modules,
  lessonsByModule,
  testsByModule,
  activeModuleId,
  lessons,
  initialDraft,
  isSaving = false,
  errorMessage = "",
  onClose,
  onSave,
}: ExerciseCreateModalProps) {
  const [draft, setDraft] = useState<ExerciseEditorDraft>(createDefaultDraft());
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPreviewLessonId(null);
      return;
    }

    setDraft(normalizeDraft(initialDraft ?? createDefaultDraft()));
  }, [initialDraft, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (draft.afterLessonId) {
      setPreviewLessonId(draft.afterLessonId);
      return;
    }

    setPreviewLessonId((currentValue) => {
      if (currentValue && lessons.some((lesson) => lesson.id === currentValue)) {
        return currentValue;
      }

      return lessons[0]?.id ?? null;
    });
  }, [draft.afterLessonId, isOpen, lessons]);

  const activeModule = modules.find((module) => module.id === activeModuleId) || null;
  const canSave = useMemo(() => isExerciseDraftValid(draft), [draft]);
  const availableTokens =
    draft.type === "drag_drop_code"
      ? draft.content.tokens.map((token) => token.trim()).filter(Boolean)
      : [];

  if (!isOpen) {
    return null;
  }

  const updateDraft = (updater: (currentDraft: ExerciseEditorDraft) => ExerciseEditorDraft) => {
    setDraft((currentDraft) => normalizeDraft(updater(currentDraft)));
  };

  const updateDragDropContent = (
    updater: (content: DragDropCodeExerciseContent) => DragDropCodeExerciseContent
  ) => {
    updateDraft((currentDraft) =>
      currentDraft.type === "drag_drop_code"
        ? {
            ...currentDraft,
            content: updater(currentDraft.content),
          }
        : currentDraft
    );
  };

  const updateWriteCodeContent = (
    updater: (content: WriteCodeExerciseContent) => WriteCodeExerciseContent
  ) => {
    updateDraft((currentDraft) =>
      currentDraft.type === "write_code"
        ? {
            ...currentDraft,
            content: updater(currentDraft.content),
          }
        : currentDraft
    );
  };

  const handleTypeChange = (nextType: ExerciseType) => {
    updateDraft((currentDraft) => {
      if (currentDraft.type === nextType) {
        return currentDraft;
      }

      const sharedQuestion = currentDraft.content.question;

      if (nextType === "drag_drop_code") {
        return {
          ...currentDraft,
          type: "drag_drop_code",
          content: createEmptyDragDropContent(sharedQuestion),
        };
      }

      return {
        ...currentDraft,
        type: "write_code",
        content: createEmptyWriteCodeContent(sharedQuestion),
      };
    });
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-h-[94vh] w-full max-w-[104rem] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
        <CourseStructureSidebar
          courseTitle={courseTitle}
          modules={modules}
          lessonsByModule={lessonsByModule}
          testsByModule={testsByModule}
          restrictToActiveModule
          activeModuleId={activeModuleId}
          selectedAfterLessonId={draft.afterLessonId}
          previewLessonId={previewLessonId}
          showTestSourcePreview
          onSelectPreviewLesson={setPreviewLessonId}
        />

        <div className="relative flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close exercise modal"
            className="absolute right-6 top-6 z-10 rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="border-b border-slate-200 px-8 py-6 pr-24">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f97316]/10 text-[#f97316]">
                <Code2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-3xl font-extrabold tracking-tight text-[#14213d]">
                  {heading}
                </h3>
                {activeModule ? (
                  <p className="mt-1 text-sm text-slate-500">
                    {`Inside Module ${activeModule.order}: ${activeModule.title}.`}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <div className="space-y-6">
                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
                  <h6 className="text-2xl font-bold tracking-tight text-[#14213d]">
                    Place exercise after:
                  </h6>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft((currentDraft) => ({
                          ...currentDraft,
                          afterLessonId: null,
                        }))
                      }
                      className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                        draft.afterLessonId === null
                          ? "border-[#f97316] bg-[#f97316] text-white"
                          : "border-slate-200 bg-[#f9fbfd] text-slate-700 hover:border-[#f97316]/30 hover:bg-[#f97316]/5"
                      }`}
                      disabled={isSaving}
                    >
                      This Module
                    </button>

                    {lessons.map((lesson) => {
                      const isActive = draft.afterLessonId === lesson.id;

                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() =>
                            updateDraft((currentDraft) => ({
                              ...currentDraft,
                              afterLessonId: lesson.id,
                            }))
                          }
                          className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                            isActive
                              ? "border-[#f97316] bg-[#f97316] text-white"
                              : "border-slate-200 bg-[#f9fbfd] text-slate-700 hover:border-[#f97316]/30 hover:bg-[#f97316]/5"
                          }`}
                          disabled={isSaving}
                        >
                          {`${lesson.order}. ${lesson.title}`}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-[1.5rem]  bg-white p-6">
                  <h6 className="text-2xl font-bold tracking-tight text-[#14213d]">
                    Exercise Type
                  </h6>
                  <div className="mt-5 grid gap-4">
                    <div className="grid gap-2">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleTypeChange("drag_drop_code")}
                          className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                            draft.type === "drag_drop_code"
                              ? "border-[#f97316] bg-[#fff7ed] text-[#c2410c]"
                              : "border-slate-200 bg-white text-slate-600 hover:border-[#f97316]/30 hover:bg-[#f97316]/5"
                          }`}
                        >
                          Drag &amp; Drop Code
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTypeChange("write_code")}
                          className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                            draft.type === "write_code"
                              ? "border-[#f97316] bg-[#fff7ed] text-[#c2410c]"
                              : "border-slate-200 bg-white text-slate-600 hover:border-[#f97316]/30 hover:bg-[#f97316]/5"
                          }`}
                        >
                          Write Code
                        </button>
                      </div>
                    </div>

                    
                    
                  </div>
                </section>

                {draft.type === "drag_drop_code" ? (
                  <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
                    <h6 className="text-2xl font-bold tracking-tight text-[#14213d]">
                      Drag &amp; Drop Content
                    </h6>

                    <div className="mt-5 space-y-5">
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold text-slate-600">Question</label>
                        <textarea
                          value={draft.content.question}
                          onChange={(event) =>
                            updateDragDropContent((content) => ({
                              ...content,
                              question: event.target.value,
                            }))
                          }
                          disabled={isSaving}
                          className="min-h-[6rem] rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-semibold text-slate-600">
                          Code Template
                        </label>
                        <textarea
                          value={draft.content.code_template}
                          onChange={(event) =>
                            updateDragDropContent((content) => ({
                              ...content,
                              code_template: event.target.value,
                            }))
                          }
                          disabled={isSaving}
                          className="min-h-[12rem] rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm leading-6 text-slate-700 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                          placeholder={"Use ___ where students should drop tokens."}
                        />
                      </div>

                      <div className="grid gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-sm font-semibold text-slate-600">Tokens</label>
                          <button
                            type="button"
                            onClick={() =>
                              updateDragDropContent((content) => ({
                                ...content,
                                tokens: [...content.tokens, ""],
                              }))
                            }
                            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            disabled={isSaving}
                          >
                            <Plus className="h-4 w-4" />
                            Add Token
                          </button>
                        </div>

                        <div className="space-y-3">
                          {draft.content.tokens.map((token, index) => (
                            <div key={`token-${index}`} className="flex items-center gap-3">
                              <Input
                                value={token}
                                onChange={(event) =>
                                  updateDragDropContent((content) => ({
                                    ...content,
                                    tokens: content.tokens.map((currentToken, tokenIndex) =>
                                      tokenIndex === index ? event.target.value : currentToken
                                    ),
                                  }))
                                }
                                disabled={isSaving}
                                className="h-11 rounded-2xl border-slate-200 px-4 text-sm focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateDragDropContent((content) => ({
                                    ...content,
                                    tokens:
                                      content.tokens.length > 1
                                        ? content.tokens.filter(
                                            (_, tokenIndex) => tokenIndex !== index
                                          )
                                        : [""],
                                  }))
                                }
                                disabled={isSaving}
                                className="rounded-2xl border border-slate-200 p-2.5 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-sm font-semibold text-slate-600">
                            Correct Answer Sequence
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              updateDragDropContent((content) => ({
                                ...content,
                                correct_answer: [...content.correct_answer, availableTokens[0] ?? ""],
                              }))
                            }
                            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            disabled={isSaving || availableTokens.length === 0}
                          >
                            <Plus className="h-4 w-4" />
                            Add Step
                          </button>
                        </div>

                        {availableTokens.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            Add at least one token before choosing the correct sequence.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {draft.content.correct_answer.map((token, index) => (
                              <div
                                key={`correct-answer-${index}`}
                                className="flex items-center gap-3"
                              >
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff7ed] text-sm font-bold text-[#c2410c]">
                                  {index + 1}
                                </span>
                                <select
                                  value={token}
                                  onChange={(event) =>
                                    updateDragDropContent((content) => ({
                                      ...content,
                                      correct_answer: content.correct_answer.map(
                                        (currentToken, answerIndex) =>
                                          answerIndex === index ? event.target.value : currentToken
                                      ),
                                    }))
                                  }
                                  disabled={isSaving}
                                  className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-[#14213d] outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                                >
                                  {availableTokens.map((availableToken) => (
                                    <option key={availableToken} value={availableToken}>
                                      {availableToken}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateDragDropContent((content) => ({
                                      ...content,
                                      correct_answer:
                                        content.correct_answer.length > 1
                                          ? content.correct_answer.filter(
                                              (_, answerIndex) => answerIndex !== index
                                            )
                                          : [],
                                    }))
                                  }
                                  disabled={isSaving}
                                  className="rounded-2xl border border-slate-200 p-2.5 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
                    <h6 className="text-2xl font-bold tracking-tight text-[#14213d]">
                      Write Code Content
                    </h6>

                    <div className="mt-5 space-y-5">
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold text-slate-600">Question</label>
                        <textarea
                          value={draft.content.question}
                          onChange={(event) =>
                            updateWriteCodeContent((content) => ({
                              ...content,
                              question: event.target.value,
                            }))
                          }
                          disabled={isSaving}
                          className="min-h-[6rem] rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-semibold text-slate-600">Initial Code</label>
                        <textarea
                          value={draft.content.initial_code}
                          onChange={(event) =>
                            updateWriteCodeContent((content) => ({
                              ...content,
                              initial_code: event.target.value,
                            }))
                          }
                          disabled={isSaving}
                          className="min-h-[12rem] rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm leading-6 text-slate-700 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-semibold text-slate-600">
                          Expected Answer
                        </label>
                        <textarea
                          value={draft.content.expected_answer}
                          onChange={(event) =>
                            updateWriteCodeContent((content) => ({
                              ...content,
                              expected_answer: event.target.value,
                            }))
                          }
                          disabled={isSaving}
                          className="min-h-[12rem] rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm leading-6 text-slate-700 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                        />
                      </div>
                    </div>
                  </section>
                )}
            </div>
          </div>

          <div className="border-t border-slate-200 px-8 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {errorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </div>
              ) : (
                <div />
              )}

              <div className="flex justify-end gap-4">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => onSave(draft)}
                  disabled={!canSave || isSaving}
                  className="h-11 rounded-2xl bg-[#f97316] px-5 text-sm font-bold text-white hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : saveLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
