import type { Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";

export function getHealth(_req: Request, res: Response) {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Liveness (`/health`) only proves the process is up. This proves it can actually serve requests:
 * without a reachable Supabase every authenticated call fails, and because those failures surface
 * as 401s the app looks like it is logging everyone out rather than being down. Point the platform
 * health check here so a misconfigured or cut-off instance is taken out of rotation instead.
 *
 * Deliberately cheap — one indexed row, no joins, no user data in the response.
 */
export async function getReadiness(_req: Request, res: Response) {
  const startedAt = Date.now();

  const { error } = await supabaseAdmin.from("profiles").select("id").limit(1);

  if (error) {
    console.error(`[READINESS_FAILED] Supabase is not reachable: ${error.message}`);
    res.status(503).json({
      status: "unavailable",
      dependency: "supabase",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    status: "ready",
    dependency: "supabase",
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
}
