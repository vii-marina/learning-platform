import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import {
  BookOpen,
  CheckCircle2,
  Layers3,
  Play,
  Plus,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { getTeacherAvatarPublicUrl } from "../../teacher-dashboard/api/teacherProfileStorage";
import type {
  StudentDashboardAccentTone,
  StudentDashboardCatalogCard,
} from "./studentDashboardViewModels";

type StudentDashboardCourseCardProps = {
  course: StudentDashboardCatalogCard;
  onQuickView: (course: StudentDashboardCatalogCard) => void;
  actionLabel?: string;
  actionVariant?: "primary" | "accent" | "secondary";
  isActionLoading?: boolean;
  showProgress?: boolean;
  onAction?: (course: StudentDashboardCatalogCard) => void;
};

const toneButtonClassNames: Record<StudentDashboardAccentTone, string> = {
  cyan: "border-blue-500 text-blue-600 hover:bg-blue-50",
  emerald: "border-blue-500 text-blue-600 hover:bg-blue-50",
  amber: "border-amber-500 text-amber-600 hover:bg-amber-50",
  violet: "border-violet-500 text-violet-600 hover:bg-violet-50",
};

const toneAvatarClassNames: Record<StudentDashboardAccentTone, string> = {
  cyan: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
};

function stopCardEvent(event: ReactMouseEvent | ReactKeyboardEvent) {
  event.stopPropagation();
}

function getTeacherInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "IN";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getActionButtonClassName(
  actionLabel: string,
  accentTone: StudentDashboardAccentTone
) {
  if (actionLabel === "Почати курс") {
    return `w-full border-2 bg-blue-100 ${toneButtonClassNames[accentTone]}`;
  }

  if (actionLabel === "Продовжити") {
    return "w-full border-[#4f46e5] bg-[#4f46e5] text-white hover:bg-[#4338ca]";
  }

  return "w-full";
}

function getCourseStateStripeClassName(course: StudentDashboardCatalogCard) {
  if (course.isCompleted) {
    return "bg-emerald-500";
  }

  if (course.isStarted) {
    return "bg-orange-500";
  }

  return "bg-[#13daec]";
}

export function StudentDashboardCourseCard({
  course,
  onQuickView,
  actionLabel = "Швидкий перегляд",
  actionVariant = "secondary",
  isActionLoading = false,
  showProgress = false,
  onAction,
}: StudentDashboardCourseCardProps) {
  function handleKeyboardOpen(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onQuickView(course);
    }
  }

  const teacherAvatarUrl = getTeacherAvatarPublicUrl(course.teacherAvatarPath);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onQuickView(course)}
      onKeyDown={handleKeyboardOpen}
      className="group relative flex min-h-[20.5rem] cursor-pointer flex-col overflow-hidden rounded-[1.25rem] border border-[#dedbf5] bg-white shadow-[0_12px_28px_rgba(31,27,83,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(31,27,83,0.14)] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30"
    >
      <div className={`h-1.5 w-full rounded-t-[1.25rem] ${getCourseStateStripeClassName(course)}`} />

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-4 aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-100 bg-[#f8fafc]">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={`Обкладинка курсу ${course.title}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-300">
              <BookOpen className="h-8 w-8" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-[#18153d]">
            {course.title}
          </h3>

          {course.description ? (
            <p className="mt-2 line-clamp-2 min-h-[3rem] text-sm leading-6 text-[#6f6aa0]">
              {course.description}
            </p>
          ) : (
            <p className="mt-2 min-h-[3rem] text-sm leading-6 text-[#6f6aa0]">
              Опис курсу зʼявиться тут.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-[#6f6aa0]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-emerald-600">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              {course.lessonCount} уроків
            </span>
            <span className="inline-flex items-center gap-1.5 text-cyan-600">
              <Layers3 className="h-4 w-4 text-cyan-600" />
              {course.moduleCount} модулів
            </span>
          </div>
          <span>{course.updatedLabel}</span>
        </div>

        {showProgress ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold text-[#6f6aa0]">
              <span>{course.isCompleted ? "Завершено" : `${course.progressPercent}% виконано`}</span>
              <span>{course.progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e8e5fb]">
              <div
                className={`h-full rounded-full ${
                  course.isCompleted ? "bg-emerald-500" : "bg-[#4f46e5]"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, course.progressPercent))}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-auto pt-4">
          <Button
            type="button"
            variant={actionVariant}
            disabled={isActionLoading}
            onClick={(event) => {
              stopCardEvent(event);
              if (onAction) {
                onAction(course);
              } else {
                onQuickView(course);
              }
            }}
            className={getActionButtonClassName(actionLabel, course.accentTone)}
          >
            {actionLabel === "Почати курс" ? <Plus className="h-4 w-4" /> : null}
            {actionLabel === "Продовжити" ? <Play className="h-4 w-4" /> : null}
            {isActionLoading ? "Завантаження..." : actionLabel}
          </Button>
        </div>
      </div>

      <div className="mt-auto border-t border-[#dedbf5] bg-[#fbfaff] px-5 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white ${toneAvatarClassNames[course.accentTone]}`}
            >
              {teacherAvatarUrl ? (
                <img
                  src={teacherAvatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                getTeacherInitials(course.teacherName)
              )}
            </div>
            <p className="min-w-0 truncate text-sm font-semibold text-[#6f6aa0]">
              {course.teacherName}
            </p>
          </div>

          {course.isCompleted ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          ) : null}
        </div>
      </div>
    </article>
  );
}
