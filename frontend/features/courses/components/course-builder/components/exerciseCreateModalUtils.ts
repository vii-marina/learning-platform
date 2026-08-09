/**
 * Exercise-editor helpers.
 *
 * A barrel over four focused modules; the exercise modal, its handler factories and the
 * preview components all import from this path.
 *
 * - `exerciseTemplateTokens` — the `___` / `{{blank_n}}` / `{{answer}}` placeholder grammar
 * - `exerciseAnswerOptions` — building and shuffling the drag-drop token bank
 * - `exerciseDraftFactories` — empty content per exercise type
 * - `exerciseDraftCoercion` — stored or AI-produced payloads → a renderable draft
 */

export * from "./exerciseTemplateTokens";
export * from "./exerciseAnswerOptions";
export * from "./exerciseDraftFactories";
export * from "./exerciseDraftCoercion";
