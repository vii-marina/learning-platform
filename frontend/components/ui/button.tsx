import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

const variantClassNames = {
  primary:
    "border-transparent bg-[#0f172a] text-white hover:bg-slate-800",
  accent:
    "border-transparent bg-[#13daec] text-[#0f172a] hover:bg-[#0fc8d9]",
  secondary:
    "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
  ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950",
} satisfies Record<NonNullable<ButtonProps["variant"]>, string>;

const sizeClassNames = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
} satisfies Record<NonNullable<ButtonProps["size"]>, string>;

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl border font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13daec]/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button
      className={`${base} ${variantClassNames[variant]} ${sizeClassNames[size]} ${className}`}
      {...props}
    />
  );
}
