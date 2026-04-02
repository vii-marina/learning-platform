import { Plus } from "lucide-react";

export function TeacherDashboardOverview({
  onOpenCourseBuilder,
}: {
  onOpenCourseBuilder: () => void;
}) {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 md:p-8">
      <div className="space-y-5">
        <div className="space-y-2">

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Build and maintain your courses
          </h1>
        
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenCourseBuilder}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            <span>New Course</span>
          </button>
        </div>
      </div>
    </section>
  );
}
