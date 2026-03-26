import {
  BarChart3,
  BookOpen,
  CalendarDays,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { LogoutButton } from "../../auth/components/LogoutButton";
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
  { id: "progress", label: "My Progress", icon: BarChart3 },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "messages", label: "Messages", icon: MessageSquare },
];

const secondaryItems: SidebarItem[] = [
  { id: "settings", label: "Settings", icon: Settings },
];

type TeacherDashboardSidebarProps = {
  activeSection: TeacherDashboardSectionId;
  onSectionChange: (section: TeacherDashboardSectionId) => void;
  compactOnDesktop?: boolean;
};

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
  compactOnDesktop = false,
}: TeacherDashboardSidebarProps) {
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
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#14213d] text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className={compactOnDesktop ? "lg:hidden lg:group-hover:block" : ""}>
            <p className="text-[1.45rem] font-black tracking-tight text-[#14213d]">
              Learning Platform
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Teacher Panel
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
            <Link
              to="/course-builder"
              className={`flex h-12 w-full items-center gap-2 rounded-2xl bg-[#13daec] text-sm font-extrabold text-[#14213d] shadow-[0_16px_32px_rgba(19,218,236,0.24)] transition hover:bg-[#10c6d7] ${
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
            </Link>

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
                compactOnDesktop ? "lg:px-0 lg:group-hover:px-4" : ""
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
