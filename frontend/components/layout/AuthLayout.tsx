import * as React from "react";
import { AuthHeroText } from "./AuthHeroText";

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative mx-auto grid min-h-screen max-w-5xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-[1fr_1fr]">
        <section className="order-2 flex flex-col justify-center md:order-1">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-semibold text-slate-900">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <div className="mt-10">{children}</div>
        </section>
        <aside className="order-1 flex items-center justify-center md:order-2 md:justify-self-end">
          <div className="neon-frame relative flex w-full max-w-md items-center justify-center overflow-hidden rounded-3xl bg-transparent p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] md:min-h-[420px]">
            <img
              src="/auth-hero.png"
              alt="Learning illustration"
              className="max-h-72 w-full object-contain md:max-h-80"
            />
          </div>
        </aside>
        <div className="pointer-events-none absolute left-1/2 top-14 hidden w-full max-w-xl -translate-x-1/2 text-center md:block">
          <AuthHeroText />
        </div>
      </div>
    </div>
  );
}
