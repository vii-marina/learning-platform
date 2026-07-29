import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  Code2,
  Layers3,
  Minus,
  Play,
  Plus,
  Users,
} from "lucide-react";
import {
  FrameLabel,
  landingContainer,
  PanelCaption,
  PrimaryLink,
  SectionHead,
  StickerCard,
} from "../components/primitives";

const entityStyles = {
  module: {
    label: "Модуль",
    icon: Layers3,
    row: "border-[#13daec] bg-[#13daec]/5",
    chip: "bg-[#13daec]/12 text-[#08bfd4]",
  },
  lesson: {
    label: "Урок",
    icon: Play,
    row: "border-emerald-200 bg-emerald-50",
    chip: "bg-emerald-100 text-emerald-700",
  },
  test: {
    label: "Тест",
    icon: BadgeCheck,
    row: "border-violet-200 bg-violet-50",
    chip: "bg-violet-100 text-violet-700",
  },
  exercise: {
    label: "Вправа",
    icon: Code2,
    row: "border-orange-200 bg-orange-50",
    chip: "bg-orange-100 text-orange-600",
  },
} as const;

type EntityKind = keyof typeof entityStyles;

function StructureRow({
  kind,
  label,
  bare = false,
}: {
  kind: EntityKind;
  label: string;
  bare?: boolean;
}) {
  const { icon: Icon, row, chip } = entityStyles[kind];

  return (
    <div
      className={`flex items-center gap-2.5 text-[#14213d] ${
        bare ? "" : `rounded-lg border px-2.5 py-2 ${row}`
      }`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${chip}`}>
        <Icon className="h-3 w-3" />
      </span>
      <span className={`min-w-0 truncate text-xs ${bare ? "font-extrabold" : "font-bold"}`}>
        {label}
      </span>
      <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-[#90a0b7]" />
    </div>
  );
}

function StructureFrame() {
  const modules: { title: string; items: { kind: EntityKind; label: string }[] }[] = [
    {
      title: "Модуль 1: Основи",
      items: [
        { kind: "lesson", label: "1.1 Змінні" },
        { kind: "test", label: "Тест: 8 питань" },
        { kind: "exercise", label: "Вправа: дописати код" },
      ],
    },
    {
      title: "Модуль 2: Функції",
      items: [{ kind: "lesson", label: "2.1 Аргументи" }],
    },
  ];

  return (
    <div className="space-y-2.5">
      {modules.map(({ title, items }) => (
        <div key={title} className="overflow-hidden rounded-xl border border-[#13daec] bg-white">
          <div className="border-b border-[#13daec] bg-[#13daec]/5 px-2.5 py-2">
            <StructureRow kind="module" label={title} bare />
          </div>
          <div className="space-y-1.5 p-2">
            {items.map(({ kind, label }) => (
              <StructureRow key={label} kind={kind} label={label} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const progressStats = [
  { icon: Users, value: "3", label: "Студентів", chip: "bg-[#13daec]/12 text-[#08bfd4]" },
  { icon: BookOpen, value: "7", label: "Переглядів", chip: "bg-violet-100 text-violet-600" },
  { icon: CircleCheck, value: "1", label: "Завершень", chip: "bg-emerald-100 text-emerald-600" },
];

const progressCourses = [
  {
    title: "Variables in Python",
    pills: ["7 тестів", "9 вправ"],
    studentsPill: "2 студентів",
    percent: 34,
    students: [
      { name: "Vilkhovetska Marina", lessons: "3/13 уроків", percent: 23 },
      { name: "Павло Студентович", lessons: "5/9 уроків", percent: 56 },
    ],
  },
  {
    title: "Think Python. Introduction",
    pills: ["4 тести", "6 вправ"],
    studentsPill: "1 студент",
    percent: 100,
    students: [{ name: "Олег Науменко", lessons: "11/11 уроків", percent: 100 }],
  },
];

function ProgressFrame() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-1.5">
        {progressStats.map(({ icon: Icon, value, label, chip }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5"
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${chip}`}
            >
              <Icon className="h-3 w-3" />
            </span>
            <span className="text-xs font-extrabold leading-none text-[#14213d]">{value}</span>
            <span className="min-w-0 truncate text-[0.6rem] font-bold leading-none text-slate-500">
              {label}
            </span>
          </div>
        ))}
      </div>

      {progressCourses.map(({ title, pills, studentsPill, percent, students }) => (
        <div key={title} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[#14213d] px-2 py-0.5 text-[0.6rem] font-extrabold text-white">
              {studentsPill}
            </span>
            {pills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-slate-200 px-2 py-0.5 text-[0.6rem] font-bold text-slate-600"
              >
                {pill}
              </span>
            ))}
            <span
              className={`ml-auto text-[0.6rem] font-extrabold ${
                percent === 100 ? "text-emerald-600" : "text-[#14213d]"
              }`}
            >
              {percent}%
            </span>
          </div>
          <p className="mt-2 truncate text-xs font-extrabold text-[#14213d]">{title}</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                percent === 100 ? "bg-emerald-500" : "bg-[#13daec]"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5">
            {students.map((student) => (
              <div key={student.name} className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[0.65rem] font-extrabold text-[#14213d]">
                  {student.name}
                </p>
                <p className="shrink-0 text-[0.6rem] font-bold text-slate-500">
                  {student.lessons}
                </p>
                <div className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      student.percent === 100 ? "bg-emerald-500" : "bg-[#13daec]"
                    }`}
                    style={{ width: `${student.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TestBuilderFrame() {
  const types = ["Правда/Неправда", "Один варіант", "Кілька варіантів", "Змішаний"];

  return (
    <div className="space-y-3 lg:flex lg:items-start lg:gap-4 lg:space-y-0">
      <div className="rounded-xl border border-violet-200 bg-white p-3 lg:flex-1">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <BadgeCheck className="h-3.5 w-3.5" />
          </span>
          <p className="text-xs font-extrabold text-[#14213d]">Створити тест</p>
        </div>

        <div className="mt-3">
          <FrameLabel>Тип запитання</FrameLabel>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {types.map((type, index) => (
            <span
              key={type}
              className={`truncate rounded-lg border px-2 py-1.5 text-center text-[0.62rem] font-bold ${
                index === 1
                  ? "border-violet-300 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 lg:w-56 lg:shrink-0">
        <FrameLabel>Кількість запитань</FrameLabel>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-200">
            <span className="flex h-7 w-7 items-center justify-center border-r border-slate-200 text-slate-500">
              <Minus className="h-3 w-3" />
            </span>
            <span className="flex h-7 w-8 items-center justify-center text-xs font-extrabold text-[#14213d]">
              5
            </span>
            <span className="flex h-7 w-7 items-center justify-center border-l border-slate-200 text-slate-500">
              <Plus className="h-3 w-3" />
            </span>
          </div>
          <span className="ml-auto rounded-lg bg-[#5549f1] px-2.5 py-1.5 text-[0.62rem] font-extrabold text-white">
            Згенерувати
          </span>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 p-2">
          <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-violet-300 bg-violet-50 text-violet-700">
            <Check className="h-2.5 w-2.5" strokeWidth={4} />
          </span>
          <p className="text-[0.6rem] font-bold leading-4 text-slate-600">
            Оцінюваний тест
          </p>
        </div>
      </div>
    </div>
  );
}

const panels = [
  { n: "01", caption: "Дерево курсу", frame: <StructureFrame />, span: "lg:col-span-5" },
  { n: "02", caption: "Прогрес студентів", frame: <ProgressFrame />, span: "lg:col-span-7" },
  { n: "03", caption: "Генерація тесту", frame: <TestBuilderFrame />, span: "lg:col-span-12" },
];

export function TeacherSection() {
  return (
    <section
      id="teachers"
      className="scroll-mt-20 border-b-2 border-[#1f1b4d] bg-white py-16 md:py-20"
    >
      <div className={landingContainer}>
        <SectionHead
          title="Кабінет викладача"
          action={
            <PrimaryLink to="/register">
              Створити курс <ArrowRight className="h-4 w-4" />
            </PrimaryLink>
          }
        />

        <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-12">
          {panels.map(({ n, caption, frame, span }) => (
            <div key={n} className={`flex flex-col ${span}`}>
              <PanelCaption index={n} name={caption} />
              <StickerCard className="flex-1 p-4" tone="tint" lift="sm">
                {frame}
              </StickerCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
