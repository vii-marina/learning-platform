import { Card } from "../../../components/ui/Card";

type AdminMetricCardProps = {
  label: string;
  value: number;
};

export function AdminMetricCard({ label, value}: AdminMetricCardProps) {
  return (
    <Card className="rounded-[1.75rem] border-cyan-100 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
      <p className="text-sm leading-6 text-slate-400">{label}</p>
      <p className="mt-4 text-4xl font-black tracking-tight text-slate-900">{value}</p>
      
    </Card>
  );
}
