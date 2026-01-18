import * as React from "react";

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-5xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-2">
        <section className="flex flex-col justify-center">
          <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
          {subtitle ? (
            <p className="mt-3 text-sm text-slate-600">{subtitle}</p>
          ) : null}
          <div className="mt-8">{children}</div>
        </section>
        <aside className="hidden items-center justify-center rounded border border-slate-200 bg-white p-10 text-sm text-slate-600 md:flex">
          <p>Welcome back. Build better habits with focused learning.</p>
        </aside>
      </div>
    </div>
  );
}
