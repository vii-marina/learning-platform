import { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { supabase } from "../../lib/supabase";

export function UserPanel() {
  const [displayName, setDisplayName] = useState("User");

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const nameFromMeta =
        (user?.user_metadata?.full_name as string | undefined) ||
        (user?.user_metadata?.name as string | undefined);
      const emailName = user?.email ? user.email.split("@")[0] : undefined;
      setDisplayName(nameFromMeta || emailName || "User");
    };

    loadUser();
  }, []);

  return (
    <aside className="hidden w-72 flex-col gap-6 border-l border-slate-200 bg-white px-6 py-8 lg:flex">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-slate-200" />
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Welcome, {displayName}!
          </p>
          <p className="text-xs text-slate-500">Your learning snapshot</p>
        </div>
      </div>
      <Card className="p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Next up
        </p>
        <h6 className="mt-2 text-sm font-semibold text-slate-900">
          Course placeholder
        </h6>
        <p className="mt-2 text-xs text-slate-600">
          Short description for the next lesson.
        </p>
      </Card>
    </aside>
  );
}
