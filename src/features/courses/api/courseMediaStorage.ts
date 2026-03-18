import { supabase } from "../../../lib/supabase";

export const COURSE_MEDIA_BUCKET = "course-media";

const IMAGE_EXTENSIONS = new Set([
  "avif",
  "bmp",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);

const VIDEO_EXTENSIONS = new Set([
  "avi",
  "m4v",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "ogg",
  "ogv",
  "webm",
]);

function normalizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFileExtension(path: string) {
  const segments = path.split(".");
  return segments.length > 1 ? segments.at(-1)?.toLowerCase() ?? "" : "";
}

export function getCourseMediaKind(path: string | null) {
  if (!path) {
    return "file" as const;
  }

  const extension = getFileExtension(path);

  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image" as const;
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video" as const;
  }

  return "file" as const;
}

export function getCourseMediaLabel(path: string | null) {
  if (!path) {
    return "No file uploaded";
  }

  const segments = path.split("/");
  return decodeURIComponent(segments.at(-1) ?? path);
}

export function getCourseMediaPublicUrl(path: string | null) {
  if (!path) {
    return null;
  }

  const { data } = supabase.storage.from(COURSE_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadCourseMedia(courseId: string, file: File) {
  const safeName = normalizeFileName(file.name) || "course-media";
  const path = `courses/${courseId}/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(COURSE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) {
    throw new Error(`Unable to upload course media: ${error.message}`);
  }

  return data.path;
}
