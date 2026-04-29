import { useEffect } from "react";
import {
  BookOpen,
  CalendarClock,
  GraduationCap,
  Layers3,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import type {
  StudentDashboardAccentTone,
  StudentDashboardCatalogCard,
} from "./studentDashboardViewModels";

type StudentDashboardCourseQuickViewModalProps = {
  course: StudentDashboardCatalogCard | null;
  onClose: () => void;
};

const toneBadgeClassNames: Record<StudentDashboardAccentTone, string> = {
  cyan: "border-[#13daec]/30 bg-[#13daec]/15 text-[#0f8ea0]",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
};

const toneHeroGlowClassNames: Record<StudentDashboardAccentTone, string> = {
  cyan: "bg-[#13daec]/20",
  emerald: "bg-emerald-400/20",
  amber: "bg-amber-400/20",
  violet: "bg-violet-400/20",
};

function CourseHero({
  course,
}: {
  course: StudentDashboardCatalogCard;
}) {
  if (course.thumbnailUrl) {
    return (
      <img
        src={course.thumbnailUrl}
        alt={course.title}
        className="absolute inset-0 h-full w-full object-cover opacity-30"
      />
    );
  }

  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(19,218,236,0.18),_transparent_30%),linear-gradient(135deg,_#1f2937_0%,_#111827_45%,_#0f172a_100%)]" />
  );
}

export function StudentDashboardCourseQuickViewModal({
  course,
  onClose,
}: StudentDashboardCourseQuickViewModalProps) {
  useEffect(() => {
    if (!course) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [course]);

  if (!course) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[110] bg-slate-950/55 p-4 backdrop-blur-sm lg:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-2xl">
        <div className="relative overflow-hidden border-b border-slate-200 bg-slate-950 px-6 py-6 md:px-8 md:py-8">
          <CourseHero course={course} />
          <div
            className={`absolute bottom-[-4rem] right-[-2rem] h-36 w-36 rounded-full blur-3xl ${toneHeroGlowClassNames[course.accentTone]}`}
          />

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${toneBadgeClassNames[course.accentTone]}`}
                >
                  {course.releaseLabel}
                </span>
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
                  {course.accessLabel}
                </span>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={onClose}
                className="border-white/15 bg-white/10 px-0 text-white hover:bg-white/15 hover:text-white"
                aria-label="Close quick view"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-8 ">
              <h2 className="text-ml font-semibold tracking-tight text-white ">
                {course.title}
              </h2>
              {course.description ? (
                <p className="mt-4 text-sm leading-7 text-white/80">
                  {course.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="overflow-y-auto bg-white p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.25rem] border border-slate-200 bg-[#f8fafc] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Layers3 className="h-4 w-4 text-[#08bfd4]" />
                  <span>Structure</span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-950">
                  {course.moduleCount}
                </p>
                <p className="mt-1 text-sm text-slate-500">Modules in the learning path</p>
              </div>

              <div className="rounded-[1.25rem] border border-slate-200 bg-[#f8fafc] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  <span>Lesson load</span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-950">
                  {course.lessonCount}
                </p>
                <p className="mt-1 text-sm text-slate-500">Lessons prepared for students</p>
              </div>

              <div className="rounded-[1.25rem] border border-slate-200 bg-[#f8fafc] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <CalendarClock className="h-4 w-4 text-amber-600" />
                  <span>Latest change</span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-950">
                  {course.updatedLabel}
                </p>
                <p className="mt-1 text-sm text-slate-500">Freshness of the course content</p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-[#f8fafc] p-5 md:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Sparkles className="h-4 w-4 text-[#08bfd4]" />
                <span>Quick course snapshot</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {course.highlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.04)]"
                  >
                    {highlight}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" size="lg" variant="accent" onClick={onClose}>
                Preview course outline
              </Button>
              <Button type="button" size="lg" variant="secondary" onClick={onClose}>
                Keep browsing
              </Button>
            </div>
          </div>

          <aside className="border-t border-slate-200 bg-[#f8fafc] p-6 lg:border-l lg:border-t-0">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#13daec]/12 text-[#0f172a]">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{course.teacherName}</p>
                  <p className="text-xs text-slate-500">Course instructor</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Access
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-700">{course.accessLabel}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Release
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-700">{course.releaseLabel}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Update status
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-700">{course.updatedLabel}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
