import { z } from "zod";
import { env } from "../config/env";
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

export type GeneratedOption = {
  text: string;
  correct: boolean;
};

export type GeneratedQuestionType = "true_false" | "single_choice" | "multiple_choice";
export type AiQuestionGenerationMode = GeneratedQuestionType | "mixed";

export type GeneratedQuestion = {
  type: GeneratedQuestionType;
  question_text: string;
  options: GeneratedOption[];
};

// Wire shape, enforced twice: by the strict Structured Outputs schema below
// (API-level guarantee) and by this Zod parse (defense in depth). Semantic
// rules (correct-answer counts, option counts) are checked in the normalizers.
const rawQuestionSchema = z.object({
  type: z.enum(["true_false", "single_choice", "multiple_choice"]),
  question_text: z.string(),
  options: z.array(
    z.object({
      text: z.string(),
      correct: z.boolean(),
    })
  ),
});

const questionsResponseSchema = z.object({
  questions: z.array(rawQuestionSchema),
});

type RawQuestion = z.infer<typeof rawQuestionSchema>;

// Strict-mode Structured Outputs schema. Uses only the core keyword subset
// (types, enum, required, additionalProperties) so it works across models;
// requires a model with Structured Outputs support (default gpt-4o-mini has it).
const questionsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "question_text", "options"],
        properties: {
          type: {
            type: "string",
            enum: ["true_false", "single_choice", "multiple_choice"],
          },
          question_text: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "correct"],
              properties: {
                text: { type: "string" },
                correct: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  },
};

function normalizeTrueFalseQuestion(raw: RawQuestion): GeneratedQuestion | null {
  const questionText = raw.question_text.trim();

  if (!questionText) {
    return null;
  }

  const trueOption = raw.options.find(
    (option) => option.text.trim().toLowerCase() === "true"
  );
  const falseOption = raw.options.find(
    (option) => option.text.trim().toLowerCase() === "false"
  );

  if (!trueOption && !falseOption) {
    return null;
  }

  const correctIndex = trueOption?.correct ? 0 : falseOption?.correct ? 1 : null;

  if (correctIndex === null) {
    return null;
  }

  // Literal "True"/"False" is the platform convention — the course builder
  // matches on these strings and renders localized labels itself.
  return {
    type: "true_false",
    question_text: questionText,
    options: [
      { text: "True", correct: correctIndex === 0 },
      { text: "False", correct: correctIndex === 1 },
    ],
  };
}

function normalizeChoiceQuestion(
  raw: RawQuestion,
  type: "single_choice" | "multiple_choice"
): GeneratedQuestion | null {
  const questionText = raw.question_text.trim();

  if (!questionText) {
    return null;
  }

  const options = raw.options
    .map((option) => ({ text: option.text.trim(), correct: option.correct }))
    .filter((option) => option.text)
    .slice(0, 4);

  if (options.length < 2) {
    return null;
  }

  const correctCount = options.filter((option) => option.correct).length;

  if (type === "single_choice" && correctCount !== 1) {
    return null;
  }

  if (type === "multiple_choice" && correctCount < 2) {
    return null;
  }

  return {
    type,
    question_text: questionText,
    options,
  };
}

