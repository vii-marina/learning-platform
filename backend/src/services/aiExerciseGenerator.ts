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

const dragDropExerciseSchema = z.object({
  type: z.literal("drag_drop_code").optional(),
  question: z.string().trim().min(1),
  code_template: z.string().trim().min(1),
  blanks: z
    .array(
      z.object({
        correct: z.string().trim().min(1),
        distractors: z.array(z.string().trim().min(1)).default([]),
      })
    )
    .min(1),
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
You are an educational assistant.

Generate exactly one "Fill Missing Code" programming exercise based on the lesson content.

Rules:
- Return ONLY valid JSON
- The exercise must be short, clear, and directly based on the lesson
- Use 1 to 3 blanks
- The code must stay syntactically coherent
- Use placeholders inside code_template in this exact format: {{blank_1}}, {{blank_2}}, ...
- The number of placeholders must exactly match the number of blank objects
- Each blank must include the correct value and 2 or 3 distractors
- Distractors must be plausible but incorrect
- Keep the task suitable for beginner students when possible

Return format:
{
  "type": "drag_drop_code",
  "question": "Fill in the missing code to ...",
  "code_template": "print({{blank_1}})",
  "blanks": [
    {
      "correct": "\"Hello\"",
      "distractors": ["\"Hi\"", "\"Bye\""]
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
You are an educational assistant.

Generate exactly one "Write Code" programming exercise based on the lesson content.

Rules:
- Return ONLY valid JSON
- The exercise must be short, clear, and directly based on the lesson
- initial_code must contain exactly one answer slot in this exact format: {{answer}}
- Keep the code concise and realistic
- expected_answer must be the exact code the student should type into the slot
- Keep the task suitable for beginner students when possible

Return format:
{
  "type": "write_code",
  "question": "Complete the missing code to ...",
  "initial_code": "def add(a, b):\\n    return {{answer}}",
  "expected_answer": "a + b"
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
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: "You generate programming exercises for educational platforms.",
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
