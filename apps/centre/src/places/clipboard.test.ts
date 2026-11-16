import { describe, expect, it } from "vitest";
import { copyText } from "./clipboard.js";

describe("copyText", () => {
  it("writes the text and reports success", async () => {
    let written = "";
    const nav = { clipboard: { writeText: async (value: string) => void (written = value) } } as unknown as Navigator;
    expect(await copyText("hello", nav)).toBe(true);
    expect(written).toBe("hello");
  });
  it("reports failure when the browser refuses", async () => {
    const nav = { clipboard: { writeText: async () => Promise.reject(new Error("denied")) } } as unknown as Navigator;
    expect(await copyText("x", nav)).toBe(false);
  });
  it("reports failure when there is no clipboard", async () => {
    expect(await copyText("x", {} as Navigator)).toBe(false);
    expect(await copyText("x", undefined)).toBe(false);
  });
});
