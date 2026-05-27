import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Code2,
  Eye,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Menu,
  PenLine,
  Play,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { publicBackendRequest } from "../../features/auth/api/backendClient";

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
    { label: "Превʼю платформи", href: "#features" },
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
}: {
  mode: PreviewMode;
  onModeChange?: (mode: PreviewMode) => void;
}) {
  return (
    <div className="rounded-[1.4rem] bg-[#e6e1ff] p-1.5">
      <div className="grid grid-cols-3 gap-1">
        {previewTabs.map(({ key, label, icon: Icon }) => {
          const isActive = mode === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onModeChange?.(key)}
              className={`flex items-center justify-center gap-2 rounded-[1.05rem] px-3 py-2.5 text-sm font-extrabold transition ${
                isActive
                  ? "bg-white text-[#5549f1] shadow-[0_10px_24px_rgba(31,27,77,0.1)]"
                  : "text-[#6d6a9f] hover:bg-white/45"
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
    }> = [
      {
        id: lesson.id,
        label: `${preview.module.order}.${lesson.order} ${lesson.title}`,
        type: "lesson",
      },
    ];

    if (lesson.id === preview.lesson.id && preview.exercise) {
      lessonItems.push({
        id: preview.exercise.id,
        label: preview.exercise.title || "Написати код",
        type: "exercise",
        tone: "exercise",
      });
    }

    if (lesson.id === preview.lesson.id && preview.test) {
      lessonItems.push({
        id: preview.test.id,
        label: preview.test.title || preview.lesson.title,
        type: "test",
        tone: "test",
      });
    }

    return lessonItems;
  });

  return (
    <aside className="hidden min-h-0 overflow-hidden border-r border-[#5549f1]/15 bg-white md:block">
      <div className="border-b border-[#5549f1]/15 p-5">
        <PreviewTabs mode={mode} onModeChange={onModeChange} />
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
              <div
                key={`${item.type}-${item.id}`}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-extrabold ${
                  isActive
                    ? item.tone === "exercise" && mode === "exercise"
                      ? "rounded-2xl bg-orange-50 text-orange-700"
                      : item.type === "lesson"
                        ? "bg-[#e7e2ff] text-[#5549f1]"
                        : "rounded-2xl bg-[#e7e2ff] text-[#5549f1]"
                    : item.tone === "exercise"
                      ? "text-orange-600"
                      : "text-[#5b5686]"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 truncate">{item.label}</span>
              </div>
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
  },
  {
    text: "What type of number is the result of dividing two integers in Python?",
    answers: ["Integer", "Floating-point number", "String", "Boolean"],
  },
  {
    text: "What is the result of the operation 84 // 2 in Python?",
    answers: ["42.0", "42", "43", "41"],
  },
  {
    text: "What does the operator ** do in Python?",
    answers: [
      "Performs multiplication",
      "Performs exponentiation",
      "Performs division",
      "Performs subtraction",
    ],
  },
  {
    text: "What is the result of the operation 85 // 2 in Python?",
    answers: ["42.5", "42", "43", "41"],
  },
];

function getPreviewQuestions(preview: PublicLandingPreview) {
  const backendQuestions = preview.test?.questions ?? [];

  if (backendQuestions.length === 0) {
    return arithmeticQuestions;
  }

  return backendQuestions.map((question) => ({
    text: question.question_text,
    answers:
      question.answers.length > 0
        ? question.answers.map((answer) => answer.answer_text)
        : ["Правда", "Неправда"],
  }));
}

function TestPreviewContent({ preview }: { preview: PublicLandingPreview }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const questions = getPreviewQuestions(preview);
  const question = questions[questionIndex] ?? questions[0];

  useEffect(() => {
    setQuestionIndex(0);
  }, [preview.test?.id]);

  return (
    <div>
      <p className="text-sm font-extrabold text-[#6d6a9f]">
        {`Урок ${preview.module.order}.${preview.lesson.order} · Перевірка знань`}
      </p>
      <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1f1b4d]">
        {preview.test?.title || preview.lesson.title}
      </h3>
      <div className="mt-6 flex items-center justify-between text-sm font-extrabold text-[#6d6a9f]">
        <span>{`Запитання ${questionIndex + 1} з ${questions.length}`}</span>
        <span>0 відповідей</span>
      </div>
      <div className="mt-3 grid grid-cols-5 overflow-hidden rounded-2xl border border-[#d8d3ff] bg-[#e7e2ff]">
        {questions.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setQuestionIndex(index)}
            className={`py-3 text-center text-sm font-extrabold transition ${
              questionIndex === index ? "bg-[#5549f1] text-white" : "text-[#6d6a9f]"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-[#d8d3ff] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f1f0ff] px-3 py-1 text-xs font-extrabold text-[#5549f1]">
            <span className="h-4 w-4 rounded-full border-2 border-[#5549f1]" />
            Одна правильна відповідь
          </span>
          <span className="text-xs font-extrabold text-[#6d6a9f]">
            Оберіть один варіант
          </span>
        </div>
        <h4 className="mt-5 text-xl font-extrabold leading-7 text-[#1f1b4d]">
          {question.text}
        </h4>
        <div className="mt-5 space-y-3">
          {(question?.answers ?? []).map((answer, index) => (
            <button
              type="button"
              key={answer}
              className="flex w-full items-center gap-4 rounded-2xl border-2 border-[#ded9ff] bg-white px-4 py-3 text-left text-sm font-extrabold text-[#1f1b4d] transition hover:bg-[#fbfaff]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#ded9ff] text-xs text-[#6d6a9f]">
                {String.fromCharCode(65 + index)}
              </span>
              {answer}
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button className="inline-flex items-center gap-2 rounded-2xl bg-[#8f84f6] px-5 py-3 text-sm font-extrabold text-white">
            Перевірити відповідь <CheckCircle2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
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

function ExercisePreviewContent({ preview }: { preview: PublicLandingPreview }) {
  const exercise = preview.exercise ?? fallbackLandingPreview.exercise;
  const question =
    getExerciseContentString(exercise?.content, "question") ||
    exercise?.description ||
    "Fill in the missing operator to perform addition.";
  const codeTemplate = getExerciseCodeTemplate(exercise);
  const codeParts = codeTemplate.split(/(___|{{blank_\d+}}|{{answer}})/g);

  return (
    <div>
      <p className="text-sm font-extrabold text-[#6d6a9f]">
        {`Урок ${preview.module.order}.${preview.lesson.order} · Практика`}
      </p>
      <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1f1b4d]">
        Практичні вправи
      </h3>
      <div className="mt-6 rounded-3xl border-2 border-orange-200 bg-white p-5 shadow-sm sm:p-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-extrabold text-orange-700">
          <Code2 className="h-4 w-4" />
          {exercise?.type === "drag_drop_code" ? "Заповнити пропуски в коді" : "Написати код"}
        </span>
        <p className="mt-6 text-base font-bold leading-7 text-slate-700">
          {question}
        </p>
        <div className="mt-5 overflow-hidden rounded-2xl bg-[#111827] px-5 py-4 font-mono text-base font-bold text-slate-100">
          {codeParts.map((part, index) =>
            /^(___|{{blank_\d+}}|{{answer}})$/.test(part) ? (
              <span
                key={`blank-${index}`}
                className="mx-2 inline-flex min-w-32 rounded-xl border-2 border-orange-300 bg-white px-4 py-2 text-slate-400"
              >
                Відповідь 1
              </span>
            ) : (
              <span key={`text-${index}`} className="whitespace-pre-wrap">
                {part}
              </span>
            )
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className="rounded-2xl bg-orange-300 px-5 py-3 text-sm font-extrabold text-white">
            Перевірити відповідь
          </button>
          <button className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-extrabold text-slate-600">
            Спробувати ще раз
          </button>
          <button className="px-4 py-3 text-sm font-extrabold text-slate-500">
            Показати відповідь
          </button>
        </div>
      </div>
    </div>
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
  return (
    <div
      className={`mx-auto h-[34rem] w-full overflow-hidden rounded-[1.5rem] border border-[#dedcff] bg-white text-left shadow-[0_24px_70px_rgba(31,27,77,0.08)] ${
        compact ? "mt-8 max-w-5xl" : "mt-12 max-w-6xl"
      }`}
    >
      <div className="grid h-full md:grid-cols-[320px_minmax(0,1fr)]">
        <PreviewSidebar mode={mode} onModeChange={onModeChange} preview={preview} />
        <div className="border-b border-[#5549f1]/15 p-4 md:hidden">
          <PreviewTabs mode={mode} onModeChange={onModeChange} />
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
              className="inline-flex min-w-[11rem] items-center justify-start gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Попередній урок
            </button>
            <button
              type="button"
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

function Hero({ preview }: { preview: PublicLandingPreview }) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("lesson");

  return (
    <section className="bg-[#f8f7ff] px-5 pb-16 pt-16 text-center md:pt-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c7c3ff] bg-[#eceaff] px-4 py-1.5 text-xs font-bold text-[#5549f1]">
          <Sparkles className="h-3.5 w-3.5" />
          AI-асистент для створення курсів і практичного навчання
        </div>
        <h1 className="text-4xl font-extrabold leading-[1.08] text-[#1f1b4d] sm:text-5xl lg:text-6xl">
          Створюйте курси.
          <span className="text-[#5549f1]"> Закріплюйте знання практикою.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#6d6a9f]">
          EduCat допомагає викладачам збирати структуровані курси з уроками,
          тестами та вправами, а студентам проходити навчання в одному зрозумілому
          інтерфейсі.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <PrimaryLink to="/register">
            Почати безкоштовно <ArrowRight className="h-4 w-4" />
          </PrimaryLink>
          <SecondaryLink to="/login">
            Увійти в кабінет <ArrowRight className="h-4 w-4" />
          </SecondaryLink>
        </div>
      </div>
      <CoursePreviewFrame
        mode={previewMode}
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
      text: "Будуйте курс крок за кроком: опис, модулі, уроки, тести, вправи та фінальний перегляд перед публікацією.",
      features: [
        "Конструктор курсу з модулями та уроками",
        "AI-генерація тестів і вправ"
      ],
      action: "Створити курс",
      to: "/teacher/dashboard",
      variant: "light",
    },
    {
      icon: BookOpen,
      title: "Для студентів",
      text: "Проходьте уроки, відповідайте на тести, пишіть код у вправах і бачте свій прогрес у курсах.",
      features: [
        "Особистий кабінет із прогресом",
        "Уроки, тести й вправи в єдиній структурі",
        "Зрозумілий перехід між темами",
      ],
      action: "Перейти до навчання",
      to: "/student/dashboard",
      variant: "primary",
    },
  ];

  return (
    <section className="bg-white px-5 py-16">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {cards.map(({ icon: Icon, title, text, features, action, to, variant }) => (
          <div
            key={title}
            className={`flex min-h-[360px] flex-col rounded-3xl border p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
              variant === "primary"
                ? "border-transparent bg-[#5549f1] text-white"
                : "border-[#5549f1]/15 bg-white"
            }`}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                variant === "primary" ? "bg-white/15" : "bg-[#ede9ff]"
              }`}
            >
              <Icon className={`h-6 w-6 ${variant === "primary" ? "text-white" : "text-[#5549f1]"}`} />
            </span>
            <h3 className="mt-5 text-2xl font-extrabold">{title}</h3>
            <p
              className={`mt-3 text-sm leading-7 ${
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
    title: "Конструктор курсу",
    text: "Створюйте курс у зрозумілих кроках: інформація, структура, контент і перегляд.",
  },
  {
    icon: ClipboardList,
    color: "#F97316",
    bg: "#FFEDD5",
    title: "Тести до уроків",
    text: "Додавайте питання з однією або кількома правильними відповідями та швидко перевіряйте знання.",
  },
  {
    icon: Code2,
    color: "#0891B2",
    bg: "#CFFAFE",
    title: "Практичні вправи",
    text: "Прикріплюйте coding-завдання до тем, щоб студенти не тільки читали, а й писали код.",
  },
  {
    icon: Eye,
    color: "#8B5CF6",
    bg: "#EDE9FE",
    title: "Превʼю для студента",
    text: "Перед публікацією можна побачити курс саме так, як його відкриє студент.",
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
    title: "Дашборд навчання",
    text: "Студент бачить активні, непройдені та завершені курси без зайвого пошуку.",
  },
  {
    icon: BookOpen,
    color: "#0891B2",
    bg: "#CFFAFE",
    title: "Зручний перегляд уроків",
    text: "Сайдбар зі структурою курсу, фіксований блок уроку та перемикання між уроком, тестом і вправою.",
  },
  {
    icon: BarChart3,
    color: "#10B981",
    bg: "#D1FAE5",
    title: "Прогрес і завершення",
    text: "Видно, які уроки вже виконано, що йде далі та скільки курсу залишилось пройти.",
  },
  {
    icon: Trophy,
    color: "#F59E0B",
    bg: "#FEF3C7",
    title: "Мотивація",
    text: "Прогрес, завершені блоки та короткі практичні кроки підтримують регулярне навчання.",
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
    <section id={id} className={`px-5 py-20 ${tinted ? "bg-[#f1f0ff]" : "bg-white"}`}>
      <div className="mx-auto max-w-5xl">
        <SectionLabel>{label}</SectionLabel>
        <SectionHeading title={title} subtitle={subtitle} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, color, bg, title: itemTitle, text }) => (
            <div
              key={itemTitle}
              className="rounded-2xl border border-[#5549f1]/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: bg }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </span>
              <h3 className="mt-5 text-base font-extrabold text-[#1f1b4d]">
                {itemTitle}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#6d6a9f]">{text}</p>
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
          Платформа поєднує робочий кабінет викладача, зручний студентський
          дашборд і практичний перегляд уроків.
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
          Освітня платформа для створення курсів і практичного навчання.
        </p>
        <div className="flex gap-4 text-xs font-semibold text-[#6d6a9f]">
          <a href="#features" className="hover:text-[#5549f1]">
            Превʼю платформи
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
          "/public/landing-preview?lessonTitle=Arithmetic%20operators"
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
        <Hero preview={preview} />
        <AudienceCards />
        <FeatureGrid
          id="teachers"
          label="Викладачам"
          title="Все потрібне для створення якісного курсу"
          subtitle="Структура, AI-допомога, фінальний перегляд і публікація зібрані в одному робочому процесі."
          items={teacherFeatures}
          tinted
        />
        <FeatureGrid
          id="students"
          label="Студентам"
          title="Навчання, яке легко продовжити"
          subtitle="Кабінет, прогрес, уроки, тести й вправи спроєктовані так, щоб студент швидко повертався до наступного кроку."
          items={studentFeatures}
        />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
