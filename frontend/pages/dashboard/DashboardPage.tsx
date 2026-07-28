import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../features/auth/api/authApi";
import { BackendApiError, getErrorMessage } from "../../features/auth/api/backendClient";
import { getDefaultRouteForRole } from "../../features/auth/lib/roleRouting";
import { DashboardShell } from "../dashboards/components/DashboardShell";

export function DashboardPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function redirectToRoleDashboard() {
      try {
        const currentUser = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        navigate(getDefaultRouteForRole(currentUser.role), { replace: true });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof BackendApiError && error.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        setMessage(getErrorMessage(error, "Не вдалося відкрити вашу інформаційну панель."));
      }
    }

    void redirectToRoleDashboard();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <DashboardShell
      title={message ? "Інформаційна панель недоступна" : "Перенаправлення"}
      description={message || "Відкриття правильної інформаційної панелі для вашої ролі."}
    />
  );
}
