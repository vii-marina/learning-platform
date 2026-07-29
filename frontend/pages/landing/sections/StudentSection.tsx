import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Play,
  Users,
} from "lucide-react";
import {
  FrameLabel,
  landingContainer,
  PrimaryLink,
  SectionHead,
  StickerCard,
  stickerOutline,
} from "../components/primitives";

const sidebarItems = [
  { label: "Головна", icon: LayoutDashboard, active: true },
  { label: "Мої викладачі", icon: Users, active: false },
  { label: "Мої курси", icon: BookOpen, active: false },
];

const stats = [
  {
    value: "3",
    title: "Мої курси",
    icon: BookOpen,
    chip: "bg-violet-100 text-violet-600",
  },
  {
    value: "0",
    title: "Ще не відкривали",
    icon: EyeOff,
    chip: "bg-amber-100 text-amber-600",
  },
  {
    value: "0",
    title: "Завершені",
    icon: CircleCheck,
    chip: "bg-emerald-100 text-emerald-600",
  },
];

const inProgress = [
  { title: "Think Python. Introduction", percent: 18, teacher: "Guido van Rossum" },
  { title: "Основи JavaScript", percent: 29, teacher: "Brendan Eich" },
];

const courseCounters = [
  { label: "Тести", value: "0/7", filled: 0 },
  { label: "Вправи", value: "1/9", filled: 11 },
];

function ProgressRing({ percent }: { percent: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 36 36" className="h-9 w-9 shrink-0" aria-hidden>
      <circle cx="18" cy="18" r={radius} fill="none" stroke="#e6e3ff" strokeWidth="4" />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="#5549f1"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - percent / 100)}
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}

function Sidebar() {
  return (
    <div className="flex flex-col gap-5 border-b-2 border-[#1f1b4d] bg-white p-4 md:border-b-0 md:border-r-2">
      <nav className="space-y-1.5">
        {sidebarItems.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold ${
              active ? "bg-[#14213d] text-white" : "text-[#6d6a9f]"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-[#f1f0ff] p-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[0.65rem] font-extrabold text-[#5549f1]">
            VM
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.7rem] font-extrabold text-[#14213d]">
              Vilkhovetska Mari…
            </p>
            <p className="truncate text-[0.6rem] font-bold text-slate-500">
              demo.student@chnu.e…
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-2.5 text-[0.7rem] font-bold text-[#6d6a9f]">
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Вийти
        </div>
      </div>
    </div>
  );
}

function Workspace() {
  return (
    <div className="space-y-4 p-4 md:p-5">
      <div>
        <p className="text-base font-extrabold text-[#14213d]">
          Вітаємо, Student! 👋
        </p>
        <FrameLabel>Дашборд студента</FrameLabel>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {stats.map(({ value, title,  icon: Icon, chip }) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${chip}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <p className="text-sm font-extrabold text-[#14213d]">{value}</p>
              <p className="min-w-0 truncate text-[0.65rem] font-extrabold text-[#14213d]">
                {title}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-[#14213d]">Продовжити навчання</p>
        <span className="flex items-center gap-1 text-[0.65rem] font-bold text-[#6d6a9f]">
          Переглянути всі <ArrowRight className="h-3 w-3" />
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {inProgress.map(({ title, percent, teacher }) => (
          <div
            key={title}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
          >
            <ProgressRing percent={percent} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.7rem] font-extrabold text-[#14213d]">{title}</p>
              <p className="text-[0.6rem] font-bold text-[#5549f1]">{percent}% завершено</p>
              <p className="truncate text-[0.6rem] font-bold text-slate-500">{teacher}</p>
            </div>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#5549f1] text-white">
              <Play className="ml-0.5 h-3 w-3" />
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="h-1 bg-[#13daec]" />
        <div className="p-3">
          <p className="truncate text-[0.7rem] font-extrabold text-[#14213d]">
            Variables in Python: Usage and Best Practices
          </p>
          <div className="mt-1.5 flex flex-wrap gap-3">
            <FrameLabel>9 уроків</FrameLabel>
            <FrameLabel>2 модулів</FrameLabel>
          </div>
          <div className="mt-2.5 space-y-1.5">
            {courseCounters.map(({ label, value, filled }) => (
              <div key={label} className="rounded-lg bg-[#f1f0ff] px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.65rem] font-bold text-[#14213d]">{label}</p>
                  <p className="text-[0.65rem] font-bold text-[#6d6a9f]">{value}</p>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#13daec]"
                    style={{ width: `${filled}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentSection() {
  return (
    <section
      id="students"
      className="scroll-mt-20 border-b-2 border-[#1f1b4d] bg-[#f1f0ff] py-16 md:py-20"
    >
      <div className={landingContainer}>
        <SectionHead
          title="Студентський простір"
          action={
            <PrimaryLink to="/register">
              Почати навчання <ArrowRight className="h-4 w-4" />
            </PrimaryLink>
          }
        />

        <StickerCard className="mt-10 overflow-hidden" tone="white" lift="md">
          <div className="flex items-center gap-2 border-b-2 border-[#1f1b4d] bg-[#f8f7ff] px-4 py-2.5">
            <span className="flex gap-1.5">
              {["bg-[#ff8a8a]", "bg-[#ffd166]", "bg-[#6ee7b7]"].map((dot) => (
                <span
                  key={dot}
                  className={`h-2.5 w-2.5 rounded-full ${dot} ${stickerOutline} border-[1.5px]`}
                />
              ))}
            </span>
            <p className="ml-2 text-xs font-extrabold text-[#1f1b4d]">Кабінет студента</p>
          </div>

          <div className="md:grid md:grid-cols-[13rem_minmax(0,1fr)]">
            <Sidebar />
            <Workspace />
          </div>
        </StickerCard>
      </div>
    </section>
  );
}
