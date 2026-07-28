import {
  BookOpen,
  LayoutGrid,
  LogOut,
  Plus,
  PlayCircle,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AdminTeacherAvatar } from "../../admin-dashboard/components/AdminTeacherAvatar";
import type { CurrentUser } from "../../auth/types";
import { getErrorMessage } from "../../auth/api/backendClient";
import { listTeacherDashboardCourses } from "../api/teacherDashboardApi";
import { getTeacherAvatarPublicUrl } from "../api/teacherProfileStorage";
import {
  getTeacherDraftCourseHistory,
  rememberTeacherDraftCourse,
} from "../lib/draftCourseHistory";
import type { TeacherDashboardSectionId } from "../types";
import type { TeacherCourseSummary } from "./teacherCourseDashboard.types";
import {
  formatCourseRelativeTime,
  matchesCourseFilter,
  sortCoursesByRecent,
} from "./teacherCourseDashboard.utils";

type SidebarItem = {
  id: TeacherDashboardSectionId;
  label: string;
  icon: LucideIcon;
};

const sidebarItems: SidebarItem[] = [
  { id: "overview", label: "Головна", icon: LayoutGrid },
  { id: "courses", label: "Мої курси", icon: BookOpen },
  { id: "students", label: "Мої студенти", icon: Users },
];

