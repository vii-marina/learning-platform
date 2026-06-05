import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileChartColumn,
  ListTodo,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Menu,
  PenLine,
  Play,
  RefreshCw,
  Sparkles,
  Trophy,
  Code2,
  X,
  XCircle,
  FileUser,
} from "lucide-react";
import { publicBackendRequest } from "../../features/auth/api/backendClient";
import { getCourseMediaPublicUrl } from "../../features/courses/api/courseMediaStorage";

const COLORS = {
  primary: "#5549F1",
  navy: "#1F1B4D",
  muted: "#6D6A9F",
  lavender: "#F1F0FF",
  soft: "#FAFAFF",
  border: "rgba(85, 73, 241, 0.14)",
};

type IconComponent = typeof BookOpen;

type LandingPreviewLesson = {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  order: number;
};

type LandingPreviewModule = {
  id: string;
  course_id: string;
  title: string;
  order: number;
};

type LandingPreviewAnswer = {
  id: string;
  answer_text: string;
  is_correct: boolean;
};

type LandingPreviewQuestion = {
  id: string;
  type: "true_false" | "single_choice" | "multiple_choice";
  question_text: string;
  order: number;
  answers: LandingPreviewAnswer[];
};

type LandingPreviewTest = {
  id: string;
  title: string;
  after_lesson_id: string | null;
  module_id: string;
  questions: LandingPreviewQuestion[];
};

type LandingPreviewExercise = {
  id: string;
  module_id: string;
  after_lesson_id: string | null;
  type: "drag_drop_code" | "write_code";
  title: string;
  description: string | null;
  content: Record<string, unknown>;
};

type PublicLandingPreview = {
  course: {
    id: string;
    title: string;
    description: string | null;
    slug: string;
    thumbnail_path: string | null;
  };
  module: LandingPreviewModule;
  lesson: LandingPreviewLesson;
  module_lessons: LandingPreviewLesson[];
  test: LandingPreviewTest | null;
  exercise: LandingPreviewExercise | null;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center">
      <span className="inline-flex items-center rounded-full border border-[#c7c3ff] bg-[#f1f0ff] px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#5549f1]">
        {children}
      </span>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto mt-4 max-w-3xl text-center">
      <h2 className="text-3xl font-extrabold leading-tight text-[#1f1b4d] md:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-7 text-[#6d6a9f]">{subtitle}</p>
      ) : null}
    </div>
  );
}

function PrimaryLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5549f1] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_34px_rgba(85,73,241,0.28)] transition hover:bg-[#473ed4]"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#5549f1] bg-white px-5 py-3 text-sm font-bold text-[#5549f1] transition hover:bg-[#f1f0ff]"
    >
      {children}
    </Link>
  );
}

function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Превʼю курсу", href: "#course-preview" },
    { label: "Для викладачів", href: "#teachers" },
    { label: "Для студентів", href: "#students" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#5549f1]/10 bg-[#f8f7ff]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5549f1] text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-base font-extrabold text-[#1f1b4d]">EduCat</span>
        </Link>

        <nav className="hidden flex-1 justify-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[#6d6a9f] transition hover:bg-[#eceaff] hover:text-[#1f1b4d]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-xl px-4 py-2 text-sm font-bold text-[#1f1b4d] transition hover:bg-[#eceaff]"
          >
            Увійти
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-[#5549f1] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#473ed4]"
          >
            Створити акаунт
          </Link>
        </div>

        <button
          type="button"
          className="ml-auto rounded-xl p-2 text-[#1f1b4d] transition hover:bg-[#eceaff] md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Відкрити меню"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[#5549f1]/10 bg-[#f8f7ff] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#6d6a9f] hover:bg-[#eceaff]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            <SecondaryLink to="/login">Увійти</SecondaryLink>
            <PrimaryLink to="/register">Створити акаунт</PrimaryLink>
          </div>
        </div>
      ) : null}
    </header>
  );
}

type PreviewMode = "lesson" | "test" | "exercise";

const previewTabs: Array<{ key: PreviewMode; label: string; icon: IconComponent }> = [
  { key: "lesson", label: "Урок", icon: BookOpen },
  { key: "test", label: "Тест", icon: ClipboardList },
  { key: "exercise", label: "Вправа", icon: Code2 },
];

