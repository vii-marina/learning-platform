import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { openai } from "../lib/openai";
import {
  AiQualityError,
  fillLessonText,
  isTooSimilarToLesson,
  LANGUAGE_RULE,
  LESSON_TEXT_PLACEHOLDER,
  logAiUsage,
  normalizeForComparison,
  UNTRUSTED_LESSON_NOTE,
} from "./aiShared";

export type GeneratedExerciseType = "drag_drop_code" | "write_code";
export type ExerciseDifficulty = "easy" | "medium" | "hard";

export type GeneratedDragDropCodeExerciseBlank = {
  id: string;
  correct: string;
  distractors: string[];
};

export type GeneratedDragDropCodeExerciseContent = {
  type: "drag_drop_code";
  question: string;
  code_template: string;
  tokens: string[];
  correct_answer: string[];
  blanks: GeneratedDragDropCodeExerciseBlank[];
};

export type GeneratedWriteCodeExerciseContent = {
  type: "write_code";
  question: string;
  initial_code: string;
  expected_answer: string;
  match_mode: "strict";
};

export type GeneratedExerciseContent =
  | GeneratedDragDropCodeExerciseContent
  | GeneratedWriteCodeExerciseContent;

const BLANK_SLOT_PATTERN = /___|{{blank_\d+}}/g;
const WRITE_CODE_SLOT_PATTERN = /{{answer}}|___|{{blank_\d+}}/g;
const WRITE_CODE_SLOT_TOKEN = "{{answer}}";

const EXERCISE_SYSTEM_PROMPT =
  "You generate high-quality beginner programming exercises and must strictly match the requested difficulty level.";

// Semantic validation of the parsed response (counts, non-empty strings).
// Wire shape is already guaranteed by the strict Structured Outputs schemas below.
const dragDropExerciseSchema = z.object({
  question: z.string().trim().min(1),
  code_template: z.string().trim().min(1),
  blanks: z
    .array(
      z.object({
        correct: z.string().trim().min(1),
        distractors: z.array(z.string().trim().min(1)).min(2).max(3),
      })
    )
    .min(1)
    .max(4),
});

const writeCodeExerciseSchema = z.object({
  question: z.string().trim().min(1),
  initial_code: z.string().trim().min(1),
  expected_answer: z.string().trim().min(1),
});

// Strict-mode Structured Outputs schemas (core keyword subset only — the
// count/length constraints above stay in Zod). Require a model with
// Structured Outputs support (default gpt-4o-mini has it).
const dragDropJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["question", "code_template", "blanks"],
  properties: {
    question: { type: "string" },
    code_template: { type: "string" },
    blanks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["correct", "distractors"],
        properties: {
          correct: { type: "string" },
          distractors: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
};

const writeCodeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["question", "initial_code", "expected_answer"],
  properties: {
    question: { type: "string" },
    initial_code: { type: "string" },
    expected_answer: { type: "string" },
  },
};

function unique(values: string[]) {
  const set = new Set<string>();
  return values.filter((v) => {
    const n = v.trim();
    if (!n || set.has(n)) return false;
    set.add(n);
    return true;
  });
}

function normalizeBlankPlaceholders(template: string) {
  let i = 0;
  return template.replace(BLANK_SLOT_PATTERN, () => `{{blank_${++i}}}`);
}

function normalizeDragDrop(raw: unknown, lessonText: string): GeneratedDragDropCodeExerciseContent {
  const result = dragDropExerciseSchema.safeParse(raw);

  if (!result.success) {
    throw new AiQualityError("AI returned an invalid drag & drop exercise");
  }

  const parsed = result.data;

  if (isTooSimilarToLesson(parsed.question, lessonText)) {
    throw new AiQualityError("Exercise question is too similar to lesson text");
  }

  const codeTemplate = normalizeBlankPlaceholders(parsed.code_template);
  const placeholderCount = codeTemplate.match(/{{blank_\d+}}/g)?.length ?? 0;

  if (placeholderCount !== parsed.blanks.length) {
    throw new AiQualityError("Mismatch between blanks and placeholders");
  }

  const blanks = parsed.blanks.map((b) => {
    const distractors = unique(b.distractors).filter(
      (d) => normalizeForComparison(d) !== normalizeForComparison(b.correct)
    );

    if (distractors.length < 2) {
      throw new AiQualityError("Invalid distractors");
    }

    return {
      id: randomUUID(),
      correct: b.correct.trim(),
      distractors,
    };
  });

  return {
    type: "drag_drop_code",
    question: parsed.question.trim(),
    code_template: codeTemplate,
    tokens: unique(blanks.flatMap((b) => [b.correct, ...b.distractors])),
    correct_answer: blanks.map((b) => b.correct),
    blanks,
  };
}

function normalizeWriteCode(raw: unknown, lessonText: string): GeneratedWriteCodeExerciseContent {
  const result = writeCodeExerciseSchema.safeParse(raw);

  if (!result.success) {
    throw new AiQualityError("AI returned an invalid write code exercise");
  }

  const parsed = result.data;

  if (isTooSimilarToLesson(parsed.question, lessonText)) {
    throw new AiQualityError("Exercise question is too similar to lesson text");
  }

  const matches = parsed.initial_code.match(WRITE_CODE_SLOT_PATTERN) ?? [];

  if (matches.length !== 1) {
    throw new AiQualityError("Write code must have exactly one slot");
  }

  return {
    type: "write_code",
    question: parsed.question.trim(),
    initial_code: parsed.initial_code
      .replace(/___|{{blank_\d+}}/g, WRITE_CODE_SLOT_TOKEN)
      .trim(),
    expected_answer: parsed.expected_answer.trim(),
    match_mode: "strict",
  };
}

