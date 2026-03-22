import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { loadAdminOverviewData } from "../../features/admin-dashboard/api/adminDashboardApi";
import { AdminMetricCard } from "../../features/admin-dashboard/components/AdminMetricCard";
import type { AdminDashboardOverviewData } from "../../features/admin-dashboard/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function hydrateOverview() {
      try {
        const overviewData = await loadAdminOverviewData();

        if (!isMounted) {
          return;
        }

        setData(overviewData);
        setMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(getErrorMessage(error, "Unable to load overview."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      { label: "Teachers", value: data.totals.teachers },
      { label: "Students", value: data.totals.students },
      { label: "Courses", value: data.totals.courses },
      { label: "Modules", value: data.totals.modules },
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-cyan-100 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Overview</h1>
      </Card>

      {message ? (
        <Card className="rounded-[1.75rem] border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          Loading overview data...
        </Card>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <AdminMetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <Card className="rounded-[1.75rem] border-cyan-100 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Data snapshot</h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold leading-6 text-slate-400">Users</p>
                <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  {data.totals.users}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold leading-6 text-slate-400">Lessons</p>
                <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  {data.totals.lessons}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold leading-6 text-slate-400">Lesson blocks</p>
                <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  {data.totals.blocks}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold leading-6 text-slate-400">Tests</p>
                <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  {data.totals.tests}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold leading-6 text-slate-400">Questions</p>
                <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  {data.totals.questions}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold leading-6 text-slate-400">Answers</p>
                <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  {data.totals.answers}
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
