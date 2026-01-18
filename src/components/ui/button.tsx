import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  const base = "px-4 py-2 rounded text-sm font-medium";
  const styles =
    variant === "secondary"
      ? "border border-slate-300 text-slate-700"
      : "bg-slate-900 text-white";

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