type TeacherDashboardSidebarProps = {
  activeSection: TeacherDashboardSectionId;
  onSectionChange: (section: TeacherDashboardSectionId) => void;
  currentUser: CurrentUser | null;
  onOpenProfile: () => void;
  onCreateCourse: () => void;
  onContinueCourse: (courseId: string) => void;
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
      className={`flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left text-sm font-medium transition-colors ${
        compactOnDesktop
          ? "lg:h-12 lg:justify-center lg:px-0"
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

export function TeacherDashboardSidebar({
  activeSection,
  onSectionChange,
  currentUser,
  onOpenProfile,
  onCreateCourse,
  onContinueCourse,
  onLogout,
  isLoggingOut = false,
  logoutMessage = null,
  compactOnDesktop = false,
}: TeacherDashboardSidebarProps) {
  const avatarImageUrl = getTeacherAvatarPublicUrl(currentUser?.avatarPath);
  const teacherId = currentUser?.id ?? null;
  const [courses, setCourses] = useState<TeacherCourseSummary[]>([]);
  const [draftCourseHistory, setDraftCourseHistory] = useState<string[]>([]);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateDraftCourse() {
      if (!teacherId) {
        if (isMounted) {
          setCourses([]);
          setDraftCourseHistory([]);
        }
        return;
      }

      try {
        const nextCourses = await listTeacherDashboardCourses();

        if (!isMounted) {
          return;
        }

        setCourses(nextCourses.sort(sortCoursesByRecent));
        setDraftCourseHistory(getTeacherDraftCourseHistory(teacherId));
        setDraftMessage(null);
      } catch (error) {
        if (isMounted) {
          setDraftMessage(getErrorMessage(error, "Не вдалося завантажити чернетку."));
        }
      }
    }

    void hydrateDraftCourse();

    return () => {
      isMounted = false;
    };
  }, [teacherId]);

  const continueCourse = useMemo(() => {
    const draftCourses = courses.filter((course) => matchesCourseFilter(course, "drafts"));

    return (
      draftCourseHistory
        .map((courseId) => draftCourses.find((course) => course.id === courseId) ?? null)
        .find((course) => course !== null) ??
      draftCourses[0] ??
      null
    );
  }, [courses, draftCourseHistory]);

  function handleContinueCourse(course: TeacherCourseSummary) {
    if (teacherId) {
      setDraftCourseHistory(rememberTeacherDraftCourse(teacherId, course.id));
    }

    onContinueCourse(course.id);
  }

  function handleMobileContinueCourse() {
    if (continueCourse) {
      handleContinueCourse(continueCourse);
      return;
    }

    onCreateCourse();
  }

  return (
    <>
      <aside
        className={`group/sidebar hidden border-r border-slate-200/80 bg-white/92 px-5 py-6 backdrop-blur lg:sticky lg:top-0 lg:block lg:h-screen lg:py-8 ${
          compactOnDesktop
            ? "lg:w-[5.75rem] lg:px-4"
            : "lg:w-[17rem] lg:px-6"
        }`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`flex items-center gap-3 px-1 ${
              compactOnDesktop ? "lg:justify-center" : ""
            }`}
          >
            
            <div className={compactOnDesktop ? "lg:hidden" : ""}>
              <p className="text-ml font-semibold  text-slate-950 ">
                Кабінет викладача
              </p>
            </div>
          </div>

          <nav className="mt-10 flex-1 space-y-2">
            {sidebarItems.map((item) => (
              <div key={item.id} className="space-y-2">
                <SidebarButton
                  item={item}
                  compactOnDesktop={compactOnDesktop}
                  isActive={
                    activeSection === item.id ||
                    (activeSection === "builder" && item.id === "courses")
                  }
                  onClick={() => onSectionChange(item.id)}
                />
                {item.id === "students" && continueCourse ? (
                  <button
                    type="button"
                    onClick={() => handleContinueCourse(continueCourse)}
                    title={
                      compactOnDesktop
                        ? `Продовжити: ${continueCourse.title}`
                        : undefined
                    }
                    className={`w-full rounded-[1rem] border border-[#13daec]/40 bg-[#13daec]/10 px-4 py-3 text-left transition hover:border-[#13daec] hover:bg-[#13daec]/20 ${
                      compactOnDesktop ? "lg:hidden" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase text-cyan-700">
                      <PlayCircle className="h-4 w-4" />
                      Продовжити 
                    </span>
                    <span className="mt-1 block truncate text-sm font-semibold text-slate-950">
                      {continueCourse.title}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Оновлено {formatCourseRelativeTime(continueCourse.updated_at)}
                    </span>
                  </button>
                ) : null}
              </div>
            ))}
            {draftMessage ? (
              <p className={`px-1 text-xs text-rose-600 ${compactOnDesktop ? "lg:hidden" : ""}`}>
                {draftMessage}
              </p>
            ) : null}
          </nav>

          <div className="space-y-3 pt-6">
            <button
              type="button"
              title={compactOnDesktop ? "Створити курс" : undefined}
              onClick={onCreateCourse}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-[1rem] bg-[#13daec] px-4 text-sm font-semibold text-slate-950 shadow-[0_14px_30px_rgba(19,218,236,0.28)] transition hover:bg-[#10c7d8] ${
                compactOnDesktop ? "lg:px-0" : ""
              }`}
            >
              <Plus className="h-4 w-4" />
              <SidebarLabel compactOnDesktop={compactOnDesktop}>Створити курс</SidebarLabel>
            </button>

            <button
              type="button"
              title={compactOnDesktop ? "Мій профіль" : undefined}
              onClick={onOpenProfile}
              aria-current={activeSection === "profile" ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-[0.5rem] border bg-[#13daec]/10 px-3 py-3 text-left transition hover:bg-slate-100 ${
                compactOnDesktop
                  ? "lg:justify-center lg:px-2"
                  : ""
              }`}
            >
              <AdminTeacherAvatar
                name={getAvatarName(currentUser)}
                imageUrl={avatarImageUrl}
                size="sm"
              />
              <div
                className={`min-w-0 ${compactOnDesktop ? "lg:hidden" : ""}`}
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
                    ? "lg:justify-center lg:px-0"
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

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden"
        aria-label="Навігація кабінету викладача"
      >
        <div className="mx-auto flex max-w-md gap-1.5">
          <MobileNavButton
            label="Головна"
            icon={LayoutGrid}
            isActive={activeSection === "overview"}
            onClick={() => onSectionChange("overview")}
          />
          <MobileNavButton
            label="Мої курси"
            icon={BookOpen}
            isActive={activeSection === "courses"}
            onClick={() => onSectionChange("courses")}
          />
          <MobileNavButton
            label="Мої студенти"
            icon={Users}
            isActive={activeSection === "students"}
            onClick={() => onSectionChange("students")}
          />
          <MobileNavButton
            label="Продовжити "
            icon={PlayCircle}
            isActive={activeSection === "builder"}
            onClick={handleMobileContinueCourse}
          />
        </div>
      </nav>
    </>
  );
}
