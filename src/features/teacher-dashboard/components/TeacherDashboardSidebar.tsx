import {
  BookOpen,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
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

const primaryItems: SidebarItem[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "students", label: "My Students", icon: Users },
  { id: "courses", label: "My Courses", icon: BookOpen },
  { id: "messages", label: "Messages", icon: MessageSquare },
];

const secondaryItems: SidebarItem[] = [
  { id: "settings", label: "Settings", icon: Settings },
];

type TeacherDashboardSidebarProps = {
  activeSection: TeacherDashboardSectionId;
  onSectionChange: (section: TeacherDashboardSectionId) => void;
  currentUser: CurrentUser | null;
  onOpenProfile: () => void;
  onOpenCourseBuilder: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
  logoutMessage?: string | null;
  compactOnDesktop?: boolean;
};

function getProfileDisplayName(user: CurrentUser | null) {
  return user?.fullName?.trim() || "Teacher profile";
}

function getAvatarName(user: CurrentUser | null) {
  return user?.fullName?.trim() || user?.email || "Teacher";
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
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
        compactOnDesktop
          ? "lg:justify-center lg:px-0 lg:group-hover:justify-start lg:group-hover:px-4"
          : ""
      } ${
        isActive
          ? "bg-[#13daec]/14 text-[#14213d] shadow-[inset_0_0_0_1px_rgba(19,218,236,0.32)]"
          : "text-slate-500 hover:bg-[#13daec]/8 hover:text-[#14213d]"
      }`}
    >
      <Icon className="h-5 w-5" />
      <SidebarLabel compactOnDesktop={compactOnDesktop}>
        {item.label}
      </SidebarLabel>
    </button>
  );
}

export function TeacherDashboardSidebar({
  activeSection,
  onSectionChange,
  currentUser,
  onOpenProfile,
  onOpenCourseBuilder,
  onLogout,
  isLoggingOut = false,
  logoutMessage = null,
  compactOnDesktop = false,
}: TeacherDashboardSidebarProps) {
  const avatarImageUrl = getTeacherAvatarPublicUrl(currentUser?.avatarPath);

  return (
    <aside
      className={`group border-r border-cyan-100 bg-white px-5 py-6 transition-[width,padding] duration-300 lg:sticky lg:top-0 lg:h-screen lg:py-8 ${
        compactOnDesktop
          ? "lg:w-[5.75rem] lg:px-4 lg:hover:w-[18rem] lg:hover:px-7"
          : "lg:w-[18rem] lg:px-7"
      }`}
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      <div className="flex h-full flex-col">
        <button
          type="button"
          title={compactOnDesktop ? "My Profile" : undefined}
          onClick={onOpenProfile}
          aria-current={activeSection === "profile" ? "page" : undefined}
          className={`flex w-full items-center gap-3 rounded-[1.5rem]  px-3 text-left transition ${
            compactOnDesktop
              ? "lg:justify-center lg:px-2 lg:group-hover:justify-start lg:group-hover:px-3"
              : ""
          } ${
            activeSection === "profile"
              ? "border-[#a7edf3] bg-[#f8feff] shadow-[0_18px_30px_rgba(19,218,236,0.14)]"
              : "border-cyan-100 bg-white hover:border-[#a7edf3] hover:bg-[#f8feff]"
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
            <p className="truncate text-sm font-black text-[#14213d]">
              {getProfileDisplayName(currentUser)}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {currentUser?.email ?? "Loading profile..."}
            </p>
          </div>
        </button>

        <nav className="mt-10 flex flex-1 flex-col justify-between">
          <div className="space-y-2">
            {primaryItems.map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                compactOnDesktop={compactOnDesktop}
                onClick={() => onSectionChange(item.id)}
              />
            ))}
          </div>

          <div className="space-y-3 pt-10">
            <button
              type="button"
              onClick={onOpenCourseBuilder}
              className={`flex h-12 w-full items-center gap-2 rounded-2xl text-sm font-extrabold text-[#14213d] shadow-[0_16px_32px_rgba(19,218,236,0.24)] transition ${
                activeSection === "builder"
                  ? "bg-[#10c6d7]"
                  : "bg-[#13daec] hover:bg-[#10c6d7]"
              } ${
                compactOnDesktop
                  ? "justify-center px-0 lg:group-hover:justify-center lg:group-hover:px-4"
                  : "justify-center px-4"
              }`}
              title={compactOnDesktop ? "New Course" : undefined}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              <SidebarLabel compactOnDesktop={compactOnDesktop}>
                New Course
              </SidebarLabel>
            </button>

            {secondaryItems.map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                compactOnDesktop={compactOnDesktop}
                onClick={() => onSectionChange(item.id)}
              />
            ))}

            <div className="flex flex-col items-stretch gap-2">
              <button
                type="button"
                onClick={onLogout}
                disabled={isLoggingOut}
                className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${
                  compactOnDesktop ? "lg:px-0 lg:group-hover:px-4" : ""
                }`}
              >
                <span
                  className={`flex items-center gap-3 text-slate-700 ${
                    compactOnDesktop
                      ? "justify-center lg:group-hover:justify-start"
                      : "justify-center"
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  <SidebarLabel compactOnDesktop={compactOnDesktop}>
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </SidebarLabel>
                </span>
              </button>
              {logoutMessage ? (
                <p className="px-1 text-sm text-rose-600">{logoutMessage}</p>
              ) : null}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
}
