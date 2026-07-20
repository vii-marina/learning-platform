import { ArrowRight, Sparkles } from "lucide-react";
import { PrimaryLink, SecondaryLink } from "../components/primitives";

export function Hero() {
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
