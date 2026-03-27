import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  const base =
    "rounded-2xl p-7 shadow-[0_12px_28px_rgba(15,23,42,0.08)]";
  return <div className={`${base} ${className}`} {...props} />;
}
