import { Card } from "../../../components/ui/Card";
import type { CurrentUser } from "../../auth/types";

type AdminUserDirectoryProps = {
  title: string;
  users: CurrentUser[];
  emptyMessage: string;
};

function formatUserName(user: CurrentUser) {
  return user.fullName?.trim() || "Unnamed user";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminUserDirectory({
  title,
  users,
  emptyMessage,
}: AdminUserDirectoryProps) {
  return (
    <Card className="rounded-[1.75rem] border-cyan-100 p-0 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>
          </div>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
            {users.length}
          </span>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="px-6 py-10 text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <article
              key={user.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {formatUserName(user)}
                  </h3>
                  <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-600">
                  {user.role}
                </span>
              </div>

              <dl className="mt-5 space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-4">
                  <dt>User ID</dt>
                  <dd className="truncate font-medium text-slate-900">{user.id}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Created</dt>
                  <dd className="font-medium text-slate-900">{formatDate(user.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Access</dt>
                  <dd className="font-medium text-slate-900">
                    {user.isSuperAdmin
                      ? "Super-admin"
                      : user.isAdmin
                        ? "Admin"
                        : "Standard"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
