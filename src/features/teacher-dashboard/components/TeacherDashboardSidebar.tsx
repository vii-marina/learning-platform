import {
  BookOpen,
  LayoutGrid,
  LogOut,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminTeacherAvatar } from "../../admin-dashboard/components/AdminTeacherAvatar";
import type { CurrentUser } from "../../auth/types";
import { getTeacherAvatarPublicUrl } from "../api/teacherProfileStorage";
import type { TeacherDashboardSectionId } from "../types";

type SidebarItem = {
  id: TeacherDashboardSectionId;
  label: string;
  icon: LucideIcon;
};

const sidebarItems: SidebarItem[] = [
  { id: "overview", label: "Огляд", icon: LayoutGrid },
  { id: "courses", label: "Мої курси", icon: BookOpen },
  { id: "students", label: "Мої студенти", icon: Users }
];

type TeacherDashboardSidebarProps = {
  activeSection: TeacherDashboardSectionId;
  onSectionChange: (section: TeacherDashboardSectionId) => void;
  currentUser: CurrentUser | null;
  onOpenProfile: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
  logoutMessage?: string | null;
  compactOnDesktop?: boolean;
};

function getProfileDisplayName(user: CurrentUser | null) {
  return user?.fullName?.trim() || "Профіль викладача";
}

function getAvatarName(user: CurrentUser | null) {
  return user?.fullName?.trim() || user?.email || "Викладач";
}

function SidebarLabel({
  compactOnDesktop,
  children,
}: {
  compactOnDesktop: boolean;
  children: string;
}) {
  return (
    <span className={compactOnDesktop ? "lg:hidden lg:group-hover:inline" : ""}>
      {children}
    </span>
  );
}

function SidebarProfilePlaceholder() {
  return (
    <div className="flex min-h-[2.75rem] flex-col justify-center gap-2" aria-hidden="true">
      <div className="h-3.5 w-28 rounded-full bg-slate-200" />
      <div className="h-2.5 w-36 rounded-full bg-slate-100" />
    </div>
  );
}

function SidebarButton({
  item,
  isActive,
  compactOnDesktop,
  onClick,
}: {
  item: SidebarItem;
  isActive: boolean;
  compactOnDesktop: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      title={compactOnDesktop ? item.label : undefined}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left text-sm font-medium transition ${
        compactOnDesktop
          ? "lg:justify-center lg:px-0 lg:group-hover:justify-start lg:group-hover:px-4"
          : ""
      } ${
        isActive
          ? "bg-slate-950 text-white shadow-[0_16px_32px_rgba(15,23,42,0.16)]"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      <Icon className="h-4 w-4" />
      <SidebarLabel compactOnDesktop={compactOnDesktop}>{item.label}</SidebarLabel>
    </button>
  );
}

export function TeacherDashboardSidebar({
  activeSection,
  onSectionChange,
  currentUser,
  onOpenProfile,
  onLogout,
  isLoggingOut = false,
  logoutMessage = null,
  compactOnDesktop = false,
}: TeacherDashboardSidebarProps) {
  const avatarImageUrl = getTeacherAvatarPublicUrl(currentUser?.avatarPath);

  return (
    <aside
      className={`group border-r border-slate-200/80 bg-white/92 px-5 py-6 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:py-8 ${
        compactOnDesktop
          ? "lg:w-[5.75rem] lg:px-4 lg:hover:w-[17rem] lg:hover:px-6"
          : "lg:w-[17rem] lg:px-6"
      }`}
    >
      <div className="flex h-full flex-col">
        <div
          className={`flex items-center gap-3 px-1 ${
            compactOnDesktop ? "lg:justify-center lg:group-hover:justify-start" : ""
          }`}
        >
          
          <div className={compactOnDesktop ? "lg:hidden lg:group-hover:block" : ""}>
            <p className="text-ml font-semibold  text-slate-950 ">
              Кабінет викладача
            </p>
          </div>
        </div>

        <nav className="mt-10 flex-1 space-y-2">
          {sidebarItems.map((item) => (
            <SidebarButton
              key={item.id}
              item={item}
              compactOnDesktop={compactOnDesktop}
              isActive={
                activeSection === item.id ||
                (activeSection === "builder" && item.id === "courses")
              }
              onClick={() => onSectionChange(item.id)}
            />
          ))}
        </nav>

        <div className="space-y-3 pt-6">
          <button
            type="button"
            title={compactOnDesktop ? "Мій профіль" : undefined}
            onClick={onOpenProfile}
            aria-current={activeSection === "profile" ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-[0.5rem] border bg-[#13daec]/10 px-3 py-3 text-left transition hover:bg-slate-100 ${
              compactOnDesktop
                ? "lg:justify-center lg:px-2 lg:group-hover:justify-start lg:group-hover:px-3"
                : ""
            }`}
          >
            <AdminTeacherAvatar
              name={getAvatarName(currentUser)}
              imageUrl={avatarImageUrl}
              size="sm"
            />
            <div
              className={`min-w-0 ${compactOnDesktop ? "lg:hidden lg:group-hover:block" : ""}`}
            >
              {currentUser ? (
                <>
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {getProfileDisplayName(currentUser)}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {currentUser.email}
                  </p>
                </>
              ) : (
                <SidebarProfilePlaceholder />
              )}
            </div>
          </button>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className={`flex h-11 w-full items-center gap-3 rounded-[1.25rem] px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 ${
                compactOnDesktop
                  ? "lg:justify-center lg:px-0 lg:group-hover:justify-start lg:group-hover:px-4"
                  : ""
              }`}
            >
              <LogOut className="h-4 w-4" />
              <SidebarLabel compactOnDesktop={compactOnDesktop}>
                {isLoggingOut ? "Вихід..." : "Вийти"}
              </SidebarLabel>
            </button>
            {logoutMessage ? (
              <p className="px-1 text-sm text-rose-600">{logoutMessage}</p>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
