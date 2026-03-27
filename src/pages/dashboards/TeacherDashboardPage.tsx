import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import {
  getCurrentUser,
  updateCurrentUserProfile,
} from "../../features/auth/api/authApi";
import { BackendApiError, getErrorMessage } from "../../features/auth/api/backendClient";
import {
  canAccessDashboardRole,
  getDefaultRouteForRole,
} from "../../features/auth/lib/roleRouting";
import type {
  CurrentUser,
  UpdateCurrentUserProfileInput,
} from "../../features/auth/types";
import { uploadTeacherAvatar } from "../../features/teacher-dashboard/api/teacherProfileStorage";
import { TeacherDashboardCourses } from "../../features/teacher-dashboard/components/TeacherDashboardCourses";
import { TeacherDashboardOverview } from "../../features/teacher-dashboard/components/TeacherDashboardOverview";
import { TeacherDashboardProfile } from "../../features/teacher-dashboard/components/TeacherDashboardProfile";
import { TeacherDashboardSidebar } from "../../features/teacher-dashboard/components/TeacherDashboardSidebar";
import type { TeacherDashboardSectionId } from "../../features/teacher-dashboard/types";

function TeacherDashboardPlaceholder({
  title,
}: {
  title: string;
}) {
  return (
    <Card className="rounded-[1.75rem] border-cyan-100 p-8 shadow-[0_20px_40px_rgba(15,23,42,0.06)] md:p-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-black tracking-tight text-[#14213d]">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          This section is mocked for now and can be expanded next.
        </p>
      </div>
    </Card>
  );
}

export function TeacherDashboardPage() {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [pageMessage, setPageMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [profileMessage, setProfileMessage] = useState<{
    type: "error" | "success";
    text: string;
    details?: unknown;
  } | null>(null);
  const [activeSection, setActiveSection] =
    useState<TeacherDashboardSectionId>("overview");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const currentUser = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        if (!canAccessDashboardRole(currentUser.role, "teacher")) {
          navigate(getDefaultRouteForRole(currentUser.role), { replace: true });
          return;
        }

        setCurrentUser(currentUser);
        setHasAccess(true);
        setPageMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof BackendApiError && error.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        setPageMessage({
          type: "error",
          text: getErrorMessage(error, "Unable to load your dashboard."),
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (!isLoading && !hasAccess && !pageMessage) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSaveProfile(
    input: UpdateCurrentUserProfileInput,
    avatarFile: File | null
  ) {
    if (!currentUser) {
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileMessage(null);
      const avatarPath = avatarFile
        ? await uploadTeacherAvatar(currentUser.id, avatarFile)
        : input.avatarPath;
      const updatedUser = await updateCurrentUserProfile({
        ...input,
        avatarPath,
      });
      setCurrentUser(updatedUser);
      setProfileMessage({
        type: "success",
        text: "Information updated.",
      });
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to save your information."),
        details: error instanceof BackendApiError ? error.details : undefined,
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  function renderTeacherSection() {
    switch (activeSection) {
      case "profile":
        return currentUser ? (
          <TeacherDashboardProfile
            teacher={currentUser}
            isSaving={isSavingProfile}
            onSave={handleSaveProfile}
            saveMessage={profileMessage}
            onClearSaveMessage={() => setProfileMessage(null)}
          />
        ) : (
          <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
            Loading profile...
          </Card>
        );
      case "overview":
        return <TeacherDashboardOverview />;
      case "courses":
        return <TeacherDashboardCourses />;
      case "students":
        return <TeacherDashboardPlaceholder title="My students" />;
      case "progress":
        return <TeacherDashboardPlaceholder title="My progress" />;
      case "calendar":
        return <TeacherDashboardPlaceholder title="Calendar" />;
      case "messages":
        return <TeacherDashboardPlaceholder title="Messages" />;
      case "settings":
        return <TeacherDashboardPlaceholder title="Settings" />;
      default:
        return <TeacherDashboardOverview />;
    }
  }

  return (
    <div
      className="min-h-screen bg-[#f4fbfd] text-slate-900"
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1720px] flex-col lg:flex-row">
        <TeacherDashboardSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          currentUser={currentUser}
          onOpenProfile={() => setActiveSection("profile")}
          compactOnDesktop={activeSection === "courses"}
        />

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8 xl:px-10">
          {pageMessage ? (
            <Card
              className={`rounded-[1.75rem] p-6 shadow-none ${
                pageMessage.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              <p className="text-sm font-medium">{pageMessage.text}</p>
            </Card>
          ) : null}

          {isLoading ? (
            <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
              Loading teacher dashboard...
            </Card>
          ) : hasAccess ? (
            renderTeacherSection()
          ) : null}
        </main>
      </div>
    </div>
  );
}
