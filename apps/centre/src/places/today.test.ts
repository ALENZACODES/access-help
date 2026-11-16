import { describe, expect, it } from "vitest";
import { localToday } from "./today.js";

describe("localToday", () => {
  it("uses the local calendar date with zero padding", () => {
    expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localToday(new Date(2026, 10, 15, 0, 1))).toBe("2026-11-15");
  });
});
