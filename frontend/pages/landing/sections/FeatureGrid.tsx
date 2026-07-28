import {
  BookOpen,
  FileChartColumn,
  FileUser,
  Layers,
  LayoutDashboard,
  ListTodo,
  Trophy,
} from "lucide-react";
import type { IconComponent } from "../types";
import { SectionHeading, SectionLabel } from "../components/primitives";

type FeatureItem = {
  icon: IconComponent;
  color: string;
  bg: string;
  title: string;
  text: string;
};

const teacherFeatures: FeatureItem[] = [
  { icon: Layers, color: "#5549F1", bg: "#EDE9FF", title: "Мої курси", text: "Створення й редагування" },
  { icon: FileUser, color: "#F97316", bg: "#FFEDD5", title: "Студенти", text: "Інформація про учасників" },
  { icon: FileChartColumn, color: "#0891B2", bg: "#CFFAFE", title: "Результати", text: "Прогрес проходження" },
  { icon: ListTodo, color: "#096f4d", bg: "#b7ead9", title: "Тести й вправи", text: "Перевірка знань" },
];

const studentFeatures: FeatureItem[] = [
  { icon: LayoutDashboard, color: "#5549F1", bg: "#EDE9FF", title: "Власний темп", text: "Навчання без обмежень" },
  { icon: FileChartColumn, color: "#F97316", bg: "#FFEDD5", title: "Відстежуйте прогрес", text: "Слідкуйте за успіхами" },
  { icon: BookOpen, color: "#0891B2", bg: "#CFFAFE", title: "Практика & тести", text: "Закріплюйте знання" },
  { icon: Trophy, color: "#096f4d", bg: "#b7ead9", title: "Мотивація", text: "Короткі досяжні етапи" },
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
  items: FeatureItem[];
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

export function TeacherFeatureGrid() {
  return (
    <FeatureGrid
      id="teachers"
      label="Викладачам"
      title="Керування курсами та студентами"
      subtitle="Викладач створює курси, переглядає студентів і відстежує результати навчання."
      items={teacherFeatures}
      tinted
    />
  );
}

export function StudentFeatureGrid() {
  return (
    <FeatureGrid
      id="students"
      label="Студентам"
      title="Зручне проходження курсу"
      subtitle="Студент проходить уроки, тести й вправи у своєму темпі та бачить інформацію про викладача."
      items={studentFeatures}
    />
  );
}
