import { useState } from "react";
import { ArrowRight, Check, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import type { PublicLandingPreview } from "../types";

const fallbackPreviewQuestions = [
  {
    text: "Позначте правильну відповідь.",
    answers: ["Правильна відповідь", "Неправильна відповідь"],
    correctIndexes: [0],
    type: "single_choice" as const,
  },
];

function getPreviewQuestions(preview: PublicLandingPreview) {
  const backendQuestions = preview.test?.questions ?? [];

  if (backendQuestions.length === 0) {
    return fallbackPreviewQuestions;
  }

  return backendQuestions.map((question) => ({
    text: question.question_text,
    type: question.type,
    answers:
      question.answers.length > 0
        ? question.answers.map((answer) => answer.answer_text)
        : ["Правда", "Неправда"],
    correctIndexes: question.answers
      .map((answer, index) => (answer.is_correct ? index : -1))
      .filter((index) => index >= 0),
  }));
}

function TestPreviewSession({ preview }: { preview: PublicLandingPreview }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number[]>>({});
  const [checkedResults, setCheckedResults] = useState<Record<number, "correct" | "incorrect">>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const questions = getPreviewQuestions(preview);
  const question = questions[questionIndex] ?? questions[0];
  const questionSelections = selectedAnswers[questionIndex] ?? [];
  const questionResult = checkedResults[questionIndex] ?? null;
  const correctCount = Object.values(checkedResults).filter((result) => result === "correct").length;
  const isMultiple = question?.type === "multiple_choice";

  function handleCheckAnswer() {
    const correctIndexes = question?.correctIndexes ?? [];
    const isCorrect =
      questionSelections.length === correctIndexes.length &&
      questionSelections.every((selectedIndex) => correctIndexes.includes(selectedIndex));

    setCheckedResults((currentResults) => ({
      ...currentResults,
      [questionIndex]: isCorrect ? "correct" : "incorrect",
    }));
  }

  function handleNextQuestion() {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((currentIndex) => currentIndex + 1);
      return;
    }

    setIsSubmitted(true);
  }

  return (
    <div>
      <p className="text-sm font-extrabold text-[#6d6a9f]">
        {`Урок ${preview.module.order}.${preview.lesson.order} · Перевірка знань`}
      </p>
      <h3 className="mt-2 text-xl font-extrabold tracking-tight text-[#1f1b4d]">
        {preview.test?.title || preview.lesson.title}
      </h3>
      <div className="mt-6 flex items-center justify-between text-sm font-extrabold text-[#6d6a9f]">
        <span>{`Запитання ${questionIndex + 1} з ${questions.length}`}</span>
        <span>{`${Object.keys(checkedResults).length} відповідей`}</span>
      </div>
      <div
        className="mt-3 grid overflow-hidden rounded-xl border border-[#d8d3ff] bg-[#e7e2ff]"
        style={{ gridTemplateColumns: `repeat(${Math.max(questions.length, 1)}, minmax(0, 1fr))` }}
      >
        {questions.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setQuestionIndex(index)}
            className={`py-2 text-center text-xs font-extrabold transition ${
              checkedResults[index] === "correct"
                ? "bg-emerald-500 text-white"
                : checkedResults[index] === "incorrect"
                  ? "bg-rose-500 text-white"
                  : questionIndex === index
                    ? "bg-[#5549f1] text-white"
                    : "text-[#6d6a9f]"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {isSubmitted ? (
        <div className="mt-6 rounded-xl border border-[#d8d3ff] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-xl font-extrabold text-emerald-700">
            {questions.length ? `${Math.round((correctCount / questions.length) * 100)}%` : "0%"}
          </div>
          <h4 className="mt-5 text-2xl font-extrabold text-[#1f1b4d]">Тест завершено</h4>
          <p className="mt-2 text-sm font-extrabold text-[#6d6a9f]">
            {`Правильних відповідей: ${correctCount} з ${questions.length}`}
          </p>
          <button
            type="button"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-[#ded9ff] px-5 py-3 text-xs font-extrabold text-[#5549f1] transition hover:bg-[#f1f0ff]"
            onClick={() => {
              setQuestionIndex(0);
              setSelectedAnswers({});
              setCheckedResults({});
              setIsSubmitted(false);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Пройти ще раз
          </button>
        </div>
      ) : (
      <div className="relative mt-6 rounded-xl border border-[#d8d3ff] bg-white p-5 shadow-sm sm:p-6">
        {questionResult ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/65 px-4 backdrop-blur-[3px]">
            <div className="max-w-sm rounded-3xl border border-[#ded9ff] bg-white px-5 py-6 text-center shadow-[0_18px_42px_rgba(31,27,77,0.16)]">
              <div
                className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                  questionResult === "correct"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {questionResult === "correct" ? (
                  <CheckCircle2 className="h-7 w-7" />
                ) : (
                  <XCircle className="h-7 w-7" />
                )}
              </div>
              <p className="mt-3 text-base font-extrabold text-[#1f1b4d]">
                {questionResult === "correct" ? "Правильна відповідь" : "Відповідь неправильна"}
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#5549f1] px-5 py-3 text-sm font-extrabold text-white"
                onClick={handleNextQuestion}
              >
                {questionIndex < questions.length - 1 ? "Наступне запитання" : "Показати результат"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f1f0ff] px-3 py-1 text-xs font-extrabold text-[#5549f1]">
            <span
              className={`h-4 w-4 border-2 border-[#5549f1] ${
                isMultiple ? "rounded-[5px]" : "rounded-full"
              }`}
            />
            {isMultiple ? "Кілька правильних відповідей" : "Одна правильна відповідь"}
          </span>
          <span className="text-xs font-extrabold text-[#6d6a9f]">
            {isMultiple ? "Можна обрати кілька варіантів" : "Оберіть один варіант"}
          </span>
        </div>
        <h4 className="mt-5 text-ml font-extrabold leading-7 text-[#1f1b4d]">
          {question.text}
        </h4>
        <div className="mt-5 space-y-3">
          {(question?.answers ?? []).map((answer, index) => (
            <button
              type="button"
              key={answer}
              onClick={() => {
                setSelectedAnswers((currentAnswers) => {
                  const currentSelections = currentAnswers[questionIndex] ?? [];
                  const nextSelections = isMultiple
                    ? currentSelections.includes(index)
                      ? currentSelections.filter((selectedIndex) => selectedIndex !== index)
                      : [...currentSelections, index]
                    : [index];

                  return {
                    ...currentAnswers,
                    [questionIndex]: nextSelections,
                  };
                });
              }}
              className={`flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3 text-left text-xs font-extrabold transition ${
                questionSelections.includes(index)
                  ? "border-[#5549f1] bg-[#f1f0ff] text-[#5549f1]"
                  : "border-[#ded9ff] bg-white text-[#1f1b4d] hover:bg-[#fbfaff]"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center border-2 text-xs ${
                  isMultiple ? "rounded-lg" : "rounded-full"
                } ${
                  questionSelections.includes(index)
                    ? "border-[#5549f1] bg-[#5549f1] text-white"
                    : "border-[#ded9ff] text-[#6d6a9f]"
                }`}
              >
                {String.fromCharCode(65 + index)}
              </span>
              {answer}
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={questionSelections.length === 0}
            onClick={handleCheckAnswer}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5549f1] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#4035d6] disabled:cursor-not-allowed disabled:bg-[#8f84f6]/55"
          >
            Перевірити відповідь <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

export function TestPreviewContent({ preview }: { preview: PublicLandingPreview }) {
  return <TestPreviewSession key={preview.test?.id ?? preview.lesson.id} preview={preview} />;
}
