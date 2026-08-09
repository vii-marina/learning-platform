/**
 * Teacher lookups for the student-facing course cards.
 *
 * Names and profiles are fetched separately because a course always needs a display name
 * but only the course page needs the full profile.
 */

import { toServiceError } from "../../lib/appError";
import { chunkValues } from "../../lib/collections";
import { supabaseAdmin } from "../../lib/supabase";
import type { UserProfileRow } from "../../types/auth";
import type { TeacherProfileRow } from "./types";

const profileSelect = "id,full_name,email";

export async function listTeacherNamesById(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const profiles: UserProfileRow[] = [];

  for (const chunk of chunkValues(ids)) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(profileSelect)
      .in("id", chunk);

    if (error) {
      throw toServiceError(500, "TEACHERS_FETCH_FAILED", "Unable to load teachers", error);
    }

    profiles.push(...((data ?? []) as UserProfileRow[]));
  }

  return new Map(
    profiles.map((profile) => [
      profile.id,
      profile.full_name?.trim() || profile.email || "Platform instructor",
    ])
  );
}

export async function listTeacherProfilesById(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, TeacherProfileRow>();
  }

  const profiles: TeacherProfileRow[] = [];

  for (const chunk of chunkValues(ids)) {
    const { data, error } = await supabaseAdmin
      .from("teacher_profiles")
      .select(
        "id,headline,bio,specialization,experience_years,education,gender,birth_date,avatar_path,linkedin_url,github_url"
      )
      .in("id", chunk);

    if (error) {
      const message = error.message.toLowerCase();
      const isMissingRelation =
        "code" in error &&
        (error.code === "PGRST205" ||
          error.code === "42P01" ||
          (message.includes("teacher_profiles") &&
            (message.includes("does not exist") ||
              message.includes("could not find the table"))));

      if (isMissingRelation) {
        return new Map<string, TeacherProfileRow>();
      }

      throw toServiceError(
        500,
        "TEACHER_PROFILES_FETCH_FAILED",
        "Unable to load teacher profiles",
        error
      );
    }

    profiles.push(...((data ?? []) as TeacherProfileRow[]));
  }

  return new Map(profiles.map((profile) => [profile.id, profile]));
}
