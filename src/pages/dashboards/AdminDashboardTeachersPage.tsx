import { Plus, Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  createAdminManagedUser,
  deleteAdminTeacher,
  loadAdminTeachersData,
} from "../../features/admin-dashboard/api/adminDashboardApi";
import { AdminCreateUserModal } from "../../features/admin-dashboard/components/AdminCreateUserModal";
import { AdminDeleteWarningModal } from "../../features/admin-dashboard/components/AdminDeleteWarningModal";
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
  const [messageTone, setMessageTone] = useState<"success" | "error">("error");
  const [searchValue, setSearchValue] = useState("");
  const [teacherPendingDelete, setTeacherPendingDelete] = useState<AdminTeacher | null>(null);
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);
  const [isCreateTeacherOpen, setIsCreateTeacherOpen] = useState(false);
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
        setMessageTone("error");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessageTone("error");
        setMessage(getErrorMessage(error, "Не вдалося завантажити викладачів."));
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

  async function handleTeacherDeleteConfirm() {
    if (!teacherPendingDelete || isDeletingTeacher) {
      return;
    }

    const teacherToDelete = teacherPendingDelete;
    setIsDeletingTeacher(true);

    try {
      await deleteAdminTeacher(teacherToDelete.id);
      setTeachers((currentTeachers) =>
        currentTeachers.filter((teacher) => teacher.id !== teacherToDelete.id)
      );
      setMessageTone("success");
      setMessage("Викладача успішно видалено.");
      setTeacherPendingDelete(null);
    } catch (error) {
      setMessageTone("error");
      setMessage(getErrorMessage(error, "Не вдалося видалити викладача."));
      setTeacherPendingDelete(null);
    } finally {
      setIsDeletingTeacher(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 px-1 py-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#14213d]">Викладачі</h1>
          
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800">
            Усього викладачів: {teachers.length}
          </div>
          <Button
            type="button"
            variant="accent"
            size="lg"
            onClick={() => setIsCreateTeacherOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Додати викладача</span>
          </Button>
        </div>
      </div>

      {message ? (
        <Card
          className={
            messageTone === "success"
              ? "rounded-[1.75rem] border-emerald-200 bg-emerald-50 p-6 text-emerald-800 shadow-none"
              : "rounded-[1.75rem] border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-none"
          }
        >
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Пошук викладачів за імʼям або email..."
          className="h-12 w-full rounded-[1.15rem] border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-[#14213d] outline-none transition focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/12"
        />
      </div>

      {isLoading ? (
        <LoadingState variant="section" />
      ) : filteredTeachers.length === 0 ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          За вашим пошуком викладачів не знайдено.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTeachers.map((teacher) => (
            <AdminTeacherCard
              key={teacher.id}
              teacher={teacher}
              onDeleteClick={(selectedTeacher) => {
                setTeacherPendingDelete(selectedTeacher);
              }}
            />
          ))}
        </div>
      )}

      <AdminDeleteWarningModal
        isOpen={teacherPendingDelete !== null}
        entityLabel="викладача"
        entityName={teacherPendingDelete ? getTeacherDisplayName(teacherPendingDelete) : ""}
        entityEmail={teacherPendingDelete?.email ?? ""}
        impactItems={
          teacherPendingDelete
            ? [
                "Інформацію профілю викладача може бути видалено.",
                `${teacherPendingDelete.courseCount} повʼязаних курсів можуть втратити привʼязку до викладача.`,
                `${teacherPendingDelete.publishedCourseCount} опублікованих курсів можуть бути зачеплені.`,
                `${teacherPendingDelete.draftCourseCount} чернеток курсів можуть бути зачеплені.`,
                `${teacherPendingDelete.assignedStudents.length} звʼязків зі студентами можуть бути втрачені.`,
              ]
            : []
        }
        confirmLabel="Видалити викладача"
        isSubmitting={isDeletingTeacher}
        onClose={() => {
          if (!isDeletingTeacher) {
            setTeacherPendingDelete(null);
          }
        }}
        onConfirm={() => {
          void handleTeacherDeleteConfirm();
        }}
      />

      {isCreateTeacherOpen ? (
        <AdminCreateUserModal
          role="teacher"
          onClose={() => setIsCreateTeacherOpen(false)}
          onSubmit={async (input) => {
            await createAdminManagedUser(input);
            const nextTeachers = await loadAdminTeachersData();
            setTeachers(nextTeachers);
            setMessageTone("success");
            setMessage("Викладача успішно створено.");
          }}
        />
      ) : null}
    </div>
  );
}
