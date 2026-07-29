import { ArrowRight } from "lucide-react";
import { BrandMark } from "../../../components/ui";
import {
  landingContainer,
  PrimaryLink,
  SecondaryLink,
  StickerCard,
  stickerOutline,
} from "../components/primitives";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b-2 border-[#1f1b4d] bg-[#f8f7ff] py-14 md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(#c7c3ff 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className={`relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] ${landingContainer}`}>
        <div>
          <h1 className="text-3xl font-extrabold leading-[1.05] tracking-tight text-[#1f1b4d] lg:text-5xl lg:leading-[1.05]">
            Поширюйте знання
            <span
              className="mt-2 block font-semibold leading-[0.95] text-[#5549f1] text-[2.75rem] sm:text-5xl lg:text-[4.4rem]"
              style={{ fontFamily: '"Caveat", cursive' }}
            >
              Навчайтесь ефективно та цікаво!
            </span>
          </h1>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryLink to="/register">
              Створити акаунт <ArrowRight className="h-4 w-4" />
            </PrimaryLink>
            <SecondaryLink to="/login">Увійти</SecondaryLink>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0">
          <StickerCard className="p-5" tone="white">
            <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-[#c7c3ff] pb-3">
              <p className="text-base font-extrabold text-[#5549f1]">
                EduCat — простір для навчання та розвитку
              </p>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="h-2.5 w-4/5 rounded-full bg-[#e6e3ff]" />
              <div className="h-2.5 w-2/3 rounded-full bg-[#e6e3ff]" />
            </div>

            <div className="mt-5 space-y-2.5">
              {[
                { text: "Тест: 8 питань", done: true },
                { text: "Вправа: дописати функцію", done: false },
              ].map(({ text, done }) => (
                <div
                  key={text}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${stickerOutline} ${
                    done ? "bg-[#d3d1f5] text-1f1b4d" : "bg-white text-[#1f1b4d]"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-current text-[0.6rem]`}
                  >
                    {done ? "✓" : ""}
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </StickerCard>

          <BrandMark
            large
            className="absolute -bottom-8 -right-4 h-28 w-28 drop-shadow-[4px_4px_0_rgba(31,27,77,0.18)] sm:h-36 sm:w-36"
          />
        </div>
      </div>
    </section>
  );
}
