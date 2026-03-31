import { useMemo, useRef, useState } from "react";
import { Code2, Plus, Trash2, X } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import type {
  DragDropCodeExerciseBlank,
  DragDropCodeExerciseContent,
  ExerciseMatchMode,
  ExerciseType,
  Lesson,
  Module,
  WriteCodeExerciseContent,
} from "../../api";
import type { CourseTest, ExerciseEditorDraft } from "./courseBuilderUiTypes";
import { ExercisePreview } from "./ExercisePreview";

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

type ExerciseValidationErrors = {
  question?: string;
  codeTemplate?: string;
  blanks?: string;
  initialCode?: string;
  expectedAnswer?: string;
};

type PlacementMode = "lesson" | "module";

const BLANK_TOKEN = "___";
const BLANK_PATTERN = /___|{{blank_\d+}}/g;
const DEFAULT_EXERCISE_TITLES: Record<ExerciseType, string> = {
  drag_drop_code: "Fill Missing Code Exercise",
  write_code: "Write Code Exercise",
};

function createBlankId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createBlank(
  overrides: Partial<DragDropCodeExerciseBlank> = {}
): DragDropCodeExerciseBlank {
  return {
    id: overrides.id ?? createBlankId(),
    correct: overrides.correct ?? "",
    distractors: overrides.distractors ?? [],
  };
}

function countBlankPlaceholders(template: string) {
  return template.match(BLANK_PATTERN)?.length ?? 0;
}

function buildTokenBank(blanks: DragDropCodeExerciseBlank[]) {
  const seen = new Set<string>();
  const tokens: string[] = [];

  blanks.forEach((blank) => {
    [blank.correct, ...blank.distractors].forEach((token) => {
      const normalizedToken = token.trim();

      if (!normalizedToken || seen.has(normalizedToken)) {
        return;
      }

      seen.add(normalizedToken);
      tokens.push(normalizedToken);
    });
  });

  return tokens;
}

