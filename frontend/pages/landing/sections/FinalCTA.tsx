import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "../../../components/ui";
import {
  landingContainer,
  PrimaryLink,
  stickerOutline,
} from "../components/primitives";

export function FinalCTA() {
  return (
    <section className="bg-[#f8f7ff] py-16 md:py-20">
      <div className={landingContainer}>
        <div
          className={`relative mx-auto max-w-4xl overflow-hidden rounded-[28px] bg-[#1f1b4d] px-6 py-12 sm:px-12 ${stickerOutline} shadow-[10px_10px_0_0_#5549f1]`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.22]"
            style={{
              backgroundImage:
                "radial-gradient(#8f86ff 1.5px, transparent 1.5px)",
              backgroundSize: "22px 22px",
            }}
          />

          <div className="relative flex flex-col items-start gap-8 sm:flex-row sm:items-center">
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                Створіть свій перший курс уже сьогодні
              </h2>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <PrimaryLink to="/register">
                  Створити акаунт <ArrowRight className="h-4 w-4" />
                </PrimaryLink>
                <Link
                  to="/login"
                  className={`sticker-cursor inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20 ${stickerOutline} border-white/40`}
                >
                  Увійти
                </Link>
              </div>
            </div>

            <BrandMark
              large
              className="h-28 w-28 self-center sm:h-40 sm:w-40"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