function PreviewTabs({
  mode,
  onModeChange,
  preview,
}: {
  mode: PreviewMode;
  onModeChange?: (mode: PreviewMode) => void;
  preview: PublicLandingPreview;
}) {
  const isModeAvailable = (nextMode: PreviewMode) =>
    nextMode === "lesson" ||
    (nextMode === "test" && Boolean(preview.test)) ||
    (nextMode === "exercise" && Boolean(preview.exercise));

  return (
    <div className="rounded-[1.4rem] bg-[#e6e1ff] p-1.5">
      <div className="grid grid-cols-3 gap-1">
        {previewTabs.map(({ key, label, icon: Icon }) => {
          const isActive = mode === key;
          const isAvailable = isModeAvailable(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (isAvailable) {
                  onModeChange?.(key);
                }
              }}
              disabled={!isAvailable}
              className={`flex items-center justify-center gap-2 rounded-[1.05rem] px-3 py-2.5 text-sm font-extrabold transition ${
                isActive
                  ? "bg-white text-[#5549f1] shadow-[0_10px_24px_rgba(31,27,77,0.1)]"
                  : isAvailable
                    ? "text-[#6d6a9f] hover:bg-white/45"
                    : "cursor-not-allowed text-[#6d6a9f]/35 blur-[0.35px]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PreviewSidebar({
  mode,
  onModeChange,
  preview,
}: {
  mode: PreviewMode;
  onModeChange?: (mode: PreviewMode) => void;
  preview: PublicLandingPreview;
}) {
  const sidebarItems = preview.module_lessons.flatMap((lesson) => {
    const lessonItems: Array<{
      id: string;
      label: string;
      type: PreviewMode;
      tone?: "exercise" | "test";
      available: boolean;
    }> = [
      {
        id: lesson.id,
        label: `${preview.module.order}.${lesson.order} ${lesson.title}`,
        type: "lesson",
        available: lesson.id === preview.lesson.id,
      },
    ];

    if (lesson.id === preview.lesson.id && preview.test) {
      lessonItems.push({
        id: preview.test.id,
        label: preview.test.title || preview.lesson.title,
        type: "test",
        tone: "test",
        available: true,
      });
    }

    if (lesson.id === preview.lesson.id && preview.exercise) {
      lessonItems.push({
        id: preview.exercise.id,
        label: preview.exercise.title || "Написати код",
        type: "exercise",
        tone: "exercise",
        available: true,
      });
    }

    return lessonItems;
  });

  return (
    <aside className="hidden min-h-0 overflow-hidden border-r border-[#5549f1]/15 bg-white md:block">
      <div className="border-b border-[#5549f1]/15 p-5">
        <PreviewTabs mode={mode} onModeChange={onModeChange} preview={preview} />
      </div>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="mt-1 text-[#6d6a9f]">⌄</span>
          <div>
            <h3 className="text-lg font-extrabold leading-7 text-[#1f1b4d]">
              {`Модуль ${preview.module.order}: ${preview.module.title}`}
            </h3>
            <p className="mt-2 text-sm font-extrabold text-[#6d6a9f]">
              {`0/${preview.module_lessons.length} виконано`}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-1">
          {sidebarItems.map((item) => {
            const isActive =
              (mode === "lesson" && item.type === "lesson" && item.id === preview.lesson.id) ||
              (mode === "exercise" && item.type === "exercise") ||
              (mode === "test" && item.type === "test");
            const Icon = item.type === "exercise" ? Code2 : item.type === "test" ? ClipboardList : Play;

            return (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                disabled={!item.available}
                onClick={() => {
                  if (item.available) {
                    onModeChange?.(item.type);
                  }
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-extrabold transition ${
                  isActive
                    ? item.tone === "exercise" && mode === "exercise"
                      ? "rounded-2xl bg-orange-50 text-orange-700"
                      : item.type === "lesson"
                        ? "bg-[#e7e2ff] text-[#5549f1]"
                        : "rounded-2xl bg-[#e7e2ff] text-[#5549f1]"
                    : !item.available
                      ? "cursor-not-allowed text-[#5b5686]/35 blur-[0.45px]"
                    : item.tone === "exercise"
                      ? "text-orange-600"
                      : item.tone === "test"
                        ? "text-[#5549f1]"
                        : "text-[#5b5686] hover:bg-[#f1f0ff]"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

const arithmeticLessonHtml = `
<p>An <strong>arithmetic operator</strong> is a symbol that represents an arithmetic computation. For example, the plus sign, <code>+</code>, performs addition.</p>
<pre data-code-variant="input" class="lesson-code-block lesson-code-block--input"><code>30 + 12</code></pre>
<pre data-code-variant="output" class="lesson-code-block lesson-code-block--output"><code>42</code></pre>
<p>The minus sign, <code>-</code>, is the operator that performs subtraction.</p>
<pre data-code-variant="input" class="lesson-code-block lesson-code-block--input"><code>43 - 1</code></pre>
<pre data-code-variant="output" class="lesson-code-block lesson-code-block--output"><code>42</code></pre>
<p>The asterisk, <code>*</code>, performs multiplication.</p>
<pre data-code-variant="input" class="lesson-code-block lesson-code-block--input"><code>6 * 7</code></pre>
<pre data-code-variant="output" class="lesson-code-block lesson-code-block--output"><code>42</code></pre>
<p>And the forward slash, <code>/</code>, performs division:</p>
<pre data-code-variant="input" class="lesson-code-block lesson-code-block--input"><code>84 / 2</code></pre>
<pre data-code-variant="output" class="lesson-code-block lesson-code-block--output"><code>42.0</code></pre>
<p>Notice that the result of the division is <code>42.0</code> rather than <code>42</code>. That is because there are two types of numbers in Python: integers and floating-point numbers.</p>
`;

const fallbackLandingPreview: PublicLandingPreview = {
  course: {
    id: "fallback-course",
    title: "Python Basics",
    description: null,
    slug: "python-basics",
    thumbnail_path: null,
  },
  module: {
    id: "fallback-module",
    course_id: "fallback-course",
    title: "Programming as a way of thinking",
    order: 1,
  },
  lesson: {
    id: "fallback-lesson",
    module_id: "fallback-module",
    title: "Arithmetic operators",
    content: arithmeticLessonHtml,
    order: 2,
  },
  module_lessons: [
    {
      id: "fallback-lesson-1",
      module_id: "fallback-module",
      title: "Programming as a way of thinking",
      content: null,
      order: 1,
    },
    {
      id: "fallback-lesson",
      module_id: "fallback-module",
      title: "Arithmetic operators",
      content: arithmeticLessonHtml,
      order: 2,
    },
    {
      id: "fallback-lesson-3",
      module_id: "fallback-module",
      title: "Expressions",
      content: null,
      order: 3,
    },
    {
      id: "fallback-lesson-4",
      module_id: "fallback-module",
      title: "Arithmetic functions",
      content: null,
      order: 4,
    },
    {
      id: "fallback-lesson-5",
      module_id: "fallback-module",
      title: "Strings",
      content: null,
      order: 5,
    },
  ],
  test: {
    id: "fallback-test",
    title: "Arithmetic operators",
    after_lesson_id: "fallback-lesson",
    module_id: "fallback-module",
    questions: [],
  },
  exercise: {
    id: "fallback-exercise",
    module_id: "fallback-module",
    after_lesson_id: "fallback-lesson",
    type: "write_code",
    title: "Написати код",
    description: null,
    content: {
      type: "write_code",
      question: "Fill in the missing operator to perform addition.",
      initial_code: "result = 5 {{answer}} 3",
      expected_answer: "+",
    },
  },
};

function LessonPreviewContent({ preview }: { preview: PublicLandingPreview }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-semibold text-[#6d6a9f]">
        <span>{`Модуль ${preview.module.order}`}</span>
        <ArrowRight className="h-3.5 w-3.5" />
        <span>{`Урок ${preview.module.order}.${preview.lesson.order}`}</span>
      </p>
      <h3 className="mt-1.5 text-xl font-bold tracking-tight text-[#1f1b4d] md:text-2xl">
        {preview.lesson.title}
      </h3>
      <div
        className="prose prose-slate mt-3 max-w-none text-slate-700 prose-headings:text-[#1f1b4d] prose-a:text-[#5549f1]"
        dangerouslySetInnerHTML={{ __html: preview.lesson.content || arithmeticLessonHtml }}
      />
    </div>
  );
}

const arithmeticQuestions = [
  {
    text: "What does the plus sign (+) represent in arithmetic operations?",
    answers: ["Subtraction", "Addition", "Multiplication", "Division"],
    correctIndexes: [1],
    type: "single_choice" as const,
  },
  {
    text: "What type of number is the result of dividing two integers in Python?",
    answers: ["Integer", "Floating-point number", "String", "Boolean"],
    correctIndexes: [1],
    type: "single_choice" as const,
  },
  {
    text: "What is the result of the operation 84 // 2 in Python?",
    answers: ["42.0", "42", "43", "41"],
    correctIndexes: [1],
    type: "single_choice" as const,
  },
  {
    text: "What does the operator ** do in Python?",
    answers: [
      "Performs multiplication",
      "Performs exponentiation",
      "Performs division",
      "Performs subtraction",
    ],
    correctIndexes: [1],
    type: "single_choice" as const,
  },
  {
    text: "What is the result of the operation 85 // 2 in Python?",
    answers: ["42.5", "42", "43", "41"],
    correctIndexes: [1],
    type: "single_choice" as const,
  },
];

function getPreviewQuestions(preview: PublicLandingPreview) {
  const backendQuestions = preview.test?.questions ?? [];

  if (backendQuestions.length === 0) {
    return arithmeticQuestions;
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

function TestPreviewContent({ preview }: { preview: PublicLandingPreview }) {
  return <TestPreviewSession key={preview.test?.id ?? preview.lesson.id} preview={preview} />;
}

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
  const exercise = preview.exercise ?? fallbackLandingPreview.exercise;
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

function ExercisePreviewContent({ preview }: { preview: PublicLandingPreview }) {
  return (
    <ExercisePreviewSession
      key={preview.exercise?.id ?? preview.lesson.id}
      preview={preview}
    />
  );
}

function CoursePreviewFrame({
  mode,
  preview,
  onModeChange,
  compact = false,
}: {
  mode: PreviewMode;
  preview: PublicLandingPreview;
  onModeChange?: (mode: PreviewMode) => void;
  compact?: boolean;
}) {
  const canOpenExercise = Boolean(preview.exercise);
  const canOpenTest = Boolean(preview.test);
  const previousMode =
    mode === "test"
      ? canOpenExercise
        ? "exercise"
        : "lesson"
      : mode === "exercise"
        ? "lesson"
        : null;
  const nextMode =
    mode === "lesson"
      ? canOpenExercise
          ? "exercise"
          : canOpenTest
            ? "test"
            : null
      : mode === "exercise"
        ? canOpenTest
          ? "test"
          : null
        : null;

  return (
    <div
      className={`mx-auto h-[34rem] w-full overflow-hidden rounded-[1.5rem] border border-[#dedcff] bg-white text-left shadow-[0_24px_70px_rgba(31,27,77,0.08)] ${
        compact ? "mt-8 max-w-5xl" : "mt-0 max-w-6xl rounded-t-none border-t-0"
      }`}
    >
      <div className="grid h-full md:grid-cols-[320px_minmax(0,1fr)]">
        <PreviewSidebar mode={mode} onModeChange={onModeChange} preview={preview} />
        <div className="border-b border-[#5549f1]/15 p-4 md:hidden">
          <PreviewTabs mode={mode} onModeChange={onModeChange} preview={preview} />
        </div>
        <main className="flex h-full min-h-0 flex-col bg-[#f1f0ff]">
          <div
            className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${
              mode === "exercise" ? "" : "mx-auto w-full max-w-[58rem]"
            }`}
          >
            {mode === "lesson" ? (
              <LessonPreviewContent preview={preview} />
            ) : mode === "test" ? (
              <TestPreviewContent preview={preview} />
            ) : (
              <ExercisePreviewContent preview={preview} />
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[#dedcff] bg-white px-6 py-4">
            <button
              type="button"
              disabled={!previousMode}
              onClick={() => {
                if (previousMode) {
                  onModeChange?.(previousMode);
                }
              }}
              className="inline-flex min-w-[11rem] items-center justify-start gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Попередній урок
            </button>
            <button
              type="button"
              disabled={!nextMode}
              onClick={() => {
                if (nextMode) {
                  onModeChange?.(nextMode);
                }
              }}
              className={`inline-flex min-w-[11rem] items-center justify-end gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                mode === "lesson"
                  ? "border-orange-200 bg-white text-orange-800 hover:bg-orange-50"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {mode === "lesson"
                ? "Відкрити вправи"
                : mode === "test"
                  ? "Наступний урок"
                  : "Наступна вправа"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function LandingCourseSummary({ preview }: { preview: PublicLandingPreview }) {
  const thumbnailUrl = getCourseMediaPublicUrl(preview.course.thumbnail_path);
  const description =
    preview.course.description?.trim() ||
    "Курс показано у форматі, близькому до реального проходження студентом: урок, тест і практика в одному потоці.";

  return (
    <div className="mx-auto mt-12 max-w-6xl rounded-t-xl border border-b-0 border-[#dedcff] bg-white p-5 text-left shadow-[0_18px_54px_rgba(31,27,77,0.06)] md:p-6">
      <div className="grid gap-5 md:grid-cols-[16rem_minmax(0,1fr)] md:items-center">
        <div className="aspect-video overflow-hidden rounded-[1rem] border border-[#dedcff] bg-[#1f1b4d]">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={preview.course.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#1f1b4d] text-white">
              <BookOpen className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[#1f1b4d] ">
            {preview.course.title}
          </h2>
          <p className="mt-3 max-h-28 overflow-y-auto pr-2 text-sm font-semibold leading-7 text-[#6d6a9f]">
            {description}
          </p>
          
        </div>
      </div>
    </div>
  );
}



function Hero() {
  return (
    <section className="bg-[#f8f7ff] px-5 pb-16 pt-16 text-center md:pt-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c7c3ff] bg-[#eceaff] px-4 py-1.5 text-sm font-bold text-[#5549f1]">
          <Sparkles className="h-5 w-5" />
          Навчальна платформа з AI-генерацією завдань
        </div>
        <h1 className="text-4xl font-extrabold leading-[1.08] text-[#1f1b4d] sm:text-5xl lg:text-6xl">
          Створюйте курси.
          <span className="text-[#5549f1]"> Закріплюйте знання практикою.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#6d6a9f]">
          EduCat допомагає викладачам створювати структуровані курси з уроками, тестами й вправами, 
          а студентам — послідовно проходити навчання та відстежувати власний прогрес.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <PrimaryLink to="/register">
            Створити акаунт <ArrowRight className="h-4 w-4" />
          </PrimaryLink>
          <SecondaryLink to="/login">
            Увійти в кабінет <ArrowRight className="h-4 w-4" />
          </SecondaryLink>
        </div>
      </div>
    </section>
  );
}

function CoursePreviewSection({ preview }: { preview: PublicLandingPreview }) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("lesson");
  const resolvedPreviewMode =
    (previewMode === "test" && !preview.test) ||
    (previewMode === "exercise" && !preview.exercise)
      ? "lesson"
      : previewMode;

  return (
    <section id="course-preview" className="bg-[#f8f7ff] px-5 pb-16 pt-4 text-center">
      <LandingCourseSummary preview={preview} />
      <CoursePreviewFrame
        mode={resolvedPreviewMode}
        preview={preview}
        onModeChange={setPreviewMode}
      />
    </section>
  );
}

function AudienceCards() {
  const cards = [
    {
      icon: PenLine,
      title: "Для викладачів",
      text: "Створюйте навчальні курси. Переглядайте структуру перед публікацією та редагуйте матеріали у зручному конструкторі.",
      features: [
        "Конструктор курсів, модулів і уроків",
        "AI-генерація тестів і практичних вправ",
        "Публікація, архівація та редагування курсів",
      ],
      action: "Створити курс",
      to: "/register",
      variant: "light",
    },
    {
      icon: BookOpen,
      title: "Для студентів",
      text: "Проходьте уроки, виконуйте тести й практичні вправи. Поступово рухайтеся між темами та відстежуйте власний прогрес.",
      features: [
        "Особистий кабінет із прогресом навчання",
        "Уроки, тести й вправи в одній структурі",
        "Послідовне проходження тем курсу",
      ],
      action: "Перейти до навчання",
      to: "/register",
      variant: "primary",
    },
  ];

  return (
    <section className="bg-white px-5 py-16">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {cards.map(({ icon: Icon, title, text, features, action, to, variant }) => (
          <div
            key={title}
            className={`flex min-h-[360px] flex-col rounded-xl border p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
              variant === "primary"
                ? "border-transparent bg-[#5549f1] text-white"
                : "border-[#5549f1]/15 bg-white"
            }`}
          >
            <div className="flex items-center gap-4">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  variant === "primary" ? "bg-white/15" : "bg-[#ede9ff]"
                }`}
              >
                <Icon className={`h-6 w-6 ${variant === "primary" ? "text-white" : "text-[#5549f1]"}`} />
              </span>
              <h3 className={`text-2xl font-extrabold
              ${variant === "primary" ? "text-white" : "text-[#5549f1]"}
              `}>{title}</h3>
            </div>
            <p
              className={`mt-5 text-sm leading-7 ${
                variant === "primary" ? "text-white/75" : "text-[#6d6a9f]"
              }`}
            >
              {text}
            </p>
            <ul className="mt-5 space-y-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm font-semibold">
                  <CheckCircle2
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      variant === "primary" ? "text-emerald-200" : "text-emerald-500"
                    }`}
                  />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              {variant === "primary" ? (
                <Link
                  to={to}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#5549f1] transition hover:bg-[#f1f0ff]"
                >
                  {action} <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <SecondaryLink to={to}>
                  {action} <ArrowRight className="h-4 w-4" />
                </SecondaryLink>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const teacherFeatures: Array<{
  icon: IconComponent;
  color: string;
  bg: string;
  title: string;
  text: string;
}> = [
  {
    icon: Layers,
    color: "#5549F1",
    bg: "#EDE9FF",
    title: "Мої курси",
    text: "Створення й редагування",
  },
  {
    icon: FileUser,
    color: "#F97316",
    bg: "#FFEDD5",
    title: "Студенти",
    text: "Інформація про учасників",
  },
  {
    icon: FileChartColumn,
    color: "#0891B2",
    bg: "#CFFAFE",
    title: "Результати",
    text: "Прогрес проходження",
  },
  {
    icon: ListTodo,
    color: "#096f4d",
    bg: "#b7ead9",
    title: "Тести й вправи",
    text: "Перевірка знань",
  },
];

const studentFeatures: Array<{
  icon: IconComponent;
  color: string;
  bg: string;
  title: string;
  text: string;
}> = [
  {
    icon: LayoutDashboard,
    color: "#5549F1",
    bg: "#EDE9FF",
    title: "Власний темп",
    text: "Навчання без обмежень",
  },
  {
    icon: FileChartColumn,
    color: "#F97316",
    bg: "#FFEDD5",
    title: "Відстежуйте прогрес",
    text: "Слідкуйте за успіхами",
  },
  {
    icon: BookOpen,
    color: "#0891B2",
    bg: "#CFFAFE",
    title: "Практика & тести",
    text: "Закріплюйте знання",
  },
  {
    icon: Trophy,
    color: "#096f4d",
    bg: "#b7ead9",
    title: "Мотивація",
    text: "Короткі досяжні етапи",
  },
];

function FeatureGrid({
  id,
  label,
  title,
  subtitle,
  items,
  tinted = false,
}: {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  items: typeof teacherFeatures;
  tinted?: boolean;
}) {
  return (
    <section id={id} className={`px-5 py-16 ${tinted ? "bg-[#f1f0ff]" : "bg-white"}`}>
      <div className="mx-auto max-w-5xl">
        <SectionLabel>{label}</SectionLabel>
        <SectionHeading title={title} subtitle={subtitle} />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, color, bg, title: itemTitle, text }) => (
            <div
              key={itemTitle}
              className="rounded-xl border border-[#5549f1]/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: bg }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold leading-5 text-[#1f1b4d]">
                    {itemTitle}
                  </h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#6d6a9f]">
                    {text}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqItems = [
  {
    question: "Чи можна створювати курс без технічної підготовки?",
    answer:
      "Так. Викладач працює з готовою структурою: опис курсу, модулі, уроки, тести й вправи. AI може допомогти з чернетками контенту.",
  },
  {
    question: "Як студент проходить курс?",
    answer:
      "Студент відкриває курс у кабінеті, бачить структуру в сайдбарі та послідовно проходить урок, тест і вправу.",
  },
  {
    question: "Для чого потрібне превʼю курсу?",
    answer:
      "Перед публікацією викладач бачить курс у студентському вигляді та може виправити незрозумілі місця.",
  },
  {
    question: "Чи підтримуються практичні завдання з кодом?",
    answer:
      "Так. Уроки можна доповнювати coding-вправами, де студент пише розвʼязок і перевіряє результат.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white px-5 py-20">
      <div className="mx-auto max-w-2xl">
        <SectionLabel>FAQ</SectionLabel>
        <SectionHeading title="Поширені питання" />
        <div className="mt-10 space-y-3">
          {faqItems.map((item, index) => (
            <div
              key={item.question}
              className="overflow-hidden rounded-2xl border border-[#5549f1]/15"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                style={{ background: open === index ? COLORS.lavender : "#fff" }}
                onClick={() => setOpen(open === index ? null : index)}
              >
                <span className="text-sm font-extrabold text-[#1f1b4d]">
                  {item.question}
                </span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-[#5549f1] transition"
                  style={{ transform: open === index ? "rotate(180deg)" : "none" }}
                />
              </button>
              {open === index ? (
                <div className="bg-[#f1f0ff] px-5 pb-5 text-sm leading-7 text-[#6d6a9f]">
                  {item.answer}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-[#f1f0ff] px-5 py-20">
      <div className="mx-auto max-w-3xl rounded-[28px] bg-[#1f1b4d] px-6 py-12 text-center shadow-[0_24px_70px_rgba(31,27,77,0.16)] sm:px-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5549f1] text-white">
          <GraduationCap className="h-7 w-7" />
        </span>
        <h2 className="mt-6 text-3xl font-extrabold leading-tight text-white md:text-4xl">
          Готові створити курс або почати навчання?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/60">
          EduCat об’єднує курси, уроки, тести, вправи та прогрес навчання 
          в одному зручному середовищі.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <PrimaryLink to="/register">
            Створити акаунт <ArrowRight className="h-4 w-4" />
          </PrimaryLink>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Увійти <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-[#5549f1]/10 bg-white px-5 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5549f1] text-white">
            <GraduationCap className="h-4 w-4" />
          </span>
          <span className="font-extrabold text-[#1f1b4d]">EduCat</span>
        </Link>
        <p className="text-xs text-[#6d6a9f]">
          Платформа для створення курсів, проходження уроків і виконання практичних завдань.
        </p>
        <div className="flex gap-4 text-xs font-semibold text-[#6d6a9f]">
          <a href="#course-preview" className="hover:text-[#5549f1]">
            Превʼю курсу
          </a>
          <a href="#faq" className="hover:text-[#5549f1]">
            FAQ
          </a>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  const [landingPreview, setLandingPreview] = useState<PublicLandingPreview | null>(null);
  const preview = landingPreview ?? fallbackLandingPreview;

  useEffect(() => {
    let isMounted = true;

    async function loadLandingPreview() {
      try {
        const loadedPreview = await publicBackendRequest<PublicLandingPreview>(
          "/public/landing-preview"
        );

        if (isMounted) {
          setLandingPreview(loadedPreview);
        }
      } catch {
        if (isMounted) {
          setLandingPreview(null);
        }
      }
    }

    void loadLandingPreview();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1f1b4d]">
      <LandingNavbar />
      <main>
        <Hero />
        <AudienceCards />
        <CoursePreviewSection preview={preview} />
        <FeatureGrid
          id="teachers"
          label="Викладачам"
          title="Керування курсами та студентами"
          subtitle="Викладач створює курси, переглядає студентів і відстежує результати навчання."
          items={teacherFeatures}
          tinted
        />
        <FeatureGrid
          id="students"
          label="Студентам"
          title="Зручне проходження курсу"
          subtitle="Студент проходить уроки, тести й вправи у своєму темпі та бачить інформацію про викладача."
          items={studentFeatures}
        />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
