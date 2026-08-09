import { describe, expect, it } from "vitest";

import {
  getDateStatus,
  getEmailStatus,
  getFieldFrameClasses,
  getFlattenedErrorDetails,
  getNoticeClassName,
  getOptionalTextStatus,
  getRequiredTextStatus,
  getUrlStatus,
  isImageFile,
  isValidDateValue,
  isValidEmailValue,
  isValidUrlValue,
  joinLabels,
  normalizeOptionalText,
} from "./profileFormFields";

describe("normalizeOptionalText", () => {
  it("trims a real value", () => {
    expect(normalizeOptionalText("  hello  ")).toBe("hello");
  });

  // The column is nullable; sending "" would store an empty string that then reads back
  // as "present but blank".
  it("turns a blank value into null rather than an empty string", () => {
    expect(normalizeOptionalText("   ")).toBeNull();
    expect(normalizeOptionalText("")).toBeNull();
  });
});

describe("isValidUrlValue", () => {
  it("accepts http and https", () => {
    expect(isValidUrlValue("http://example.com")).toBe(true);
    expect(isValidUrlValue("https://example.com/path?a=1")).toBe(true);
  });

  // These end up in an href. A javascript: or data: URL passing here would be XSS.
  it("rejects javascript: and data: URLs", () => {
    expect(isValidUrlValue("javascript:alert(1)")).toBe(false);
    expect(isValidUrlValue("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects other schemes and malformed input", () => {
    expect(isValidUrlValue("ftp://example.com")).toBe(false);
    expect(isValidUrlValue("mailto:a@b.com")).toBe(false);
    expect(isValidUrlValue("example.com")).toBe(false);
    expect(isValidUrlValue("")).toBe(false);
  });
});

describe("isValidEmailValue", () => {
  it("accepts an ordinary address", () => {
    expect(isValidEmailValue("user@example.com")).toBe(true);
  });

  it("tolerates surrounding whitespace", () => {
    expect(isValidEmailValue("  user@example.com  ")).toBe(true);
  });

  it("rejects addresses missing a part", () => {
    expect(isValidEmailValue("user@")).toBe(false);
    expect(isValidEmailValue("@example.com")).toBe(false);
    expect(isValidEmailValue("user@example")).toBe(false);
    expect(isValidEmailValue("user example@test.com")).toBe(false);
  });
});

describe("isValidDateValue", () => {
  it("accepts an ISO date", () => {
    expect(isValidDateValue("1998-04-21")).toBe(true);
  });

  it("rejects other formats and impossible dates", () => {
    expect(isValidDateValue("21-04-1998")).toBe(false);
    expect(isValidDateValue("1998-13-01")).toBe(false);
    expect(isValidDateValue("")).toBe(false);
  });
});

describe("isImageFile", () => {
  it("accepts by MIME type", () => {
    expect(isImageFile(new File([""], "a.png", { type: "image/png" }))).toBe(true);
  });

  it("rejects a non-image MIME type", () => {
    expect(isImageFile(new File([""], "a.pdf", { type: "application/pdf" }))).toBe(false);
  });

  // Some browsers report an empty type; falling back to the extension avoids rejecting a
  // legitimate image.
  it("falls back to the extension when the type is empty", () => {
    expect(isImageFile(new File([""], "photo.JPG", { type: "" }))).toBe(true);
    expect(isImageFile(new File([""], "notes.txt", { type: "" }))).toBe(false);
  });
});

// "neutral" must be distinct from "valid": an untouched optional field should not look
// approved.
describe("field status", () => {
  it("reports an untouched field as neutral", () => {
    expect(getEmailStatus("")).toBe("neutral");
    expect(getDateStatus("  ")).toBe("neutral");
    expect(getUrlStatus("")).toBe("neutral");
    expect(getRequiredTextStatus("")).toBe("neutral");
    expect(getOptionalTextStatus("")).toBe("neutral");
  });

  it("reports a good value as valid", () => {
    expect(getEmailStatus("a@b.com")).toBe("valid");
    expect(getDateStatus("2000-01-01")).toBe("valid");
    expect(getUrlStatus("https://a.com")).toBe("valid");
    expect(getRequiredTextStatus("x")).toBe("valid");
  });

  it("reports a bad value as invalid", () => {
    expect(getEmailStatus("nope")).toBe("invalid");
    expect(getDateStatus("nope")).toBe("invalid");
    expect(getUrlStatus("javascript:alert(1)")).toBe("invalid");
  });

  it("only paints the frame red for an invalid value", () => {
    expect(getFieldFrameClasses("invalid")).toContain("rose");
    expect(getFieldFrameClasses("valid")).not.toContain("rose");
    expect(getFieldFrameClasses("neutral")).not.toContain("rose");
  });
});

describe("getNoticeClassName", () => {
  it("gives each notice type its own palette", () => {
    expect(getNoticeClassName("error")).toContain("rose");
    expect(getNoticeClassName("warning")).toContain("amber");
    expect(getNoticeClassName("info")).not.toContain("rose");
  });
});

// The payload crosses the network, so every level is checked rather than cast.
describe("getFlattenedErrorDetails", () => {
  it("returns empty collections for a non-object", () => {
    expect(getFlattenedErrorDetails(null)).toEqual({ formErrors: [], fieldErrors: {} });
    expect(getFlattenedErrorDetails("boom")).toEqual({ formErrors: [], fieldErrors: {} });
    expect(getFlattenedErrorDetails(undefined)).toEqual({ formErrors: [], fieldErrors: {} });
  });

  it("extracts form and field errors", () => {
    const result = getFlattenedErrorDetails({
      formErrors: ["bad request"],
      fieldErrors: { email: ["already in use"] },
    });

    expect(result.formErrors).toEqual(["bad request"]);
    expect(result.fieldErrors.email).toEqual(["already in use"]);
  });

  it("drops non-string and blank messages", () => {
    const result = getFlattenedErrorDetails({
      formErrors: ["kept", 42, "  ", null],
      fieldErrors: { email: [7], name: ["real"] },
    });

    expect(result.formErrors).toEqual(["kept"]);
    expect(result.fieldErrors.email).toBeUndefined();
    expect(result.fieldErrors.name).toEqual(["real"]);
  });

  it("survives fieldErrors being the wrong shape", () => {
    expect(getFlattenedErrorDetails({ fieldErrors: "nope" }).fieldErrors).toEqual({});
  });
});

describe("joinLabels", () => {
  it("formats zero, one, two and many", () => {
    expect(joinLabels([])).toBe("");
    expect(joinLabels(["a"])).toBe("a");
    expect(joinLabels(["a", "b"])).toBe("a and b");
    expect(joinLabels(["a", "b", "c"])).toBe("a, b, and c");
  });
});
