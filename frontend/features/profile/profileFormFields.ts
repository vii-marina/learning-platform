/**
 * Field validation and error shaping shared by the teacher and student profile forms.
 *
 * Both forms carried byte-identical private copies of everything here — roughly 160 lines
 * each. That is the kind of duplication that goes wrong quietly: a fix to one form's URL
 * check silently leaves the other accepting `javascript:` links.
 *
 * Pure by construction, which is what makes it testable without rendering a form.
 */

/**
 * `neutral` means "nothing typed yet" and is deliberately distinct from `valid`: an empty
 * optional field should look untouched, not approved.
 */
export type FieldStatus = "neutral" | "valid" | "invalid";

export type FlattenedErrorDetails = {
  formErrors: string[];
  fieldErrors: Record<string, string[]>;
};

export function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function isImageFile(file: File) {
  if (file.type) {
    return file.type.startsWith("image/");
  }

  // Some browsers report an empty type for files picked from certain sources, so fall
  // back to the extension rather than rejecting a legitimate image.
  return /\.(avif|bmp|gif|jpeg|jpg|png|svg|webp)$/i.test(file.name);
}

export function isValidDateValue(value: string) {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function isValidEmailValue(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Only http(s) — this value ends up in an `href`, so `javascript:` must not pass. */
export function isValidUrlValue(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getEmailStatus(value: string): FieldStatus {
  if (!value.trim()) {
    return "neutral";
  }

  return isValidEmailValue(value) ? "valid" : "invalid";
}

export function getRequiredTextStatus(value: string): FieldStatus {
  return value.trim() ? "valid" : "neutral";
}

export function getOptionalTextStatus(value: string): FieldStatus {
  return value.trim() ? "valid" : "neutral";
}

export function getDateStatus(value: string): FieldStatus {
  if (!value.trim()) {
    return "neutral";
  }

  return isValidDateValue(value) ? "valid" : "invalid";
}

export function getUrlStatus(value: string): FieldStatus {
  if (!value.trim()) {
    return "neutral";
  }

  return isValidUrlValue(value) ? "valid" : "invalid";
}

export function getFieldFrameClasses(status: FieldStatus) {
  if (status === "invalid") {
    return "border-rose-300 bg-rose-50/40";
  }

  return "border-slate-300 bg-white";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toErrorMessages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

/**
 * Normalises whatever the backend put in `AppError.details` into a predictable shape.
 * The payload is untrusted here — it crosses the network — so every level is checked
 * rather than cast.
 */
export function getFlattenedErrorDetails(details: unknown): FlattenedErrorDetails {
  if (!isRecord(details)) {
    return {
      formErrors: [],
      fieldErrors: {},
    };
  }

  const formErrors = toErrorMessages(details.formErrors);
  const fieldErrors: Record<string, string[]> = {};

  if (isRecord(details.fieldErrors)) {
    for (const [key, value] of Object.entries(details.fieldErrors)) {
      const messages = toErrorMessages(value);

      if (messages.length > 0) {
        fieldErrors[key] = messages;
      }
    }
  }

  return {
    formErrors,
    fieldErrors,
  };
}

export function getNoticeClassName(type: "error" | "warning" | "info") {
  if (type === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (type === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-[#bdeff5] bg-[#effcff] text-[#0f172a]";
}

/** "a", "a and b", "a, b, and c" — used to name the fields that still need filling in. */
export function joinLabels(labels: string[]) {
  if (labels.length === 0) {
    return "";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}
