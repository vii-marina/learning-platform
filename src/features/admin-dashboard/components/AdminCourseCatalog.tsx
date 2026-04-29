import { Card } from "../../../components/ui/Card";
import type { AdminDashboardCourseSummary } from "../types";
import { AdminCourseCard } from "./AdminCourseCard";

type AdminCourseCatalogProps = {
  courses: AdminDashboardCourseSummary[];
  title?: string;
  emptyMessage?: string;
  sectionId?: string;
  tone?: "neutral" | "published" | "draft" | "archived";
  pendingActionByCourseId?: Record<string, "publish" | "unpublish" | "archive" | "delete" | null>;
  onDelete: (course: AdminDashboardCourseSummary) => void;
  onUpdateStatus: (
    course: AdminDashboardCourseSummary,
    action: "publish" | "unpublish" | "archive"
  ) => void;
};

const catalogToneStyles = {
  neutral: {
    titleWrap: "border-slate-200 bg-slate-50 text-slate-900",
    dot: "bg-slate-400",
  },
  published: {
    titleWrap: "border-emerald-100 bg-emerald-50 text-emerald-900",
    dot: "bg-emerald-500",
  },
  draft: {
    titleWrap: "border-amber-100 bg-amber-50 text-amber-900",
    dot: "bg-amber-500",
  },
  archived: {
    titleWrap: "border-slate-300 bg-slate-100 text-slate-900",
    dot: "bg-slate-600",
  },
} satisfies Record<NonNullable<AdminCourseCatalogProps["tone"]>, {
  titleWrap: string;
  dot: string;
}>;

export function AdminCourseCatalog({
  courses,
  title = "Courses",
  emptyMessage = "No courses found.",
  sectionId,
  tone = "neutral",
  pendingActionByCourseId = {},
  onDelete,
  onUpdateStatus,
}: AdminCourseCatalogProps) {
  const styles = catalogToneStyles[tone];

  return (
    <section id={sectionId} className="scroll-mt-6">
      <Card className="rounded-[1.5rem] border-slate-200/80 p-5 shadow-sm md:p-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 ${styles.titleWrap}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
              <h2 className="text-lg font-black tracking-tight sm:text-sm">{title}</h2>
            </div>
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
              {courses.length}
            </span>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="py-8 text-sm text-slate-500">{emptyMessage}</div>
        ) : (
          <div className="pt-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <AdminCourseCard
                  key={course.id}
                  course={course}
                  actionInFlight={pendingActionByCourseId[course.id] ?? null}
                  onDelete={onDelete}
                  onUpdateStatus={onUpdateStatus}
                />
              ))}
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
