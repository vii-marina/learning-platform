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

const BLANK_SLOT_PATTERN = /___|{{blank_\d+}}/g;
const WRITE_CODE_SLOT_PATTERN = /{{answer}}|___|{{blank_\d+}}/g;
const WRITE_CODE_SLOT_TOKEN = "{{answer}}";
const lessonTextPlaceholder = "__LESSON_TEXT__";
const EXERCISE_SYSTEM_PROMPT =
  "You generate high-quality programming exercises for an educational platform.";

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
  const trimmedResponse = response.trim();

  if (!trimmedResponse.startsWith("```")) {
    return trimmedResponse;
  }

  return trimmedResponse
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function buildPrompt(type: GeneratedExerciseType) {
  if (type === "drag_drop_code") {
    return `
For drag_drop_code:

Generate ONE high-quality "Fill Missing Code" exercise.

Global rules:
- Use lesson content ONLY.
- Base the exercise directly on the lesson's concepts, keywords, syntax, and code patterns.
- Do NOT introduce unrelated topics.
- Do NOT generate generic programming questions.
- If the lesson is about variables, use variables. If it is about conditionals, use if/else. If it is about loops, use loops.
- Keep the task beginner-friendly, but avoid trivial tasks.
- The task must require understanding, not guessing.
- Use realistic code that looks like a real beginner programming example.
- Avoid repetitive patterns such as Hello World or simple print-only tasks when a more meaningful exercise is possible.
- Make each generation feel different by varying the structure when the lesson supports it, such as variables, functions, conditions, loops, or operations.
- Return ONLY valid JSON.
- Do not wrap JSON in markdown.
- Do not add explanations, headings, or extra text.

Rules:
- Use lesson content ONLY.
- Use 1 to 4 blanks.
- Blanks must represent real logic or syntax from the lesson.
- The code must be meaningful and slightly challenging.
- The code must stay syntactically coherent.
- Use placeholders inside code_template in this exact format: {{blank_1}}, {{blank_2}}, ...
- The number of placeholders must exactly match the number of blank objects.
- Each blank must represent a real programming concept, such as an operator, condition, function call, variable value, return expression, or loop part taken from the lesson context.
- Each blank must include the correct value and 2 or 3 plausible distractors based on common mistakes.
- Distractors must NOT be random or unrelated.

Examples of good tasks:
- completing condition
- filling operator
- completing function logic

Examples of bad tasks:
- repeating "Hello world"
- trivial prints
- unrelated code

Return JSON:
{
  "type": "drag_drop_code",
  "question": "...",
  "code_template": "...",
  "blanks": [
    {
      "correct": "...",
      "distractors": ["...", "..."]
    }
  ]
}

Lesson content:
"""
${lessonTextPlaceholder}
"""
`;
  }

  return `
For write_code:

Generate ONE high-quality "Write Code" exercise.

Global rules:
- Use lesson content ONLY.
- Base the exercise directly on the lesson's concepts, keywords, syntax, and code patterns.
- Do NOT introduce unrelated topics.
- Do NOT generate generic programming questions.
- If the lesson is about variables, use variables. If it is about conditionals, use if/else. If it is about loops, use loops.
- Keep the task beginner-friendly, but avoid trivial tasks.
- The task must require understanding, not guessing.
- Use realistic code that looks like a real beginner programming example.
- Avoid repetitive patterns such as Hello World or simple print-only tasks when a more meaningful exercise is possible.
- Make each generation feel different by varying the structure when the lesson supports it, such as variables, functions, conditions, loops, or operations.
- Return ONLY valid JSON.
- Do not wrap JSON in markdown.
- Do not add explanations, headings, or extra text.

Rules:
- Use lesson content ONLY.
- Task must require thinking.
- Avoid generic prompts and avoid unrelated concepts.
- initial_code must contain exactly one {{answer}} slot.
- expected_answer must be the correct code for that slot.
- The surrounding code must be concise, realistic, and meaningful.

Examples of good tasks:
- completing condition
- filling operator
- completing function logic

Examples of bad tasks:
- repeating "Hello world"
- trivial prints
- unrelated code

Return JSON:
{
  "type": "write_code",
  "question": "...",
  "initial_code": "... {{answer}} ...",
  "expected_answer": "..."
}

Lesson content:
"""
${lessonTextPlaceholder}
"""
`;
}

