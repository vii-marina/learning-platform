import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type GeneratedOption = {
  text: string;
  correct: boolean;
};

export type GeneratedQuestion = {
  question_text: string;
  options: GeneratedOption[];
};

export async function generateQuestionsFromLesson(
  lessonText: string,
  questionCount: number = 5
): Promise<GeneratedQuestion[]> {
  const prompt = `
You are an educational assistant.

Generate ${questionCount} multiple choice questions based on the lesson content.

Rules:
- Each question must have exactly 4 options
- Only one option can be correct
- Questions must test understanding of the lesson
- Do not repeat questions
- Return ONLY valid JSON

Return format:

[
 {
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
${lessonText}
"""
`;

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
    const parsed = JSON.parse(response);
    return parsed;
  } catch (err) {
    throw new Error("Failed to parse AI response");
  }
}