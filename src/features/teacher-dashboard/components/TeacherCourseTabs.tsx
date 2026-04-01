import type { TeacherCourseFilterId } from "./teacherCourseDashboard.types";

const tabs: Array<{
  id: TeacherCourseFilterId;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "drafts", label: "Drafts" },
  { id: "published", label: "Published" },
  { id: "archived", label: "Archived" },
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
  return (
    <div className="overflow-x-auto">
      <div
        className="inline-flex min-w-full gap-2 rounded-xl border border-slate-200 bg-white p-1.5"
        role="tablist"
        aria-label="Filter courses"
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
              className={`inline-flex min-w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-[#13daec] text-[#0f172a]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive
                    ? "bg-[#0f172a]/10 text-[#0f172a]"
                    : "bg-slate-100 text-slate-500"
                }`}
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
