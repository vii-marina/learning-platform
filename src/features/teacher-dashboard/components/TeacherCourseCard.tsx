import { BookOpen, Copy, Ellipsis, LoaderCircle, Trash2, Upload } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Button } from "../../../components/ui/button";
import {
  getCourseMediaKind,
  getCourseMediaPublicUrl,
} from "../../courses/api/courseMediaStorage";
import type { TeacherCourseSummary } from "./teacherCourseDashboard.types";
import {
  getCourseCardClassName,
  formatCourseRelativeTime,
  getCourseStatusClassName,
  getCourseStatusFilterLabel,
  isPublishedCourse,
} from "./teacherCourseDashboard.utils";

type TeacherCourseCardProps = {
  course: TeacherCourseSummary;
  actionInFlight?: "delete" | "duplicate" | "publish" | "unpublish" | null;
  showStatusBadge?: boolean;
  onOpenDetails: (course: TeacherCourseSummary) => void;
  onOpenPublish: (course: TeacherCourseSummary) => void;
  onContinue: (course: TeacherCourseSummary) => void;
  onDelete: (course: TeacherCourseSummary) => void;
  onDuplicate: (course: TeacherCourseSummary) => void;
  onTogglePublish: (course: TeacherCourseSummary) => void;
};

function stopCardEvent(event: ReactMouseEvent | ReactKeyboardEvent) {
  event.stopPropagation();
}

function CourseThumbnail({
  course,
}: {
  course: TeacherCourseSummary;
}) {
  const thumbnailUrl = getCourseMediaPublicUrl(course.thumbnail_path);
  const thumbnailKind = getCourseMediaKind(course.thumbnail_path);

  if (thumbnailUrl && thumbnailKind === "image") {
    return (
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-slate-100">
        <img src={thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex aspect-[16/9] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <BookOpen className="h-5 w-5" />
      </div>
    </div>
  );
}

export function TeacherCourseCard({
  course,
  actionInFlight = null,
  showStatusBadge = false,
  onOpenDetails,
  onOpenPublish,
  onContinue,
  onDelete,
  onDuplicate,
  onTogglePublish,
}: TeacherCourseCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isCoursePublished = isPublishedCourse(course);
  const isActionBusy = actionInFlight !== null;

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  function handleKeyboardOpen(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenDetails(course);
    }
  }

  function runMenuAction(callback: () => void) {
    callback();
    setIsMenuOpen(false);
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(course)}
      onKeyDown={handleKeyboardOpen}
      className={`group relative flex min-h-full cursor-pointer flex-col rounded-xl border p-3.5 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#13daec]/40 ${getCourseCardClassName(course)}`}
    >
      {showStatusBadge ? (
        <div className="mb-3 flex justify-center">
          <span
            className={`inline-flex items-center rounded-full px-3.5 py-1 text-xs font-semibold ${getCourseStatusClassName(course)}`}
          >
            {getCourseStatusFilterLabel(course)}
          </span>
        </div>
      ) : null}

      <div className="relative">
        <CourseThumbnail course={course} />
        <div className="absolute right-2.5 top-2.5" ref={menuRef}>
          <button
            type="button"
            aria-label="Open course actions"
            onClick={(event) => {
              stopCardEvent(event);
              setIsMenuOpen((currentValue) => !currentValue);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            <Ellipsis className="h-4 w-4" />
          </button>

          {isMenuOpen ? (
            <div className="absolute right-0 top-10 z-10 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              <button
                type="button"
                disabled={isActionBusy}
                onClick={(event) => {
                  stopCardEvent(event);
                  runMenuAction(() => onDuplicate(course));
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionInFlight === "duplicate" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span>Duplicate</span>
              </button>

              {isCoursePublished ? (
                <button
                  type="button"
                  disabled={isActionBusy}
                  onClick={(event) => {
                    stopCardEvent(event);
                    runMenuAction(() => onTogglePublish(course));
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionInFlight === "publish" || actionInFlight === "unpublish" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>Unpublish</span>
                </button>
              ) : null}

              <button
                type="button"
                disabled={isActionBusy}
                onClick={(event) => {
                  stopCardEvent(event);
                  runMenuAction(() => onDelete(course));
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionInFlight === "delete" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>Delete</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-slate-950">
              {course.title}
            </h3>
          </div>

          <p className="shrink-0 text-xs text-slate-400">
            {formatCourseRelativeTime(course.updated_at)}
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
          <span>{course.modulesCount} modules</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>{course.lessonsCount} lessons</span>
        </div>

        <div className="mt-auto space-y-2 pt-4">
          <Button
            type="button"
            disabled={isActionBusy}
            onClick={(event) => {
              stopCardEvent(event);
              onContinue(course);
            }}
            className="w-full"
          >
            Continue
          </Button>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isActionBusy}
              onClick={(event) => {
                stopCardEvent(event);
                onOpenDetails(course);
              }}
              className="w-full"
            >
              Preview
            </Button>
            <Button
              type="button"
              variant="accent"
              disabled={isActionBusy}
              onClick={(event) => {
                stopCardEvent(event);
                onOpenPublish(course);
              }}
              className="w-full"
            >
              Publish Course
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
