/**
 * The course-builder API surface.
 *
 * This file is a barrel: every function now lives in a domain module under
 * `courseBuilder/`, and this re-exports them so the ~40 existing call sites keep importing
 * from one place.
 *
 * The split follows the data path rather than the entity list. Reads of course content go
 * straight to Supabase under RLS; every write goes through the backend, which checks
 * ownership and holds the service-role key. Each module says which of the two it uses.
 */

// Response shapes other features consume directly (the student dashboard renders the same
// hydrated test payload the builder produces).
export type {
  GeneratedExerciseWithDifficulty,
  GeneratedTestQuestion,
  GeneratedTestQuestionOption,
  HydratedTestEntityResponse,
  HydratedTestQuestionResponse,
  ModuleContentResponse,
} from "./courseBuilder/internal";

export * from "./courseBuilder/coursesApi";
export * from "./courseBuilder/modulesApi";
export * from "./courseBuilder/lessonsApi";
export * from "./courseBuilder/aiApi";
export * from "./courseBuilder/exercisesApi";
export * from "./courseBuilder/testsApi";
