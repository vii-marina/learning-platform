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
    <Card className="rounded-[1.5rem] border-cyan-100 p-0 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
          </div>
          <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
            {users.length}
          </span>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="px-5 py-8 text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <article
              key={user.id}
              className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {formatUserName(user)}
                  </h3>
                  <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {user.role}
                </span>
              </div>

              <dl className="mt-4 space-y-2 text-sm text-slate-600">
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
