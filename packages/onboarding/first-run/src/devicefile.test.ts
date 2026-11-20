import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, LIMITS, auditCopy, type Note } from "./index";
import { recordAsk, markReplied, MAX_ASKED, type AskRecord } from "./asked";
import { addToBin, MAX_BIN } from "./bin";
import {
  DEVICE_FORMAT,
  MOVE_COPY,
  PARTS,
  broughtText,
  deviceFilename,
  exportDevice,
  fileAgeText,
  importDevice,
  isDeviceFile,
  mergeDevice,
  moveStrings,
  partCount,
  usefulParts,
  type DeviceData,
  type Part,
} from "./devicefile";
import { logCorrection } from "./noteedit";
import { addStop, emptySurvey, setLicence, type Survey } from "./survey";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const note = (id: string, name: string): Note => testNote(id, name, [{ key: "elevator", value: "yes", source: CONTRIBUTOR_SOURCE }]);

function survey(name: string): Survey {
  const r = addStop(emptySurvey(TODAY), name, "", TODAY);
  if (!r.ok) throw new Error("survey");
  return setLicence(r.survey, "CC0-1.0");
}

function asked(id: string, name: string, on: string): AskRecord[] {
  const r = recordAsk([], { id, name, address: undefined }, ["elevator"], "email", new Date(`${on}T12:00:00Z`));
  if (r === "full") throw new Error("full");
  return r;
}

const EMPTY: DeviceData = { notes: [], lists: { needs: {}, shortlist: [], checklist: {} }, asked: [], corrections: [], bin: [], survey: undefined };

function full(): DeviceData {
  return {
    notes: [note("n1", "Library"), note("n2", "Cafe")],
    lists: { needs: { elevator: "yes" }, shortlist: ["library-1a2b3c4d"], checklist: {} },
    asked: asked("library-1a2b3c4d", "Library", "2026-11-10"),
    corrections: logCorrection([], "n1", [{ part: "elevator", from: "no", to: "yes" }], TODAY),
    bin: addToBin([], note("gone", "Arena"), TODAY),
    survey: survey("Pool"),
  };
}

const ALL = new Set<Part>(PARTS);

