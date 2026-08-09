import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { clearAdminDashboardCache } from "../../admin-dashboard/api/adminDashboardApi";
import { clearCurrentUserCache } from "../api/authApi";

// Page guards only run on mount, so a sign-out in another tab or an expired
// token would otherwise leave a fully rendered dashboard on screen until the
// next request fails. Supabase mirrors sign-out across tabs, so this covers both.
const publicPaths = ["/", "/login", "/register", "/email-confirmed"];

export function AuthSessionWatcher() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT") {
        return;
      }

      clearCurrentUserCache();
      clearAdminDashboardCache();

      // Read the live pathname rather than a router value: keeping `location` out
      // of the dependency list stops this from resubscribing on every navigation.
      if (!publicPaths.includes(window.location.pathname)) {
        navigate("/login", { replace: true });
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}
