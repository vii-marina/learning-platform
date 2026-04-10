import type { ExerciseDifficulty } from "./aiExerciseGenerator";

const DIFFICULTY_ORDER: Record<ExerciseDifficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

const HARD_PATTERNS = [
  /\bfor\b/i,
  /\bwhile\b/i,
  /\bdef\b/i,
  /\bfunction\b/i,
  /\blists?\b/i,
  /\btuples?\b/i,
  /\bdictionaries?\b/i,
  /\bdicts?\b/i,
  /\barrays?\b/i,
];

const MEDIUM_PATTERNS = [
  /\bif\b/i,
  /\belse\b/i,
  /\belif\b/i,
  /\bprint\b/i,
  /\binput\s*\(/i,
  /\blen\s*\(/i,
];

function hasArithmeticExpression(text: string) {
  return /(?:\b[a-z_][a-z0-9_]*\b|\d+|\))\s*[+\-*/]\s*(?:\b[a-z_][a-z0-9_]*\b|\d+|\()/i.test(
    text
  );
}

function hasSimpleFunctionCall(text: string) {
  return /\b(?!if\b|for\b|while\b|def\b|function\b)[a-z_][a-z0-9_]*\s*\(/i.test(text);
}

function hasUnpacking(text: string) {
  return /\b[a-z_][a-z0-9_]*\s*,\s*[a-z_][a-z0-9_]*(?:\s*,\s*[a-z_][a-z0-9_]*)*\s*=/i.test(
    text
  );
}

function hasNestedLogic(text: string) {
  return (
    /if[^\n]*:\s*\n\s{2,}if\b/i.test(text) ||
    /if\s*\([^)]*\)\s*\{[\s\S]{0,160}if\s*\(/i.test(text)
  );
}

function getAllowedDifficulties(maxDifficulty: ExerciseDifficulty) {
  return (["easy", "medium", "hard"] as const).filter(
    (difficulty) => DIFFICULTY_ORDER[difficulty] <= DIFFICULTY_ORDER[maxDifficulty]
  );
}

export function detectMaxDifficulty(text: string): ExerciseDifficulty {
  const normalizedText = text.toLowerCase();

  const hasHardContent =
    HARD_PATTERNS.some((pattern) => pattern.test(normalizedText)) ||
    hasUnpacking(text) ||
    hasNestedLogic(text);

  if (hasHardContent) {
    return "hard";
  }

  const hasMediumContent =
    MEDIUM_PATTERNS.some((pattern) => pattern.test(normalizedText)) ||
    hasArithmeticExpression(text) ||
    hasSimpleFunctionCall(text);

  if (hasMediumContent) {
    return "medium";
  }

  return "easy";
}

export function filterDifficulties(
  requested: ExerciseDifficulty[],
  maxDifficulty: ExerciseDifficulty
): ExerciseDifficulty[] {
  const allowedDifficulties = getAllowedDifficulties(maxDifficulty);
  const allowedSet = new Set(allowedDifficulties);
  const filtered = requested.filter((difficulty) => allowedSet.has(difficulty));

  return filtered.length > 0 ? filtered : [maxDifficulty];
}
