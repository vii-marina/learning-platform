import { 
  CheckCircle2,
  FileText,
  GraduationCap,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
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
      {
        label: "Teachers",
        value: data.totals.teachers,
        to: "/admin/dashboard/teachers",
        icon: GraduationCap,
        tone: "violet" as const,
      },
      {
        label: "Students",
        value: data.totals.students,
        to: "/admin/dashboard/students",
        icon: Users,
        tone: "sky" as const,
      },
      {
        label: "Draft Courses",
        value: data.courseStatuses.draft,
        to: "/admin/dashboard/courses#draft-courses",
        icon: FileText,
        tone: "amber" as const,
      },
      {
        label: "Published Courses",
        value: data.courseStatuses.published,
        to: "/admin/dashboard/courses#published-courses",
        icon: CheckCircle2,
        tone: "emerald" as const,
      },
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#d8f5f7] px-6 py-6 shadow-[0_18px_40px_rgba(20,33,61,0.06)]">
        
        <h2 className="text-3xl font-black tracking-tight text-slate-900">
          Dashboard Overview
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Welcome to the admin panel. On this page, you will be able to fully manage all the platform content.
        </p>
      </section>

      {message ? (
        <Card className="rounded-[1.75rem] border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <LoadingState variant="section" />
      ) : data ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <AdminMetricCard key={metric.label} {...metric} />
            ))}
          </div>

          
        </div>
      ) : null}
    </div>
  );
}
