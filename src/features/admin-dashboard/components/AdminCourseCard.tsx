import {
  BookOpen,
  Check,
  Copy,
  FileText,
  FileVideo,
} from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import type { AdminDashboardCourseSummary } from "../types";
import { getAdminCourseAuthorName } from "../lib/adminCoursePreview";
import {
  getCourseMediaKind,
  getCourseMediaPublicUrl,
} from "../../courses/api/courseMediaStorage";
import { useAppToast } from "../../../components/ui/AppToastProvider";

type AdminCourseCardProps = {
  course: AdminDashboardCourseSummary;
};

type CopyState = "idle" | "copied" | "failed";

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  const didCopy = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!didCopy) {
    throw new Error("Unable to copy to clipboard.");
  }
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
  const { showSuccessToast } = useAppToast();
  const thumbnailUrl = getCourseMediaPublicUrl(course.thumbnail_path);
  const thumbnailKind = getCourseMediaKind(course.thumbnail_path);
  const authorName = getAdminCourseAuthorName(course);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const copyButtonLabel =
    copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy ID";

  const CopyIcon = copyState === "copied" ? Check : Copy;

  function queueCopyStateReset() {
    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = window.setTimeout(() => {
      setCopyState("idle");
      resetTimeoutRef.current = null;
    }, 2200);
  }

  async function handleCopyCourseId(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    try {
      await copyToClipboard(course.id);
      setCopyState("copied");
      showSuccessToast("Course ID copied.");
    } catch {
      setCopyState("failed");
    } finally {
      queueCopyStateReset();
    }
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_24px_50px_rgba(15,23,42,0.1)]">
      <Link
        to={`/admin/dashboard/courses/${course.id}`}
        state={{ course }}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="aspect-[16/10] overflow-hidden bg-slate-100">
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

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
        <button
          type="button"
          onClick={handleCopyCourseId}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#13daec]/18 ${
            copyState === "copied"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : copyState === "failed"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-cyan-100 bg-cyan-50 text-cyan-800 hover:border-cyan-200 hover:bg-cyan-100"
          }`}
        >
          <CopyIcon className="h-3.5 w-3.5" />
          {copyButtonLabel}
        </button>

      </div>
    </article>
  );
}
