import { useRef, useState } from "react";
import { Code2, Plus, Sparkles, X } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import type {
  DragDropCodeExerciseBlank,
  DragDropCodeExerciseContent,
  ExerciseType,
  Lesson,
  Module,
  WriteCodeExerciseContent,
} from "../../api";
import type { CourseTest, ExerciseEditorDraft } from "./courseBuilderUiTypes";
import { CourseStructureSidebar } from "./CourseStructureSidebar";
import { ExercisePreview } from "./ExercisePreview";
import { getLessonAiQuestionLimit, getModuleAiQuestionLimit } from "./courseBuilderPageUtils";

type ExerciseCreateModalProps = {
  isOpen: boolean;
  initialMode?: "manual" | "ai";
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
  onGenerateAi: (draft: ExerciseEditorDraft) => Promise<ExerciseEditorDraft>;
  onSave: (draft: ExerciseEditorDraft) => void;
};

const BLANK_PATTERN = /___|{{blank_\d+}}/g;
const WRITE_CODE_SLOT_PATTERN = /___|{{blank_\d+}}|{{answer}}/;
const WRITE_CODE_SLOT_TOKEN = "{{answer}}";
const AUTHOR_BLANK_TOKEN = "___";
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

function normalizeAuthorCodeTemplate(template: string) {
  return template.replace(/{{blank_\d+}}/g, AUTHOR_BLANK_TOKEN);
}

function hasWriteCodeAnswerSlot(template: string) {
  return WRITE_CODE_SLOT_PATTERN.test(template);
}

function getChipInputWidth(value: string, fallbackLength = 8) {
  return `${Math.min(24, Math.max(6, Math.max(value.length, fallbackLength) + 1))}ch`;
}

