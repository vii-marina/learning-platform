import { createContext, useContext } from "react";

export type ConfirmTone = "default" | "danger";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` paints the confirm button red; use it for anything destructive. */
  tone?: ConfirmTone;
};

export type PromptOptions = ConfirmOptions & {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  inputType?: "text" | "url";
  /** Return a message to block submission, or null when the value is acceptable. */
  validate?: (value: string) => string | null;
};

export type ConfirmDialogContextValue = {
  /** Resolves true when confirmed, false when cancelled or dismissed. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resolves the entered string, or null when cancelled or dismissed. */
  prompt: (options: PromptOptions) => Promise<string | null>;
};

export const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

/**
 * Replaces `window.confirm` / `window.prompt`. Those block the main thread, cannot be
 * styled or translated, are inconsistent across browsers, and are suppressed outright in
 * some contexts — which silently turns "are you sure?" into "yes".
 */
export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error("useConfirmDialog must be used within a ConfirmDialogProvider.");
  }

  return context;
}
