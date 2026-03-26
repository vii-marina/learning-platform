import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { getCurrentUser } from "../../features/auth/api/authApi";
import { BackendApiError, getErrorMessage } from "../../features/auth/api/backendClient";
import {
  canAccessDashboardRole,
  getDefaultRouteForRole,
} from "../../features/auth/lib/roleRouting";
import { TeacherDashboardCourses } from "../../features/teacher-dashboard/components/TeacherDashboardCourses";
import { TeacherDashboardOverview } from "../../features/teacher-dashboard/components/TeacherDashboardOverview";
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
  const [message, setMessage] = useState("");
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

        setHasAccess(true);
        setMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof BackendApiError && error.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        setMessage(getErrorMessage(error, "Unable to load your dashboard."));
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

  if (!isLoading && !hasAccess && !message) {
    return <Navigate to="/dashboard" replace />;
  }

  function renderTeacherSection() {
    switch (activeSection) {
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
          compactOnDesktop={activeSection === "courses"}
        />

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8 xl:px-10">
          {message ? (
            <Card className="rounded-[1.75rem] border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
              <p className="text-sm font-medium">{message}</p>
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
