import { supabase } from "../../../lib/supabase";
import { COURSE_MEDIA_BUCKET } from "../../courses/api/courseMediaStorage";

const TEACHER_PROFILE_MEDIA_BUCKET =
  import.meta.env.VITE_TEACHER_PROFILE_MEDIA_BUCKET || COURSE_MEDIA_BUCKET;

function normalizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isImageFile(file: File) {
  if (file.type) {
    return file.type.startsWith("image/");
  }

  return /\.(avif|bmp|gif|jpeg|jpg|png|svg|webp)$/i.test(file.name);
}

export function getTeacherAvatarPublicUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  const { data } = supabase.storage
    .from(TEACHER_PROFILE_MEDIA_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function uploadTeacherAvatar(userId: string, file: File) {
  if (!isImageFile(file)) {
    throw new Error("Please choose a valid image file.");
  }

  const safeName = normalizeFileName(file.name) || "teacher-avatar";
  const path = `teacher-profiles/${userId}/avatars/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(TEACHER_PROFILE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) {
    throw new Error(`Unable to upload avatar: ${error.message}`);
  }

  return data.path;
}
