import { Card } from "../../../components/ui/Card";
import type { AdminDashboardCourseSummary } from "../types";
import { AdminCourseCard } from "./AdminCourseCard";

type AdminCourseCatalogProps = {
  courses: AdminDashboardCourseSummary[];
  title?: string;
  emptyMessage?: string;
  sectionId?: string;
};

export function AdminCourseCatalog({
  courses,
  title = "Courses",
  emptyMessage = "No courses found.",
  sectionId,
}: AdminCourseCatalogProps) {
  return (
    <section id={sectionId} className="scroll-mt-6">
      <Card className="rounded-[1.5rem] border-cyan-100 p-0 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
            </div>
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
              {courses.length}
            </span>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">{emptyMessage}</div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {courses.map((course) => (
              <AdminCourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
