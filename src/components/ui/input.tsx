import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  const base = "w-full rounded border border-slate-300 px-3 py-2 text-sm";
  return <input className={`${base} ${className}`} {...props} />;
}
