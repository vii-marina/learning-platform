/** Blank/answer placeholder tokens and the small value coercions built on them. */

import type { DragDropCodeExerciseBlank, ExerciseDifficulty, ExerciseType } from "../../../api/index";

export const BLANK_PATTERN = /___|{{blank_\d+}}/g;
export const BLANK_SPLIT_PATTERN = /(___|{{blank_\d+}})/g;
export const BLANK_FRAGMENT_PATTERN = /^(___|{{blank_\d+}})$/;
export const AUTHOR_INLINE_ANSWER_PATTERN =
  /(^|[\s([{=,:])\[([^\]\n]+)\](?=$|[\s)\]},;:+\-*/<>!=])/g;
export const WRITE_CODE_SLOT_PATTERN = /___|{{blank_\d+}}|{{answer}}/;
export const WRITE_CODE_SLOT_SPLIT_PATTERN = /(___|{{blank_\d+}}|{{answer}})/g;
export const WRITE_CODE_SLOT_FRAGMENT_PATTERN = /^(___|{{blank_\d+}}|{{answer}})$/;
export const WRITE_CODE_SLOT_TOKEN = "{{answer}}";
export const AUTHOR_BLANK_TOKEN = "___";
export const DEFAULT_EXERCISE_TITLES: Record<ExerciseType, string> = {
  drag_drop_code: "Заповнити пропуски в коді",
  write_code: "Написати код",
};
export const EXERCISE_COUNT_MIN = 1;
export const AI_DIFFICULTY_OPTIONS: Array<{
  value: ExerciseDifficulty;
  label: string;
}> = [
  { value: "easy", label: "Легка" },
  { value: "medium", label: "Середня" },
  { value: "hard", label: "Складна" },
];

export const DIFFICULTY_COLOR_STYLES: Record<
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function toNullableStringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

export function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function createBlankId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createBlank(
  overrides: Partial<DragDropCodeExerciseBlank> = {}
): DragDropCodeExerciseBlank {
  return {
    id: overrides.id ?? createBlankId(),
    correct: overrides.correct ?? "",
    distractors: overrides.distractors ?? [],
  };
}

export function coerceBlank(value: unknown): DragDropCodeExerciseBlank | null {
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

export function parseAuthorCodeTemplate(template: string) {
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

export function normalizeOptionValue(value: string) {
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
