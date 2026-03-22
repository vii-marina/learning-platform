import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { loadAdminSettingsData } from "../../features/admin-dashboard/api/adminDashboardApi";
import type { AdminDashboardSettingsData } from "../../features/admin-dashboard/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";
import type { CurrentUser } from "../../features/auth/types";

export function AdminDashboardSettingsPage() {
  const { currentUser } = useOutletContext<{ currentUser: CurrentUser }>();
  const [data, setData] = useState<AdminDashboardSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function hydrateSettings() {
      try {
        const settingsData = await loadAdminSettingsData();

        if (!isMounted) {
          return;
        }

        setData(settingsData);
        setMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(getErrorMessage(error, "Unable to load platform settings."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-cyan-100 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
          Platform settings
        </h1>
      </Card>

      {message ? (
        <Card className="rounded-[1.75rem] border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          Loading platform settings...
        </Card>
      ) : data ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                Current role
              </p>
              <p className="mt-2 text-lg font-black tracking-tight text-slate-900">
                {currentUser.role}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                Super-admin
              </p>
              <p className="mt-2 text-lg font-black tracking-tight text-slate-900">
                {currentUser.isSuperAdmin ? "Yes" : "No"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                Admin users
              </p>
              <p className="mt-2 text-lg font-black tracking-tight text-slate-900">
                {data.users.filter((user) => user.isAdmin).length}
              </p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
