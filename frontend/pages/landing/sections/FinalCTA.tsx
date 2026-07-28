import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";
import { PrimaryLink } from "../components/primitives";

export function FinalCTA() {
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
