import { CheckCircle2} from "lucide-react";
import { Link } from "react-router-dom";

export function EmailConfirmedPage() {
  return (
    <div
      className="flex min-h-screen flex-col bg-[#f6f8f8] text-[#0f172a]"
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      

      <main className="flex flex-1 items-center justify-center px-4 py-8 md:px-8 md:py-10">
        <div className="w-full max-w-xl rounded-[1.75rem] border border-slate-100 bg-white p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-[1.9rem] font-extrabold tracking-tight text-[#14213d] md:text-[2.1rem]">
            Дякуємо!
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Ваш email успішно підтверджено. Натисніть кнопку входу.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#5549f1] px-8 text-base font-extrabold text-white shadow-[0_12px_24px_rgba(85,73,241,0.28)] transition hover:bg-[#473ed4]"
            >
              Увійти
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
