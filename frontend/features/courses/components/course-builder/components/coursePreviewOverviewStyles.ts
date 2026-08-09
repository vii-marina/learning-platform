/** Styling and labelling rules for the course-overview modal's tabs and open buttons. */

import type { CourseExercise } from "../types/courseBuilderUiTypes";
import type { CoursePreviewOverviewTab } from "./CoursePreviewOverviewModal";

export function getOverviewTabButtonClassName(
  tab: CoursePreviewOverviewTab,
  isActive: boolean
) {
  const baseClassName =
    "inline-flex items-center gap-2.5 rounded-[1.1rem] border px-4 py-2.5 text-sm font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5";

  if (tab === "modules") {
    return isActive
      ? `${baseClassName} border-[#13daec] bg-[#13daec] text-[#0f172a]`
      : `${baseClassName} border-[#13daec]/30 bg-white text-[#0f8ea0] hover:border-[#13daec]/45 hover:bg-[#ecfeff]`;
  }

  if (tab === "lessons") {
    return isActive
      ? `${baseClassName} border-emerald-500 bg-emerald-500 text-white`
      : `${baseClassName} border-emerald-200 bg-white text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50`;
  }

  if (tab === "exercises") {
    return isActive
      ? `${baseClassName} border-amber-500 bg-amber-500 text-white`
      : `${baseClassName} border-amber-200 bg-white text-amber-800 hover:border-amber-300 hover:bg-amber-50`;
  }

  return isActive
    ? `${baseClassName} border-violet-500 bg-violet-500 text-white`
    : `${baseClassName} border-violet-200 bg-white text-violet-800 hover:border-violet-300 hover:bg-violet-50`;
}

export function getOpenButtonClassName(tab: CoursePreviewOverviewTab) {
  const baseClassName =
    "h-11 rounded-xl border bg-white px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  if (tab === "modules") {
    return `${baseClassName} border-[#13daec]/30 text-[#0f8ea0] hover:border-[#13daec]/45 hover:bg-[#ecfeff]`;
  }

  if (tab === "lessons") {
    return `${baseClassName} border-emerald-200 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50`;
  }

  if (tab === "exercises") {
    return `${baseClassName} border-orange-200 text-orange-800 hover:border-orange-300 hover:bg-orange-50`;
  }

  return `${baseClassName} border-violet-200 text-violet-800 hover:border-violet-300 hover:bg-violet-50`;
}

export function getExerciseTypeLabel(exercise: CourseExercise) {
  return exercise.type === "drag_drop_code" ? "Заповнити пропуски в коді" : "Написати код";
}

