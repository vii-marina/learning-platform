import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { loadAdminTeachersData } from "../../features/admin-dashboard/api/adminDashboardApi";
import { AdminTeacherCard } from "../../features/admin-dashboard/components/AdminTeacherCard";
import type { AdminTeacher } from "../../features/admin-dashboard/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";

function getTeacherDisplayName(teacher: AdminTeacher) {
  return teacher.fullName?.trim() || teacher.email;
}

export function AdminDashboardTeachersPage() {
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);

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

  const filteredTeachers = useMemo(() => {
    const normalizedQuery = deferredSearchValue.trim().toLowerCase();

    if (!normalizedQuery) {
      return [...teachers].sort((left, right) =>
        getTeacherDisplayName(left).localeCompare(getTeacherDisplayName(right))
      );
    }

    return teachers
      .filter((teacher) => {
        const searchableText = [getTeacherDisplayName(teacher), teacher.email]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .sort((left, right) =>
        getTeacherDisplayName(left).localeCompare(getTeacherDisplayName(right))
      );
  }, [deferredSearchValue, teachers]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 px-1 py-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#14213d]">Teachers</h1>
          
        </div>
        <div className="rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800">
          Total teachers: {teachers.length}
        </div>
      </div>

      {message ? (
        <Card className="rounded-[1.75rem] border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search teachers by name or email..."
          className="h-12 w-full rounded-[1.15rem] border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-[#14213d] outline-none transition focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/12"
        />
      </div>

      {isLoading ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          Loading teachers...
        </Card>
      ) : filteredTeachers.length === 0 ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          No teachers match your search.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTeachers.map((teacher) => (
            <AdminTeacherCard
              key={teacher.id}
              teacher={teacher}
              onDeleteClick={() => {
                setMessage("Teacher deletion is not supported by the current backend yet.");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
