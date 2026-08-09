import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../api/authApi";
import { getDefaultRouteForRole } from "../lib/roleRouting";

/**
 * Keeps an already signed-in visitor off the login/register pages — they cannot
 * sign in or register again, and without this the browser back button after a
 * login lands on the form again. Returns `true` while the session is being
 * resolved so the caller can hold the form back instead of flashing it.
 */
export function useRedirectIfAuthenticated() {
  const navigate = useNavigate();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function redirectWhenAlreadySignedIn() {
      try {
        const currentUser = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        navigate(getDefaultRouteForRole(currentUser.role), { replace: true });
      } catch {
        // No usable session (or the profile could not be read) — show the form.
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    void redirectWhenAlreadySignedIn();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return isCheckingSession;
}
