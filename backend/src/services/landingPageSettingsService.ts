import { AppError, toServiceError } from "../lib/appError";
import { supabaseAdmin } from "../lib/supabase";

export type LandingPageSettingsRow = {
  id: string;
  course_id: string | null;
  lesson_id: string | null;
  updated_at: string;
};

export type LandingPageSettingsInput = {
  courseId: string;
  lessonId: string;
};

export function isMissingTableError(
  error: { code?: string; message: string },
  tableName: string
) {
  const message = error.message.toLowerCase();

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (message.includes(tableName) &&
      (message.includes("does not exist") || message.includes("could not find the table")))
  );
}

function isMissingLandingSettingsTable(error: { code?: string; message: string }) {
  return isMissingTableError(error, "landing_page_settings");
}

export async function getLandingPageSettings() {
  const { data, error } = await supabaseAdmin
    .from("landing_page_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    if (isMissingLandingSettingsTable(error)) {
      return null;
    }

    throw toServiceError(
      500,
      "LANDING_SETTINGS_FETCH_FAILED",
      "Unable to load landing settings",
      error
    );
  }

  return (data as LandingPageSettingsRow | null) ?? null;
}

export const LANDING_PREVIEW_SNAPSHOT_ID = "default";
const LANDING_PREVIEW_SNAPSHOT_TABLE = "landing_preview_snapshot";

export type LandingPreviewSnapshotSource = {
  courseId: string;
  lessonId: string;
};

/**
 * Stores the ready-made landing preview in a single publicly-readable row so the
 * landing page can read it straight from Supabase instead of waking the Render
 * instance (F1). Best-effort by design: the admin's save must still succeed if
 * the migration has not been run or the write fails, because the landing falls
 * back to `GET /public/landing-preview`. Returns whether the snapshot was stored.
 */
export async function saveLandingPreviewSnapshot(
  payload: unknown,
  source: LandingPreviewSnapshotSource
): Promise<boolean> {
  const { error } = await supabaseAdmin.from(LANDING_PREVIEW_SNAPSHOT_TABLE).upsert(
    {
      id: LANDING_PREVIEW_SNAPSHOT_ID,
      payload,
      source_course_id: source.courseId,
      source_lesson_id: source.lessonId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (!error) {
    return true;
  }

  if (isMissingTableError(error, LANDING_PREVIEW_SNAPSHOT_TABLE)) {
    console.warn(
      `[LANDING_PREVIEW_SNAPSHOT] table missing — landing will keep using the backend endpoint. Run claude/${LANDING_PREVIEW_SNAPSHOT_TABLE}.sql in Supabase.`
    );
    return false;
  }

  console.error(
    `[LANDING_PREVIEW_SNAPSHOT_SAVE_FAILED] Unable to store landing preview snapshot: ${error.message}`
  );
  return false;
}

export async function saveLandingPageSettings(input: LandingPageSettingsInput) {
  const { data, error } = await supabaseAdmin
    .from("landing_page_settings")
    .upsert(
      {
        id: "default",
        course_id: input.courseId,
        lesson_id: input.lessonId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingLandingSettingsTable(error)) {
      throw new AppError(
        500,
        "Landing settings table is missing. Run backend/scripts/create-landing-page-settings.sql in Supabase.",
        "LANDING_SETTINGS_TABLE_MISSING"
      );
    }

    throw toServiceError(
      500,
      "LANDING_SETTINGS_SAVE_FAILED",
      "Unable to save landing settings",
      error
    );
  }

  return data as LandingPageSettingsRow;
}
