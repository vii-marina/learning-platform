import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center">
      <span className="inline-flex items-center rounded-full border border-[#c7c3ff] bg-[#f1f0ff] px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#5549f1]">
        {children}
      </span>
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto mt-4 max-w-3xl text-center">
      <h2 className="text-3xl font-extrabold leading-tight text-[#1f1b4d] ">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-7 text-[#6d6a9f]">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function PrimaryLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5549f1] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_34px_rgba(85,73,241,0.28)] transition hover:bg-[#473ed4]"
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#5549f1] bg-white px-5 py-3 text-sm font-bold text-[#5549f1] transition hover:bg-[#f1f0ff]"
    >
      {children}
    </Link>
  );
}
