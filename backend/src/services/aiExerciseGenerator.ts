import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type GeneratedExerciseType = "drag_drop_code" | "write_code";

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

const lessonTextPlaceholder = "__LESSON_TEXT__";

const BLANK_SLOT_PATTERN = /___|{{blank_\d+}}/g;
const WRITE_CODE_SLOT_PATTERN = /{{answer}}|___|{{blank_\d+}}/g;
const WRITE_CODE_SLOT_TOKEN = "{{answer}}";

const EXERCISE_SYSTEM_PROMPT =
  "You generate high-quality beginner programming exercises that require understanding, not copying.";

const dragDropExerciseSchema = z.object({
  type: z.literal("drag_drop_code").optional(),
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
  type: z.literal("write_code").optional(),
  question: z.string().trim().min(1),
  initial_code: z.string().trim().min(1),
  expected_answer: z.string().trim().min(1),
});

function normalizeJsonResponse(response: string) {
  const trimmed = response.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function extractExerciseData(parsed: unknown) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid AI structure");
  }

  const exercise =
    "exercise" in parsed &&
    parsed.exercise &&
    typeof parsed.exercise === "object" &&
    !Array.isArray(parsed.exercise)
      ? parsed.exercise
      : parsed;

  if (exercise === parsed) {
    console.warn("[AI] Exercise response has no wrapper, using root object");
  }

  return exercise;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForComparison(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

function isTooSimilarToLesson(text: string, lesson: string) {
  return normalizeForComparison(lesson).includes(normalizeForComparison(text));
}

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
  const parsed = dragDropExerciseSchema.parse(raw);

  if (isTooSimilarToLesson(parsed.question, lessonText)) {
    throw new Error("Exercise question is too similar to lesson text");
  }

  const codeTemplate = normalizeBlankPlaceholders(parsed.code_template);
  const placeholderCount = codeTemplate.match(/{{blank_\d+}}/g)?.length ?? 0;

  if (placeholderCount !== parsed.blanks.length) {
    throw new Error("Mismatch between blanks and placeholders");
  }

  const blanks = parsed.blanks.map((b) => {
    const distractors = unique(b.distractors).filter(
      (d) => normalizeForComparison(d) !== normalizeForComparison(b.correct)
    );

    if (distractors.length < 2) {
      throw new Error("Invalid distractors");
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
  const parsed = writeCodeExerciseSchema.parse(raw);

  if (isTooSimilarToLesson(parsed.question, lessonText)) {
    throw new Error("Exercise question is too similar to lesson text");
  }

  const matches = parsed.initial_code.match(WRITE_CODE_SLOT_PATTERN) ?? [];

  if (matches.length !== 1) {
    throw new Error("Write code must have exactly one slot");
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

function buildPrompt(type: GeneratedExerciseType) {
  if (type === "drag_drop_code") {
    return `
Generate ONE beginner-friendly but non-trivial programming exercise.

Goal:
- The student should THINK, not just copy
- The task must be slightly challenging but clear

Strict rules:
- Use ONLY lesson content
- Do NOT copy sentences from the lesson
- Do NOT rewrite lesson examples directly
- Do NOT use "Hello World" or trivial prints
- Do NOT create purely theoretical tasks

Quality rules:
- The task must involve logic (condition, calculation, or behavior)
- The code must feel realistic for a beginner
- Avoid repeating typical patterns (same variables, same structure)

Blanks rules:
- 1 to 4 blanks
- Each blank must represent meaningful logic (operator, value, condition, function part)
- Distractors must be based on real beginner mistakes (not random)
- Distractors must be plausible

Return JSON:
{
  "type": "drag_drop_code",
  "question": "...",
  "code_template": "... {{blank_1}} ...",
  "blanks": [
    {
      "correct": "...",
      "distractors": ["...", "..."]
    }
  ]
}

Lesson:
"""
${lessonTextPlaceholder}
"""
`;
  }

  return `
Generate ONE beginner-friendly "Write Code" exercise.

Goal:
- The student should think and apply knowledge
- Not just copy from lesson

Strict rules:
- Use ONLY lesson content
- Do NOT copy or rephrase lesson examples
- Do NOT generate trivial tasks
- Avoid overly complex logic

Quality rules:
- The task must involve real logic (condition, operation, or small behavior)
- The code must be short but meaningful
- Only ONE missing part

Structure rules:
- initial_code must contain exactly one {{answer}}
- expected_answer must match that slot

Return JSON:
{
  "type": "write_code",
  "question": "...",
  "initial_code": "... {{answer}} ...",
  "expected_answer": "..."
}

Lesson:
"""
${lessonTextPlaceholder}
"""
`;
}

export async function generateExerciseFromLesson(
  lessonText: string,
  type: GeneratedExerciseType
): Promise<GeneratedExerciseContent> {
  const prompt = buildPrompt(type).replace(lessonTextPlaceholder, lessonText);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.75,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: EXERCISE_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `
Return this JSON:
{
  "exercise": { ... }
}

${prompt}
`,
      },
    ],
  });

  const response = completion.choices[0].message.content;

  if (!response) {
    throw new Error("Empty AI response");
  }

  try {
    console.log("[AI] Raw exercise response:", response);

    const parsed = JSON.parse(normalizeJsonResponse(response));
    const exerciseData = extractExerciseData(parsed);

    return type === "drag_drop_code"
      ? normalizeDragDrop(exerciseData, lessonText)
      : normalizeWriteCode(exerciseData, lessonText);
  } catch (e) {
    console.error("[AI] Failed to normalize exercise response:", e);

    if (e instanceof Error) throw e;
    throw new Error("Failed to parse AI exercise");
  }
}
