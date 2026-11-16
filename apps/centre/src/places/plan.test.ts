import { describe, expect, it } from "vitest";
import { buildPackManifest } from "./docs-bridge.js";
import { QUESTION_KEYS } from "./moreStrings.js";
import { mergePacks } from "./packs.js";
import { buildPlan, leadKey, planText } from "./plan.js";
import { resolveSaved, type SavedPlace } from "./saved.js";
import { SAMPLE_TODAY, sampleRecords } from "./testing.js";

const records = sampleRecords();
const packOf = (id: string, list = records) => ({ manifest: buildPackManifest(id, list, SAMPLE_TODAY), records: list, warnings: [] });
const saved = (id: string, extra: Partial<SavedPlace> = {}): SavedPlace => ({ id, name: `Saved ${id}`, note: "", labels: [], savedOn: SAMPLE_TODAY, ...extra });
const resolve = (ids: string[], packs = [packOf("a")]) => resolveSaved(ids.map((id) => saved(id)), mergePacks(packs).places);

describe("leadKey", () => {
  it("matches the recorded status, and never softens UNKNOWN", () => {
    const r = resolve(["s1", "s2", "s3", "s4", "gone"]);
    expect(r.map(leadKey)).toEqual(["leadYes", "leadLimited", "leadNo", "leadUnknown", "leadNotLoaded"]);
  });
  it("uses the conflict lead when packs disagree", () => {
    const other = packOf("b", records.map((r) => (r.id === "s1" ? { ...r, wheelchair: "no" as const } : r)));
    expect(resolve(["s1"], [packOf("a"), other]).map(leadKey)).toEqual(["leadConflict"]);
  });
});

describe("buildPlan", () => {
  it("includes only the chosen places, with every question", () => {
    const plan = buildPlan(resolve(["s1", "s2"]), new Set(["s2"]), SAMPLE_TODAY, "en");
    expect(plan.map((item) => item.id)).toEqual(["s2"]);
    expect(plan[0]?.questions).toHaveLength(QUESTION_KEYS.length);
  });
  it("flags an old record and leaves a recent one without the flag", () => {
    const plan = buildPlan(resolve(["s1", "s3"]), new Set(["s1", "s3"]), SAMPLE_TODAY, "en");
    expect(plan.find((i) => i.id === "s1")?.staleNote).toBeNull();
    expect(plan.find((i) => i.id === "s3")?.staleNote).toContain("older than a year");
  });
  it("keeps the saved name and says UNKNOWN for a place that is in no loaded pack", () => {
    const [item] = buildPlan(resolve(["gone"]), new Set(["gone"]), SAMPLE_TODAY, "en");
    expect(item?.name).toBe("Saved gone");
    expect(item?.status).toBe("UNKNOWN");
    expect(item?.coordinates).toBeNull();
    expect(item?.lead).toContain("UNKNOWN");
  });
  it("uses the current pack name over the saved one", () => {
    const [item] = buildPlan(resolve(["s1"]), new Set(["s1"]), SAMPLE_TODAY, "en");
    expect(item?.name).toBe("Sample Library");
  });
});

describe("planText", () => {
  const items = buildPlan(
    resolveSaved([saved("s4", { note: "call after 9" })], mergePacks([packOf("a")]).places),
    new Set(["s4"]),
    SAMPLE_TODAY,
    "en",
  );
  it("lists the lead, the note, numbered questions, and the footer", () => {
    const text = planText(items, SAMPLE_TODAY, "en");
    expect(text).toContain("Visit plan");
    expect(text).toContain("Sample Clinic Annex");
    expect(text).toContain("No status is recorded for this place.");
    expect(text).toContain("Your note: call after 9");
    expect(text).toContain("1. Is there a step-free route");
    expect(text).toContain("8. When was each of these last looked at");
    expect(text.trim().endsWith("Contribute page.")).toBe(true);
  });
  it("is written in French with French punctuation", () => {
    const fr = buildPlan(resolveSaved([saved("s4", { note: "x" })], mergePacks([packOf("a")]).places), new Set(["s4"]), SAMPLE_TODAY, "fr");
    const text = planText(fr, SAMPLE_TODAY, "fr");
    expect(text).toContain("Plan de visite");
    expect(text).toContain("Votre note : x");
    expect(text).toContain("principale ?");
  });
  it("gives no medical or eligibility wording", () => {
    const text = planText(items, SAMPLE_TODAY, "en");
    expect(text).not.toMatch(/\b(doctor|diagnos|treat|eligib|qualif|medical|therap|injur)/i);
  });
});