function uniqueNonEmpty(values: string[]) {
  const seen = new Set<string>();
  const normalizedValues: string[] = [];

  values.forEach((value) => {
    const normalizedValue = value.trim();

    if (!normalizedValue || seen.has(normalizedValue)) {
      return;
    }

    seen.add(normalizedValue);
    normalizedValues.push(normalizedValue);
  });

  return normalizedValues;
}

function normalizeBlankPlaceholders(template: string) {
  let blankIndex = 0;

  return template.replace(BLANK_SLOT_PATTERN, () => `{{blank_${++blankIndex}}}`);
}

function normalizeDragDropExerciseContent(rawValue: unknown): GeneratedDragDropCodeExerciseContent {
  const parsed = dragDropExerciseSchema.parse(rawValue);
  const codeTemplate = normalizeBlankPlaceholders(parsed.code_template);
  const placeholderCount = codeTemplate.match(/{{blank_\d+}}/g)?.length ?? 0;

  if (placeholderCount === 0) {
    throw new Error("AI did not include any blank placeholders.");
  }

  if (parsed.blanks.length !== placeholderCount) {
    throw new Error("AI returned a blank count that does not match the code template.");
  }

  const blanks = parsed.blanks.map((blank) => {
    const distractors = uniqueNonEmpty(blank.distractors).filter(
      (token) => token !== blank.correct.trim()
    );

    if (distractors.length < 2) {
      throw new Error("AI must return at least two unique distractors for each blank.");
    }

    return {
      id: randomUUID(),
      correct: blank.correct.trim(),
      distractors,
    };
  });

  const tokens = uniqueNonEmpty(
    blanks.flatMap((blank) => [blank.correct, ...blank.distractors])
  );

  return {
    type: "drag_drop_code",
    question: parsed.question.trim(),
    code_template: codeTemplate,
    tokens,
    correct_answer: blanks.map((blank) => blank.correct),
    blanks,
  };
}

function normalizeWriteCodeExerciseContent(rawValue: unknown): GeneratedWriteCodeExerciseContent {
  const parsed = writeCodeExerciseSchema.parse(rawValue);
  const slotMatches = parsed.initial_code.match(WRITE_CODE_SLOT_PATTERN) ?? [];

  if (slotMatches.length !== 1) {
    throw new Error("AI must return exactly one answer slot for write-code exercises.");
  }

  return {
    type: "write_code",
    question: parsed.question.trim(),
    initial_code: parsed.initial_code.replace(/___|{{blank_\d+}}/g, WRITE_CODE_SLOT_TOKEN).trim(),
    expected_answer: parsed.expected_answer.trim(),
    match_mode: "strict",
  };
}

export async function generateExerciseFromLesson(
  lessonText: string,
  type: GeneratedExerciseType
): Promise<GeneratedExerciseContent> {
  const prompt = buildPrompt(type).replace(lessonTextPlaceholder, lessonText);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
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
        content: prompt,
      },
    ],
  });

  const response = completion.choices[0].message.content;

  if (!response) {
    throw new Error("AI returned empty response");
  }

  try {
    const parsed = JSON.parse(normalizeJsonResponse(response));

    return type === "drag_drop_code"
      ? normalizeDragDropExerciseContent(parsed)
      : normalizeWriteCodeExerciseContent(parsed);
  } catch (error) {
    if (error instanceof Error && error.message.trim()) {
      throw error;
    }

    throw new Error("Failed to parse AI exercise response");
  }
}
