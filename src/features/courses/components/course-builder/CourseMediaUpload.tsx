import { File, Film, Image as ImageIcon, Upload } from "lucide-react";
import {
  getCourseMediaKind,
  getCourseMediaLabel,
} from "../../api/courseMediaStorage";

type CourseMediaUploadProps = {
  disabled?: boolean;
  isUploading?: boolean;
  mediaPath: string | null;
  mediaUrl: string | null;
  onFileSelect: (file: File) => void;
};

export function CourseMediaUpload({
  disabled = false,
  isUploading = false,
  mediaPath,
  mediaUrl,
  onFileSelect,
}: CourseMediaUploadProps) {
  const mediaKind = getCourseMediaKind(mediaPath);
  const mediaLabel = getCourseMediaLabel(mediaPath);

  return (
    <label
      className={`block rounded-[1.5rem] border-2 border-dashed border-[#13daec]/20 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-[#13daec]/45 hover:bg-[#13daec]/5"
      }`}
    >
      <input
        type="file"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            onFileSelect(file);
          }

          event.target.value = "";
        }}
      />

      {mediaUrl ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
            {mediaKind === "image" ? (
              <img
                src={mediaUrl}
                alt="Course media preview"
                className="aspect-video w-full object-cover"
              />
            ) : mediaKind === "video" ? (
              <video
                src={mediaUrl}
                controls
                className="aspect-video w-full bg-slate-950 object-cover"
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-[#f9fbfd] px-6 text-slate-600">
                <File className="h-10 w-10 text-[#08bfd4]" />
                <p className="max-w-sm truncate text-sm font-medium">{mediaLabel}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#f9fbfd] px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#14213d]">{mediaLabel}</p>
              <p className="text-xs leading-5 text-slate-500">
                {isUploading ? "Uploading..." : "Click to replace the current file"}
              </p>
            </div>
            <Upload className="h-4 w-4 text-[#08bfd4]" />
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[1.25rem] border border-[#13daec]/15 bg-[radial-gradient(circle_at_top_left,_rgba(255,224,214,0.4),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(19,218,236,0.16),_transparent_36%),#f7fbfd]">
          <div className="flex aspect-video flex-col items-center justify-center gap-3 px-5 py-6 text-center text-xs text-slate-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#13daec]/15 text-[#08bfd4]">
              <Upload className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <ImageIcon className="h-3.5 w-3.5" />
              <Film className="h-3.5 w-3.5" />
              <File className="h-3.5 w-3.5" />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-semibold text-[#14213d]">
                {isUploading ? "Uploading file..." : "Drop your image here, or browse"}
              </p>
              <p className="mx-auto max-w-[15rem] text-xs leading-5 text-slate-500">
                16:9 aspect ratio recommended. JPG, PNG, WebP, video, or generic file.
              </p>
            </div>
          </div>
        </div>
      )}
    </label>
  );
}
