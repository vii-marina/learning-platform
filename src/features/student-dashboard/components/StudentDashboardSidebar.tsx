import {
  BookOpen,
  GraduationCap,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminTeacherAvatar } from "../../admin-dashboard/components/AdminTeacherAvatar";
import { LogoutButton } from "../../auth/components/LogoutButton";
import type { CurrentUser } from "../../auth/types";
import { getStudentAvatarPublicUrl } from "../api/studentProfileStorage";
import type { StudentDashboardSectionId } from "../types";

type SidebarItem = {
  id: StudentDashboardSectionId;
  label: string;
  icon: LucideIcon;
};

const primaryItems: SidebarItem[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "teachers", label: "My Teachers", icon: GraduationCap },
  { id: "courses", label: "My Courses", icon: BookOpen },
  { id: "messages", label: "Messages", icon: MessageSquare },
];

const secondaryItems: SidebarItem[] = [
  { id: "settings", label: "Settings", icon: Settings },
];

type StudentDashboardSidebarProps = {
  activeSection: StudentDashboardSectionId;
  onSectionChange: (section: StudentDashboardSectionId) => void;
  currentUser: CurrentUser | null;
  onOpenProfile: () => void;
  compactOnDesktop?: boolean;
};

function getProfileDisplayName(user: CurrentUser | null) {
  return user?.fullName?.trim() || "Student profile";
}

function getAvatarName(user: CurrentUser | null) {
  return user?.fullName?.trim() || user?.email || "Student";
}

function SidebarLabel({
  compactOnDesktop,
  children,
}: {
  compactOnDesktop: boolean;
  children: string;
}) {
  return (
    <span
      className={
        compactOnDesktop
          ? "lg:hidden lg:group-hover:inline"
          : ""
      }
    >
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

export function StudentDashboardSidebar({
  activeSection,
  onSectionChange,
  currentUser,
  onOpenProfile,
  compactOnDesktop = false,
}: StudentDashboardSidebarProps) {
  const avatarImageUrl = getStudentAvatarPublicUrl(currentUser?.avatarPath);

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
          className={`flex w-full items-center gap-3 rounded-[1.5rem] border px-3 py-3 text-left transition ${
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
              {currentUser ? (
                <>
                  <p className="truncate text-sm font-black text-[#14213d]">
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
            {secondaryItems.map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                compactOnDesktop={compactOnDesktop}
                onClick={() => onSectionChange(item.id)}
              />
            ))}

            <LogoutButton
              containerClassName="flex flex-col items-stretch gap-2"
              buttonVariant="secondary"
              buttonClassName={`h-12 w-full rounded-2xl border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 ${
                compactOnDesktop
                  ? "lg:px-0 lg:group-hover:px-4"
                  : ""
              }`}
              contentClassName={`flex items-center gap-3 text-slate-700 ${
                compactOnDesktop
                  ? "justify-center lg:group-hover:justify-start"
                  : "justify-center"
              }`}
              content={
                <>
                  <LogOut className="h-4 w-4" />
                  <SidebarLabel compactOnDesktop={compactOnDesktop}>
                    Logout
                  </SidebarLabel>
                </>
              }
            />
          </div>
        </nav>
      </div>
    </aside>
  );
}
