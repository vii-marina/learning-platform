import { useRef } from "react";
import { File as FileIcon, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import {
  getCourseMediaKind,
  getCourseMediaLabel,
} from "../../../api/courseMediaStorage";

type CourseMediaUploadProps = {
  disabled?: boolean;
  isUploading?: boolean;
  mediaPath: string | null;
  mediaUrl: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
};

export function CourseMediaUpload({
  disabled = false,
  isUploading = false,
  mediaPath,
  mediaUrl,
  onFileSelect,
  onRemove,
}: CourseMediaUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mediaKind = getCourseMediaKind(mediaPath);
  const mediaLabel = getCourseMediaLabel(mediaPath);
  const isActionDisabled = disabled || isUploading;

  const openFilePicker = () => {
    if (isActionDisabled) {
      return;
    }

    inputRef.current?.click();
  };

  return (
    <div
      className={`rounded-xl border border-[#13daec]/16 bg-white/45 p-4 ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:border-[#13daec]/28"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        disabled={isActionDisabled}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            onFileSelect(file);
          }

          event.target.value = "";
        }}
      />

      {mediaUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-[#13daec]/18 bg-slate-50">
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <button
              type="button"
              disabled={isActionDisabled}
              onClick={openFilePicker}
              aria-label={isUploading ? "Uploading course media" : "Replace course media"}
              title={isUploading ? "Uploading..." : "Replace media"}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isActionDisabled}
              onClick={onRemove}
              aria-label="Delete course media"
              title="Delete media"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-500 shadow-sm transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className={isUploading ? "opacity-80" : undefined}>
            {mediaKind === "image" ? (
              <img
                src={mediaUrl}
                alt="Course media preview"
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-slate-600">
                <FileIcon className="h-10 w-10 text-[#08bfd4]" />
                <p className="max-w-sm truncate text-sm font-medium">{mediaLabel}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openFilePicker}
          disabled={isActionDisabled}
          className="block w-full text-left disabled:cursor-not-allowed"
        >
          <div className="relative overflow-hidden rounded-xl border border-dashed border-[#13daec]/24 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.03),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(19,218,236,0.08),_transparent_34%),#f8fafc]">
            <div className="flex aspect-video flex-col items-center justify-center gap-3 px-5 py-6 text-center text-xs text-slate-500">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                <Upload className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <ImageIcon className="h-3.5 w-3.5" />
                <FileIcon className="h-3.5 w-3.5" />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold text-slate-950">
                  {isUploading ? "Uploading file..." : "Drop your image here, or browse"}
                </p>
                <p className="mx-auto max-w-[15rem] text-xs leading-5 text-slate-500">
                  Images are cropped to 16:9 before upload. PNG, JPG, and JPEG only.
                </p>
              </div>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
