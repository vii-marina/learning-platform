import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { BookOpen } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type {
  StudentDashboardAccentTone,
  StudentDashboardCatalogCard,
} from "./studentDashboardViewModels";

type StudentDashboardCourseCardProps = {
  course: StudentDashboardCatalogCard;
  onQuickView: (course: StudentDashboardCatalogCard) => void;
};

const toneCardClassNames: Record<StudentDashboardAccentTone, string> = {
  cyan: "border-cyan-200 bg-[linear-gradient(180deg,#ecfeff_0%,#ffffff_72%)] hover:border-cyan-400",
  emerald:
    "border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5_0%,#ffffff_72%)] hover:border-emerald-400",
  amber:
    "border-amber-200 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_72%)] hover:border-amber-400",
  violet:
    "border-violet-200 bg-[linear-gradient(180deg,#f5f3ff_0%,#ffffff_72%)] hover:border-violet-400",
};

const toneChipClassNames: Record<StudentDashboardAccentTone, string> = {
  cyan: "border border-cyan-200/90 bg-cyan-100/95 text-cyan-800",
  emerald: "border border-emerald-200/90 bg-emerald-100/95 text-emerald-800",
  amber: "border border-amber-200/90 bg-amber-100/95 text-amber-800",
  violet: "border border-violet-200/90 bg-violet-100/95 text-violet-800",
};

const toneDotClassNames: Record<StudentDashboardAccentTone, string> = {
  cyan: "bg-cyan-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
};

const tonePlaceholderClassNames: Record<StudentDashboardAccentTone, string> = {
  cyan: "bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_55%,#13daec_130%)]",
  emerald:
    "bg-[linear-gradient(135deg,#0f172a_0%,#166534_55%,#34d399_130%)]",
  amber: "bg-[linear-gradient(135deg,#0f172a_0%,#9a3412_55%,#fbbf24_130%)]",
  violet:
    "bg-[linear-gradient(135deg,#0f172a_0%,#5b21b6_55%,#a78bfa_130%)]",
};

function stopCardEvent(event: ReactMouseEvent | ReactKeyboardEvent) {
  event.stopPropagation();
}

function CourseAccessChip({
  course,
}: {
  course: StudentDashboardCatalogCard;
}) {
  return (
    <span
      className={`absolute left-2.5 top-2.5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm ${toneChipClassNames[course.accentTone]}`}
    >
      <span className={`h-2 w-2 rounded-full ${toneDotClassNames[course.accentTone]}`} />
      <span>{course.accessLabel}</span>
    </span>
  );
}

function CourseThumbnail({
  course,
}: {
  course: StudentDashboardCatalogCard;
}) {
  if (course.thumbnailUrl) {
    return (
      <div className="relative overflow-hidden rounded-lg bg-slate-100">
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <CourseAccessChip course={course} />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
      <div
        className={`flex aspect-[16/9] items-center justify-center text-white ${tonePlaceholderClassNames[course.accentTone]}`}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-white/12 p-4">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-white/80">Course preview</p>
        </div>
      </div>
      <CourseAccessChip course={course} />
    </div>
  );
}

export function StudentDashboardCourseCard({
  course,
  onQuickView,
}: StudentDashboardCourseCardProps) {
  function handleKeyboardOpen(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onQuickView(course);
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onQuickView(course)}
      onKeyDown={handleKeyboardOpen}
      className={`group relative flex min-h-full cursor-pointer flex-col rounded-xl border p-3.5 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#13daec]/40 ${toneCardClassNames[course.accentTone]}`}
    >
      <CourseThumbnail course={course} />

      <div className="flex flex-1 flex-col pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-slate-950">
              {course.title}
            </h3>
            <p className="line-clamp-1 text-sm font-medium text-slate-500">
              {course.teacherName}
            </p>
          </div>

          <p className="shrink-0 text-xs text-slate-400">{course.updatedLabel}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>{course.moduleCount} modules</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>{course.lessonCount} lessons</span>
        </div>

        {course.description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
            {course.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="text-xs font-medium text-slate-400">
            {course.releaseLabel}
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={(event) => {
              stopCardEvent(event);
              onQuickView(course);
            }}
          >
            Quick view
          </Button>
        </div>
      </div>
    </article>
  );
}
