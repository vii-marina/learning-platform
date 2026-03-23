import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  Mail,
  Pencil,
  UserRound,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import {
  loadAdminTeacherDetailData,
  primeAdminTeacherDetailCache,
  saveAdminTeacherProfile,
} from "../../features/admin-dashboard/api/adminDashboardApi";
import { AdminTeacherAvatar } from "../../features/admin-dashboard/components/AdminTeacherAvatar";
import type { AdminTeacher, AdminTeacherProfileInput } from "../../features/admin-dashboard/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";

type TeacherDetailTab = "contact" | "students";
type TeacherDetailLocationState = {
  teacher?: AdminTeacher;
};

function getTeacherDisplayName(teacher: AdminTeacher) {
  return teacher.fullName?.trim() || teacher.email;
}

function toInputState(teacher: AdminTeacher): AdminTeacherProfileInput {
  return {
    fullName: teacher.fullName ?? "",
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm leading-6 text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-[#14213d]">{value}</span>
    </div>
  );
}

function DetailField({
  label,
  icon: Icon,
  value,
  editable = false,
  onChange,
  placeholder,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  value: string;
  editable?: boolean;
  onChange?: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[#13daec]/12 p-3 text-[#08bfd4]">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-slate-500">{label}</span>
      </div>

      {editable ? (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          className="mt-4 h-11 w-full rounded-[0.9rem] border border-slate-200 bg-white px-4 text-sm font-medium text-[#14213d] outline-none transition focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/12"
        />
      ) : (
        <div className="mt-4 rounded-[0.9rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#14213d]">
          {value}
        </div>
      )}
    </div>
  );
}

export function AdminTeacherDetailsPage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const location = useLocation();
  const locationState = location.state as TeacherDetailLocationState | null;
  const stateTeacher = locationState?.teacher ?? null;
  const initialTeacher = stateTeacher && stateTeacher.id === teacherId ? stateTeacher : null;
  const [teacher, setTeacher] = useState<AdminTeacher | null>(initialTeacher);
  const [isLoading, setIsLoading] = useState(initialTeacher === null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TeacherDetailTab>("contact");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<AdminTeacherProfileInput | null>(
    initialTeacher ? toInputState(initialTeacher) : null
  );

  useEffect(() => {
    let isMounted = true;

    async function hydrateTeacher() {
      if (!teacherId) {
        return;
      }

      if (initialTeacher) {
        primeAdminTeacherDetailCache(initialTeacher);
        setTeacher(initialTeacher);
        setFormState(toInputState(initialTeacher));
        setIsLoading(false);
        setMessage("");
        return;
      }

      try {
        const nextTeacher = await loadAdminTeacherDetailData(teacherId);

        if (!isMounted) {
          return;
        }

        setTeacher(nextTeacher);
        setFormState(nextTeacher ? toInputState(nextTeacher) : null);
        setMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(getErrorMessage(error, "Unable to load teacher profile."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateTeacher();

    return () => {
      isMounted = false;
    };
  }, [initialTeacher, teacherId]);

  if (!teacherId) {
    return <Navigate to="/admin/dashboard/teachers" replace />;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          to="/admin/dashboard/teachers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#14213d] transition hover:text-[#08bfd4]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Teachers</span>
        </Link>
        
      </div>

      {message ? (
        <Card className="rounded-[1.5rem] border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="rounded-[1.5rem] border-cyan-100 p-8 text-sm text-slate-500 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
          Loading teacher details...
        </Card>
      ) : !teacher || !formState ? (
        <Card className="rounded-[1.5rem] border-cyan-100 p-8 text-sm text-slate-500 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
          Teacher not found.
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <Card className="rounded-[1.75rem] border-[#d8f5f7] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col items-center text-center">
              <AdminTeacherAvatar
                name={getTeacherDisplayName({
                  ...teacher,
                  fullName: formState.fullName,
                })}
                size="lg"
              />
              <h1 className="mt-5 break-all text-2xl font-black tracking-tight text-[#14213d]">
                {getTeacherDisplayName({
                  ...teacher,
                  fullName: formState.fullName,
                })}
              </h1>
              <div className="mt-3 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-700">
                Teacher
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <SummaryRow label="Email" value={teacher.email} />
              <SummaryRow label="Created" value={formatDate(teacher.createdAt)} />
              <SummaryRow label="Courses" value={`${teacher.courseCount} total`} />
              <SummaryRow
                label="Published"
                value={`${teacher.publishedCourseCount}`}
              />
              <SummaryRow label="Drafts" value={`${teacher.draftCourseCount}`} />
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-[#d8f5f7] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
            <div className="rounded-full bg-slate-100 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("contact")}
                  className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === "contact"
                      ? "bg-white text-[#14213d] shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Contact Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("students")}
                  className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === "students"
                      ? "bg-white text-[#14213d] shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Assigned Students ({teacher.assignedStudents.length})
                </button>
              </div>
            </div>

            {activeTab === "contact" ? (
              <div className="mt-5 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailField
                    label="Full name"
                    icon={UserRound}
                    value={formState.fullName}
                    editable
                    onChange={(value) => setFormState((prev) => (prev ? { ...prev, fullName: value } : prev))}
                    placeholder="Teacher full name"
                  />
                  <DetailField
                    label="Email"
                    icon={Mail}
                    value={teacher.email}
                  />
                  <DetailField
                    label="Role"
                    icon={GraduationCap}
                    value={teacher.role}
                  />
                  <DetailField
                    label="Created"
                    icon={CalendarDays}
                    value={formatDate(teacher.createdAt)}
                  />
                  <DetailField
                    label="Total courses"
                    icon={BookOpen}
                    value={`${teacher.courseCount}`}
                  />
                  <DetailField
                    label="Published courses"
                    icon={CheckCircle2}
                    value={`${teacher.publishedCourseCount}`}
                  />
                  <DetailField
                    label="Draft courses"
                    icon={FileText}
                    value={`${teacher.draftCourseCount}`}
                  />
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsSaving(true);
                      const updatedTeacher = await saveAdminTeacherProfile(teacher, formState);

                      if (!updatedTeacher) {
                        setMessage("Teacher was saved but could not be reloaded.");
                        return;
                      }

                      setTeacher(updatedTeacher);
                      setFormState(toInputState(updatedTeacher));
                      setMessage("Teacher profile updated.");
                    } catch (error) {
                      setMessage(getErrorMessage(error, "Unable to save teacher profile."));
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[1rem] bg-[#14213d] px-5 text-sm font-bold text-white transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                >
                  <Pencil className="h-4 w-4" />
                  <span>{isSaving ? "Saving..." : "Save changes"}</span>
                </button>
              </div>
            ) : teacher.assignedStudents.length === 0 ? (
              <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-5 py-6 text-sm leading-6 text-slate-500">
                No assigned students found for this teacher.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {teacher.assignedStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-start justify-between gap-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#14213d]">
                        {student.fullName?.trim() || "Unnamed student"}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {student.email}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {student.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