function normalizeOptionValue(value: string) {
  return value.trim();
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
  const codeTemplate = normalizeAuthorCodeTemplate(content.code_template);
  const blankCount = countBlankPlaceholders(codeTemplate);
  const nextBlanks = Array.isArray(content.blanks) ? content.blanks : [];
  const legacyDistractors = nextBlanks.length === 0
    ? collectLegacyDistractors(content.tokens, content.correct_answer)
    : [];

  const blanks = Array.from({ length: blankCount }, (_, index) => {
    const blank = nextBlanks[index];
    const fallbackCorrect = content.correct_answer[index] ?? "";
    const fallbackDistractors = index === 0 ? legacyDistractors : [];
    const normalizedDistractors = (blank?.distractors ?? fallbackDistractors).map(
      normalizeOptionValue
    );

    return createBlank({
      id: blank?.id,
      correct: normalizeOptionValue(blank?.correct ?? fallbackCorrect),
      distractors: normalizedDistractors.length > 0 ? normalizedDistractors : [""],
    });
  });

  return {
    ...content,
    code_template: codeTemplate,
    blanks,
    tokens: buildTokenBank(blanks),
    correct_answer: blanks.map((blank) => normalizeOptionValue(blank.correct)),
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


function renderEditorLineNumbers(lineCount: number) {
  return Array.from({ length: Math.max(1, lineCount) }, (_, index) => (
    <div key={`line-${index + 1}`}>{index + 1}</div>
  ));
}

function hasMeaningfulExerciseDraft(draft: ExerciseEditorDraft) {
  if (draft.type === "drag_drop_code") {
    return (
      draft.content.question.trim().length > 0 ||
      draft.content.code_template.trim().length > 0 ||
      (draft.content.blanks ?? []).some((blank) => blank.correct.trim().length > 0)
    );
  }

  return (
    draft.content.question.trim().length > 0 ||
    draft.content.initial_code.trim().length > 0 ||
    draft.content.expected_answer.trim().length > 0
  );
}

function getExerciseValidationMessage(draft: ExerciseEditorDraft) {
  if (!draft.content.question.trim()) {
    return "Enter the task for the student.";
  }

  if (draft.type === "drag_drop_code") {
    if (!draft.content.code_template.trim()) {
      return "Add the code for the exercise.";
    }

    const blankCount = countBlankPlaceholders(draft.content.code_template);

    if (blankCount === 0) {
      return "Add at least one blank to the code.";
    }

    if ((draft.content.blanks ?? []).length !== blankCount) {
      return "Each blank in the code needs its own options block.";
    }

    if ((draft.content.blanks ?? []).some((blank) => !blank.correct.trim())) {
      return "Each blank needs a correct option.";
    }

    return "";
  }

  if (!draft.content.initial_code.trim()) {
    return "Add the initial code.";
  }

  if (!draft.content.expected_answer.trim()) {
    return "Add the expected answer.";
  }

  return "";
}

function sanitizeExerciseDraftForSave(draft: ExerciseEditorDraft): ExerciseEditorDraft {
  if (draft.type === "write_code") {
    return {
      ...draft,
      content: {
        ...draft.content,
        question: draft.content.question.trim(),
        initial_code: draft.content.initial_code,
        expected_answer: draft.content.expected_answer.trim(),
      },
    };
  }

  const blanks = (draft.content.blanks ?? []).map((blank) => ({
    ...blank,
    correct: blank.correct.trim(),
    distractors: blank.distractors.map((token) => token.trim()).filter(Boolean),
  }));

  return {
    ...draft,
    content: {
      ...draft.content,
      question: draft.content.question.trim(),
      code_template: normalizeAuthorCodeTemplate(draft.content.code_template),
      blanks,
      tokens: buildTokenBank(blanks),
      correct_answer: blanks.map((blank) => blank.correct),
    },
  };
}

export function ExerciseCreateModal({
  isOpen,
  initialMode = "manual",
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
  onGenerateAi,
  onSave,
}: ExerciseCreateModalProps) {
  const [draft, setDraft] = useState<ExerciseEditorDraft>(() =>
    normalizeDraft(initialDraft ?? createDefaultDraft())
  );
  const [manualPreviewLessonId, setManualPreviewLessonId] = useState<string | null>(
    lessons[0]?.id ?? null
  );
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");
  const dragDropEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const writeCodeEditorRef = useRef<HTMLTextAreaElement | null>(null);

  const activeModule = modules.find((module) => module.id === activeModuleId) || null;
  const previewLessonId =
    manualPreviewLessonId && lessons.some((lesson) => lesson.id === manualPreviewLessonId)
      ? manualPreviewLessonId
      : lessons[0]?.id ?? null;

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

  const insertSnippetIntoEditor = (
    textarea: HTMLTextAreaElement | null,
    currentValue: string,
    snippet: string,
    onApply: (nextValue: string) => void
  ) => {
    const selectionStart = textarea?.selectionStart ?? currentValue.length;
    const selectionEnd = textarea?.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, selectionStart)}${snippet}${currentValue.slice(
      selectionEnd
    )}`;
    const nextCursorPosition = selectionStart + snippet.length;

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
  const hasAnswerSlot =
    draft.type === "write_code" ? hasWriteCodeAnswerSlot(draft.content.initial_code) : false;
  const validationMessage = getExerciseValidationMessage(draft);
  const canSave = validationMessage.length === 0;
  const isAiMode = initialMode === "ai";
  const exerciseAiContentLimit = draft.afterLessonId
    ? getLessonAiQuestionLimit(
        lessons.find((lesson) => lesson.id === draft.afterLessonId)?.content ?? ""
      )
    : getModuleAiQuestionLimit(lessons);
  const canGenerateAi = exerciseAiContentLimit > 0;

  const handleGenerateAi = async () => {
    if (!canGenerateAi || isGeneratingAi || isSaving) {
      return;
    }

    if (
      hasMeaningfulExerciseDraft(draft) &&
      !window.confirm("Replace the current exercise with AI-generated content?")
    ) {
      return;
    }

    try {
      setAiError("");
      setIsGeneratingAi(true);
      const nextDraft = await onGenerateAi(normalizeDraft(draft));
      setDraft(normalizeDraft(nextDraft));
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setAiError(error.message);
      } else {
        setAiError("Unable to generate exercise with AI.");
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const updateDragDropBlank = (
    blankIndex: number,
    updater: (blank: DragDropCodeExerciseBlank) => DragDropCodeExerciseBlank
  ) => {
    updateDragDropContent((content) => ({
      ...content,
      blanks: (content.blanks ?? []).map((blank, currentIndex) =>
        currentIndex === blankIndex ? updater(blank) : blank
      ),
    }));
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-h-[94vh] w-full max-w-[98rem] overflow-hidden rounded-[2rem] border border-slate-200 bg-[#f8fafc] shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
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
          onSelectPreviewLesson={setManualPreviewLessonId}
        />

        <div className="relative flex min-w-0 flex-1 flex-col">
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
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#14213d] text-sm font-bold text-white">
                  1
                </span>
                <div>
                  <h4 className="text-2xl font-bold tracking-tight text-[#14213d]">
                    Place this exercise after:
                  </h4>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAiError("");
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      afterLessonId: null,
                    }));
                  }}
                  className={`h-12 w-full rounded-2xl border px-5 text-sm font-semibold transition ${
                    draft.afterLessonId === null
                      ? "border-[#f97316] bg-[#f97316] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[#fb923c]/40 hover:bg-[#fff7ed]"
                  }`}
                  disabled={isSaving}
                >
                  This Module
                </button>

                <select
                  value={draft.afterLessonId ?? ""}
                  onChange={(event) => {
                    setAiError("");
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      afterLessonId: event.target.value || null,
                    }));
                  }}
                  disabled={lessons.length === 0 || isSaving}
                  className={`h-12 w-full rounded-2xl border px-4 text-sm font-semibold outline-none transition ${
                    draft.afterLessonId !== null
                      ? "border-[#f97316] bg-[#fff7ed] text-[#c2410c]"
                      : "border-slate-200 bg-white text-slate-700 focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
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

            </section>
            <section className="rounded-[1.75rem]  p-6">
               <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#14213d] text-sm font-bold text-white">
                  2
                </span>
                <div>
                  <h4 className="text-2xl font-bold tracking-tight text-[#14213d]">
                    Choose the exercise format
                  </h4>
                </div>
              </div>

              <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setAiError("");
                    handleTypeChange("drag_drop_code");
                  }}
                  className={`flex h-full flex-col rounded-[1.5rem] border p-5 text-left transition ${
                    draft.type === "drag_drop_code"
                      ? "border-[#f97316] bg-[#fff7ed] shadow-[0_16px_32px_rgba(249,115,22,0.12)]"
                      : "border-slate-200 hover:border-[#f97316]/40 hover:bg-white"
                  }`}
                >
                  <div className="min-h-[3.75rem]">
                    <div>
                      <p className="whitespace-nowrap text-lg font-semibold text-[#14213d]">
                        Fill Missing Code
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        Students select correct parts of code.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex min-h-[10rem] flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-slate-200 bg-[#0f172a]">
                    <div className="border-b border-white/10 px-4 py-3 text-s font-semibold text-slate-400">
                      Preview
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-4 px-4 py-4">
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
                  onClick={() => {
                    setAiError("");
                    handleTypeChange("write_code");
                  }}
                  className={`flex h-full flex-col rounded-[1.5rem] border p-5 text-left transition ${
                    draft.type === "write_code"
                      ? "border-[#f97316] bg-[#fff7ed] shadow-[0_16px_32px_rgba(249,115,22,0.12)]"
                      : "border-slate-200 bg-slate-50 hover:border-[#f97316]/40 hover:bg-white"
                  }`}
                >
                  <div className="min-h-[3.75rem]">
                    <div>
                      <p className="whitespace-nowrap text-lg font-semibold text-[#14213d]">
                        Write Code
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        Students type missing code manually.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex min-h-[10rem] flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-slate-200 bg-[#0f172a]">
                    <div className="border-b border-white/10 px-4 py-3 text-s font-semibold text-slate-400">
                      Preview
                    </div>
                    <div className="flex flex-1 items-start px-4 py-4 font-mono text-xs leading-6 text-slate-100">
                      <div>
                        <span>return </span>
                        <span className="inline-flex min-w-[6rem] translate-y-[0.15rem] items-center rounded-md border border-sky-300/50 bg-white px-2 py-1 text-[11px] font-medium text-slate-400">
                          input
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </section>



            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#14213d] text-sm font-bold text-white">
                    3
                  </span>
                  <div>
                    <h4 className="text-2xl font-bold tracking-tight text-[#14213d]">
                      Build the exercise
                    </h4>
                  </div>
                </div>

                {isAiMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleGenerateAi();
                    }}
                    disabled={!canGenerateAi || isGeneratingAi || isSaving}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#fdba74]/60 bg-white px-5 text-sm font-semibold text-[#ea580c] transition hover:bg-[#fff7ed] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{isGeneratingAi ? "Generating..." : "Generate with AI"}</span>
                  </button>
                ) : null}
              </div>

              {isAiMode && aiError ? (
                <p className="mt-4 text-sm font-medium text-rose-600">{aiError}</p>
              ) : null}

              <div className="mt-6 space-y-6">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-s font-semibold text-slate-600">
                      Enter task:
                    </span>
                    <input
                      value={draft.content.question}
                      onChange={(event) => {
                        setAiError("");
                        updateDraft((currentDraft) =>
                          currentDraft.type === "drag_drop_code"
                            ? {
                                ...currentDraft,
                                content: {
                                  ...currentDraft.content,
                                  question: event.target.value,
                                },
                              }
                            : {
                                ...currentDraft,
                                content: {
                                  ...currentDraft.content,
                                  question: event.target.value,
                                },
                              }
                        );
                      }}
                      disabled={isSaving}
                      className="min-w-0 flex-1  text-sm font-medium outline-none placeholder:text-slate-500"
                      placeholder="Type the task for the student..."
                    />
                  </div>
                {draft.type === "drag_drop_code" ? (
                  <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#0f172a]">
                    <div className="flex flex-wrap items-end  gap-4 border-b border-white/10 px-5 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          insertSnippetIntoEditor(
                            dragDropEditorRef.current,
                            draft.content.code_template,
                            AUTHOR_BLANK_TOKEN,
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
                        className="min-h-[10rem] w-full resize-y border-0 bg-transparent px-4 py-4 font-mono text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
                        placeholder={`Example:\nprint(${AUTHOR_BLANK_TOKEN})`}
                        spellCheck={false}
                      />
                    </div>

                    <div className="border-t border-white/10 px-4 py-4">
                      <div className="space-y-3 overflow-hidden">
                        {(draft.content.blanks ?? []).length > 0 ? (
                          (draft.content.blanks ?? []).map((blank, index) => (
                            <div
                              key={blank.id}
                              className="rounded-[1.25rem] bg-white px-4 py-4 text-sm shadow-sm"
                            >
                              <div className="flex flex-wrap items-start gap-4">
                                <span className="mt-1 flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-[#14213d] px-2 text-xs font-bold text-white">
                                  {index + 1}
                                </span>
                                <div className="min-w-[12rem] flex-[0.7]">
                                  <p className="text-sm font-semibold  text-slate-600">
                                    Correct Option
                                  </p>
                                  <input
                                    value={blank.correct}
                                    onChange={(event) =>
                                      updateDragDropBlank(index, (currentBlank) => ({
                                        ...currentBlank,
                                        correct: event.target.value,
                                      }))
                                    }
                                    disabled={isSaving}
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#14213d] outline-none placeholder:text-slate-400"
                                    placeholder={`Correct value for blank ${index + 1}`}
                                  />
                                </div>
                                <div className="min-w-[18rem] flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-slate-600">
                                      Other Options
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateDragDropBlank(index, (currentBlank) => ({
                                          ...currentBlank,
                                          distractors: [...currentBlank.distractors, ""],
                                        }))
                                      }
                                      disabled={isSaving}
                                      className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                                    >
                                      + Add option
                                    </button>
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {(blank.distractors ?? []).length > 0 ? (
                                      blank.distractors.map((distractor, distractorIndex) => (
                                        <div
                                          key={`${blank.id}-distractor-${distractorIndex}`}
                                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2"
                                        >
                                          <input
                                            value={distractor}
                                            onChange={(event) =>
                                              updateDragDropBlank(index, (currentBlank) => ({
                                                ...currentBlank,
                                                distractors: currentBlank.distractors.map(
                                                  (currentDistractor, currentDistractorIndex) =>
                                                    currentDistractorIndex === distractorIndex
                                                      ? event.target.value
                                                      : currentDistractor
                                                ),
                                              }))
                                            }
                                            disabled={isSaving}
                                            style={{
                                              width: getChipInputWidth(distractor, 8),
                                            }}
                                            className="min-w-0 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                                            placeholder="Option"
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateDragDropBlank(index, (currentBlank) => ({
                                                ...currentBlank,
                                                distractors: currentBlank.distractors.filter(
                                                  (_, currentDistractorIndex) =>
                                                    currentDistractorIndex !== distractorIndex
                                                ),
                                              }))
                                            }
                                            disabled={isSaving}
                                            className="text-xs font-bold text-slate-400 transition hover:text-rose-500"
                                          >
                                            x
                                          </button>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-sm text-slate-400">
                                        Add as many wrong options as you need.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">
                            Click “Add Blank” to insert `___` into the code and define the options for that blank.
                          </span>
                        )}
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#0f172a]">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                      

                      <button
                        type="button"
                        onClick={() => {
                          if (hasWriteCodeAnswerSlot(draft.content.initial_code)) {
                            writeCodeEditorRef.current?.focus();
                            return;
                          }

                          insertSnippetIntoEditor(
                            writeCodeEditorRef.current,
                            draft.content.initial_code,
                            WRITE_CODE_SLOT_TOKEN,
                            (nextValue) =>
                              updateWriteCodeContent((content) => ({
                                ...content,
                                initial_code: nextValue,
                              }))
                          );
                        }}
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
                        className="min-h-[10rem] w-full resize-y border-0 bg-transparent px-4 py-4 font-mono text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
                        placeholder={`Example:\nreturn ${WRITE_CODE_SLOT_TOKEN}`}
                        spellCheck={false}
                      />
                    </div>

                    <div className="border-t border-white/10 px-4 py-4">
                      <div className="flex flex-wrap gap-3 overflow-hidden">
                        {hasAnswerSlot || draft.content.expected_answer.trim() ? (
                          <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-2 py-2 text-sm shadow-sm">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#14213d] text-xs font-bold text-white">
                              1
                            </span>
                            <input
                              value={draft.content.expected_answer}
                              onChange={(event) =>
                                updateWriteCodeContent((content) => ({
                                  ...content,
                                  expected_answer: event.target.value,
                                }))
                              }
                              disabled={isSaving}
                              style={{
                                width: getChipInputWidth(draft.content.expected_answer, 14),
                              }}
                              className="min-w-0 max-w-[20rem] bg-transparent text-sm font-semibold text-[#14213d] outline-none placeholder:text-slate-400"
                              placeholder="Correct answer"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Click “Insert Answer Slot” to add the correct answer.
                          </span>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                <section className="rounded-[1.5rem] ">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h5 className="mt-2 text-xl font-semibold text-[#14213d]">
                        Students Preview
                      </h5>
                    </div>
                  </div>

                  <div className="mt-5">
                    <ExercisePreview
                      content={draft.content}
                      description={draft.description}
                    />
                  </div>
                </section>
              </div>
            </section>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-8 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium text-slate-500">
                {errorMessage || validationMessage}
              </div>
              <div className="flex justify-end gap-4">
              <Button
                variant="secondary"
                onClick={onClose}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={() => onSave(sanitizeExerciseDraftForSave(normalizeDraft(draft)))}
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
