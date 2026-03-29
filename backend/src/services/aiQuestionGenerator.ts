import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

function normalizeOption(option: unknown) {
  if (!option || typeof option !== "object") {
    return null;
  }

  const text = "text" in option && typeof option.text === "string"
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

function normalizeTrueFalseQuestion(rawQuestion: unknown) {
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
    type: "true_false" as const,
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
) {
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

function normalizeGeneratedQuestions(
  parsed: unknown,
  generationMode: AiQuestionGenerationMode
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

  if (normalizedQuestions.length === 0) {
    throw new Error("AI did not return valid questions");
  }

  return normalizedQuestions;
}

function buildPrompt(questionCount: number, generationMode: AiQuestionGenerationMode) {
  const baseRules = `
You are an educational assistant.

Generate ${questionCount} quiz questions based on the lesson content.

Rules:
- Questions must test understanding of the lesson
- Do not repeat questions
- Return ONLY valid JSON
- Every question must include a "type" field
- Allowed types: "true_false", "single_choice", "multiple_choice"
`;

  const modeRules =
    generationMode === "true_false"
      ? `
- Every question must have type "true_false"
- Every question must have exactly 2 options
- The options must be exactly "True" and "False"
- Exactly one option must be correct
`
      : generationMode === "single_choice"
        ? `
- Every question must have type "single_choice"
- Every question must have exactly 4 options
- Exactly one option must be correct
`
        : generationMode === "multiple_choice"
          ? `
- Every question must have type "multiple_choice"
- Every question must have exactly 4 options
- At least 2 options must be correct
`
          : `
- Use a mix of question types across the full set
- Include more than one question type when the question count allows it
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
   {"text":"Option A","correct":false},
   {"text":"Option B","correct":true},
   {"text":"Option C","correct":false},
   {"text":"Option D","correct":false}
  ]
 }
]

Lesson content:
"""
${lessonTextPlaceholder}
"""
`;
}

const lessonTextPlaceholder = "__LESSON_TEXT__";

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
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: "You generate quiz questions for educational platforms.",
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
    return normalizeGeneratedQuestions(parsed, generationMode);
  } catch (err) {
    throw new Error("Failed to parse AI response");
  }
}
