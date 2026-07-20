import { useState } from "react";
import { Code2 } from "lucide-react";
import type { LandingPreviewExercise, PublicLandingPreview } from "../types";

function getExerciseContentString(
  content: Record<string, unknown> | undefined,
  key: string,
  fallback = ""
) {
  const value = content?.[key];

  return typeof value === "string" ? value : fallback;
}

function getExerciseCodeTemplate(exercise: LandingPreviewExercise | null) {
  if (!exercise) {
    return "result = 5 {{answer}} 3";
  }

  return (
    getExerciseContentString(exercise.content, "initial_code") ||
    getExerciseContentString(exercise.content, "code_template") ||
    "result = 5 {{answer}} 3"
  );
}

function getExerciseExpectedAnswers(exercise: LandingPreviewExercise | null) {
  if (!exercise) {
    return ["+"];
  }

  const expectedAnswer = exercise.content.expected_answer;
  const correctAnswer = exercise.content.correct_answer;

  if (typeof expectedAnswer === "string") {
    return [expectedAnswer];
  }

  if (Array.isArray(correctAnswer)) {
    return correctAnswer.map((item) => String(item));
  }

  if (typeof correctAnswer === "string") {
    return [correctAnswer];
  }

  return ["+"];
}

function ExercisePreviewSession({ preview }: { preview: PublicLandingPreview }) {
  const exercise = preview.exercise;
  const question =
    getExerciseContentString(exercise?.content, "question") ||
    exercise?.description ||
    "Fill in the missing operator to perform addition.";
  const codeTemplate = getExerciseCodeTemplate(exercise);
  const codeParts = codeTemplate.split(/(___|{{blank_\d+}}|{{answer}})/g);
  const expectedAnswers = getExerciseExpectedAnswers(exercise);
  const [answers, setAnswers] = useState<string[]>(() => expectedAnswers.map(() => ""));
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);

  function handleCheckExercise() {
    const isCorrect = expectedAnswers.every(
      (expectedAnswer, index) => answers[index]?.trim() === expectedAnswer.trim()
    );

    setResult(isCorrect ? "correct" : "incorrect");
  }

  let blankIndex = 0;

  return (
    <div>
      <p className="text-sm font-extrabold text-[#6d6a9f]">
        {`Урок ${preview.module.order}.${preview.lesson.order} · Практика`}
      </p>
      <h3 className="mt-2 text-xl font-extrabold tracking-tight text-[#1f1b4d]">
        Практичні вправи
      </h3>
      <div className="mt-6 rounded-xl border-2 border-orange-200 bg-white p-5 shadow-sm sm:p-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-700">
          <Code2 className="h-4 w-4" />
          {exercise?.type === "drag_drop_code" ? "Заповнити пропуски в коді" : "Написати код"}
        </span>
        <p className="mt-2 text-sm font-bold leading-7 text-slate-700">
          {question}
        </p>
        <div className="mt-5 overflow-hidden rounded-xl bg-[#111827] px-5 py-4 font-mono text-sm font-bold text-slate-100">
          {codeParts.map((part, index) =>
            /^(___|{{blank_\d+}}|{{answer}})$/.test(part) ? (() => {
              const currentBlankIndex = blankIndex;
              blankIndex += 1;

              return (
                <input
                  key={`blank-${index}`}
                  value={answers[currentBlankIndex] ?? ""}
                  onChange={(event) => {
                    setAnswers((currentAnswers) =>
                      currentAnswers.map((answer, answerIndex) =>
                        answerIndex === currentBlankIndex ? event.target.value : answer
                      )
                    );
                    setResult(null);
                  }}
                  onFocus={() => {
                    setResult(null);
                  }}
                  className="mx-2 inline-flex w-32 rounded-xl border-2 border-orange-300 bg-white px-4 py-2 text-slate-900 outline-none focus:border-orange-500"
                  placeholder={`Відповідь`}
                />
              );
            })() : (
              <span key={`text-${index}`} className="whitespace-pre-wrap">
                {part}
              </span>
            )
          )}
        </div>
        {result ? (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-extrabold ${
              result === "correct"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {result === "correct"
              ? "Правильно. Система зарахувала відповідь."
              : "Поки неправильно. Спробуйте змінити відповідь або подивіться підказку."}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCheckExercise}
            className="rounded-xl bg-orange-500 px-5 py-3 text-xs font-extrabold text-white transition hover:bg-orange-600"
          >
            Перевірити
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswers(expectedAnswers.map(() => ""));
              setResult(null);
            }}
            className="rounded-xl border border-slate-300 px-5 py-3 text-xs font-extrabold text-slate-600"
          >
            Спробувати ще раз
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswers(expectedAnswers);
              setResult(null);
            }}
            className="px-4 py-3 text-xs font-extrabold text-slate-500"
          >
            Показати відповідь
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExercisePreviewContent({ preview }: { preview: PublicLandingPreview }) {
  return (
    <ExercisePreviewSession
      key={preview.exercise?.id ?? preview.lesson.id}
      preview={preview}
    />
  );
}
