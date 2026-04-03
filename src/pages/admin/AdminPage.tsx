import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "../../components/layout/Footer";
import { Header } from "../../components/layout/Header";
import { Sidebar } from "../../components/layout/Sidebar";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  getCurrentUser,
  listAdminUsers,
  listStudents,
  listTeachers,
  updateAdminUser,
} from "../../features/auth/api/authApi";
import { BackendApiError, getErrorMessage } from "../../features/auth/api/backendClient";
import type { CurrentUser, UserRole } from "../../features/auth/types";

type AdminScreenData = {
  currentUser: CurrentUser;
  users: CurrentUser[];
  teachers: CurrentUser[];
  students: CurrentUser[];
};

type UserListSectionProps = {
  title: string;
  subtitle: string;
  users: CurrentUser[];
  emptyMessage: string;
};

const editableRoles: UserRole[] = ["student", "teacher", "admin", "super-admin"];

function formatUserName(user: CurrentUser) {
  return user.fullName?.trim() || "Unnamed user";
}

async function loadAdminScreenData(): Promise<AdminScreenData> {
  const currentUser = await getCurrentUser();

  if (!currentUser.isAdmin) {
    return {
      currentUser,
      users: [],
      teachers: [],
      students: [],
    };
  }

  const [users, teachers, students] = await Promise.all([
    listAdminUsers(),
    listTeachers(),
    listStudents(),
  ]);

  return {
    currentUser,
    users,
    teachers,
    students,
  };
}

function UserListSection({ title, subtitle, users, emptyMessage }: UserListSectionProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {users.length}
        </span>
      </div>
      {users.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{formatUserName(user)}</p>
                  <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-slate-600">
                  {user.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [teachers, setTeachers] = useState<CurrentUser[]>([]);
  const [students, setStudents] = useState<CurrentUser[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftFullName, setDraftFullName] = useState("");
  const [draftRole, setDraftRole] = useState<UserRole>("student");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAdminPage() {
      try {
        const data = await loadAdminScreenData();

        if (!isMounted) {
          return;
        }

        if (!data.currentUser.isAdmin) {
          navigate("/dashboard");
          return;
        }

        setCurrentUser(data.currentUser);
        setUsers(data.users);
        setTeachers(data.teachers);
        setStudents(data.students);
        setErrorMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof BackendApiError && error.status === 401) {
          navigate("/login");
          return;
        }

        if (error instanceof BackendApiError && error.status === 403) {
          navigate("/dashboard");
          return;
        }

        setErrorMessage(getErrorMessage(error, "Unable to load admin data."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateAdminPage();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleEditStart = (user: CurrentUser) => {
    setEditingUserId(user.id);
    setDraftFullName(user.fullName ?? "");
    setDraftRole(user.role);
    setErrorMessage("");
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingUserId) {
      return;
    }

    setIsSaving(true);

    try {
      await updateAdminUser(editingUserId, {
        fullName: draftFullName.trim() ? draftFullName.trim() : null,
        role: draftRole,
      });

      const data = await loadAdminScreenData();

      if (!data.currentUser.isAdmin) {
        navigate("/dashboard");
        return;
      }

      setCurrentUser(data.currentUser);
      setUsers(data.users);
      setTeachers(data.teachers);
      setStudents(data.students);
      setEditingUserId(null);
      setErrorMessage("");
    } catch (error) {
      if (error instanceof BackendApiError && error.status === 401) {
        navigate("/login");
        return;
      }

      if (error instanceof BackendApiError && error.status === 403) {
        navigate("/dashboard");
        return;
      }

      setErrorMessage(getErrorMessage(error, "Unable to update the selected user."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
      />
      <div
        className={`transition-[padding] duration-300 ${
          isSidebarOpen ? "pl-64" : "pl-16"
        }`}
      >
        <Header alignLeft />
        <main className="mx-auto flex w-full max-w-none flex-col gap-6 px-6 py-8">
          <Card className="p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Admin Panel</h1>
                <p className="mt-3 max-w-3xl text-sm text-slate-600">
                  Manage LMS users, review teachers and students, and keep role access aligned
                  with backend permissions.
                </p>
              </div>
              {currentUser ? (
                <div className="rounded-2xl bg-slate-900 px-5 py-4 text-white">
\                 <p className="mt-2 text-sm font-semibold">{formatUserName(currentUser)}</p>
                  <p className="mt-1 text-xs text-slate-300">{currentUser.role}</p>
                </div>
              ) : null}
            </div>
          </Card>

          {errorMessage ? (
            <Card className="border-rose-200 bg-rose-50 p-6 text-rose-700">
              <p className="text-sm font-medium">{errorMessage}</p>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <p className="text-xs uppercase tracking-wide text-slate-500">Managed users</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{users.length}</p>
            </Card>
            <Card className="p-6">
              <p className="text-xs uppercase tracking-wide text-slate-500">Teachers</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{teachers.length}</p>
            </Card>
            <Card className="p-6">
              <p className="text-xs uppercase tracking-wide text-slate-500">Students</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{students.length}</p>
            </Card>
          </div>

          <Card className="p-0">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">All users</h2>
              <p className="mt-1 text-sm text-slate-600">
                {currentUser?.isSuperAdmin
                  ? "Super-admins can update names and roles directly from this view."
                  : "Admins can review the full user list in read-only mode."}
              </p>
            </div>
            {isLoading ? (
              <div className="px-6 py-6">
                <LoadingState variant="card" className="min-h-[13rem]" />
              </div>
            ) : users.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">
                No managed users were found yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Name</th>
                      <th className="px-6 py-4 font-medium">Email</th>
                      <th className="px-6 py-4 font-medium">Role</th>
                      <th className="px-6 py-4 font-medium">Access</th>
                      <th className="px-6 py-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-slate-200">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-900">{formatUserName(user)}</p>
                            <p className="mt-1 text-xs text-slate-500">{user.id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {user.isSuperAdmin
                            ? "Full access"
                            : user.isAdmin
                              ? "Admin access"
                              : "Standard access"}
                        </td>
                        <td className="px-6 py-4">
                          {currentUser?.isSuperAdmin ? (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleEditStart(user)}
                            >
                              Edit
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-500">Read only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {currentUser?.isSuperAdmin && editingUserId ? (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-slate-900">Edit user</h2>
              <form className="mt-5 grid gap-4 md:grid-cols-[1.5fr_1fr_auto]" onSubmit={handleSave}>
                <label className="text-sm text-slate-600">
                  Full name
                  <Input
                    className="mt-1"
                    value={draftFullName}
                    onChange={(event) => setDraftFullName(event.target.value)}
                    placeholder="Alex Johnson"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  Role
                  <select
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    value={draftRole}
                    onChange={(event) => setDraftRole(event.target.value as UserRole)}
                  >
                    {editableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end gap-3">
                  <Button
                    type="submit"
                    className="disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingUserId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <UserListSection
              title="Teachers"
              subtitle="Dedicated list powered by GET /admin/teachers."
              users={teachers}
              emptyMessage="No teachers found yet."
            />
            <UserListSection
              title="Students"
              subtitle="Dedicated list powered by GET /admin/students."
              users={students}
              emptyMessage="No students found yet."
            />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
