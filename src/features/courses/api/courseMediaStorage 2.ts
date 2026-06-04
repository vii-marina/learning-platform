import { supabase } from "../../../lib/supabase";

export const COURSE_MEDIA_BUCKET = "course-media";
export const COURSE_THUMBNAIL_ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg"] as const;

const COURSE_THUMBNAIL_ALLOWED_EXTENSION_SET = new Set(COURSE_THUMBNAIL_ALLOWED_EXTENSIONS);
const COURSE_THUMBNAIL_ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);

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

export function isAllowedCourseThumbnailFile(file: File) {
  const extension = getFileExtension(file.name);

  if (file.type) {
    return COURSE_THUMBNAIL_ALLOWED_MIME_TYPES.has(file.type);
  }

  return COURSE_THUMBNAIL_ALLOWED_EXTENSION_SET.has(
    extension as (typeof COURSE_THUMBNAIL_ALLOWED_EXTENSIONS)[number]
  );
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
  if (!isAllowedCourseThumbnailFile(file)) {
    throw new Error("Course thumbnail must be a PNG, JPG, or JPEG image.");
  }

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

export async function deleteCourseMedia(path: string) {
  const { error } = await supabase.storage.from(COURSE_MEDIA_BUCKET).remove([path]);

  if (error) {
    throw new Error(`Unable to delete course media: ${error.message}`);
  }
}

export async function uploadLessonContentImage(courseId: string, file: File) {
  const safeName = normalizeFileName(file.name) || "lesson-image";
  const path = `courses/${courseId}/lesson-content/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(COURSE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) {
    throw new Error(`Unable to upload lesson image: ${error.message}`);
  }

  return data.path;
}
