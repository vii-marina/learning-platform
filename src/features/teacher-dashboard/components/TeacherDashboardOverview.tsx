import { Plus } from "lucide-react";

export function TeacherDashboardOverview({
  onOpenCourseBuilder,
}: {
  onOpenCourseBuilder: () => void;
}) {
  return (
    <div className="space-y-6">
      <section
        className="overflow-hidden rounded-[1.75rem] p-6 text-white shadow-[0_24px_60px_rgba(23,51,143,0.24)] md:p-8"
        style={{
          background:
            "linear-gradient(135deg, #17338f 0%, #2f5fcd 48%, #63b2ff 100%)",
        }}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              Create your course
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/82 md:text-base">
              Launch a new course structure, organize modules and lessons, and
              prepare materials for your students in the builder workspace.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenCourseBuilder}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#17338f] transition hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
                <span>Open course builder</span>
              </button>
              
            </div>
          </div>

          
        </div>
      </section>

      
    </div>
  );
}
