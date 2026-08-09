import { useEffect, useState } from "react";
import { getCurrentUser } from "../api/authApi";
import { getDefaultRouteForRole } from "../lib/roleRouting";

/**
 * Dashboard route of the signed-in visitor, or `null` when nobody is signed in.
 * Used by public pages so they can point at the dashboard instead of offering a
 * sign-in link to someone who already has a session. Anonymous visitors resolve
 * without a network call — `getCurrentUser` rejects on the local session read.
 */
export function useSignedInDashboardPath() {
  const [dashboardPath, setDashboardPath] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveDashboardPath() {
      try {
        const currentUser = await getCurrentUser();

        if (isMounted) {
          setDashboardPath(getDefaultRouteForRole(currentUser.role));
        }
      } catch {
        if (isMounted) {
          setDashboardPath(null);
        }
      }
    }

    void resolveDashboardPath();

    return () => {
      isMounted = false;
    };
  }, []);

  return dashboardPath;
}
