import { describe, expect, it } from "vitest";
import { beginSitting, emptyLedger, markSubmitted, setSitOutcome, sitGoTo, type Ledger, type Sitting } from "./docs-bridge.js";
import { buildSittingView, buildStartView, sittingFile, sittingName } from "./sittingModel.js";
import type { PlaceRecord } from "./types.js";

function place(over: Partial<PlaceRecord> = {}): PlaceRecord {
  return { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10", ...over };
}

const NOTES: PlaceRecord[] = [
  place(),
  place({ id: "a2", name: "Sample Arena", wheelchair: "no", lat: 43.851, lon: -79.431, observedOn: "2026-11-08" }),
  place({ id: "a3", name: null, wheelchair: "limited", lat: 44.3, lon: -78.32, observedOn: "2026-11-12" }),
  place({ id: "u1", name: "Sample Pool", wheelchair: "UNKNOWN", observedOn: "2026-11-11" }),
];
const TODAY = "2026-11-19";

function ledgerWith(id: string): Ledger {
  const result = markSubmitted(emptyLedger(), { id, observedOn: "2026-11-10" }, { markedOn: TODAY, changeset: "", note: "" }, TODAY);
  if (!result.ok) throw new Error("could not mark");
  return result.ledger;
}

function begun(): Sitting {
  const sitting = beginSitting(buildStartView(NOTES, emptyLedger(), "newest", "en").queue, TODAY);
  if (sitting === null) throw new Error("nothing ready");
  return sitting;
}

describe("before a sitting", () => {
  it("counts what is ready and says why the rest is not", () => {
    const view = buildStartView(NOTES, emptyLedger(), "newest", "en");
    expect(view.ready).toBe("Ready to go through: 3.");
    expect(view.leftOut).toEqual(["Status UNKNOWN, so there is nothing to add: 1."]);
    expect(view.canStart).toBe(true);
    expect(view.queue.ids).toEqual(["a3", "a1", "a2"]);
  });
  it("leaves out what is already on the person’s list", () => {
    const view = buildStartView(NOTES, ledgerWith("a1"), "newest", "en");
    expect(view.queue.ids).toEqual(["a3", "a2"]);
    expect(view.leftOut[0]).toBe("Already on your list of what you added: 1.");
  });
  it("offers three orders with a hint each", () => {
    const view = buildStartView(NOTES, emptyLedger(), "nearby", "fr");
    expect(view.orders.map((o) => o.id)).toEqual(["newest", "oldest", "nearby"]);
    expect(view.orders[2]?.label).toBe("Lieu par lieu, le plus proche ensuite");
    for (const option of view.orders) expect(option.hint.length).toBeGreaterThan(10);
  });
  it("changes the queue with the order", () => {
    expect(buildStartView(NOTES, emptyLedger(), "oldest", "en").queue.ids).toEqual(["a2", "a1", "a3"]);
  });
  it("cannot start when nothing is ready", () => {
    const view = buildStartView([place({ wheelchair: "UNKNOWN" })], emptyLedger(), "newest", "en");
    expect(view.canStart).toBe(false);
    expect(view.ready).toBe("Ready to go through: 0.");
  });
});

describe("during a sitting", () => {
  it("shows the observation on screen with its record line and tags", () => {
    const view = buildSittingView(begun(), NOTES, "en");
    expect(view.atSummary).toBe(false);
    expect(view.isFirst).toBe(true);
    expect(view.item?.name).toBe("Place without a name");
    expect(view.item?.position).toBe("Observation 1 of 3");
    expect(view.item?.recordLine).toBe("Status: limited. Source: own visit. Licence: CC0-1.0. Seen on 2026-11-12. Tier: UNKNOWN. Spot: 44.30000, -78.32000.");
    expect(view.item?.tags).toBe("wheelchair=limited\ncheck_date:wheelchair=2026-11-12\nsource=own visit");
    expect(view.item?.heldBack).toEqual(["The observation has no name, so no name tag is written."]);
    expect(view.item?.outcome).toBeNull();
    expect(view.item?.outcomeText).toBe("Not looked at yet");
  });
  it("gives the distance to the next one", () => {
    expect(buildSittingView(begun(), NOTES, "en").item?.nextStop).toMatch(/^Next one, in a straight line: \d/);
    expect(buildSittingView(sitGoTo(begun(), 2), NOTES, "en").item?.nextStop).toBe("");
  });
  it("counts outcomes and lists every observation in the summary rows", () => {
    let sitting = begun();
    sitting = setSitOutcome(sitting, "a3", { kind: "added", changeset: "42" });
    sitting = setSitOutcome(sitting, "a1", { kind: "skipped", reason: "not-sure" });
    const view = buildSittingView(sitting, NOTES, "en");
    expect(view.counts).toBe("In this sitting: 3. Said added: 1. Skipped: 1. For later: 0. Not looked at yet: 1.");
    expect(view.rows.map((r) => [r.name, r.outcome, r.hasOutcome])).toEqual([
      ["Place without a name", "You said you added it, changeset 42", true],
      ["Sample Library", "Skipped: i am not sure of what i saw", true],
      ["Sample Arena", "Not looked at yet", false],
    ]);
    expect(view.firstOpen).toBe(2);
  });
  it("groups what the person said they added by changeset, with a draft", () => {
    let sitting = begun();
    sitting = setSitOutcome(sitting, "a3", { kind: "added", changeset: "42" });
    sitting = setSitOutcome(sitting, "a1", { kind: "added", changeset: null });
    const view = buildSittingView(sitting, NOTES, "en");
    expect(view.groups.map((g) => [g.key, g.heading])).toEqual([
      ["42", "Changeset 42: 1 place"],
      ["none", "No changeset number: 1 place"],
    ]);
    expect(view.groups[0]?.draft).toBe("comment=Wheelchair access for 1 place, seen in person on 2026-11-12.\nsource=own visit");
    expect(view.groups[1]?.notes).toEqual(["You can write the number in later on your list of what you added."]);
  });
  it("is at the summary after the last observation, with no item", () => {
    const view = buildSittingView(sitGoTo(begun(), 3), NOTES, "en");
    expect(view.atSummary).toBe(true);
    expect(view.item).toBeNull();
    expect(view.firstOpen).toBe(0);
  });
  it("leaves a removed observation out of the rows and shows no item for it", () => {
    const view = buildSittingView(begun(), NOTES.filter((r) => r.id !== "a3"), "en");
    expect(view.item).toBeNull();
    expect(view.rows.map((r) => r.id)).toEqual(["a1", "a2"]);
    expect(view.rows.map((r) => r.index)).toEqual([1, 2]);
  });
  it("always carries the cannot-see line and the rest line", () => {
    const view = buildSittingView(begun(), NOTES, "fr");
    expect(view.cannotSee).toMatch(/^L’application n’ajoute rien à OpenStreetMap et ne peut pas la voir\./);
    expect(view.rest).toMatch(/^Arrêtez quand vous voulez\./);
  });
  it("names a place with a blank name", () => {
    expect(sittingName({ name: " " }, "fr")).toBe("Lieu sans nom");
    expect(sittingName({ name: " Sample Café " }, "en")).toBe("Sample Café");
  });
});

describe("sitting files", () => {
  it("makes a text summary and a CSV named by the day the sitting began", () => {
    const sitting = setSitOutcome(begun(), "a3", { kind: "later" });
    const text = sittingFile("txt", sitting, NOTES, "en");
    expect(text).toMatchObject({ filename: "adding-by-hand-2026-11-19.txt", mime: "text/plain" });
    expect(text.content).toContain("1. Place without a name. For later.");
    const csv = sittingFile("csv", sitting, NOTES, "en");
    expect(csv).toMatchObject({ filename: "adding-by-hand-2026-11-19.csv", mime: "text/csv" });
    expect(csv.content.split("\r\n")[1]).toMatch(/^1,a3,,later,,,limited,own visit,CC0-1\.0,2026-11-12,UNKNOWN,/);
  });
});
