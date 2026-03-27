import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import {
  deleteAdminStudent,
  loadAdminStudentsData,
} from "../../features/admin-dashboard/api/adminDashboardApi";
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
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .sort((left, right) =>
        getStudentDisplayName(left).localeCompare(getStudentDisplayName(right))
      );
  }, [deferredSearchValue, students]);

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
      setMessage("Student deleted successfully.");
      setStudentPendingDelete(null);
    } catch (error) {
      setMessageTone("error");
      setMessage(getErrorMessage(error, "Unable to delete student."));
      setStudentPendingDelete(null);
    } finally {
      setIsDeletingStudent(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 px-1 py-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#14213d]">Students</h1>
        </div>
        <div className="rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800">
          Total students: {students.length}
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
          placeholder="Search students by name, email, or education place..."
          className="h-12 w-full rounded-[1.15rem] border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-[#14213d] outline-none transition focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/12"
        />
      </div>

      {isLoading ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          Loading students...
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          No students match your search.
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
        entityLabel="Student"
        entityName={studentPendingDelete ? getStudentDisplayName(studentPendingDelete) : ""}
        entityEmail={studentPendingDelete?.email ?? ""}
        impactItems={
          studentPendingDelete
            ? [
                "Student profile information may be removed.",
                `${studentPendingDelete.enrolledCourses.length} enrolled course records may be lost.`,
                `${studentPendingDelete.completedCourses.length} completed course records may be lost.`,
                studentPendingDelete.educationPlace?.trim()
                  ? `Education place record "${studentPendingDelete.educationPlace}" may be removed.`
                  : "Education place data may be removed if it exists.",
              ]
            : []
        }
        confirmLabel="Delete Student"
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
    </div>
  );
}
