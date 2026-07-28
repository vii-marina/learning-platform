import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, PenLine } from "lucide-react";
import { SecondaryLink } from "../components/primitives";

export function AudienceCards() {
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
