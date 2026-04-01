import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useAppToast } from "../../components/ui/AppToastProvider";
import { Card } from "../../components/ui/Card";
import {
  loadAdminStudentDetailData,
  primeAdminStudentDetailCache,
  saveAdminStudentProfile,
} from "../../features/admin-dashboard/api/adminDashboardApi";
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
          <span>Back to Students</span>
        </Link>
      </div>

      {pageMessage ? (
        <Card className="rounded-[1.5rem] border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-none">
          <p className="text-sm font-medium">{pageMessage}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="rounded-[1.5rem] border-cyan-100 p-8 text-sm text-slate-500 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
          Loading student details...
        </Card>
      ) : !student ? (
        <Card className="rounded-[1.5rem] border-cyan-100 p-8 text-sm text-slate-500 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
          Student not found.
        </Card>
      ) : (
        <StudentDashboardProfile
          student={student}
          isSaving={isSaving}
          onSave={handleSaveProfile}
          saveMessage={profileMessage}
          onClearSaveMessage={() => setProfileMessage(null)}
        />
      )}
    </div>
  );
}
