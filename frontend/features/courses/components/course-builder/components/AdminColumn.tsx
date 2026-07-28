import type { ReactNode } from "react";
import { Card } from "../../../../../components/ui/Card";

type AdminColumnProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AdminColumn({ title, subtitle, children }: AdminColumnProps) {
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}
