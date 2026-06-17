import OpenAI from "openai";
import { env } from "../config/env";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

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

const lessonTextPlaceholder = "__LESSON_TEXT__";

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

function isGeneratedQuestionType(value: unknown): value is GeneratedQuestionType {
  return (
    value === "true_false" ||
    value === "single_choice" ||
    value === "multiple_choice"
  );
}

function normalizeOption(option: unknown): GeneratedOption | null {
  if (!option || typeof option !== "object") {
    return null;
  }

  const text =
    "text" in option && typeof option.text === "string"
      ? option.text.trim()
      : "";

  if (!text) {
    return null;
  }

  return {
    text,
    correct: Boolean("correct" in option && option.correct),
  };
}

function normalizeTrueFalseQuestion(rawQuestion: unknown): GeneratedQuestion | null {
  if (!rawQuestion || typeof rawQuestion !== "object") {
    return null;
  }

  const rawOptions = "options" in rawQuestion ? rawQuestion.options : undefined;
  const questionText =
    "question_text" in rawQuestion && typeof rawQuestion.question_text === "string"
      ? rawQuestion.question_text.trim()
      : "";

  if (!questionText) {
    return null;
  }

  const normalizedOptions = (Array.isArray(rawOptions) ? rawOptions : [])
    .map(normalizeOption)
    .filter((option): option is GeneratedOption => option !== null);

  const trueOption = normalizedOptions.find(
    (option) => option.text.trim().toLowerCase() === "true"
  );
  const falseOption = normalizedOptions.find(
    (option) => option.text.trim().toLowerCase() === "false"
  );

  if (!trueOption && !falseOption) {
    return null;
  }

  const correctIndex = trueOption?.correct ? 0 : falseOption?.correct ? 1 : null;

  if (correctIndex === null) {
    return null;
  }

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
  rawQuestion: unknown,
  fallbackType: "single_choice" | "multiple_choice"
): GeneratedQuestion | null {
  if (!rawQuestion || typeof rawQuestion !== "object") {
    return null;
  }

  const rawOptions = "options" in rawQuestion ? rawQuestion.options : undefined;
  const questionText =
    "question_text" in rawQuestion && typeof rawQuestion.question_text === "string"
      ? rawQuestion.question_text.trim()
      : "";

  if (!questionText) {
    return null;
  }

  const normalizedOptions = (Array.isArray(rawOptions) ? rawOptions : [])
    .map(normalizeOption)
    .filter((option): option is GeneratedOption => option !== null)
    .slice(0, 4);

  if (normalizedOptions.length < 2) {
    return null;
  }

  const correctCount = normalizedOptions.filter((option) => option.correct).length;

  if (fallbackType === "single_choice" && correctCount !== 1) {
    return null;
  }

  if (fallbackType === "multiple_choice" && correctCount < 2) {
    return null;
  }

  return {
    type: fallbackType,
    question_text: questionText,
    options: normalizedOptions,
  };
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForComparison(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

function questionLooksTooSimilarToLesson(questionText: string, lessonText: string) {
  const normalizedQuestion = normalizeForComparison(questionText);
  const normalizedLesson = normalizeForComparison(lessonText);

  if (!normalizedQuestion || !normalizedLesson) {
    return false;
  }

  return normalizedLesson.includes(normalizedQuestion);
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

    if (questionLooksTooSimilarToLesson(questionText, lessonText)) {
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
  parsed: unknown,
  generationMode: AiQuestionGenerationMode,
  lessonText: string
): GeneratedQuestion[] {
  if (!Array.isArray(parsed)) {
    throw new Error("AI returned an invalid question list");
  }

  const normalizedQuestions = parsed.reduce<GeneratedQuestion[]>((questions, rawQuestion) => {
    if (!rawQuestion || typeof rawQuestion !== "object") {
      return questions;
    }

    const rawType = "type" in rawQuestion ? rawQuestion.type : undefined;
    const rawOptions = "options" in rawQuestion ? rawQuestion.options : undefined;
    const normalizedOptions = (Array.isArray(rawOptions) ? rawOptions : [])
      .map(normalizeOption)
      .filter((option): option is GeneratedOption => option !== null);

    const correctCount = normalizedOptions.filter((option) => option.correct).length;

    const hasTrueFalseOptions =
      normalizedOptions.length === 2 &&
      normalizedOptions.every((option) =>
        ["true", "false"].includes(option.text.trim().toLowerCase())
      );

    const requestedType =
      generationMode === "mixed"
        ? isGeneratedQuestionType(rawType)
          ? rawType
          : null
        : generationMode;

    const inferredType =
      requestedType ??
      (hasTrueFalseOptions
        ? "true_false"
        : correctCount > 1
          ? "multiple_choice"
          : "single_choice");

    const resolvedType = inferredType ?? "single_choice";

    const normalizedQuestion =
      resolvedType === "true_false"
        ? normalizeTrueFalseQuestion(rawQuestion)
        : normalizeChoiceQuestion(rawQuestion, resolvedType);

    if (normalizedQuestion) {
      questions.push(normalizedQuestion);
    }

    return questions;
  }, []);

  const qualityFiltered = filterLowQualityQuestions(normalizedQuestions, lessonText);
  const deduplicated = deduplicateQuestions(qualityFiltered);

  if (deduplicated.length === 0) {
    throw new Error("AI did not return valid questions");
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

Output rules:
- Return ONLY valid JSON
- Do not use markdown
- Every question must include:
  - "type"
  - "question_text"
  - "options"

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

Return format:
[
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

Lesson content:
"""
${lessonTextPlaceholder}
"""
`;
}

export async function generateQuestionsFromLesson(
  lessonText: string,
  questionCount: number = 5,
  generationMode: AiQuestionGenerationMode = "single_choice"
): Promise<GeneratedQuestion[]> {
  const prompt = buildPrompt(questionCount, generationMode).replace(
    lessonTextPlaceholder,
    lessonText
  );

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content:
          "You generate high-quality quiz questions for beginner programming courses. Your questions should be clear, slightly thought-provoking, not copied from the lesson, and grounded only in the provided content.",
      },
      {
        role: "user",
        content: `
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

${prompt}
`,
      },
    ],
  });

  const response = completion.choices[0].message.content;

  if (!response) {
    throw new Error("AI returned empty response");
  }

  try {
    const parsed = JSON.parse(normalizeJsonResponse(response));
    const rawQuestions =
      parsed && typeof parsed === "object" && Array.isArray(parsed.questions)
        ? parsed.questions
        : null;

    if (!rawQuestions) {
      throw new Error("AI returned invalid response format");
    }

    const normalized = normalizeGeneratedQuestions(
      rawQuestions,
      generationMode,
      lessonText
    );

    return normalized.slice(0, questionCount);
  } catch (error) {
    if (error instanceof Error && error.message.trim()) {
      throw error;
    }

    throw new Error("Failed to parse AI response");
  }
}
