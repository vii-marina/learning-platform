import { BookOpen, FileVideo, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import type { AdminDashboardCourseSummary } from "../types";
import { getAdminCourseAuthorName } from "../lib/adminCoursePreview";
import {
  getCourseMediaKind,
  getCourseMediaPublicUrl,
} from "../../courses/api/courseMediaStorage";

type AdminCourseCardProps = {
  course: AdminDashboardCourseSummary;
};

function getStatusLabel(course: AdminDashboardCourseSummary) {
  if (course.status === "archived") {
    return "Archived";
  }

  if (course.status === "published" || course.is_published) {
    return "Published";
  }

  return "Draft";
}

function getStatusTone(course: AdminDashboardCourseSummary) {
  if (course.status === "archived") {
    return "bg-slate-900/82 text-white";
  }

  if (course.status === "published" || course.is_published) {
    return "bg-emerald-500 text-white";
  }

  return "bg-amber-400 text-[#14213d]";
}

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
          {mediaKind === "video" ? "Video thumbnail" : "Course preview"}
        </p>
      </div>
    </div>
  );
}

export function AdminCourseCard({ course }: AdminCourseCardProps) {
  const thumbnailUrl = getCourseMediaPublicUrl(course.thumbnail_path);
  const thumbnailKind = getCourseMediaKind(course.thumbnail_path);
  const authorName = getAdminCourseAuthorName(course);

  return (
    <Link
      to={`/admin/dashboard/courses/${course.id}`}
      state={{ course }}
      className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_24px_50px_rgba(15,23,42,0.1)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <div
          className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-bold ${getStatusTone(course)}`}
        >
          {getStatusLabel(course)}
        </div>

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

      <div className="flex flex-1 flex-col px-5 py-4">
        <h3 className="line-clamp-2 text-lg font-black leading-tight tracking-tight text-[#14213d]">
          {course.title}
        </h3>
        <p className="mt-2 line-clamp-1 text-sm font-medium text-slate-500">{authorName}</p>

        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm font-medium text-slate-400">Modules</span>
            <span className="text-sm font-bold text-[#14213d]">{course.moduleCount}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
