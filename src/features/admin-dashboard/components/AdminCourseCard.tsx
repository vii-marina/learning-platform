import {
  Archive,
  BookOpen,
  FileText,
  FileVideo,
  LoaderCircle,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import {
  getCourseMediaKind,
  getCourseMediaPublicUrl,
} from "../../courses/api/courseMediaStorage";
import { getAdminCourseAuthorName } from "../lib/adminCoursePreview";
import {
  formatAdminCourseRelativeTime,
  getAdminCourseStatusCardClassName,
  getAdminCourseStatusDotClassName,
  getAdminCourseStatusLabel,
  getAdminCourseStatusThumbnailClassName,
  isArchivedAdminCourse,
  isPublishedAdminCourse,
} from "../lib/adminCourseStatus";
import type { AdminDashboardCourseSummary } from "../types";

type AdminCourseCardAction = "publish" | "unpublish" | "archive" | "delete";

type AdminCourseCardProps = {
  course: AdminDashboardCourseSummary;
  actionInFlight?: AdminCourseCardAction | null;
  onDelete: (course: AdminDashboardCourseSummary) => void;
  onUpdateStatus: (
    course: AdminDashboardCourseSummary,
    action: Exclude<AdminCourseCardAction, "delete">
  ) => void;
};

function ThumbnailPlaceholder({
  mediaKind,
}: {
  mediaKind: "image" | "video" | "file";
}) {
  const Icon = mediaKind === "video" ? FileVideo : mediaKind === "file" ? FileText : BookOpen;

  return (
    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#0f172a_0%,#14213d_55%,#13daec_130%)] text-white">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-white/12 p-4">
          <Icon className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-white/80">
          {mediaKind === "video" ? "Відеообкладинка" : "Перегляд курсу"}
        </p>
      </div>
    </div>
  );
}

function CourseStatusChip({
  course,
}: {
  course: AdminDashboardCourseSummary;
}) {
  return (
    <span
      className={`absolute left-2.5 top-2.5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm ${getAdminCourseStatusThumbnailClassName(course)}`}
    >
      <span className={`h-2 w-2 rounded-full ${getAdminCourseStatusDotClassName(course)}`} />
      <span>{getAdminCourseStatusLabel(course)}</span>
    </span>
  );
}

export function AdminCourseCard({
  course,
  actionInFlight = null,
  onDelete,
  onUpdateStatus,
}: AdminCourseCardProps) {
  const thumbnailUrl = getCourseMediaPublicUrl(course.thumbnail_path);
  const thumbnailKind = getCourseMediaKind(course.thumbnail_path);
  const authorName = getAdminCourseAuthorName(course);
  const isPublished = isPublishedAdminCourse(course);
  const isArchived = isArchivedAdminCourse(course);
  const publishAction = isPublished ? "unpublish" : "publish";
  const isActionBusy = actionInFlight !== null;

  return (
    <article
      className={`group relative flex min-h-full flex-col rounded-xl border p-3.5 shadow-sm transition hover:shadow-md ${getAdminCourseStatusCardClassName(course)}`}
    >
      <Link
        to={`/admin/dashboard/courses/${course.id}`}
        state={{ course }}
        className="flex flex-1 flex-col"
      >
        <div className="relative overflow-hidden rounded-lg bg-slate-100">
          <div className="aspect-[16/9] overflow-hidden">
            {thumbnailUrl && thumbnailKind === "image" ? (
              <img
                src={thumbnailUrl}
                alt={course.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <ThumbnailPlaceholder mediaKind={thumbnailKind} />
            )}
          </div>

          <CourseStatusChip course={course} />
        </div>

        <div className="flex flex-1 flex-col pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-slate-950">
                {course.title}
              </h3>
              <p className="line-clamp-1 text-sm font-medium text-slate-500">
                {authorName}
              </p>
            </div>

            <p className="shrink-0 text-xs text-slate-400">
              {formatAdminCourseRelativeTime(course.updated_at)}
            </p>
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <span>{course.moduleCount} модулів</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{course.lessonCount} уроків</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Users className="h-4 w-4 text-[#08bfd4]" />
                <span>Студенти</span>
              </div>
              <p className="mt-1 text-lg font-black text-[#14213d]">
                {course.enrolledStudentCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold text-slate-500">Завершили</p>
              <p className="mt-1 text-lg font-black text-[#14213d]">
                {course.completedStudentCount}
              </p>
            </div>
          </div>
        </div>
      </Link>

      <div className="mt-auto space-y-2 pt-4">
        <Button
          type="button"
          size="md"
          variant={isPublished ? "secondary" : "accent"}
          disabled={isActionBusy}
          onClick={() => onUpdateStatus(course, publishAction)}
          className="w-full"
        >
          {actionInFlight === "publish" || actionInFlight === "unpublish" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span>{isPublished ? "Зняти з публікації" : "Опублікувати"}</span>
        </Button>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isActionBusy || isArchived}
            onClick={() => onUpdateStatus(course, "archive")}
            className="w-full"
          >
            {actionInFlight === "archive" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            <span>{isArchived ? "В архіві" : "Архівувати"}</span>
          </Button>

          <Button
            type="button"
            disabled={isActionBusy}
            onClick={() => onDelete(course)}
            className="w-full border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
          >
            {actionInFlight === "delete" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>Видалити</span>
          </Button>
        </div>
      </div>
    </article>
  );
}
