import type {
  DragDropCodeExerciseBlank,
  DragDropCodeExerciseContent,
  ExerciseDifficulty,
  ExerciseType,
  WriteCodeExerciseContent,
} from "../../../api/index";
import type {
  ExerciseEditorDraft,
  GeneratedExerciseAiDraft,
} from "../types/courseBuilderUiTypes";

const BLANK_PATTERN = /___|{{blank_\d+}}/g;
export const BLANK_SPLIT_PATTERN = /(___|{{blank_\d+}})/g;
export const BLANK_FRAGMENT_PATTERN = /^(___|{{blank_\d+}})$/;
const AUTHOR_INLINE_ANSWER_PATTERN =
  /(^|[\s([{=,:])\[([^\]\n]+)\](?=$|[\s)\]},;:+\-*/<>!=])/g;
const WRITE_CODE_SLOT_PATTERN = /___|{{blank_\d+}}|{{answer}}/;
export const WRITE_CODE_SLOT_SPLIT_PATTERN = /(___|{{blank_\d+}}|{{answer}})/g;
export const WRITE_CODE_SLOT_FRAGMENT_PATTERN = /^(___|{{blank_\d+}}|{{answer}})$/;
export const WRITE_CODE_SLOT_TOKEN = "{{answer}}";
export const AUTHOR_BLANK_TOKEN = "___";
export const DEFAULT_EXERCISE_TITLES: Record<ExerciseType, string> = {
  drag_drop_code: "Fill Missing Code",
  write_code: "Write Code",
};
export const EXERCISE_COUNT_MIN = 1;
export const AI_DIFFICULTY_OPTIONS: Array<{
  value: ExerciseDifficulty;
  label: string;
}> = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const DIFFICULTY_COLOR_STYLES: Record<
  ExerciseDifficulty,
  {
    optionActive: string;
    optionInactive: string;
  }
> = {
  easy: {
    optionActive: "border border-emerald-500 bg-emerald-100 text-emerald-700",
    optionInactive:
      "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/60",
  },
  medium: {
    optionActive: "border-amber-500 bg-amber-100 text-amber-700",
    optionInactive:
      "border-amber-200 bg-white text-amber-700 hover:border-amber-300 hover:bg-amber-50/60",
  },
  hard: {
    optionActive: "border-rose-500 bg-rose-100 text-rose-700",
    optionInactive:
      "border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50/60",
  },
};

