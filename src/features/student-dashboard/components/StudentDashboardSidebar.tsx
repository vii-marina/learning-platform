import {
  BookOpen,
  GraduationCap,
  LayoutGrid,
  LogOut,
  User,
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
  { id: "overview", label: "Головна", icon: LayoutGrid },
  { id: "teachers", label: "Мої викладачі", icon: GraduationCap },
  { id: "courses", label: "Мої курси", icon: BookOpen }
];



type StudentDashboardSidebarProps = {
  activeSection: StudentDashboardSectionId;
  onSectionChange: (section: StudentDashboardSectionId) => void;
  currentUser: CurrentUser | null;
  onOpenProfile: () => void;
  compactOnDesktop?: boolean;
};

function getProfileDisplayName(user: CurrentUser | null) {
  return user?.fullName?.trim() || "Профіль студента";
}

function getAvatarName(user: CurrentUser | null) {
  return user?.fullName?.trim() || user?.email || "Студент";
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
      className={compactOnDesktop ? "lg:hidden lg:group-hover:inline" : ""}
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
      <SidebarLabel compactOnDesktop={compactOnDesktop}>
        {item.label}
      </SidebarLabel>
    </button>
  );
}

function MobileNavButton({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
      className={`flex min-h-[4.5rem] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-[1.1rem] px-1.5 text-center text-[0.68rem] font-semibold leading-tight transition-colors ${
        isActive
          ? "bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)]"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="max-w-full whitespace-normal break-words">{label}</span>
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
    <>
      <aside
        className={`group hidden border-r border-slate-200/80 bg-white/92 px-5 py-6 backdrop-blur lg:sticky lg:top-0 lg:block lg:h-screen lg:py-8 ${
          compactOnDesktop
            ? "lg:w-[5.75rem] lg:px-4 lg:hover:w-[17rem] lg:hover:px-6"
            : "lg:w-[17rem] lg:px-6"
        }`}
        style={{ fontFamily: '"Lexend", sans-serif' }}
      >
        <div className="flex h-full flex-col">
          <div
            className={`flex items-center gap-3 px-1 ${
              compactOnDesktop ? "lg:justify-center lg:group-hover:justify-start" : ""
            }`}
          >
            <div className={compactOnDesktop ? "lg:hidden lg:group-hover:block" : ""}>
              <p className="text-ml font-semibold text-slate-950">
                Кабінет студента
              </p>
            </div>
          </div>

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

              <LogoutButton
                containerClassName="flex flex-col items-stretch gap-2"
                buttonVariant="ghost"
                buttonClassName={`h-11 w-full rounded-[1.25rem] px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 ${
                  compactOnDesktop
                    ? "lg:px-0 lg:group-hover:px-4"
                    : ""
                }`}
                contentClassName={`flex items-center gap-3 ${
                  compactOnDesktop
                    ? "justify-center lg:group-hover:justify-start"
                    : ""
                }`}
                content={
                  <>
                    <LogOut className="h-4 w-4" />
                    <SidebarLabel compactOnDesktop={compactOnDesktop}>
                      Вийти
                    </SidebarLabel>
                  </>
                }
              />
            </div>
          </nav>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden"
        aria-label="Навігація кабінету студента"
      >
        <div className="mx-auto flex max-w-md gap-1.5">
          <MobileNavButton
            label="Головна"
            icon={LayoutGrid}
            isActive={activeSection === "overview"}
            onClick={() => onSectionChange("overview")}
          />
          <MobileNavButton
            label="Викладачі"
            icon={GraduationCap}
            isActive={activeSection === "teachers"}
            onClick={() => onSectionChange("teachers")}
          />
          <MobileNavButton
            label="Мої курси"
            icon={BookOpen}
            isActive={activeSection === "courses"}
            onClick={() => onSectionChange("courses")}
          />
          <MobileNavButton
            label="Профіль"
            icon={User}
            isActive={activeSection === "profile"}
            onClick={onOpenProfile}
          />
          <LogoutButton
            containerClassName="min-w-0 flex-1"
            buttonVariant="ghost"
            buttonClassName="min-h-[4.5rem] w-full rounded-[1.1rem] px-1.5 text-[0.68rem] font-semibold leading-tight text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            contentClassName="flex flex-col items-center justify-center gap-1.5 text-center"
            content={
              <>
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="max-w-full whitespace-normal break-words">Вийти</span>
              </>
            }
          />
        </div>
      </nav>
    </>
  );
}
