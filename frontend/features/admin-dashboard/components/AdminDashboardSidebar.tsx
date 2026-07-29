import {
  BookOpen,
  GraduationCap,
  LayoutTemplate,
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { BrandMark } from "../../../components/ui";
import { LogoutButton } from "../../auth/components/LogoutButton";

type SidebarItem = {
  label: string;
  icon: LucideIcon;
  to: string;
  end?: boolean;
};

const primaryItems: SidebarItem[] = [
  { label: "Дашборд", icon: LayoutGrid, to: "/admin/dashboard", end: true },
  { label: "Викладачі", icon: GraduationCap, to: "/admin/dashboard/teachers" },
  { label: "Студенти", icon: Users, to: "/admin/dashboard/students" },
  { label: "Курси", icon: BookOpen, to: "/admin/dashboard/courses" },
  { label: "Лендінг", icon: LayoutTemplate, to: "/admin/dashboard/landing" },
];

const secondaryItems: SidebarItem[] = [
  { label: "Налаштування платформи", icon: Settings, to: "/admin/dashboard/settings" },
];

const mobileItems: SidebarItem[] = [
  ...primaryItems,
  { label: "Новий курс", icon: Plus, to: "/course-builder" },
  { label: "Налаштування", icon: Settings, to: "/admin/dashboard/settings" },
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
            ? "bg-[#13daec]/14 text-[#14213d] shadow-[inset_0_0_0_1px_rgba(19,218,236,0.32)]"
            : "text-slate-500 hover:bg-[#13daec]/8 hover:text-[#14213d]"
        }`
      }
    >
      <Icon className="h-5 w-5" />
      <span>{item.label}</span>
    </NavLink>
  );
}

function MobileNavLink({ item }: { item: SidebarItem }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={item.label}
      className={({ isActive }) =>
        `flex min-h-[4.5rem] w-[4.85rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[1.1rem] px-1.5 text-center text-[0.65rem] font-semibold leading-tight transition-colors ${
          isActive
            ? "bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)]"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="max-w-full whitespace-normal break-words">{item.label}</span>
    </NavLink>
  );
}

export function AdminDashboardSidebar() {
  return (
    <>
      <aside
        className="hidden border-r border-cyan-100 bg-white px-5 py-6 lg:sticky lg:top-0 lg:block lg:h-screen lg:px-7 lg:py-8"
        style={{ fontFamily: '"Lexend", sans-serif' }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <div>
              <p className="text-ml font-black tracking-tight text-[#14213d]">
                EduCat
              </p>
              <p className="text-ml font-semibold  text-slate-500">
                Адмін-панель
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
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#13daec] px-4 text-sm font-extrabold text-[#14213d] shadow-[0_16px_32px_rgba(19,218,236,0.24)] transition hover:bg-[#10c6d7]"
              >
                <Plus className="h-4 w-4" />
                <span>Новий курс</span>
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
                    <span>Вийти</span>
                  </>
                }
              />
            </div>
          </nav>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden"
        aria-label="Навігація адмін-панелі"
      >
        <div className="mx-auto flex max-w-lg gap-1.5 overflow-x-auto">
          {mobileItems.map((item) => (
            <MobileNavLink key={item.to} item={item} />
          ))}
          <LogoutButton
            containerClassName="w-[4.85rem] shrink-0"
            buttonVariant="ghost"
            buttonClassName="min-h-[4.5rem] w-full rounded-[1.1rem] px-1.5 text-[0.65rem] font-semibold leading-tight text-slate-500 hover:bg-slate-100 hover:text-slate-950"
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
