/**
 * Frontend error reporting.
 *
 * There is no error-tracking service wired up, and adding one is a decision with a bill
 * attached. What this gives instead is the part that has to exist either way: a single
 * place every unexpected failure is funnelled through, a bounded in-memory history so a
 * user can be asked what the app recorded, and a sink so a real tracker can be attached
 * later by calling one function rather than editing every call site.
 */

export type ReportedError = {
  /** Short, human-quotable id. Shown in the crash screen so a bug report is traceable. */
  id: string;
  time: string;
  message: string;
  source: "react" | "window" | "promise" | "manual";
  stack?: string;
  componentStack?: string;
  /** Correlates with the backend log line when the failure came from an API call. */
  requestId?: string;
  context?: Record<string, unknown>;
};

export type ErrorSink = (error: ReportedError) => void;

/** Bounded so a render loop that throws every frame cannot exhaust memory. */
const MAX_RETAINED_ERRORS = 20;

const recentErrors: ReportedError[] = [];

let sink: ErrorSink | null = null;

export function setErrorSink(nextSink: ErrorSink | null): void {
  sink = nextSink;
}

export function getRecentErrors(): readonly ReportedError[] {
  return recentErrors;
}

export function clearRecentErrors(): void {
  recentErrors.length = 0;
}

/**
 * Short id rather than a UUID: it exists to be read aloud or typed into a message, and a
 * 36-character UUID is neither. Collisions across a single session are what matters here,
 * and 8 base-36 characters are ample for that.
 */
function createErrorId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

function readRequestId(error: unknown): string | undefined {
  if (error && typeof error === "object" && "requestId" in error) {
    const value = (error as { requestId?: unknown }).requestId;
    return typeof value === "string" ? value : undefined;
  }

  return undefined;
}

export function reportError(
  error: unknown,
  options: {
    source?: ReportedError["source"];
    componentStack?: string;
    context?: Record<string, unknown>;
  } = {}
): ReportedError {
  const { message, stack } = describe(error);

  const reported: ReportedError = {
    id: createErrorId(),
    time: new Date().toISOString(),
    message,
    source: options.source ?? "manual",
    ...(stack ? { stack } : {}),
    ...(options.componentStack ? { componentStack: options.componentStack } : {}),
    ...(readRequestId(error) ? { requestId: readRequestId(error) } : {}),
    ...(options.context ? { context: options.context } : {}),
  };

  recentErrors.push(reported);

  if (recentErrors.length > MAX_RETAINED_ERRORS) {
    recentErrors.shift();
  }

  console.error(`[${reported.id}] ${reported.message}`, error);

  if (sink) {
    try {
      sink(reported);
    } catch {
      // A failing sink must never replace the error it was reporting.
    }
  }

  return reported;
}

let handlersInstalled = false;

/**
 * Catches the two classes of failure a React error boundary cannot see: errors thrown
 * outside the render tree, and promise rejections nobody awaited. Both otherwise reach
 * only the devtools console, which nobody has open when it matters.
 */
export function installGlobalErrorHandlers(): void {
  if (handlersInstalled || typeof window === "undefined") {
    return;
  }

  handlersInstalled = true;

  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, {
      source: "window",
      context: { filename: event.filename, line: event.lineno, column: event.colno },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, { source: "promise" });
  });
}
