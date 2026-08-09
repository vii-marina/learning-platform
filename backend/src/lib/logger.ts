import { env } from "../config/env";
import { getRequestContext } from "./requestContext";

/**
 * Structured logging.
 *
 * Two output shapes, chosen by NODE_ENV:
 *  - production emits one JSON object per line, so a log drain can index the fields;
 *  - everywhere else emits a readable single line, because a human is reading it.
 *
 * Everything is emitted as a *single* console argument. That matters: it keeps a
 * record intact when a host splits multi-argument console calls across lines, and
 * it means a grep for a request id finds the whole event rather than its first half.
 */

const LEVEL_WEIGHTS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const;

export type LogLevel = keyof typeof LEVEL_WEIGHTS;
export type LogContext = Record<string, unknown>;

export type LogRecord = {
  time: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
};

/**
 * Keys whose values never reach the log, regardless of nesting. Matched loosely on
 * purpose: `apiKey`, `api_key`, `OPENAI_API_KEY` and `x-api-key` must all be caught.
 * A logger is the easiest accidental route for a secret to reach a third-party log
 * service, so this errs towards over-redaction.
 */
const SENSITIVE_KEY_PATTERN =
  /(pass(word|phrase)?|secret|token|api[-_ ]?key|authorization|cookie|credential|service[-_ ]?role|refresh|bearer|signature)/i;

const REDACTED = "[redacted]";
const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 2_000;

function truncate(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}… [${value.length - MAX_STRING_LENGTH} more chars]`;
}

function serializeError(error: Error): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };

  if (error.stack) {
    serialized.stack = error.stack;
  }

  // AppError and Supabase/Postgres errors both carry these; they are the most
  // useful fields when reading a failure and neither is sensitive.
  for (const key of ["code", "statusCode", "status", "details", "hint"] as const) {
    if (key in error) {
      serialized[key] = (error as unknown as Record<string, unknown>)[key];
    }
  }

  if (error.cause !== undefined) {
    serialized.cause = error.cause;
  }

  return serialized;
}

function redact(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return truncate(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return `[${typeof value}]`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return redact(serializeError(value), depth, seen);
  }

  if (depth >= MAX_DEPTH) {
    return "[max depth]";
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[circular]";
    }

    seen.add(value);

    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => redact(item, depth + 1, seen));

      if (value.length > MAX_ARRAY_ITEMS) {
        items.push(`[${value.length - MAX_ARRAY_ITEMS} more items]`);
      }

      return items;
    }

    const result: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED
        : redact(entry, depth + 1, seen);
    }

    return result;
  }

  return String(value);
}

export function redactContext(context: LogContext): Record<string, unknown> {
  return redact(context, 0, new WeakSet()) as Record<string, unknown>;
}

/**
 * Optional sink for error-level records, so an error tracker (Sentry or similar)
 * can be attached in `server.ts` without every call site learning about it. Left
 * unset the logger simply writes to the console, which is the current behaviour.
 */
export type ErrorReporter = (record: LogRecord) => void;

let errorReporter: ErrorReporter | null = null;

export function setErrorReporter(reporter: ErrorReporter | null): void {
  errorReporter = reporter;
}

function resolveConfiguredLevel(): LogLevel {
  const configured = env.LOG_LEVEL;

  if (configured && configured in LEVEL_WEIGHTS) {
    return configured as LogLevel;
  }

  return env.NODE_ENV === "development" ? "debug" : "info";
}

let activeLevel: LogLevel = resolveConfiguredLevel();

export function setLogLevel(level: LogLevel): void {
  activeLevel = level;
}

export function getLogLevel(): LogLevel {
  return activeLevel;
}

export function isLevelEnabled(level: LogLevel): boolean {
  return LEVEL_WEIGHTS[level] >= LEVEL_WEIGHTS[activeLevel];
}

function formatForHumans(record: LogRecord): string {
  const { time, level, message, ...rest } = record;
  const clock = time.slice(11, 23);
  const details = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";

  return `${clock} ${level.toUpperCase().padEnd(5)} ${message}${details}`;
}

function write(record: LogRecord): void {
  const line =
    env.NODE_ENV === "production" ? JSON.stringify(record) : formatForHumans(record);

  if (record.level === "error") {
    console.error(line);
  } else if (record.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function emit(level: LogLevel, message: string, context: LogContext | undefined): void {
  if (!isLevelEnabled(level)) {
    return;
  }

  const requestContext = getRequestContext();

  const record: LogRecord = {
    ...(context ? redactContext(context) : {}),
    ...(requestContext
      ? {
          requestId: requestContext.requestId,
          method: requestContext.method,
          path: requestContext.path,
          ...(requestContext.userId ? { userId: requestContext.userId } : {}),
          ...(requestContext.role ? { role: requestContext.role } : {}),
        }
      : {}),
    time: new Date().toISOString(),
    level,
    message,
  };

  write(record);

  if (level === "error" && errorReporter) {
    try {
      errorReporter(record);
    } catch {
      // A failing error reporter must never take down the request that was
      // already failing. Swallowing here is deliberate.
    }
  }
}

export type Logger = {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(boundContext: LogContext): Logger;
};

function createLogger(boundContext: LogContext = {}): Logger {
  const merge = (context?: LogContext): LogContext | undefined => {
    const hasBound = Object.keys(boundContext).length > 0;

    if (!hasBound) {
      return context;
    }

    return context ? { ...boundContext, ...context } : boundContext;
  };

  return {
    debug: (message, context) => emit("debug", message, merge(context)),
    info: (message, context) => emit("info", message, merge(context)),
    warn: (message, context) => emit("warn", message, merge(context)),
    error: (message, context) => emit("error", message, merge(context)),
    child: (childContext) => createLogger({ ...boundContext, ...childContext }),
  };
}

export const logger = createLogger();
