import { BookOpen, CheckCircle2, Plus, Search, Users } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  createAdminManagedUser,
  deleteAdminStudent,
  loadAdminStudentsData,
} from "../../features/admin-dashboard/api/adminDashboardApi";
import { AdminCreateUserModal } from "../../features/admin-dashboard/components/AdminCreateUserModal";
import { AdminDeleteWarningModal } from "../../features/admin-dashboard/components/AdminDeleteWarningModal";
import { AdminStudentCard } from "../../features/admin-dashboard/components/AdminStudentCard";
import type { AdminDashboardStudent } from "../../features/admin-dashboard/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";

function getStudentDisplayName(student: AdminDashboardStudent) {
  return student.fullName?.trim() || student.email;
}

export function AdminDashboardStudentsPage() {
  const [students, setStudents] = useState<AdminDashboardStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("error");
  const [searchValue, setSearchValue] = useState("");
  const [studentPendingDelete, setStudentPendingDelete] =
    useState<AdminDashboardStudent | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false);
  const deferredSearchValue = useDeferredValue(searchValue);

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
        setMessageTone("error");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessageTone("error");
        setMessage(getErrorMessage(error, "Не вдалося завантажити студентів."));
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

  const filteredStudents = useMemo(() => {
    const normalizedQuery = deferredSearchValue.trim().toLowerCase();

    if (!normalizedQuery) {
      return [...students].sort((left, right) =>
        getStudentDisplayName(left).localeCompare(getStudentDisplayName(right))
      );
    }

    return students
      .filter((student) => {
        const searchableText = [
          getStudentDisplayName(student),
          student.email,
          student.educationPlace ?? "",
          ...student.enrolledCourseDetails.map((course) => course.title),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .sort((left, right) =>
        getStudentDisplayName(left).localeCompare(getStudentDisplayName(right))
      );
  }, [deferredSearchValue, students]);
  const totalEnrollments = useMemo(
    () =>
      students.reduce(
        (sum, student) => sum + student.enrolledCourseDetails.length,
        0
      ),
    [students]
  );
  const completedEnrollments = useMemo(
    () =>
      students.reduce(
        (sum, student) =>
          sum +
          student.enrolledCourseDetails.filter((course) => course.finishedAt).length,
        0
      ),
    [students]
  );

  async function handleStudentDeleteConfirm() {
    if (!studentPendingDelete || isDeletingStudent) {
      return;
    }

    const studentToDelete = studentPendingDelete;
    setIsDeletingStudent(true);

    try {
      await deleteAdminStudent(studentToDelete.id);
      setStudents((currentStudents) =>
        currentStudents.filter((student) => student.id !== studentToDelete.id)
      );
      setMessageTone("success");
      setMessage("Студента успішно видалено.");
      setStudentPendingDelete(null);
    } catch (error) {
      setMessageTone("error");
      setMessage(getErrorMessage(error, "Не вдалося видалити студента."));
      setStudentPendingDelete(null);
    } finally {
      setIsDeletingStudent(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="bg-[linear-gradient(135deg,#effcff_0%,#ffffff_54%,#f4f2ff_100%)] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-[#14213d]">
                Студенти
              </h1>
            </div>
            <Button
              type="button"
              variant="accent"
              size="lg"
              onClick={() => setIsCreateStudentOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span>Додати студента</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 px-6 py-5 md:grid-cols-3">
          <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Users className="h-4 w-4 text-[#08bfd4]" />
              <span>Усього студентів</span>
            </div>
            <p className="mt-2 text-2xl font-black text-[#14213d]">{students.length}</p>
          </div>
          <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <BookOpen className="h-4 w-4 text-violet-500" />
              <span>Записів на курси</span>
            </div>
            <p className="mt-2 text-2xl font-black text-[#14213d]">{totalEnrollments}</p>
          </div>
          <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Завершених записів</span>
            </div>
            <p className="mt-2 text-2xl font-black text-[#14213d]">{completedEnrollments}</p>
          </div>
        </div>
      </section>

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
          placeholder="Пошук студентів за імʼям, email або місцем навчання..."
          className="h-12 w-full rounded-[1.15rem] border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-[#14213d] outline-none transition focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/12"
        />
      </div>

      {isLoading ? (
        <LoadingState variant="section" />
      ) : filteredStudents.length === 0 ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          За вашим пошуком студентів не знайдено.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredStudents.map((student) => (
            <AdminStudentCard
              key={student.id}
              student={student}
              onDeleteClick={(selectedStudent) => {
                setStudentPendingDelete(selectedStudent);
              }}
            />
          ))}
        </div>
      )}

      <AdminDeleteWarningModal
        isOpen={studentPendingDelete !== null}
        entityLabel="студента"
        entityName={studentPendingDelete ? getStudentDisplayName(studentPendingDelete) : ""}
        entityEmail={studentPendingDelete?.email ?? ""}
        impactItems={
          studentPendingDelete
            ? [
                "Інформацію профілю студента може бути видалено.",
                `${studentPendingDelete.enrolledCourseDetails.length} записів про зарахування на курси можуть бути втрачені.`,
                `${
                  studentPendingDelete.enrolledCourseDetails.filter((course) => course.finishedAt)
                    .length
                } записів про завершені курси можуть бути втрачені.`,
                studentPendingDelete.educationPlace?.trim()
                  ? `Запис про місце навчання "${studentPendingDelete.educationPlace}" може бути видалено.`
                  : "Дані про місце навчання можуть бути видалені, якщо вони існують.",
              ]
            : []
        }
        confirmLabel="Видалити студента"
        isSubmitting={isDeletingStudent}
        onClose={() => {
          if (!isDeletingStudent) {
            setStudentPendingDelete(null);
          }
        }}
        onConfirm={() => {
          void handleStudentDeleteConfirm();
        }}
      />

      {isCreateStudentOpen ? (
        <AdminCreateUserModal
          role="student"
          onClose={() => setIsCreateStudentOpen(false)}
          onSubmit={async (input) => {
            await createAdminManagedUser(input);
            const nextStudents = await loadAdminStudentsData();
            setStudents(nextStudents);
            setMessageTone("success");
            setMessage("Студента успішно створено.");
          }}
        />
      ) : null}
    </div>
  );
}
