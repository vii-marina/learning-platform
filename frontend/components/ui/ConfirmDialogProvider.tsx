import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import {
  ConfirmDialogContext,
  type ConfirmDialogContextValue,
  type ConfirmOptions,
  type PromptOptions,
} from "./confirmDialogContext";

type PendingRequest =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

/** Settles a request with its "user said no" value, whichever shape that request has. */
function resolveAsCancelled(pending: PendingRequest | null): void {
  if (!pending) {
    return;
  }

  if (pending.kind === "confirm") {
    pending.resolve(false);
    return;
  }

  pending.resolve(null);
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const headingId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const errorId = useId();

  /**
   * Holds the resolver for the dialog currently on screen. Keeping it in a ref rather than
   * only in state means `settle` can be a stable callback and, more importantly, that a
   * dialog closed by any route — button, Escape, overlay — still resolves its promise.
   * A dropped resolver would leave the caller awaiting forever.
   */
  const pendingRef = useRef<PendingRequest | null>(null);

  const settle = useCallback((result: boolean | string | null) => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setRequest(null);
    setValue("");
    setValidationError(null);

    if (!pending) {
      return;
    }

    if (pending.kind === "confirm") {
      pending.resolve(result === true);
      return;
    }

    pending.resolve(typeof result === "string" ? result : null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // A second request while one is open would orphan the first promise, so the
      // outgoing one is resolved as cancelled before it is replaced.
      resolveAsCancelled(pendingRef.current);

      const next: PendingRequest = { kind: "confirm", options, resolve };
      pendingRef.current = next;
      setValue("");
      setValidationError(null);
      setRequest(next);
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      resolveAsCancelled(pendingRef.current);

      const next: PendingRequest = { kind: "prompt", options, resolve };
      pendingRef.current = next;
      setValue(options.defaultValue ?? "");
      setValidationError(null);
      setRequest(next);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const pending = pendingRef.current;

    if (!pending) {
      return;
    }

    if (pending.kind === "confirm") {
      settle(true);
      return;
    }

    const validationMessage = pending.options.validate?.(value) ?? null;

    if (validationMessage) {
      setValidationError(validationMessage);
      return;
    }

    settle(value);
  }, [settle, value]);

  const contextValue = useMemo<ConfirmDialogContextValue>(
    () => ({ confirm, prompt }),
    [confirm, prompt]
  );

  const options = request?.options;
  const isDanger = options?.tone === "danger";

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}

      <Modal
        isOpen={request !== null}
        onClose={() => settle(request?.kind === "confirm" ? false : null)}
        labelledById={headingId}
        describedById={options?.description ? descriptionId : undefined}
        closeOnOverlayClick
        overlayClassName="z-[130]"
        panelClassName="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
      >
        {options ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            <div className="flex items-start gap-3">
              {isDanger ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
              ) : null}

              <div className="min-w-0">
                <h2 id={headingId} className="text-lg font-bold text-slate-950">
                  {options.title}
                </h2>
                {options.description ? (
                  <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-500">
                    {options.description}
                  </p>
                ) : null}
              </div>
            </div>

            {request?.kind === "prompt" ? (
              <div className="mt-4">
                <label
                  htmlFor={inputId}
                  className="block text-sm font-semibold text-slate-700"
                >
                  {request.options.label}
                </label>
                <input
                  id={inputId}
                  type={request.options.inputType ?? "text"}
                  value={value}
                  autoFocus
                  placeholder={request.options.placeholder}
                  aria-invalid={validationError ? true : undefined}
                  aria-describedby={validationError ? errorId : undefined}
                  onChange={(event) => {
                    setValue(event.target.value);
                    setValidationError(null);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#5549f1] focus:ring-2 focus:ring-[#5549f1]/20"
                />
                {validationError ? (
                  <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                    {validationError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => settle(request?.kind === "confirm" ? false : null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                {options.cancelLabel ?? "Скасувати"}
              </button>
              <button
                type="submit"
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                  isDanger ? "bg-rose-600 hover:bg-rose-700" : "bg-[#5549f1] hover:bg-[#4035d6]"
                }`}
              >
                {options.confirmLabel ?? "Підтвердити"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </ConfirmDialogContext.Provider>
  );
}
