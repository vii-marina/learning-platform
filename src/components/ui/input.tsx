import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  const base =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#13daec] focus:outline-none focus:ring-4 focus:ring-[#13daec]/12 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
  return <input className={`${base} ${className}`} {...props} />;
}