describe("the file", () => {
  it("reads back exactly what was written", () => {
    const text = exportDevice(full(), "2026-11-20");
    const r = importDevice(text, TODAY);
    if (r.error) throw new Error(r.error);
    expect(r.data).toEqual(full());
    expect(r.exportedOn).toBe("2026-11-20");
    expect(JSON.parse(text).format).toBe(DEVICE_FORMAT);
  });

  it("writes no survey when there is none, and reads none back", () => {
    const text = exportDevice({ ...full(), survey: emptySurvey(TODAY) }, "2026-11-20");
    expect(JSON.parse(text).survey).toBeNull();
    const r = importDevice(text, TODAY);
    expect(r.error === undefined && r.data.survey).toBeUndefined();
  });

  it("says why a text is not a file it can read", () => {
    expect(importDevice("  ", TODAY)).toEqual({ error: "empty" });
    expect(importDevice("x".repeat(LIMITS.importChars + 1), TODAY)).toEqual({ error: "too-large" });
    expect(importDevice("{nope", TODAY)).toEqual({ error: "not-json" });
    expect(importDevice("[]", TODAY)).toEqual({ error: "wrong-format" });
    expect(importDevice(JSON.stringify({ format: "app-lists", version: 1 }), TODAY)).toEqual({ error: "is-lists" });
    expect(importDevice(JSON.stringify({ format: "app-notes", version: 1, notes: [] }), TODAY)).toEqual({ error: "is-notes" });
    expect(importDevice(JSON.stringify({ format: "something-else", version: 1 }), TODAY)).toEqual({ error: "wrong-format" });
    expect(importDevice(JSON.stringify({ format: DEVICE_FORMAT, version: 2 }), TODAY)).toEqual({ error: "wrong-version" });
    expect(importDevice(JSON.stringify({ format: DEVICE_FORMAT, version: "1" }), TODAY)).toEqual({ error: "wrong-version" });
  });

  it("drops broken parts and keeps the rest", () => {
    const text = JSON.stringify({
      format: DEVICE_FORMAT,
      version: 1,
      notes: [note("ok", "Library"), { ...note("bad", "X"), licence: "All rights reserved" }, note("ok", "Library again"), "junk"],
      lists: "nope",
      asked: [{ id: "BAD" }],
      corrections: 7,
      bin: [{ note: note("b1", "Arena"), removedOn: "2099-01-01" }],
      survey: { stops: "nope" },
      exportedOn: "yesterday",
    });
    const r = importDevice(text, TODAY);
    if (r.error) throw new Error(r.error);
    expect(r.data.notes.map((n) => n.id)).toEqual(["ok"]);
    expect(r.data.lists).toEqual({ needs: {}, shortlist: [], checklist: {} });
    expect(r.data.asked).toEqual([]);
    expect(r.data.corrections).toEqual([]);
    expect(r.data.bin).toEqual([]);
    expect(r.data.survey).toBeUndefined();
    expect(r.exportedOn).toBeUndefined();
  });

  it("is named for the day", () => {
    expect(deviceFilename(TODAY)).toBe("app-everything-2026-11-20.json");
  });

  it("counts each part as people count it", () => {
    expect(PARTS.map((p) => partCount(full(), p))).toEqual([2, 2, 1, 1, 1, 1]);
    expect(PARTS.map((p) => partCount(EMPTY, p))).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("bringing a file in", () => {
  it("adds everything to an empty device", () => {
    const { data, plans } = mergeDevice(EMPTY, full(), ALL);
    expect(data).toEqual({ ...full(), lists: { ...full().lists } });
    expect(plans.map((p) => [p.part, p.add])).toEqual([
      ["notes", 2],
      ["lists", 2],
      ["asked", 1],
      ["corrections", 1],
      ["bin", 1],
      ["survey", 1],
    ]);
    expect(usefulParts(plans)).toEqual(PARTS);
  });

  it("adds nothing the second time", () => {
    const once = mergeDevice(EMPTY, full(), ALL).data;
    const twice = mergeDevice(once, full(), ALL);
    expect(twice.data).toEqual(once);
    expect(usefulParts(twice.plans)).toEqual([]);
  });

  it("keeps this device's version of a note in both, and says so", () => {
    const mine: DeviceData = { ...EMPTY, notes: [note("n1", "Library (mine)")] };
    const { data, plans } = mergeDevice(mine, full(), ALL);
    expect(data.notes.map((n) => [n.id, n.placeName])).toEqual([
      ["n1", "Library (mine)"],
      ["n2", "Cafe"],
    ]);
    expect(plans.find((p) => p.part === "notes")).toEqual({ part: "notes", inFile: 2, add: 1, kept: 1, noRoom: 0 });
  });

  it("stops at the notes limit and counts what had no room", () => {
    const mine: DeviceData = { ...EMPTY, notes: Array.from({ length: LIMITS.notes - 1 }, (_, i) => note(`m${i}`, `M${i}`)) };
    const { data, plans } = mergeDevice(mine, full(), ALL);
    expect(data.notes).toHaveLength(LIMITS.notes);
    expect(plans.find((p) => p.part === "notes")).toMatchObject({ add: 1, noRoom: 1 });
  });

  it("counts the same whether or not notes are chosen", () => {
    const mine: DeviceData = { ...EMPTY, notes: Array.from({ length: LIMITS.notes - 1 }, (_, i) => note(`m${i}`, `M${i}`)) };
    const without = mergeDevice(mine, full(), new Set<Part>(["lists"]));
    expect(without.data.notes).toHaveLength(LIMITS.notes - 1);
    expect(without.plans.find((p) => p.part === "notes")).toMatchObject({ add: 1, noRoom: 1 });
  });

  it("changes only the chosen parts", () => {
    for (const p of PARTS) {
      const { data } = mergeDevice(EMPTY, full(), new Set([p]));
      for (const other of PARTS.filter((x) => x !== p)) {
        if (other === "corrections" || other === "bin") continue;
        expect(partCount(data, other), `${p} chose, ${other} must stay`).toBe(0);
      }
    }
  });

  it("keeps the more recent question for a place", () => {
    const mine: DeviceData = { ...EMPTY, asked: markReplied(asked("library-1a2b3c4d", "Library", "2026-11-01"), "library-1a2b3c4d", new Date(Date.UTC(2026, 10, 15))) };
    const older = mergeDevice(mine, full(), ALL);
    expect(older.data.asked[0]?.state).toBe("replied");
    expect(older.plans.find((p) => p.part === "asked")).toMatchObject({ add: 0, kept: 1 });
    const theirs: DeviceData = { ...EMPTY, asked: asked("library-1a2b3c4d", "Library", "2026-11-18") };
    const newer = mergeDevice(mine, theirs, ALL);
    expect(newer.data.asked[0]).toMatchObject({ askedOn: "2026-11-18", state: "waiting" });
  });

  it("stops at 100 questions", () => {
    let list: AskRecord[] = [];
    for (let i = 0; i < MAX_ASKED; i++) {
      const r = recordAsk(list, { id: `p${i}-00000000`, name: `P${i}`, address: undefined }, ["elevator"], "phone", TODAY);
      if (r !== "full") list = r;
    }
    const { plans } = mergeDevice({ ...EMPTY, asked: list }, full(), ALL);
    expect(plans.find((p) => p.part === "asked")).toMatchObject({ add: 0, noRoom: 1 });
  });

  it("does not put a note in Recently removed when it is in the notes, and stops at 50", () => {
    const inNotes = mergeDevice({ ...EMPTY, notes: [note("gone", "Arena")] }, full(), ALL);
    expect(inNotes.data.bin).toEqual([]);
    let bin = addToBin([], note("x0", "X0"), TODAY);
    for (let i = 1; i < MAX_BIN; i++) bin = addToBin(bin, note(`x${i}`, `X${i}`), TODAY);
    const fullBin = mergeDevice({ ...EMPTY, bin }, full(), ALL);
    expect(fullBin.plans.find((p) => p.part === "bin")).toMatchObject({ add: 0, noRoom: 1 });
  });

  it("brings corrections only for notes that exist after the merge", () => {
    const onlyCorrections = mergeDevice(EMPTY, full(), new Set<Part>(["corrections"]));
    // The note n1 is not on this device and was not brought in: its correction is not kept.
    expect(onlyCorrections.data.corrections).toEqual([]);
    const withNotes = mergeDevice(EMPTY, full(), new Set<Part>(["notes", "corrections"]));
    expect(withNotes.data.corrections.map((c) => c.noteId)).toEqual(["n1"]);
  });

  it("never replaces a survey in progress", () => {
    const mine: DeviceData = { ...EMPTY, survey: survey("Kiosk") };
    const { data, plans } = mergeDevice(mine, full(), ALL);
    expect(data.survey?.stops.map((s) => s.placeName)).toEqual(["Kiosk"]);
    expect(plans.find((p) => p.part === "survey")).toMatchObject({ add: 0, kept: 1 });
  });
});

describe("words", () => {
  it("says what was brought in, and when nothing was", () => {
    const { plans } = mergeDevice(EMPTY, full(), ALL);
    expect(broughtText(plans, new Set<Part>(["notes", "asked"]), "en")).toBe("Brought in: Notes (2), Questions you sent (1).");
    expect(broughtText(plans, new Set<Part>(["notes"]), "fr")).toBe("Importé\u00A0: Notes (2).");
    expect(broughtText(plans, new Set<Part>(), "en")).toBe(MOVE_COPY.nothing.en);
  });

  it("passes the App's copy audit", () => {
    expect(auditCopy(moveStrings())).toEqual([]);
  });
});

describe("telling files apart", () => {
  it("knows an everything file, and nothing else", () => {
    expect(isDeviceFile(exportDevice(full(), "2026-11-20"))).toBe(true);
    expect(isDeviceFile(JSON.stringify({ format: "app-notes", version: 1, notes: [] }))).toBe(false);
    expect(isDeviceFile("{broken")).toBe(false);
    expect(isDeviceFile("null")).toBe(false);
    expect(isDeviceFile(`{"format":"app-device"${" ".repeat(LIMITS.importChars)}}`)).toBe(false);
  });
});

describe("how old a file is", () => {
  it("says when it was made, and warns about an old file", () => {
    expect(fileAgeText("2026-11-20", TODAY, "en")).toBe("File made on 2026-11-20, today.");
    expect(fileAgeText("2026-11-19", TODAY, "fr")).toBe("Fichier créé le 2026-11-19, il y a 1 jour.");
    expect(fileAgeText("2026-08-22", TODAY, "en")).toBe("File made on 2026-08-22, 90 days ago.");
    expect(fileAgeText("2026-08-21", TODAY, "en")).toBe(`File made on 2026-08-21, 91 days ago. ${MOVE_COPY.oldFile.en}`);
    expect(fileAgeText(undefined, TODAY, "en")).toBe("");
    // A date after today counts as today, not as a negative age.
    expect(fileAgeText("2026-12-01", TODAY, "en")).toBe("File made on 2026-12-01, today.");
  });
});

describe("counting and limits", () => {
  it("counts must-haves, shortlist and checklist places together", () => {
    const d: DeviceData = { ...EMPTY, lists: { needs: { elevator: "yes", "automatic-door": "no" }, shortlist: ["a-00000000"], checklist: { "a-00000000": {}, "b-11111111": {} } } };
    expect(partCount(d, "lists")).toBe(5);
  });

  it("keeps at most 500 corrections after a merge, newest first", () => {
    let mine: ReturnType<typeof logCorrection> = [];
    for (let i = 0; i < 499; i++) mine = logCorrection(mine, "n1", [{ part: "elevator", from: "yes", to: "no" }], new Date(Date.UTC(2026, 0, 1 + (i % 300))));
    let theirs: ReturnType<typeof logCorrection> = [];
    for (let i = 0; i < 5; i++) theirs = logCorrection(theirs, "n2", [{ part: "address", from: "a", to: `b${i}` }], new Date(Date.UTC(2026, 10, 10 + i)));
    const current: DeviceData = { ...EMPTY, notes: [note("n1", "Library"), note("n2", "Cafe")], corrections: mine };
    const { data, plans } = mergeDevice(current, { ...EMPTY, corrections: theirs }, new Set<Part>(["corrections"]));
    expect(data.corrections).toHaveLength(500);
    expect(data.corrections[0]?.on).toBe("2026-11-14");
    expect(plans.find((p) => p.part === "corrections")).toMatchObject({ add: 1, noRoom: 4 });
  });

  it("writes the survey only when it has something in it", () => {
    const text = exportDevice({ ...EMPTY, survey: survey("Pool") }, "2026-11-20");
    expect((JSON.parse(text) as { survey: { stops: unknown[] } }).survey.stops).toHaveLength(1);
  });
});