function collectLegacyDistractors(tokens: string[], correctAnswer: string[]) {
  const correctTokenCounts = correctAnswer.reduce<Map<string, number>>((counts, token) => {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      return counts;
    }

    counts.set(normalizedToken, (counts.get(normalizedToken) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  return tokens.reduce<string[]>((extras, token) => {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      return extras;
    }

    const remainingCount = correctTokenCounts.get(normalizedToken) ?? 0;

    if (remainingCount > 0) {
      correctTokenCounts.set(normalizedToken, remainingCount - 1);
      return extras;
    }

    extras.push(normalizedToken);
    return extras;
  }, []);
}

function createEmptyDragDropContent(question = ""): DragDropCodeExerciseContent {
  return {
    type: "drag_drop_code",
    question,
    code_template: "",
    tokens: [],
    correct_answer: [],
    blanks: [],
  };
}

function createEmptyWriteCodeContent(question = ""): WriteCodeExerciseContent {
  return {
    type: "write_code",
    question,
    initial_code: "",
    expected_answer: "",
    match_mode: "strict",
  };
}

function createDefaultDraft(): ExerciseEditorDraft {
  return {
    afterLessonId: null,
    type: "drag_drop_code",
    title: DEFAULT_EXERCISE_TITLES.drag_drop_code,
    description: "",
    content: createEmptyDragDropContent(),
  };
}



function normalizeDragDropContent(
  content: DragDropCodeExerciseContent
): DragDropCodeExerciseContent {
  const blankCount = countBlankPlaceholders(content.code_template);
  const nextBlanks = Array.isArray(content.blanks) ? content.blanks : [];
  const legacyDistractors = nextBlanks.length === 0
    ? collectLegacyDistractors(content.tokens, content.correct_answer)
    : [];

  const blanks = Array.from({ length: blankCount }, (_, index) => {
    const blank = nextBlanks[index];

    return createBlank({
      id: blank?.id,
      correct: blank?.correct ?? content.correct_answer[index] ?? "",
      distractors:
        blank?.distractors?.map((token) => token) ?? (index === 0 ? legacyDistractors : []),
    });
  });

  return {
    ...content,
    blanks,
    tokens: buildTokenBank(blanks),
    correct_answer: blanks.map((blank) => blank.correct),
  };
}

function normalizeWriteCodeContent(
  content: WriteCodeExerciseContent
): WriteCodeExerciseContent {
  return {
    ...content,
    match_mode: content.match_mode === "flexible" ? "flexible" : "strict",
  };
}

function normalizeDraft(draft: ExerciseEditorDraft): ExerciseEditorDraft {
  if (draft.type === "drag_drop_code") {
    return {
      ...draft,
      title: draft.title.trim() ? draft.title : DEFAULT_EXERCISE_TITLES.drag_drop_code,
      content: normalizeDragDropContent(draft.content),
    };
  }

  return {
    ...draft,
    title: draft.title.trim() ? draft.title : DEFAULT_EXERCISE_TITLES.write_code,
    content: normalizeWriteCodeContent(draft.content),
  };
}

function getExerciseValidationErrors(draft: ExerciseEditorDraft): ExerciseValidationErrors {
  const errors: ExerciseValidationErrors = {};

  if (!draft.content.question.trim()) {
    errors.question = "Add the prompt students will see.";
  }

  if (draft.type === "drag_drop_code") {
    const blankCount = countBlankPlaceholders(draft.content.code_template);

    if (!draft.content.code_template.trim()) {
      errors.codeTemplate = "Add the code students should complete.";
    }

    if (blankCount === 0) {
      errors.blanks = "Insert at least one blank before saving.";
    } else if ((draft.content.blanks ?? []).some((blank) => !blank.correct.trim())) {
      errors.blanks = "Each blank needs a correct value.";
    }

    return errors;
  }

  if (!draft.content.initial_code.trim()) {
    errors.initialCode = "Add the starting code students will work from.";
  }

  if (!draft.content.expected_answer.trim()) {
    errors.expectedAnswer = "Expected answer is required before saving.";
  }

  return errors;
}

function getPlacementSummary(
  activeModule: Module | null,
  lessons: Lesson[],
  afterLessonId: string | null
) {
  if (!afterLessonId) {
    return activeModule
      ? `After Module ${activeModule.order}: ${activeModule.title}`
      : "After this module";
  }

  const linkedLesson = lessons.find((lesson) => lesson.id === afterLessonId);

  return linkedLesson
    ? `After Lesson ${linkedLesson.order}: ${linkedLesson.title}`
    : "After selected lesson";
}

function renderEditorLineNumbers(lineCount: number) {
  return Array.from({ length: Math.max(1, lineCount) }, (_, index) => (
    <div key={`line-${index + 1}`}>{index + 1}</div>
  ));
}

export function ExerciseCreateModal({
  isOpen,
  heading = "Create Exercise",
  saveLabel = "Save Exercise",
  modules,
  activeModuleId,
  lessons,
  initialDraft,
  isSaving = false,
  errorMessage = "",
  onClose,
  onSave,
}: ExerciseCreateModalProps) {
  const [draft, setDraft] = useState<ExerciseEditorDraft>(() =>
    normalizeDraft(initialDraft ?? createDefaultDraft())
  );
  const dragDropEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const writeCodeEditorRef = useRef<HTMLTextAreaElement | null>(null);

  const activeModule = modules.find((module) => module.id === activeModuleId) || null;
  const validationErrors = useMemo(() => getExerciseValidationErrors(draft), [draft]);
  const canSave = useMemo(
    () => Object.values(validationErrors).every((value) => !value),
    [validationErrors]
  );

  const blankCount =
    draft.type === "drag_drop_code" ? countBlankPlaceholders(draft.content.code_template) : 0;
  const tokenBank = draft.type === "drag_drop_code" ? buildTokenBank(draft.content.blanks ?? []) : [];
  const placementSummary = getPlacementSummary(activeModule, lessons, draft.afterLessonId);
  const placementMode: PlacementMode = draft.afterLessonId ? "lesson" : "module";

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
      const shouldResetTitle =
        !currentDraft.title.trim() ||
        currentDraft.title === DEFAULT_EXERCISE_TITLES[currentDraft.type];

      if (nextType === "drag_drop_code") {
        return {
          ...currentDraft,
          type: "drag_drop_code",
          title: shouldResetTitle
            ? DEFAULT_EXERCISE_TITLES.drag_drop_code
            : currentDraft.title,
          content: createEmptyDragDropContent(sharedQuestion),
        };
      }

      return {
        ...currentDraft,
        type: "write_code",
        title: shouldResetTitle ? DEFAULT_EXERCISE_TITLES.write_code : currentDraft.title,
        content: createEmptyWriteCodeContent(sharedQuestion),
      };
    });
  };

  const handlePlacementModeChange = (nextMode: PlacementMode) => {
    updateDraft((currentDraft) => {
      if (nextMode === "module" || lessons.length === 0) {
        return {
          ...currentDraft,
          afterLessonId: null,
        };
      }

      const nextLessonId =
        currentDraft.afterLessonId &&
        lessons.some((lesson) => lesson.id === currentDraft.afterLessonId)
          ? currentDraft.afterLessonId
          : lessons[0]?.id ?? null;

      return {
        ...currentDraft,
        afterLessonId: nextLessonId,
      };
    });
  };

  const insertSnippetIntoEditor = (
    textarea: HTMLTextAreaElement | null,
    currentValue: string,
    onApply: (nextValue: string) => void
  ) => {
    const selectionStart = textarea?.selectionStart ?? currentValue.length;
    const selectionEnd = textarea?.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, selectionStart)}${BLANK_TOKEN}${currentValue.slice(
      selectionEnd
    )}`;
    const nextCursorPosition = selectionStart + BLANK_TOKEN.length;

    onApply(nextValue);

    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  const dragDropEditorLineCount =
    draft.type === "drag_drop_code" ? draft.content.code_template.split("\n").length : 1;
  const writeCodeEditorLineCount =
    draft.type === "write_code" ? draft.content.initial_code.split("\n").length : 1;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-h-[94vh] w-full max-w-[96rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#f8fafc] shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
        <div className="relative border-b border-slate-200 bg-white px-8 py-6 pr-24">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close exercise modal"
            className="absolute right-6 top-6 rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f97316]/10 text-[#f97316]">
              <Code2 className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <h3 className="text-3xl font-extrabold tracking-tight text-[#14213d]">
                {heading}
              </h3>
              {activeModule ? (
                <p className="mt-2 text-sm font-medium text-slate-600">
                  {`Module ${activeModule.order}: ${activeModule.title}`}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                  <h4 className="mt-2 text-2xl font-bold tracking-tight text-[#14213d]">
                    Choose the exercise format
                  </h4>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange("drag_drop_code")}
                  className={`rounded-[1.5rem] border p-5 text-left transition ${
                    draft.type === "drag_drop_code"
                      ? "border-[#f97316] bg-[#fff7ed] shadow-[0_16px_32px_rgba(249,115,22,0.12)]"
                      : "border-slate-200 bg-slate-50 hover:border-[#f97316]/40 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#14213d]">Fill Missing Code
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Students select correct parts of code.</p>
                      </p>
                    </div>

                  </div>

                  <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-[#0f172a]">
                    <div className="border-b border-white/10 px-4 py-3 text-s font-semibold  text-slate-400">
                      Preview
                    </div>
                    <div className="space-y-4 px-4 py-4">
                      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-slate-100">
                        <span>print(</span>
                        <span className="mx-1 inline-flex rounded-md border border-dashed border-sky-300/50 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                          blank
                        </span>
                        <span>)</span>
                      </pre>
                      <div className="flex flex-wrap gap-2">
                        {["Hello", "Hi", "Test"].map((token) => (
                          <span
                            key={token}
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700"
                          >
                            {token}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange("write_code")}
                  className={`rounded-[1.5rem] border p-5 text-left transition ${
                    draft.type === "write_code"
                      ? "border-[#f97316] bg-[#fff7ed] shadow-[0_16px_32px_rgba(249,115,22,0.12)]"
                      : "border-slate-200 bg-slate-50 hover:border-[#f97316]/40 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#14213d]">Write Code
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Students type missing code manually.
                      </p>
                      </p>
                    </div>

                  </div>

                  <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-[#0f172a]">
                    <div className="border-b border-white/10 px-4 py-3 text-s font-semibold  text-slate-400">
                      Preview
                    </div>
                    <div className="px-4 py-4 font-mono text-xs leading-6 text-slate-100">
                      <span>return </span>
                      <span className="inline-flex min-w-[6rem] translate-y-[0.15rem] items-center rounded-md border border-sky-300/50 bg-white px-2 py-1 text-[11px] font-medium text-slate-400">
                        input
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#14213d] text-sm font-bold text-white">
                  1
                </span>
                <div>
                  <h4 className="text-2xl font-bold tracking-tight text-[#14213d]">
                    Choose where the exercise appears
                  </h4>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <label
                  className={`rounded-[1.5rem] border p-5 transition ${
                    placementMode === "lesson"
                      ? "border-[#f97316] bg-[#fff7ed]"
                      : "border-slate-200 bg-slate-50"
                  } ${lessons.length === 0 ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <input
                    type="radio"
                    name="exercise-placement"
                    className="sr-only"
                    checked={placementMode === "lesson"}
                    onChange={() => handlePlacementModeChange("lesson")}
                    disabled={lessons.length === 0 || isSaving}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#14213d]">After Lesson</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <select
                      value={draft.afterLessonId ?? ""}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        updateDraft((currentDraft) => ({
                          ...currentDraft,
                          afterLessonId: event.target.value || null,
                        }))
                      }
                      disabled={lessons.length === 0 || isSaving}
                      className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-[#14213d] outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                    >
                      {lessons.length === 0 ? (
                        <option value="">No lessons available</option>
                      ) : null}
                      {lessons.map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>
                          {`${lesson.order}. ${lesson.title}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label
                  className={`cursor-pointer rounded-[1.5rem] border p-5 transition ${
                    placementMode === "module"
                      ? "border-[#f97316] bg-[#fff7ed]"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="exercise-placement"
                    className="sr-only"
                    checked={placementMode === "module"}
                    onChange={() => handlePlacementModeChange("module")}
                    disabled={isSaving}
                  />

                  <div className="flex items-start justify-between gap-3">

                      <p className="text-lg font-semibold text-[#14213d]">After Module</p>


                    
                  </div>

                  <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {activeModule
                        ? `Module ${activeModule.order}: ${activeModule.title}`
                        : "Current module"}
                    </p>
                  </div>
                </label>
              </div>

            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#14213d] text-sm font-bold text-white">
                  2
                </span>
                <div>

                  <h4 className="text-2xl font-bold tracking-tight text-[#14213d]">
                    Build the exercise
                  </h4>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
                <div className="space-y-6">
                  <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600">
                          Exercise Name
                        </label>
                        <Input
                          value={draft.title}
                          onChange={(event) =>
                            updateDraft((currentDraft) => ({
                              ...currentDraft,
                              title: event.target.value,
                            }))
                          }
                          disabled={isSaving}
                          className="h-12 rounded-2xl border-slate-200 bg-white px-4 text-sm focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <label className="text-sm font-semibold text-slate-600">
                        Student Prompt
                      </label>
                      <textarea
                        value={draft.content.question}
                        onChange={(event) => {
                          if (draft.type === "drag_drop_code") {
                            updateDragDropContent((content) => ({
                              ...content,
                              question: event.target.value,
                            }));
                            return;
                          }

                          updateWriteCodeContent((content) => ({
                            ...content,
                            question: event.target.value,
                          }));
                        }}
                        disabled={isSaving}
                        rows={4}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                        placeholder="Explain what the student should do."
                      />
                      {validationErrors.question ? (
                        <p className="text-sm font-medium text-rose-600">
                          {validationErrors.question}
                        </p>
                      ) : null}
                    </div>
                  </section>

                  {draft.type === "drag_drop_code" ? (
                    <>
                      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#0f172a]">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                              Fill Missing Code Builder
                            </p>
                            <p className="mt-2 text-sm text-slate-300">
                              Write the code normally, then insert blanks wherever students should
                              choose the missing value.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              insertSnippetIntoEditor(
                                dragDropEditorRef.current,
                                draft.content.code_template,
                                (nextValue) =>
                                  updateDragDropContent((content) => ({
                                    ...content,
                                    code_template: nextValue,
                                  }))
                              )
                            }
                            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
                            disabled={isSaving}
                          >
                            <Plus className="h-4 w-4" />
                            Add Blank
                          </button>
                        </div>

                        <div className="grid grid-cols-[auto_minmax(0,1fr)]">
                          <div className="border-r border-white/10 bg-slate-950/50 px-3 py-4 text-right font-mono text-xs leading-7 text-slate-500">
                            {renderEditorLineNumbers(dragDropEditorLineCount)}
                          </div>

                          <textarea
                            ref={dragDropEditorRef}
                            value={draft.content.code_template}
                            onChange={(event) =>
                              updateDragDropContent((content) => ({
                                ...content,
                                code_template: event.target.value,
                              }))
                            }
                            disabled={isSaving}
                            className="min-h-[22rem] w-full resize-y border-0 bg-transparent px-4 py-4 font-mono text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
                            placeholder={`Example:\nprint(${BLANK_TOKEN})`}
                            spellCheck={false}
                          />
                        </div>
                      </section>

                      {validationErrors.codeTemplate ? (
                        <p className="text-sm font-medium text-rose-600">
                          {validationErrors.codeTemplate}
                        </p>
                      ) : null}

                      <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                              Generated Blanks
                            </p>
                            <h5 className="mt-2 text-xl font-semibold text-[#14213d]">
                              Configure each blank
                            </h5>
                          </div>

                          <span className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-slate-600">
                            {`${blankCount} blank${blankCount === 1 ? "" : "s"}`}
                          </span>
                        </div>

                        {blankCount === 0 ? (
                          <div className="mt-5 rounded-[1.25rem] border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
                            Use <span className="font-mono text-slate-700">{BLANK_TOKEN}</span> or
                            click <span className="font-semibold text-slate-700">Add Blank</span> to
                            create blank settings.
                          </div>
                        ) : (
                          <div className="mt-5 space-y-4">
                            {(draft.content.blanks ?? []).map((blank, index) => (
                              <article
                                key={blank.id}
                                className="rounded-[1.25rem] border border-slate-200 bg-white p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[#14213d]">
                                      {`Blank ${index + 1}`}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                      Define the correct answer and any distractors.
                                    </p>
                                  </div>

                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                    {`Slot ${index + 1}`}
                                  </span>
                                </div>

                                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                  <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600">
                                      Correct Value
                                    </label>
                                    <Input
                                      value={blank.correct}
                                      onChange={(event) =>
                                        updateDragDropContent((content) => ({
                                          ...content,
                                          blanks: (content.blanks ?? []).map((currentBlank, blankIndex) =>
                                            blankIndex === index
                                              ? {
                                                  ...currentBlank,
                                                  correct: event.target.value,
                                                }
                                              : currentBlank
                                          ),
                                        }))
                                      }
                                      disabled={isSaving}
                                      className="h-11 rounded-2xl border-slate-200 px-4 text-sm focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                                      placeholder="Example: Hello"
                                    />
                                  </div>

                                  <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <label className="text-sm font-semibold text-slate-600">
                                        Distractors
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateDragDropContent((content) => ({
                                            ...content,
                                            blanks: (content.blanks ?? []).map(
                                              (currentBlank, blankIndex) =>
                                                blankIndex === index
                                                  ? {
                                                      ...currentBlank,
                                                      distractors: [
                                                        ...currentBlank.distractors,
                                                        "",
                                                      ],
                                                    }
                                                  : currentBlank
                                            ),
                                          }))
                                        }
                                        className="inline-flex h-9 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                        disabled={isSaving}
                                      >
                                        <Plus className="h-4 w-4" />
                                        Add Distractor
                                      </button>
                                    </div>

                                    {(blank.distractors ?? []).length === 0 ? (
                                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                        Optional wrong answers can be added here.
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {blank.distractors.map((distractor, distractorIndex) => (
                                          <div
                                            key={`${blank.id}-distractor-${distractorIndex}`}
                                            className="flex items-center gap-3"
                                          >
                                            <Input
                                              value={distractor}
                                              onChange={(event) =>
                                                updateDragDropContent((content) => ({
                                                  ...content,
                                                  blanks: (content.blanks ?? []).map(
                                                    (currentBlank, blankIndex) =>
                                                      blankIndex === index
                                                        ? {
                                                            ...currentBlank,
                                                            distractors:
                                                              currentBlank.distractors.map(
                                                                (
                                                                  currentDistractor,
                                                                  currentIndex
                                                                ) =>
                                                                  currentIndex === distractorIndex
                                                                    ? event.target.value
                                                                    : currentDistractor
                                                              ),
                                                          }
                                                        : currentBlank
                                                  ),
                                                }))
                                              }
                                              disabled={isSaving}
                                              className="h-11 rounded-2xl border-slate-200 px-4 text-sm focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                                              placeholder="Example: Test"
                                            />

                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateDragDropContent((content) => ({
                                                  ...content,
                                                  blanks: (content.blanks ?? []).map(
                                                    (currentBlank, blankIndex) =>
                                                      blankIndex === index
                                                        ? {
                                                            ...currentBlank,
                                                            distractors:
                                                              currentBlank.distractors.filter(
                                                                (_, currentIndex) =>
                                                                  currentIndex !== distractorIndex
                                                              ),
                                                          }
                                                        : currentBlank
                                                  ),
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
                              </article>
                            ))}
                          </div>
                        )}

                        <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                              Generated Token Bank
                            </p>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              {`${tokenBank.length} token${tokenBank.length === 1 ? "" : "s"}`}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {tokenBank.length > 0 ? (
                              tokenBank.map((token) => (
                                <span
                                  key={token}
                                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"
                                >
                                  {token}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500">
                                Add answers or distractors to build the token bank.
                              </span>
                            )}
                          </div>
                        </div>

                        {validationErrors.blanks ? (
                          <p className="mt-4 text-sm font-medium text-rose-600">
                            {validationErrors.blanks}
                          </p>
                        ) : null}
                      </section>
                    </>
                  ) : (
                    <>
                      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#0f172a]">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                              Write Code Builder
                            </p>
                            <p className="mt-2 text-sm text-slate-300">
                              Add starter code, then insert an answer slot if you want the preview
                              to render inline typing inside the code.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              insertSnippetIntoEditor(
                                writeCodeEditorRef.current,
                                draft.content.initial_code,
                                (nextValue) =>
                                  updateWriteCodeContent((content) => ({
                                    ...content,
                                    initial_code: nextValue,
                                  }))
                              )
                            }
                            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
                            disabled={isSaving}
                          >
                            <Plus className="h-4 w-4" />
                            Insert Answer Slot
                          </button>
                        </div>

                        <div className="grid grid-cols-[auto_minmax(0,1fr)]">
                          <div className="border-r border-white/10 bg-slate-950/50 px-3 py-4 text-right font-mono text-xs leading-7 text-slate-500">
                            {renderEditorLineNumbers(writeCodeEditorLineCount)}
                          </div>

                          <textarea
                            ref={writeCodeEditorRef}
                            value={draft.content.initial_code}
                            onChange={(event) =>
                              updateWriteCodeContent((content) => ({
                                ...content,
                                initial_code: event.target.value,
                              }))
                            }
                            disabled={isSaving}
                            className="min-h-[20rem] w-full resize-y border-0 bg-transparent px-4 py-4 font-mono text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
                            placeholder={`Example:\nreturn ${BLANK_TOKEN}`}
                            spellCheck={false}
                          />
                        </div>
                      </section>

                      {validationErrors.initialCode ? (
                        <p className="text-sm font-medium text-rose-600">
                          {validationErrors.initialCode}
                        </p>
                      ) : null}

                      <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                          <div className="space-y-2">
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
                              rows={7}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-700 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
                              placeholder="Example: total + 1"
                              spellCheck={false}
                            />
                            {validationErrors.expectedAnswer ? (
                              <p className="text-sm font-medium text-rose-600">
                                {validationErrors.expectedAnswer}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-600">Match Mode</p>
                              <p className="mt-1 text-sm leading-6 text-slate-500">
                                Flexible mode is saved for future grading support.
                              </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              {(["strict", "flexible"] as ExerciseMatchMode[]).map((mode) => {
                                const isActive =
                                  (draft.content.match_mode ?? "strict") === mode;

                                return (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() =>
                                      updateWriteCodeContent((content) => ({
                                        ...content,
                                        match_mode: mode,
                                      }))
                                    }
                                    className={`rounded-[1.25rem] border p-4 text-left transition ${
                                      isActive
                                        ? "border-[#f97316] bg-white shadow-[0_12px_24px_rgba(249,115,22,0.1)]"
                                        : "border-slate-200 bg-white hover:border-[#f97316]/30"
                                    }`}
                                  >
                                    <p className="text-sm font-semibold text-[#14213d]">
                                      {mode === "strict" ? "Strict Match" : "Flexible Match"}
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                      {mode === "strict"
                                        ? "Exact answer comparison."
                                        : "Reserved for future tolerant matching."}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </section>
                    </>
                  )}
                </div>

                <aside className="xl:sticky xl:top-0">
                  <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Live Preview
                        </p>
                        <h5 className="mt-2 text-xl font-semibold text-[#14213d]">
                          Student Experience
                        </h5>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {placementSummary}
                      </span>
                    </div>

                    <div className="mt-5">
                      <ExercisePreview
                        content={draft.content}
                        description={draft.description}
                        allowWriteCodeInput
                      />
                    </div>
                  </section>
                </aside>
              </div>
            </section>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-8 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                {draft.type === "drag_drop_code"
                  ? "Save is enabled once the code includes blanks and every blank has a correct answer."
                  : "Save is enabled once the prompt, initial code, and expected answer are ready."}
              </div>
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
                onClick={() => onSave(normalizeDraft(draft))}
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
  );
}
