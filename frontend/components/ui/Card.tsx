import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  const base = "rounded-xl border border-slate-200 bg-white p-6 shadow-sm";
  return <div className={`${base} ${className}`} {...props} />;
}
