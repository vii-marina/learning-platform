import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "../../components/ui/LoadingState";
import { getCurrentUser } from "../../features/auth/api/authApi";
import { getDefaultRouteForRole } from "../../features/auth/lib/roleRouting";
import { CourseBuilderPage } from "../admin/CourseBuilderPage";

export function CourseBuilderWorkspacePage() {
  const navigate = useNavigate();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // The guard belongs here rather than in CourseBuilderPage: the teacher
  // dashboard embeds that component behind its own guard, so checking inside it
  // would mean a second /auth/me round trip and two competing redirects.
  useEffect(() => {
    let isMounted = true;

    async function authorizeBuilder() {
      try {
        const currentUser = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        // Admins reach this route from their sidebar, teachers from their dashboard.
        if (currentUser.role !== "teacher" && !currentUser.isAdmin) {
          navigate(getDefaultRouteForRole(currentUser.role), { replace: true });
          return;
        }

        setIsAllowed(true);
      } catch {
        if (isMounted) {
          navigate("/login", { replace: true });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void authorizeBuilder();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8f8] px-4">
        <LoadingState variant="page" className="max-w-3xl" />
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f6f8f8]">
      <CourseBuilderPage />
    </div>
  );
}
