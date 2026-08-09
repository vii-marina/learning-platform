/**
 * Shared course-builder helpers.
 *
 * A barrel over five focused modules. It stays because ~15 files across the builder, both
 * dashboards and the student pages import from this path, and the grouping below is a
 * better description of the contents than one 617-line file was:
 *
 * - `courseBuilderDrafts` — the step model and empty-draft factories
 * - `testQuestionMapping` — persisted rows ↔ AI output ↔ editor drafts
 * - `testValidation` — what makes a question answerable
 * - `coursePreviewStructure` — ordering a module's children, review-preview selection
 * - `aiQuestionLimits` — how many questions a lesson can support
 */

export * from "./courseBuilderDrafts";
export * from "./testQuestionMapping";
export * from "./testValidation";
export * from "./coursePreviewStructure";
export * from "./aiQuestionLimits";
