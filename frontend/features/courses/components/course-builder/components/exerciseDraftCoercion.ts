/** Turning stored or AI-produced payloads into a draft the editor can render. */

import { buildTokenBank, getGeneratedAnswerOptionItems, applyGeneratedAnswerOptionOrder, collectLegacyDistractors } from "./exerciseAnswerOptions";
import { DEFAULT_EXERCISE_TITLES, isRecord, toStringValue, toNullableStringValue, toStringArray, createBlank, coerceBlank, countBlankPlaceholders, parseAuthorCodeTemplate, normalizeAuthorCodeTemplate, normalizeOptionValue } from "./exerciseTemplateTokens";
import type { GeneratedAnswerOptionItem } from "./exerciseTemplateTokens";
import type { DragDropCodeExerciseBlank, DragDropCodeExerciseContent, ExerciseType, WriteCodeExerciseContent } from "../../../api/index";
import type { ExerciseEditorDraft, GeneratedExerciseAiDraft } from "../types/courseBuilderUiTypes";

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
    return "Введіть завдання для студента.";
  }

  if (draft.type === "drag_drop_code") {
    if (!draft.content.code_template.trim()) {
      return "Додайте код для вправи.";
    }

    const blankCount = countBlankPlaceholders(draft.content.code_template);

    if (blankCount === 0) {
      return "Додайте в код хоча б один пропуск.";
    }

    if ((draft.content.blanks ?? []).length !== blankCount) {
      return "Кожному пропуску в коді потрібен власний блок варіантів.";
    }

    if ((draft.content.blanks ?? []).some((blank) => !blank.correct.trim())) {
      return "Кожен пропуск має мати правильний варіант.";
    }

    return "";
  }

  if (!draft.content.initial_code.trim()) {
    return "Додайте початковий код.";
  }

  if (!draft.content.expected_answer.trim()) {
    return "Додайте очікувану відповідь.";
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
