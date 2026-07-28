import { publicBackendRequest } from "../../../features/auth/api/backendClient";
import { supabase } from "../../../lib/supabase";
import type { PublicLandingPreview } from "../types";

// F1: the landing preview used to come from the Express backend, which sits on
// Render's free tier and sleeps after ~15 min idle — so the first visitor of the
// day paid a 30-60 s wake-up. The admin's save now also writes a ready-made
// payload into a single publicly-readable Supabase row, which the landing reads
// directly (Supabase is always on). The backend endpoint stays as the fallback
// for when the migration has not run yet or the snapshot is missing.
const SNAPSHOT_TABLE = "landing_preview_snapshot";
const SNAPSHOT_ID = "default";

// The payload is jsonb, i.e. `unknown` at the type level. Check the fields the
// demo actually renders before trusting it, so a malformed or half-written row
// falls through to the backend instead of blanking the section.
function isRenderablePreview(value: unknown): value is PublicLandingPreview {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PublicLandingPreview>;

  return (
    typeof candidate.course?.id === "string" &&
    typeof candidate.lesson?.id === "string" &&
    typeof candidate.module?.id === "string" &&
    Array.isArray(candidate.module_lessons)
  );
}

async function loadFromSnapshot(): Promise<PublicLandingPreview | null> {
  const { data, error } = await supabase
    .from(SNAPSHOT_TABLE)
    .select("payload")
    .eq("id", SNAPSHOT_ID)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const payload = (data as { payload?: unknown }).payload;

  return isRenderablePreview(payload) ? payload : null;
}

export async function loadLandingPreview(): Promise<PublicLandingPreview> {
  const snapshot = await loadFromSnapshot().catch(() => null);

  if (snapshot) {
    return snapshot;
  }

  return publicBackendRequest<PublicLandingPreview>("/public/landing-preview");
}
