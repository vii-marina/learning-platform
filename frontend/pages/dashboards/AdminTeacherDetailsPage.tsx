import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useAppToast } from "../../components/ui/appToastContext";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  loadAdminTeacherDetailData,
  primeAdminTeacherDetailCache,
  saveAdminTeacherProfile,
} from "../../features/admin-dashboard/api/adminDashboardApi";
import type { AdminTeacher } from "../../features/admin-dashboard/types";
import { BackendApiError, getErrorMessage } from "../../features/auth/api/backendClient";
import type { UpdateCurrentUserProfileInput } from "../../features/auth/types";
import { uploadTeacherAvatar } from "../../features/teacher-dashboard/api/teacherProfileStorage";
import { TeacherDashboardProfile } from "../../features/teacher-dashboard/components/TeacherDashboardProfile";

type TeacherDetailLocationState = {
  teacher?: AdminTeacher;
};

export function AdminTeacherDetailsPage() {
  const { showSuccessToast } = useAppToast();
  const { teacherId } = useParams<{ teacherId: string }>();
  const location = useLocation();
  const locationState = location.state as TeacherDetailLocationState | null;
  const stateTeacher = locationState?.teacher ?? null;
  const initialTeacher = stateTeacher && stateTeacher.id === teacherId ? stateTeacher : null;
  const [teacher, setTeacher] = useState<AdminTeacher | null>(initialTeacher);
  const [isLoading, setIsLoading] = useState(initialTeacher === null);
  const [isSaving, setIsSaving] = useState(false);
  const [pageMessage, setPageMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState<{
    type: "error";
    text: string;
    details?: unknown;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateTeacher() {
      if (!teacherId) {
        return;
      }

      if (initialTeacher) {
        primeAdminTeacherDetailCache(initialTeacher);
        setTeacher(initialTeacher);
        setIsLoading(false);
        setPageMessage("");
        setProfileMessage(null);
        return;
      }

      try {
        const nextTeacher = await loadAdminTeacherDetailData(teacherId);

        if (!isMounted) {
          return;
        }

        setTeacher(nextTeacher);
        setPageMessage("");
        setProfileMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageMessage(getErrorMessage(error, "Unable to load teacher profile."));
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

  async function handleSaveProfile(
    input: UpdateCurrentUserProfileInput,
    avatarFile: File | null
  ) {
    if (!teacher) {
      return;
    }

    try {
      setIsSaving(true);
      setProfileMessage(null);
      const avatarPath = avatarFile
        ? await uploadTeacherAvatar(teacher.id, avatarFile)
        : input.avatarPath;
      const updatedTeacher = await saveAdminTeacherProfile(teacher.id, {
        ...input,
        avatarPath,
      });

      setTeacher(updatedTeacher);
      showSuccessToast("Profile saved.");
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to save teacher profile."),
        details: error instanceof BackendApiError ? error.details : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

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
      ) : !teacher ? (
        <Card className="rounded-[1.5rem] border-cyan-100 p-8 text-sm text-slate-500 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
          Teacher not found.
        </Card>
      ) : (
        <TeacherDashboardProfile
          teacher={teacher}
          isSaving={isSaving}
          onSave={handleSaveProfile}
          saveMessage={profileMessage}
          onClearSaveMessage={() => setProfileMessage(null)}
        />
      )}
    </div>
  );
}
