import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHeading, SectionLabel } from "../components/primitives";

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

export function FAQ() {
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
                style={{ background: open === index ? "#F1F0FF" : "#fff" }}
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
