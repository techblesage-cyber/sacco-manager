import { describe, expect, it } from "vitest";
import { evaluateLicence } from "../lib/licence";

const now = new Date("2026-06-01T00:00:00Z");
const daysFromNow = (days: number) => new Date(now.getTime() + days * 86400000);

describe("licence state", () => {
  it("has no limit when no expiry is set", () => {
    expect(evaluateLicence(null, now).state).toBe("unlimited");
  });

  it("is active well before expiry", () => {
    expect(evaluateLicence(daysFromNow(120), now).state).toBe("active");
  });

  it("warns in the last 30 days", () => {
    expect(evaluateLicence(daysFromNow(10), now).state).toBe("expiring");
  });

  it("keeps working during the 30 day grace period", () => {
    expect(evaluateLicence(daysFromNow(-10), now).state).toBe("grace");
  });

  it("becomes read-only after the grace period", () => {
    expect(evaluateLicence(daysFromNow(-45), now).state).toBe("expired");
  });
});
