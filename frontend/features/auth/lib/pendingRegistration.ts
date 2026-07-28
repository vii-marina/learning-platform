import type { PendingRegistration } from "../types";

const storageKey = "learning-platform.pending-registration";

export function getPendingRegistration(): PendingRegistration | null {
  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as PendingRegistration;

    if (
      typeof parsedValue.email === "string" &&
      typeof parsedValue.fullName === "string" &&
      (parsedValue.role === "student" || parsedValue.role === "teacher")
    ) {
      return parsedValue;
    }
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }

  window.localStorage.removeItem(storageKey);
  return null;
}

export function savePendingRegistration(value: PendingRegistration) {
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export function clearPendingRegistration() {
  window.localStorage.removeItem(storageKey);
}
