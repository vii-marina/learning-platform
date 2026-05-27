import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "../../components/ui/LoadingState";
import { LogoutButton } from "../../features/auth/components/LogoutButton";
import { getCurrentUser } from "../../features/auth/api/authApi";
import { BackendApiError, getErrorMessage } from "../../features/auth/api/backendClient";
import {
  canAccessDashboardRole,
  getDefaultRouteForRole,
  type DashboardRole,
} from "../../features/auth/lib/roleRouting";
import { DashboardShell } from "./components/DashboardShell";

type RoleDashboardPageProps = {
  role: DashboardRole;
  greeting: string;
};

export function RoleDashboardPage({ role, greeting }: RoleDashboardPageProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const currentUser = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        if (!canAccessDashboardRole(currentUser.role, role)) {
          navigate(getDefaultRouteForRole(currentUser.role), { replace: true });
          return;
        }

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
  }, [navigate, role]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
        <LoadingState variant="page" className="max-w-xl" />
      </div>
    );
  }

  if (message) {
    return (
      <DashboardShell
        title="Інформаційна панель недоступна"
        description={message}
      />
    );
  }

  return (
    <DashboardShell
      title={greeting}
      description="Це тимчасовий каркас dashboard для вашої ролі."
    >
      <LogoutButton />
    </DashboardShell>
  );
}