function deduplicateQuestions(questions: GeneratedQuestion[]) {
  const seen = new Set<string>();
  const uniqueQuestions: GeneratedQuestion[] = [];

  for (const question of questions) {
    const optionsKey = question.options
      .map((option) => `${normalizeForComparison(option.text)}:${option.correct ? "1" : "0"}`)
      .join("|");

    const key = `${question.type}::${normalizeForComparison(question.question_text)}::${optionsKey}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueQuestions.push(question);
  }

  return uniqueQuestions;
}

function filterLowQualityQuestions(
  questions: GeneratedQuestion[],
  lessonText: string
): GeneratedQuestion[] {
  return questions.filter((question) => {
    const questionText = question.question_text.trim();

    if (!questionText) {
      return false;
    }

    if (questionText.length < 12) {
      return false;
    }

    if (isTooSimilarToLesson(questionText, lessonText)) {
      return false;
    }

    const uniqueOptionTexts = new Set(
      question.options.map((option) => normalizeForComparison(option.text))
    );

    if (uniqueOptionTexts.size !== question.options.length) {
      return false;
    }

    return true;
  });
}

function normalizeGeneratedQuestions(
  rawQuestions: RawQuestion[],
  generationMode: AiQuestionGenerationMode,
  lessonText: string
): GeneratedQuestion[] {
  const normalizedQuestions = rawQuestions.reduce<GeneratedQuestion[]>(
    (questions, rawQuestion) => {
      // In fixed modes the requested type wins over whatever the model labeled.
      const type = generationMode === "mixed" ? rawQuestion.type : generationMode;

      const normalized =
        type === "true_false"
          ? normalizeTrueFalseQuestion(rawQuestion)
          : normalizeChoiceQuestion(rawQuestion, type);

      if (normalized) {
        questions.push(normalized);
      }

      return questions;
    },
    []
  );

  const qualityFiltered = filterLowQualityQuestions(normalizedQuestions, lessonText);
  const deduplicated = deduplicateQuestions(qualityFiltered);

  if (deduplicated.length === 0) {
    throw new AiQualityError("AI did not return valid questions");
  }

  return deduplicated;
}

function buildPrompt(questionCount: number, generationMode: AiQuestionGenerationMode) {
  const baseRules = `
You generate quiz questions for a beginner-friendly educational platform.

Generate exactly ${questionCount} quiz questions based ONLY on the lesson content.

Main goal:
- Questions must be clear, natural, and not too easy
- Questions must require a little thinking
- Questions must NOT be copied or paraphrased too directly from the lesson
- Questions must test understanding, not just memorization

Strict content rules:
- Use ONLY concepts, syntax, and facts that are present in the lesson
- Do NOT introduce outside topics
- If the lesson is simple, keep the questions simple but still thoughtful
- Do NOT make tricky, confusing, or overly academic questions
- Avoid overly theoretical wording
- Avoid textbook-style copied definitions
- Avoid asking the same idea in different wording
- Each question must test a different point when possible
- Prefer practical understanding over definition recall
${LANGUAGE_RULE}
Question design rules:
- Prefer questions about:
  - understanding code
  - predicting output
  - choosing correct logic
  - identifying a mistake
  - applying a concept in a small example
- Avoid generic questions like:
  - "What is Python?"
  - "What is a variable?" unless the lesson is extremely short and simple
- If the lesson contains code examples, include code-based questions where appropriate
- Make distractors plausible and based on common beginner mistakes
- Distractors must not be random, silly, or obviously wrong

Anti-copy rules:
- Do NOT copy whole phrases from the lesson into question_text
- Do NOT turn a lesson sentence into a question with only 1-2 words changed
- Rewrite naturally and test understanding from another angle

Allowed types:
- "true_false"
- "single_choice"
- "multiple_choice"
`;

  const modeRules =
    generationMode === "true_false"
      ? `
Type rules:
- Every question must have type "true_false"
- Every question must have exactly 2 options
- The options must be exactly "True" and "False"
- Exactly one option must be correct
`
      : generationMode === "single_choice"
        ? `
Type rules:
- Every question must have type "single_choice"
- Every question must have exactly 4 options
- Exactly one option must be correct
`
        : generationMode === "multiple_choice"
          ? `
Type rules:
- Every question must have type "multiple_choice"
- Every question must have exactly 4 options
- At least 2 options must be correct
`
          : `
Type rules:
- Use a mix of question types when possible
- Include more than one question type if the lesson supports it
- "true_false" questions must have exactly 2 options: "True" and "False"
- "single_choice" questions must have exactly 4 options and exactly 1 correct answer
- "multiple_choice" questions must have exactly 4 options and at least 2 correct answers
`;

  return `
${baseRules}
${modeRules}

Return this exact JSON object shape:
{
  "questions": [
    {
      "type": "single_choice",
      "question_text": "Question here",
      "options": [
        { "text": "Option A", "correct": false },
        { "text": "Option B", "correct": true },
        { "text": "Option C", "correct": false },
        { "text": "Option D", "correct": false }
      ]
    }
  ]
}

${UNTRUSTED_LESSON_NOTE}

Lesson content:
"""
${LESSON_TEXT_PLACEHOLDER}
"""
`;
}

export async function generateQuestionsFromLesson(
  lessonText: string,
  questionCount: number = 5,
  generationMode: AiQuestionGenerationMode = "single_choice"
): Promise<GeneratedQuestion[]> {
  const prompt = fillLessonText(buildPrompt(questionCount, generationMode), lessonText);

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.7,
    max_completion_tokens: 4096,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "quiz_questions",
        strict: true,
        schema: questionsJsonSchema,
      },
    },
    messages: [
      {
        role: "system",
        content:
          "You generate high-quality quiz questions for beginner programming courses. Your questions should be clear, slightly thought-provoking, not copied from the lesson, and grounded only in the provided content.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  logAiUsage("questions", completion);

  const message = completion.choices[0]?.message;

  if (message?.refusal) {
    throw new AiQualityError(`AI refused to generate questions: ${message.refusal}`);
  }

  const response = message?.content;

  if (!response) {
    throw new AiQualityError("AI returned empty response");
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(response);
  } catch {
    throw new AiQualityError("AI returned invalid JSON");
  }

  const parsed = questionsResponseSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new AiQualityError("AI returned invalid response format");
  }

  const normalized = normalizeGeneratedQuestions(
    parsed.data.questions,
    generationMode,
    lessonText
  );

  return normalized.slice(0, questionCount);
}
