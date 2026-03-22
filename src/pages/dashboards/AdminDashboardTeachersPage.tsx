import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { loadAdminTeachersData } from "../../features/admin-dashboard/api/adminDashboardApi";
import { AdminUserDirectory } from "../../features/admin-dashboard/components/AdminUserDirectory";
import type { CurrentUser } from "../../features/auth/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";

export function AdminDashboardTeachersPage() {
  const [teachers, setTeachers] = useState<CurrentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function hydrateTeachers() {
      try {
        const nextTeachers = await loadAdminTeachersData();

        if (!isMounted) {
          return;
        }

        setTeachers(nextTeachers);
        setMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(getErrorMessage(error, "Unable to load teachers."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateTeachers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-cyan-100 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Teachers</h1>
      </Card>

      {message ? (
        <Card className="rounded-[1.75rem] border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          Loading teachers...
        </Card>
      ) : (
        <AdminUserDirectory
          title="Teachers"
          users={teachers}
          emptyMessage="No teachers found yet."
        />
      )}
    </div>
  );
}
