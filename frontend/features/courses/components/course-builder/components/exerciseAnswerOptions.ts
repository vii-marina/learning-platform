/** Building and shuffling the token bank a drag-drop exercise offers. */


import type { GeneratedAnswerOptionItem } from "./exerciseTemplateTokens";
import type { DragDropCodeExerciseBlank } from "../../../api/index";

export function buildTokenBank(blanks: DragDropCodeExerciseBlank[]) {
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

export function collectLegacyDistractors(tokens: string[], correctAnswer: string[]) {
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
