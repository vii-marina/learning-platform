import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { loadAdminStudentsData } from "../../features/admin-dashboard/api/adminDashboardApi";
import { AdminUserDirectory } from "../../features/admin-dashboard/components/AdminUserDirectory";
import type { CurrentUser } from "../../features/auth/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";

export function AdminDashboardStudentsPage() {
  const [students, setStudents] = useState<CurrentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function hydrateStudents() {
      try {
        const nextStudents = await loadAdminStudentsData();

        if (!isMounted) {
          return;
        }

        setStudents(nextStudents);
        setMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(getErrorMessage(error, "Unable to load students."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateStudents();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <Card className="rounded-[1.75rem] border-cyan-100 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Students</h1>
      </Card>

      {message ? (
        <Card className="rounded-[1.75rem] border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          Loading students...
        </Card>
      ) : (
        <AdminUserDirectory
          title="Students"
          users={students}
          emptyMessage="No students found yet."
        />
      )}
    </div>
  );
}
