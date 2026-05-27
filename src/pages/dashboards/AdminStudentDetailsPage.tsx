import { ArrowLeft, BookOpen, CheckCircle2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useAppToast } from "../../components/ui/AppToastProvider";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  clearAdminStudentCourseEnrollment,
  loadAdminStudentDetailData,
  primeAdminStudentDetailCache,
  saveAdminStudentProfile,
} from "../../features/admin-dashboard/api/adminDashboardApi";
import { AdminDeleteWarningModal } from "../../features/admin-dashboard/components/AdminDeleteWarningModal";
import type { AdminDashboardStudent } from "../../features/admin-dashboard/types";
import { BackendApiError, getErrorMessage } from "../../features/auth/api/backendClient";
import type { UpdateCurrentUserProfileInput } from "../../features/auth/types";
import { uploadStudentAvatar } from "../../features/student-dashboard/api/studentProfileStorage";
import { StudentDashboardProfile } from "../../features/student-dashboard/components/StudentDashboardProfile";

type StudentDetailLocationState = {
  student?: AdminDashboardStudent;
};

export function AdminStudentDetailsPage() {
  const { showSuccessToast } = useAppToast();
  const { studentId } = useParams<{ studentId: string }>();
  const location = useLocation();
  const locationState = location.state as StudentDetailLocationState | null;
  const stateStudent = locationState?.student ?? null;
  const initialStudent = stateStudent && stateStudent.id === studentId ? stateStudent : null;
  const [student, setStudent] = useState<AdminDashboardStudent | null>(initialStudent);
  const [isLoading, setIsLoading] = useState(initialStudent === null);
  const [isSaving, setIsSaving] = useState(false);
  const [pageMessage, setPageMessage] = useState("");
  const [coursePendingClear, setCoursePendingClear] =
    useState<AdminDashboardStudent["enrolledCourseDetails"][number] | null>(null);
  const [isClearingCourse, setIsClearingCourse] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "error";
    text: string;
    details?: unknown;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateStudent() {
      if (!studentId) {
        return;
      }

      if (initialStudent) {
        primeAdminStudentDetailCache(initialStudent);
        setStudent(initialStudent);
        setIsLoading(false);
        setPageMessage("");
        setProfileMessage(null);
        return;
      }

      try {
        const nextStudent = await loadAdminStudentDetailData(studentId);

        if (!isMounted) {
          return;
        }

        setStudent(nextStudent);
        setPageMessage("");
        setProfileMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageMessage(getErrorMessage(error, "Unable to load student profile."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateStudent();

    return () => {
      isMounted = false;
    };
  }, [initialStudent, studentId]);

  async function handleSaveProfile(
    input: UpdateCurrentUserProfileInput,
    avatarFile: File | null
  ) {
    if (!student) {
      return;
    }

    try {
      setIsSaving(true);
      setProfileMessage(null);
      const avatarPath = avatarFile
        ? await uploadStudentAvatar(student.id, avatarFile)
        : input.avatarPath;
      const updatedStudent = await saveAdminStudentProfile(student.id, {
        ...input,
        avatarPath,
      });

      setStudent(updatedStudent);
      showSuccessToast("Profile saved.");
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to save student profile."),
        details: error instanceof BackendApiError ? error.details : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClearCourseEnrollment() {
    if (!student || !coursePendingClear || isClearingCourse) {
      return;
    }

    try {
      setIsClearingCourse(true);
      setPageMessage("");
      const updatedStudent = await clearAdminStudentCourseEnrollment(
        student.id,
        coursePendingClear.courseId
      );

      setStudent(updatedStudent);
      setCoursePendingClear(null);
      showSuccessToast("Запис студента на курс очищено.");
    } catch (error) {
      setPageMessage(getErrorMessage(error, "Не вдалося очистити запис на курс."));
    } finally {
      setIsClearingCourse(false);
    }
  }

  if (!studentId) {
    return <Navigate to="/admin/dashboard/students" replace />;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          to="/admin/dashboard/students"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#14213d] transition hover:text-[#08bfd4]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Повернутись назад</span>
        </Link>
      </div>

      {pageMessage ? (
        <Card className="rounded-[1.5rem] border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-none">
          <p className="text-sm font-medium">{pageMessage}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <LoadingState variant="card" className="rounded-[1.5rem] shadow-[0_18px_36px_rgba(15,23,42,0.06)]" />
      ) : !student ? (
        <Card className="rounded-[1.5rem] border-cyan-100 p-8 text-sm text-slate-500 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
          Student not found.
        </Card>
      ) : (
        <div className="space-y-5">
          <StudentDashboardProfile
            student={student}
            isSaving={isSaving}
            onSave={handleSaveProfile}
            saveMessage={profileMessage}
            onClearSaveMessage={() => setProfileMessage(null)}
          />

          <Card className="rounded-[1.75rem] border-cyan-100 bg-white p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#08bfd4]">Навчання студента</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-[#14213d]">
                  Записані курси
                </h2>
              </div>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-bold text-cyan-800">
                {student.enrolledCourseDetails.length}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <BookOpen className="h-4 w-4 text-[#08bfd4]" />
                  <span>Активні записи</span>
                </div>
                <p className="mt-2 text-2xl font-black text-[#14213d]">
                  {student.enrolledCourseDetails.length}
                </p>
              </div>
              <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Завершено</span>
                </div>
                <p className="mt-2 text-2xl font-black text-[#14213d]">
                  {student.enrolledCourseDetails.filter((course) => course.finishedAt).length}
                </p>
              </div>
            </div>

            {student.enrolledCourseDetails.length === 0 ? (
              <div className="mt-5 rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-500">
                  У студента поки немає записів на курси.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {student.enrolledCourseDetails.map((course) => (
                  <div
                    key={course.progressId}
                    className="flex min-h-[10.5rem] flex-col rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-[#14213d]">
                          {course.title}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {course.completedLessonsCount} з {course.totalLessonsCount} уроків
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                          course.finishedAt
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-cyan-50 text-cyan-800"
                        }`}
                      >
                        {course.finishedAt ? "Завершено" : `${course.progressPercent}%`}
                      </span>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#13daec]"
                        style={{ width: `${course.progressPercent}%` }}
                      />
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                      <span className="text-xs font-semibold text-slate-500">
                        {course.startedAt
                          ? `Почато: ${new Date(course.startedAt).toLocaleDateString("uk-UA")}`
                          : "Дата початку відсутня"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCoursePendingClear(course)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Очистити запис
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <AdminDeleteWarningModal
        isOpen={coursePendingClear !== null}
        entityLabel="запису на курс"
        entityName={coursePendingClear?.title ?? ""}
        entityEmail={student ? `Студент: ${student.fullName || student.email}` : ""}
        impactItems={[
          "Запис студента на цей курс буде видалено.",
          "Прогрес проходження уроків цього курсу буде очищено.",
          "Курс зникне з розділу записаних курсів студента.",
        ]}
        confirmLabel="Очистити запис"
        isSubmitting={isClearingCourse}
        onClose={() => {
          if (!isClearingCourse) {
            setCoursePendingClear(null);
          }
        }}
        onConfirm={() => {
          void handleClearCourseEnrollment();
        }}
      />
    </div>
  );
}
