import {
  BookOpen,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { LogoutButton } from "../../auth/components/LogoutButton";

type SidebarItem = {
  label: string;
  icon: LucideIcon;
  to: string;
  end?: boolean;
};

const primaryItems: SidebarItem[] = [
  { label: "Overview", icon: LayoutGrid, to: "/admin/dashboard", end: true },
  { label: "Teachers", icon: GraduationCap, to: "/admin/dashboard/teachers" },
  { label: "Students", icon: Users, to: "/admin/dashboard/students" },
  { label: "Courses", icon: BookOpen, to: "/admin/dashboard/courses" },
];

const secondaryItems: SidebarItem[] = [
  { label: "Platform settings", icon: Settings, to: "/admin/dashboard/settings" },
];

function SidebarLink({ item }: { item: SidebarItem }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
          isActive
            ? "bg-cyan-50 text-cyan-700 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.14)]"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        }`
      }
    >
      <Icon className="h-5 w-5" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function AdminDashboardSidebar() {
  return (
    <aside className="border-r border-cyan-100 bg-white px-5 py-6 lg:sticky lg:top-0 lg:h-screen lg:px-7 lg:py-8">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[1.65rem] font-black tracking-tight text-slate-900">
              Admin Console
            </p>
          </div>
        </div>

        <nav className="mt-10 flex flex-1 flex-col justify-between">
          <div className="space-y-2">
            {primaryItems.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </div>

          <div className="space-y-3 pt-10">
            <Link
              to="/course-builder"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 text-sm font-extrabold text-white shadow-[0_16px_32px_rgba(6,182,212,0.28)] transition hover:bg-cyan-600"
            >
              <Plus className="h-4 w-4" />
              <span>New Course</span>
            </Link>

            {secondaryItems.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}

            <LogoutButton
              containerClassName="flex flex-col items-stretch gap-2"
              buttonVariant="secondary"
              buttonClassName="h-12 w-full rounded-2xl border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
              contentClassName="flex items-center justify-center gap-3 text-slate-700"
              content={
                <>
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </>
              }
            />
          </div>
        </nav>
      </div>
    </aside>
  );
}
