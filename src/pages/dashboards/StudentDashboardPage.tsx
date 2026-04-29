import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppToast } from "../../components/ui/AppToastProvider";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  getCurrentUser,
  updateCurrentUserProfile,
} from "../../features/auth/api/authApi";
import { BackendApiError, getErrorMessage } from "../../features/auth/api/backendClient";
import type {
  CurrentUser,
  UpdateCurrentUserProfileInput,
} from "../../features/auth/types";
import { StudentDashboardCourses } from "../../features/student-dashboard/components/StudentDashboardCourses";
import { StudentDashboardOverview } from "../../features/student-dashboard/components/StudentDashboardOverview";
import { StudentDashboardProfile } from "../../features/student-dashboard/components/StudentDashboardProfile";
import { loadStudentDashboardCourses } from "../../features/student-dashboard/api/studentDashboardApi";
import { StudentDashboardSidebar } from "../../features/student-dashboard/components/StudentDashboardSidebar";
import { uploadStudentAvatar } from "../../features/student-dashboard/api/studentProfileStorage";
import {
  canAccessDashboardRole,
  getDefaultRouteForRole,
} from "../../features/auth/lib/roleRouting";
import type { StudentDashboardSectionId } from "../../features/student-dashboard/types";
import type { StudentDashboardCourseCatalogItem } from "../../features/student-dashboard/api/studentDashboardApi";

function StudentDashboardPlaceholder({
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

export function StudentDashboardPage() {
  const navigate = useNavigate();
  const { showSuccessToast } = useAppToast();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [pageMessage, setPageMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [profileMessage, setProfileMessage] = useState<{
    type: "error";
    text: string;
    details?: unknown;
  } | null>(null);
  const [catalogCourses, setCatalogCourses] = useState<StudentDashboardCourseCatalogItem[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] =
    useState<StudentDashboardSectionId>("overview");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const currentUser = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        if (!canAccessDashboardRole(currentUser.role, "student")) {
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

  useEffect(() => {
    if (!hasAccess || currentUser?.role !== "student") {
      return;
    }

    let isMounted = true;

    async function loadCatalog() {
      try {
        setIsCatalogLoading(true);
        const courses = await loadStudentDashboardCourses();

        if (!isMounted) {
          return;
        }

        setCatalogCourses(courses);
        setCatalogMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCatalogCourses([]);
        setCatalogMessage(getErrorMessage(error, "Unable to load published courses."));
      } finally {
        if (isMounted) {
          setIsCatalogLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.role, hasAccess]);

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
        ? await uploadStudentAvatar(currentUser.id, avatarFile)
        : input.avatarPath;
      const updatedUser = await updateCurrentUserProfile({
        ...input,
        avatarPath,
      });
      setCurrentUser(updatedUser);
      showSuccessToast("Profile saved.");
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

  function renderStudentSection() {
    switch (activeSection) {
      case "profile":
        return currentUser ? (
          <StudentDashboardProfile
            student={currentUser}
            isSaving={isSavingProfile}
            onSave={handleSaveProfile}
            saveMessage={profileMessage}
            onClearSaveMessage={() => setProfileMessage(null)}
          />
        ) : (
          <LoadingState variant="section" />
        );
      case "overview":
        return (
          <StudentDashboardOverview
            currentUser={currentUser}
            courses={catalogCourses}
            isLoadingCourses={isCatalogLoading}
            coursesMessage={catalogMessage}
            onOpenCourses={() => setActiveSection("courses")}
          />
        );
      case "courses":
        return (
          <StudentDashboardCourses
            courses={catalogCourses}
            isLoadingCourses={isCatalogLoading}
            coursesMessage={catalogMessage}
          />
        );
      case "teachers":
        return <StudentDashboardPlaceholder title="My teachers" />;
      
      case "messages":
        return <StudentDashboardPlaceholder title="Messages" />;
      case "settings":
        return <StudentDashboardPlaceholder title="Settings" />;
      default:
        return (
          <StudentDashboardOverview
            currentUser={currentUser}
            courses={catalogCourses}
            isLoadingCourses={isCatalogLoading}
            coursesMessage={catalogMessage}
            onOpenCourses={() => setActiveSection("courses")}
          />
        );
    }
  }

  return (
    <div
      className="min-h-screen bg-[#f4fbfd] text-slate-900"
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1720px] flex-col lg:flex-row">
        <StudentDashboardSidebar
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
            <LoadingState variant="page" />
          ) : hasAccess ? (
            renderStudentSection()
          ) : null}
        </main>
      </div>
    </div>
  );
}
