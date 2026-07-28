import { describe, expect, it } from "vitest";

import { coerceUserRole, isAdminRole, normalizeUserRole } from "../../src/lib/roles";
import type { AdminRow } from "../../src/types/auth";

const adminRow = (isSuperAdmin: boolean): AdminRow => ({
  id: "user-1",
  is_super_admin: isSuperAdmin,
  created_at: null,
});

describe("coerceUserRole", () => {
  it("accepts the four known roles", () => {
    expect(coerceUserRole("student")).toBe("student");
    expect(coerceUserRole("teacher")).toBe("teacher");
    expect(coerceUserRole("admin")).toBe("admin");
    expect(coerceUserRole("super-admin")).toBe("super-admin");
  });

  it("rejects anything else", () => {
    expect(coerceUserRole("owner")).toBeNull();
    expect(coerceUserRole("STUDENT")).toBeNull();
    expect(coerceUserRole(null)).toBeNull();
    expect(coerceUserRole(undefined)).toBeNull();
    expect(coerceUserRole(1)).toBeNull();
    expect(coerceUserRole({ role: "admin" })).toBeNull();
  });
});

describe("normalizeUserRole", () => {
  it("resolves a super-admin record first", () => {
    expect(normalizeUserRole("teacher", adminRow(true))).toBe("super-admin");
  });

  it("resolves any other admin record to admin", () => {
    expect(normalizeUserRole("teacher", adminRow(false))).toBe("admin");
  });

  // The admin table — not the profile row — is the authority on elevated access.
  it("lets the admin record win over the profile role", () => {
    expect(normalizeUserRole("student", adminRow(false))).toBe("admin");
    expect(normalizeUserRole("student", adminRow(true))).toBe("super-admin");
  });

  it("falls back to the profile role when there is no admin record", () => {
    expect(normalizeUserRole("teacher", null)).toBe("teacher");
    expect(normalizeUserRole("student", null)).toBe("student");
  });

  // A profile claiming an unknown role must not be silently upgraded.
  it("returns null for an unrecognized profile role", () => {
    expect(normalizeUserRole("superuser", null)).toBeNull();
    expect(normalizeUserRole(undefined, null)).toBeNull();
  });
});

describe("isAdminRole", () => {
  it("is true only for admin and super-admin", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("super-admin")).toBe(true);
    expect(isAdminRole("teacher")).toBe(false);
    expect(isAdminRole("student")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});
