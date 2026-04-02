import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
import { AdminDashboardSidebar } from "../../features/admin-dashboard/components/AdminDashboardSidebar";
import { getCurrentUser } from "../../features/auth/api/authApi";
import { BackendApiError, getErrorMessage } from "../../features/auth/api/backendClient";
import { getDefaultRouteForRole } from "../../features/auth/lib/roleRouting";
import type { CurrentUser } from "../../features/auth/types";

export function AdminDashboardLayout() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function hydrateCurrentUser() {
      try {
        const user = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        if (!user.isAdmin) {
          navigate(getDefaultRouteForRole(user.role), { replace: true });
          return;
        }

        setCurrentUser(user);
        setMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof BackendApiError && error.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        if (error instanceof BackendApiError && error.status === 403) {
          navigate("/dashboard", { replace: true });
          return;
        }

        setMessage(getErrorMessage(error, "Unable to load admin dashboard."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (!isLoading && !currentUser && !message) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      className="min-h-screen bg-[#f4fbfd] text-slate-900"
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      <div className="mx-auto grid min-h-screen max-w-[1720px] lg:grid-cols-[18rem_minmax(0,1fr)]">
        <AdminDashboardSidebar />

        <main className="min-w-0 px-4 py-6 md:px-8 md:py-8 xl:px-10">
          

          {message ? (
            <Card className="rounded-[1.75rem] border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
              <p className="text-sm font-medium">{message}</p>
            </Card>
          ) : null}

          {isLoading ? (
            <LoadingState variant="page" />
          ) : currentUser ? (
            <Outlet context={{ currentUser }} />
          ) : null}
        </main>
      </div>
    </div>
  );
}