export type GeneratedAnswerOptionItem = {
  key: string;
  kind: "correct" | "distractor";
  blank: DragDropCodeExerciseBlank;
  blankIndex: number;
  distractorIndex?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toNullableStringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

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

function coerceBlank(value: unknown): DragDropCodeExerciseBlank | null {
  if (!isRecord(value)) {
    return null;
  }

  return createBlank({
    id: toStringValue(value.id),
    correct: toStringValue(value.correct),
    distractors: toStringArray(value.distractors),
  });
}

export function countBlankPlaceholders(template: string) {
  return template.match(BLANK_PATTERN)?.length ?? 0;
}

function parseAuthorCodeTemplate(template: string) {
  const answers: string[] = [];
  const codeTemplateWithAuthorBlanks = template.replace(
    AUTHOR_INLINE_ANSWER_PATTERN,
    (_match, prefix: string, answer: string) => {
      answers.push(answer.trim());
      return `${prefix}${AUTHOR_BLANK_TOKEN}`;
    }
  );

  return {
    answers,
    codeTemplate: codeTemplateWithAuthorBlanks.replace(
      /{{blank_\d+}}/g,
      AUTHOR_BLANK_TOKEN
    ),
  };
}

export function normalizeAuthorCodeTemplate(template: string) {
  return parseAuthorCodeTemplate(template).codeTemplate;
}

export function formatAuthorCodeTemplate(
  template: string,
  blanks: DragDropCodeExerciseBlank[] = []
) {
  const { codeTemplate, answers } = parseAuthorCodeTemplate(template);
  let blankIndex = 0;

  return codeTemplate.replace(BLANK_PATTERN, () => {
    const answer = answers[blankIndex] ?? blanks[blankIndex]?.correct ?? "";
    blankIndex += 1;
    return `[${answer}]`;
  });
}

export function hasWriteCodeAnswerSlot(template: string) {
  return WRITE_CODE_SLOT_PATTERN.test(template);
}

export function getChipInputWidth(value: string, fallbackLength = 8) {
  return `${Math.min(24, Math.max(6, Math.max(value.length, fallbackLength) + 1))}ch`;
}

export function getInlineBlankWidth(value: string, fallbackLength = 8) {
  return `calc(${getChipInputWidth(value, fallbackLength)} + 1.75rem)`;
}

function normalizeOptionValue(value: string) {
  return value.trim();
}

export function clampExerciseCount(value: number, maxCount: number) {
  if (maxCount <= 0) {
    return EXERCISE_COUNT_MIN;
  }

  if (!Number.isFinite(value)) {
    return EXERCISE_COUNT_MIN;
  }

  return Math.min(maxCount, Math.max(EXERCISE_COUNT_MIN, Math.floor(value)));
}

export function getDifficultyOptionClassName(
  value: ExerciseDifficulty,
  isActive: boolean
) {
  return isActive
    ? DIFFICULTY_COLOR_STYLES[value].optionActive
    : DIFFICULTY_COLOR_STYLES[value].optionInactive;
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

export function shuffleValues<T>(values: T[]) {
  const nextValues = [...values];

  for (let index = nextValues.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentValue = nextValues[index];

    nextValues[index] = nextValues[randomIndex];
    nextValues[randomIndex] = currentValue;
  }

  return nextValues;
}

export function getGeneratedAnswerOptionItems(blanks: DragDropCodeExerciseBlank[]) {
  return blanks.flatMap<GeneratedAnswerOptionItem>((blank, blankIndex) => [
    {
      key: `${blank.id}:correct`,
      kind: "correct",
      blank,
      blankIndex,
    },
    ...blank.distractors.map((_, distractorIndex) => ({
      key: `${blank.id}:distractor:${distractorIndex}`,
      kind: "distractor" as const,
      blank,
      blankIndex,
      distractorIndex,
    })),
  ]);
}

export function applyGeneratedAnswerOptionOrder(
  options: GeneratedAnswerOptionItem[],
  order: string[] | undefined
) {
  if (!order || order.length === 0) {
    return options;
  }

  const optionsByKey = new Map(options.map((option) => [option.key, option]));
  const orderedOptions = order.flatMap((key) => {
    const option = optionsByKey.get(key);
    return option ? [option] : [];
  });
  const orderedKeys = new Set(orderedOptions.map((option) => option.key));

  return [
    ...orderedOptions,
    ...options.filter((option) => !orderedKeys.has(option.key)),
  ];
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

export function createEmptyDragDropContent(question = ""): DragDropCodeExerciseContent {
  return {
    type: "drag_drop_code",
    question,
    code_template: "",
    tokens: [],
    correct_answer: [],
    blanks: [],
  };
}

export function createEmptyWriteCodeContent(question = ""): WriteCodeExerciseContent {
  return {
    type: "write_code",
    question,
    initial_code: "",
    expected_answer: "",
    match_mode: "strict",
  };
}

export function createEmptyDraftForType(
  type: "drag_drop_code",
  afterLessonId?: string | null
): Extract<ExerciseEditorDraft, { type: "drag_drop_code" }>;
export function createEmptyDraftForType(
  type: "write_code",
  afterLessonId?: string | null
): Extract<ExerciseEditorDraft, { type: "write_code" }>;
export function createEmptyDraftForType(
  type: ExerciseType,
  afterLessonId: string | null = null
): ExerciseEditorDraft {
  if (type === "drag_drop_code") {
    return {
      afterLessonId,
      type: "drag_drop_code",
      title: DEFAULT_EXERCISE_TITLES.drag_drop_code,
      description: "",
      content: createEmptyDragDropContent(),
    };
  }

  return {
    afterLessonId,
    type: "write_code",
    title: DEFAULT_EXERCISE_TITLES.write_code,
    description: "",
    content: createEmptyWriteCodeContent(),
  };
}

export function createDefaultDraft(): ExerciseEditorDraft {
  return createEmptyDraftForType("drag_drop_code");
}

export function coerceExerciseDraft(
  value: unknown,
  fallbackType: ExerciseType = "drag_drop_code"
): ExerciseEditorDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  const contentValue = isRecord(value.content) ? value.content : {};
  const resolvedType =
    value.type === "drag_drop_code" || contentValue.type === "drag_drop_code"
      ? "drag_drop_code"
      : value.type === "write_code" || contentValue.type === "write_code"
        ? "write_code"
        : fallbackType;

  if (resolvedType === "drag_drop_code") {
    return normalizeDraft({
      afterLessonId: toNullableStringValue(value.afterLessonId),
      type: "drag_drop_code",
      title: toStringValue(value.title, DEFAULT_EXERCISE_TITLES.drag_drop_code),
      description: toStringValue(value.description),
      content: {
        type: "drag_drop_code",
        question: toStringValue(contentValue.question),
        code_template: toStringValue(contentValue.code_template),
        tokens: toStringArray(contentValue.tokens),
        correct_answer: toStringArray(contentValue.correct_answer),
        blanks: Array.isArray(contentValue.blanks)
          ? contentValue.blanks
              .map((blank) => coerceBlank(blank))
              .filter((blank): blank is DragDropCodeExerciseBlank => blank !== null)
          : [],
      },
    });
  }

  return normalizeDraft({
    afterLessonId: toNullableStringValue(value.afterLessonId),
    type: "write_code",
    title: toStringValue(value.title, DEFAULT_EXERCISE_TITLES.write_code),
    description: toStringValue(value.description),
    content: {
      type: "write_code",
      question: toStringValue(contentValue.question),
      initial_code: toStringValue(contentValue.initial_code),
      expected_answer: toStringValue(contentValue.expected_answer),
      match_mode: contentValue.match_mode === "flexible" ? "flexible" : "strict",
    },
  });
}

export function coerceGeneratedExerciseAiDraft(
  value: unknown
): GeneratedExerciseAiDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  const draft = coerceExerciseDraft(value.draft);
  const id = toStringValue(value.id);

  if (!draft || !id) {
    return null;
  }

  return {
    id,
    difficulty:
      value.difficulty === "easy" ||
      value.difficulty === "medium" ||
      value.difficulty === "hard"
        ? value.difficulty
        : "medium",
    draft,
  };
}

function normalizeDragDropContent(
  content: DragDropCodeExerciseContent
): DragDropCodeExerciseContent {
  const parsedCodeTemplate = parseAuthorCodeTemplate(content.code_template);
  const codeTemplate = parsedCodeTemplate.codeTemplate;
  const blankCount = countBlankPlaceholders(codeTemplate);
  const nextBlanks = Array.isArray(content.blanks) ? content.blanks : [];
  const legacyDistractors =
    nextBlanks.length === 0
      ? collectLegacyDistractors(content.tokens, content.correct_answer)
      : [];

  const blanks = Array.from({ length: blankCount }, (_, index) => {
    const blank = nextBlanks[index];
    const fallbackCorrect =
      parsedCodeTemplate.answers[index] ?? blank?.correct ?? content.correct_answer[index] ?? "";
    const fallbackDistractors = index === 0 ? legacyDistractors : [];
    const normalizedDistractors = (blank?.distractors ?? fallbackDistractors).map(
      normalizeOptionValue
    );

    return createBlank({
      id: blank?.id,
      correct: normalizeOptionValue(fallbackCorrect),
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

export function normalizeDraft(draft: ExerciseEditorDraft): ExerciseEditorDraft {
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

export function hasMeaningfulExerciseDraft(draft: ExerciseEditorDraft) {
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

export function getExerciseValidationMessage(draft: ExerciseEditorDraft) {
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

export function sanitizeExerciseDraftForSave(
  draft: ExerciseEditorDraft
): ExerciseEditorDraft {
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

export function buildGeneratedAnswerOptions(
  exercise: GeneratedExerciseAiDraft,
  optionOrder: string[] | undefined
) {
  if (exercise.draft.type !== "drag_drop_code") {
    return [] as GeneratedAnswerOptionItem[];
  }

  return applyGeneratedAnswerOptionOrder(
    getGeneratedAnswerOptionItems(exercise.draft.content.blanks ?? []),
    optionOrder
  );
}
