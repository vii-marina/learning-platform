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
      className={`block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 transition ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-slate-400 hover:bg-slate-100"
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
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {mediaKind === "image" ? (
              <img
                src={mediaUrl}
                alt="Course media preview"
                className="h-56 w-full object-cover"
              />
            ) : mediaKind === "video" ? (
              <video
                src={mediaUrl}
                controls
                className="h-56 w-full bg-slate-950 object-cover"
              />
            ) : (
              <div className="flex h-56 flex-col items-center justify-center gap-3 text-slate-600">
                <File className="h-10 w-10" />
                <p className="max-w-sm truncate text-sm font-medium">{mediaLabel}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{mediaLabel}</p>
              <p className="text-xs text-slate-500">
                {isUploading ? "Uploading..." : "Click to replace the current file"}
              </p>
            </div>
            <Upload className="h-5 w-5 text-slate-500" />
          </div>
        </div>
      ) : (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
          <div className="flex items-center gap-3 text-slate-400">
            <ImageIcon className="h-5 w-5" />
            <Film className="h-5 w-5" />
            <File className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-slate-700">
              {isUploading ? "Uploading file..." : "Click to upload or replace course media"}
            </p>
            <p>Images, videos or generic files are supported.</p>
          </div>
        </div>
      )}
    </label>
  );
}
