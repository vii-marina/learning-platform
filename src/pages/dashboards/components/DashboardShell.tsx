import type { ReactNode } from "react";

type DashboardShellProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function DashboardShell({ title, description, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-600">
            Dashboard
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="mt-10">{children}</div>
      </section>
    </div>
  );
}
