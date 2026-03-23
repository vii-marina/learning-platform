import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

type AdminMetricCardProps = {
  label: string;
  value: number;
  to: string;
  icon: LucideIcon;
  tone?: "violet" | "sky" | "amber" | "emerald";
};

const toneClasses: Record<
  NonNullable<AdminMetricCardProps["tone"]>,
  { icon: string; ring: string }
> = {
  violet: {
    icon: "bg-violet-100 text-violet-600",
    ring: "border-violet-100",
  },
  sky: {
    icon: "bg-sky-100 text-sky-600",
    ring: "border-sky-100",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    ring: "border-amber-100",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700",
    ring: "border-emerald-100",
  },
};

export function AdminMetricCard({
  label,
  value,
  to,
  icon: Icon,
  tone = "violet",
}: AdminMetricCardProps) {
  const palette = toneClasses[tone];

  return (
    <Link
      to={to}
      className={`block rounded-[1.5rem] border bg-white p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13daec] ${palette.ring}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold leading-6 text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-[#14213d]">{value}</p>
        </div>
        <div className={`rounded-[1rem] p-3 ${palette.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}