function buildDifficultyPrompt(
  type: GeneratedExerciseType,
  difficulty: ExerciseDifficulty
) {
  if (difficulty === "easy") {
    return `
Difficulty: EASY

Rules for EASY:
- Task must be very simple
- Keep it almost the same difficulty as the lesson examples
- Rephrasing lesson examples is allowed, but do not copy lesson sentences verbatim
- No complex logic
- No combining multiple ideas
- Only one action or one obvious missing part
- Prefer assignments, simple values, one operator, or one basic syntax step
${type === "drag_drop_code" ? "- Use 1 to 2 blanks only" : "- initial_code should usually be 1 to 3 short lines"}
`;
  }

  if (difficulty === "medium") {
    return `
Difficulty: MEDIUM

Rules for MEDIUM:
- Slight thinking is required
- Use one simple concept at a time
- Minimal logic is allowed
- Do not combine unrelated lesson ideas
- Keep the task short and clear
${type === "drag_drop_code" ? "- Prefer 1 to 3 meaningful blanks" : "- Keep exactly one missing code fragment with a short context"}
`;
  }

  return `
Difficulty: HARD

Rules for HARD:
- Combine closely related lesson concepts
- Require a small amount of reasoning
- The task can have slightly more logic, but must stay readable for a beginner
- Do not overload the student with too many steps
${type === "drag_drop_code" ? "- Up to 4 meaningful blanks are allowed if they support one coherent task" : "- The missing answer can require a short logical expression or condition"}
`;
}

function buildPrompt(
  type: GeneratedExerciseType,
  difficulty: ExerciseDifficulty
) {
  const difficultyPrompt = buildDifficultyPrompt(type, difficulty);

  if (type === "drag_drop_code") {
    return `
Generate ONE programming exercise in the requested difficulty.

Goal:
- The student should solve a small coding task appropriate for the requested difficulty
- The task must stay within lesson scope

Strict rules:
- Use ONLY lesson content
- ${difficulty === "easy"
        ? "You may stay close to lesson examples, but still create a distinct exercise"
        : "Do NOT copy or directly rewrite lesson examples"}
- Do NOT create purely theoretical tasks
${LANGUAGE_RULE}
${difficultyPrompt}

Quality rules:
- Match the difficulty exactly
- Keep the code realistic for a beginner
- Avoid adding extra concepts that are not needed

Blanks rules:
- 1 to 4 blanks
- Each blank must represent a meaningful missing code part for the chosen difficulty
- Distractors must be based on real beginner mistakes (not random)
- Distractors must be plausible
- Each blank must have 2 to 3 distractors

Return JSON:
{
  "question": "...",
  "code_template": "... {{blank_1}} ...",
  "blanks": [
    {
      "correct": "...",
      "distractors": ["...", "..."]
    }
  ]
}

${UNTRUSTED_LESSON_NOTE}

Lesson:
"""
${LESSON_TEXT_PLACEHOLDER}
"""
`;
  }

  return `
Generate ONE "Write Code" exercise in the requested difficulty.

Goal:
- The student should apply lesson knowledge at the requested difficulty
- The task must stay short and focused

Strict rules:
- Use ONLY lesson content
- ${difficulty === "easy"
        ? "Rephrasing the lesson style is allowed, but the task must still be a separate exercise"
        : "Do NOT copy or directly rephrase lesson examples"}
- Avoid logic that is above the requested difficulty
${LANGUAGE_RULE}
${difficultyPrompt}

Quality rules:
- Match the requested difficulty exactly
- The code must be short but meaningful
- Only ONE missing part

Structure rules:
- initial_code must contain exactly one {{answer}}
- expected_answer must match that slot

Return JSON:
{
  "question": "...",
  "initial_code": "... {{answer}} ...",
  "expected_answer": "..."
}

${UNTRUSTED_LESSON_NOTE}

Lesson:
"""
${LESSON_TEXT_PLACEHOLDER}
"""
`;
}

export async function generateExerciseFromLesson(
  lessonText: string,
  type: GeneratedExerciseType,
  difficulty: ExerciseDifficulty
): Promise<GeneratedExerciseContent> {
  const prompt = fillLessonText(buildPrompt(type, difficulty), lessonText);

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.75,
    max_completion_tokens: 2048,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: type === "drag_drop_code" ? "drag_drop_exercise" : "write_code_exercise",
        strict: true,
        schema: type === "drag_drop_code" ? dragDropJsonSchema : writeCodeJsonSchema,
      },
    },
    messages: [
      {
        role: "system",
        content: EXERCISE_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  logAiUsage(`exercise:${type}:${difficulty}`, completion);

  const message = completion.choices[0]?.message;

  if (message?.refusal) {
    throw new AiQualityError(`AI refused to generate exercise: ${message.refusal}`);
  }

  const response = message?.content;

  if (!response) {
    throw new AiQualityError("Empty AI response");
  }

  // Debug level rather than a NODE_ENV check: the log level already decides whether this
  // is emitted, and the raw response is large enough that it should never ship by default.
  logger.debug("Raw AI exercise response", { response });

  let parsed: unknown;

  try {
    parsed = JSON.parse(response);
  } catch {
    throw new AiQualityError("AI returned invalid JSON");
  }

  return type === "drag_drop_code"
    ? normalizeDragDrop(parsed, lessonText)
    : normalizeWriteCode(parsed, lessonText);
}
