/** Module reads via the anon client; every write goes through the backend. */

import { supabase } from "../../../../lib/supabase";
import { dedupeRequest } from "../../../../lib/requestDedup";
import { authorizedBackendRequest } from "../../../auth/api/backendClient";
import { toErrorMessage } from "./internal";
import type { ModuleResponse } from "./internal";
import type { CreateModuleInput, Module, UpdateModuleInput } from "../types";

// MODULES — read via anon client; writes via backend.
export async function listModulesByCourse(courseId: string) {
  return dedupeRequest(`modules:course:${courseId}`, async () => {
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", courseId)
      .order("order", { ascending: true });

    if (error) {
      throw new Error(toErrorMessage("Unable to list modules", error.message));
    }

    return (data ?? []) as Module[];
  });
}

export async function createModule(input: CreateModuleInput) {
  const response = await authorizedBackendRequest<ModuleResponse>("/authoring/modules", {
    method: "POST",
    body: input,
  });
  return response.module;
}

export async function updateModule(moduleId: string, input: UpdateModuleInput) {
  const response = await authorizedBackendRequest<ModuleResponse>(`/authoring/modules/${moduleId}`, {
    method: "PATCH",
    body: input,
  });
  return response.module;
}

export async function deleteModule(moduleId: string) {
  await authorizedBackendRequest<void>(`/authoring/modules/${moduleId}`, {
    method: "DELETE",
  });
}

export async function swapModuleOrder(first: Module, second: Module) {
  await authorizedBackendRequest<void>("/authoring/reorder/modules", {
    method: "POST",
    body: { firstId: first.id, secondId: second.id },
  });
}
