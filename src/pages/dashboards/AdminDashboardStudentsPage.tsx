import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { loadAdminStudentsData } from "../../features/admin-dashboard/api/adminDashboardApi";
import { AdminUserDirectory } from "../../features/admin-dashboard/components/AdminUserDirectory";
import type { AdminDashboardStudent } from "../../features/admin-dashboard/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";

export function AdminDashboardStudentsPage() {
  const [students, setStudents] = useState<AdminDashboardStudent[]>([]);
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

        setMessage(getErrorMessage(error, "Не вдалося завантажити список студентів."));
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
      <div className="flex flex-wrap items-start justify-between gap-4 px-1 py-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Students</h1>
        <div className="rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800">
          Total students: {students.length}
        </div>
      </div>

      {message ? (
        <Card className="rounded-[1.75rem] border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          Loading student list...
        </Card>
      ) : (
        <AdminUserDirectory
          title="Students"
          students={students}
          emptyMessage="No students found."
        />
      )}
    </div>
  );
}
