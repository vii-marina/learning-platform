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

function isMissingLandingSettingsTable(error: { code?: string; message: string }) {
  const message = error.message.toLowerCase();

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (message.includes("landing_page_settings") &&
      (message.includes("does not exist") || message.includes("could not find the table")))
  );
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
