import type { TeacherCourseFilterId } from "./teacherCourseDashboard.types";

const tabs: Array<{
  id: TeacherCourseFilterId;
  label: string;
}> = [
  { id: "all", label: "Усі" },
  { id: "drafts", label: "Чернетки" },
  { id: "published", label: "Опубліковані" },
  { id: "archived", label: "Архів" },
];

type TeacherCourseTabsProps = {
  activeTab: TeacherCourseFilterId;
  counts: Record<TeacherCourseFilterId, number>;
  onChange: (tab: TeacherCourseFilterId) => void;
};

export function TeacherCourseTabs({
  activeTab,
  counts,
  onChange,
}: TeacherCourseTabsProps) {
  function getTabClassName(tabId: TeacherCourseFilterId, isActive: boolean) {
    if (tabId === "all") {
      return isActive
        ? "border-[#13daec] bg-[#13daec] text-[#0f172a]"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950";
    }

    if (tabId === "drafts") {
      return isActive
        ? "border-amber-300 bg-amber-100 text-amber-900"
        : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100";
    }

    if (tabId === "published") {
      return isActive
        ? "border-violet-300 bg-violet-100 text-violet-900"
        : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100";
    }

    return isActive
      ? "border-slate-300 bg-slate-200 text-slate-900"
      : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200";
  }

  function getCountClassName(tabId: TeacherCourseFilterId, isActive: boolean) {
    if (tabId === "all") {
      return isActive
        ? "bg-[#0f172a]/10 text-[#0f172a]"
        : "bg-slate-100 text-slate-500";
    }

    if (tabId === "drafts") {
      return isActive
        ? "bg-amber-200 text-amber-900"
        : "bg-white/80 text-amber-700";
    }

    if (tabId === "published") {
      return isActive
        ? "bg-violet-200 text-violet-900"
        : "bg-white/80 text-violet-700";
    }

    return isActive
      ? "bg-slate-300 text-slate-800"
      : "bg-white/80 text-slate-700";
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-flex min-w-full gap-2 rounded-xl border border-slate-200 bg-white p-1.5"
        role="tablist"
        aria-label="Фільтр курсів"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`inline-flex min-w-fit items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${getTabClassName(
                tab.id,
                isActive
              )}`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${getCountClassName(
                  tab.id,
                  isActive
                )}`}
              >
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
