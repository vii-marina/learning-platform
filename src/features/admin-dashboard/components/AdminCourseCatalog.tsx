import { Card } from "../../../components/ui/Card";
import type { AdminDashboardCourseSummary } from "../types";
import { AdminCourseCard } from "./AdminCourseCard";

type AdminCourseCatalogProps = {
  courses: AdminDashboardCourseSummary[];
  title?: string;
  emptyMessage?: string;
  sectionId?: string;
  tone?: "neutral" | "published" | "draft" | "archived";
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
}: AdminCourseCatalogProps) {
  const styles = catalogToneStyles[tone];

  return (
    <section id={sectionId} className="scroll-mt-6">
      <Card className="rounded-[1.5rem] border-cyan-100 p-0 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 ${styles.titleWrap}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
              <h2 className="text-lg font-black tracking-tight sm:text-xl">{title}</h2>
            </div>
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
              {courses.length}
            </span>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">{emptyMessage}</div>
        ) : (
          <div className="snap-x snap-mandatory overflow-x-auto px-5 py-5 pb-6 [scrollbar-width:thin]">
            <div className="grid min-w-full grid-flow-col auto-cols-[85%] gap-4 md:auto-cols-[calc((100%-1rem)/2.15)] xl:auto-cols-[calc((100%-2rem)/3.2)]">
              {courses.map((course) => (
                <div key={course.id} className="snap-start">
                  <AdminCourseCard course={course} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
