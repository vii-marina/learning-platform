import { publicBackendRequest } from "../../../features/auth/api/backendClient";
import { supabase } from "../../../lib/supabase";
import type { PublicLandingPreview } from "../types";

const SNAPSHOT_TABLE = "landing_preview_snapshot";
const SNAPSHOT_ID = "default";

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
