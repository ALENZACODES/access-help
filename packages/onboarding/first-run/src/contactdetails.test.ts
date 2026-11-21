import { describe, expect, it } from "vitest";
import {
  CONTACTS_CSV_COLUMNS,
  applyContacts,
  canClear,
  canRemove,
  cleanedFile,
  contactChanges,
  contactFindings,
  contactsCsv,
  findContacts,
  hasContact,
  newText,
  textProblem,
  withoutContacts,
  type ContactChoice,
  type Finding,
} from "./contactdetails";
import { exportNotes, importNotes } from "./exchange";
import { CONTRIBUTOR_SOURCE } from "./facts";
import { readStreetFile, type StreetFile } from "./filestreets";
import { looksLikeEmail, looksLikePhone } from "./form";
import { parseNote, type Note } from "./model";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function read(text: string): StreetFile {
  const r = readStreetFile(text, TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

/** A test note with note text, built through the App's own reader. */
function withText(n: Note, note: string): Note {
  const out = parseNote({ ...n, note });
  if (!out) throw new Error("bad note");
  return out;
}

const FILE = exportNotes(
  [
    withText(testNote("a", "Library", [{ key: "elevator", value: "yes", source: "Survey by jo@example.org" }], "1 King St W"), "Ask Jo (jo@example.org) about the lift."),
    withText(testNote("b", "Café", [{ key: "elevator", value: "no", source: "Survey by jo@example.org" }], "2 King St W"), "Ramp at the side door."),
    testNote("c", "Pizza 416-555-0199", [{ key: "automatic-door", value: "yes", source: "Survey by jo@example.org" }], "3 King St W"),
    withText(testNote("d", "Park", [], "4 King St W"), "Call 416 555 0123 or 647-555-0100, ext. 2."),
    testNote("e", "Zoo", [{ key: "elevator", value: "yes" }], "5 King St W"),
  ],
  "2026-11-01",
);

const note = (notes: readonly Note[], id: string): Note | undefined => notes.find((n) => n.id === id);

describe("findContacts", () => {
  it("finds emails and phone numbers in order, with their place in the text", () => {
    const text = "Mail a@b.ca or call (416) 555-0100.";
    expect(findContacts(text)).toEqual([
      { kind: "email", start: 5, end: 11 },
      { kind: "phone", start: 20, end: 34 },
    ]);
    expect(text.slice(20, 34)).toBe("(416) 555-0100");
  });

  it("leaves out short numbers, dates and house numbers", () => {
    expect(findContacts("Open 9-5, 2026-10-01, at 12-345 King St W")).toEqual([]);
    expect(findContacts("Room 555-0100")).toEqual([]);
  });

  it("leaves sentence punctuation after an email to the sentence", () => {
    const at = (t: string) => findContacts(t).map((c) => t.slice(c.start, c.end));
    expect(at("Write jo@example.org.")).toEqual(["jo@example.org"]);
    expect(at("Write jo@example.org, or call.")).toEqual(["jo@example.org"]);
    expect(at("Write (jo@example.org)")).toEqual(["(jo@example.org)"]);
    expect(at("Is it jo@example.org?!")).toEqual(["jo@example.org"]);
    expect(withoutContacts("Write to jo@example.org.")).toBe("Write to.");
  });

  it("counts a number inside an email as part of the email", () => {
    expect(findContacts("x4165550100@mail.ca").map((c) => c.kind)).toEqual(["email"]);
  });

  it("agrees with the App's own checks on every sample", () => {
    const samples = [
      "",
      "plain text",
      "jo@example.org",
      "write to jo at example dot org",
      "+1 416 555 0100",
      "416-555-0100",
      "4165550100",
      "555-0100",
      "1-800-555-0199 ext 4",
      "call (647) 555-0123 today",
      "2026-10-01 to 2026-11-01",
      "a@b",
      "a@b.c d@e.f",
    ];
    for (const s of samples) {
      const found = findContacts(s);
      expect(found.some((c) => c.kind === "email"), s).toBe(looksLikeEmail(s));
      // A phone inside an email is counted as the email, so only check texts with no email.
      if (!looksLikeEmail(s)) expect(found.some((c) => c.kind === "phone"), s).toBe(looksLikePhone(s));
      expect(hasContact(s), s).toBe(looksLikeEmail(s) || looksLikePhone(s));
    }
  });
});

describe("withoutContacts", () => {
  it("takes the details out and tidies what is left", () => {
    expect(withoutContacts("Ask Jo (jo@example.org) about the lift.")).toBe("Ask Jo about the lift.");
    expect(withoutContacts("Call 416 555 0123 or 647-555-0100, ext. 2.")).toBe("Call or, ext. 2.");
    expect(withoutContacts("Pizza 416-555-0199")).toBe("Pizza");
    expect(withoutContacts("Survey by jo@example.org")).toBe("Survey by");
    expect(withoutContacts("jo@example.org")).toBe("");
    expect(withoutContacts("Phone: 416-555-0100")).toBe("Phone");
    expect(withoutContacts("Front desk (416) 555-0100 is staffed.")).toBe("Front desk is staffed.");
  });

  it("keeps line breaks and text with nothing to take out", () => {
    expect(withoutContacts("Side door.\nCall 416-555-0100\nRamp is steep.")).toBe("Side door.\nCall\nRamp is steep.");
    expect(withoutContacts("Nothing here.")).toBe("Nothing here.");
  });
});

describe("contactFindings", () => {
  const r = contactFindings(read(FILE));

  it("lists names, then note texts, then sources, with what was found", () => {
    expect(r.notes).toBe(5);
    expect(r.findings.map((f) => [f.id, f.field, f.contacts.map((c) => c.kind)])).toEqual([
      ["name|c", "name", ["phone"]],
      ["note|a", "note", ["email"]],
      ["note|d", "note", ["phone", "phone"]],
      ["source|Survey by jo@example.org", "source", ["email"]],
    ]);
  });

  it("counts every note and record that uses a source, under the first place by name", () => {
    const s = r.findings[3]!;
    // In the file's place order: Café, Library, Pizza.
    expect(s.notes.map((n) => n.id)).toEqual(["b", "a", "c"]);
    expect(s.records).toBe(3);
    expect(s.place).toBe("Café");
    expect(s.without).toBe("Survey by");
  });

  it("finds nothing in a file with no contact details", () => {
    expect(contactFindings(read(exportNotes([testNote("x", "X", [{ key: "elevator", value: "yes" }])], "2026-11-01")))).toEqual({ notes: 1, findings: [] });
  });
});

describe("choices", () => {
  const r = contactFindings(read(FILE));
  const [name, text, phones, source] = r.findings as [Finding, Finding, Finding, Finding];

  it("offers removing the details unless that leaves a name or source empty, and removing the whole text only for note text", () => {
    expect(canRemove(name)).toBe(true);
    expect(canRemove(text)).toBe(true);
    const bare = { ...source, without: "" };
    expect(canRemove(bare)).toBe(false);
    expect(canRemove({ ...text, without: "" })).toBe(true);
    expect([name, text, phones, source].map(canClear)).toEqual([false, true, true, false]);
  });

  it("names what is wrong with text written again", () => {
    expect(textProblem(name, "")).toBe("empty");
    expect(textProblem(name, "x".repeat(121))).toBe("too-long");
    expect(textProblem(name, "Pizza\tPlace")).toBe("control");
    expect(textProblem(name, "Pizza Place")).toBeUndefined();
    expect(textProblem(text, "")).toBeUndefined();
    expect(textProblem(text, "Line one\nLine two")).toBeUndefined();
    expect(textProblem(text, "x".repeat(501))).toBe("too-long");
    expect(textProblem(source, CONTRIBUTOR_SOURCE)).toBe("contributor");
    expect(textProblem(source, "Branch walk")).toBeUndefined();
    // A detail left in is allowed.
    expect(textProblem(name, "Pizza 416-555-0199")).toBeUndefined();
  });

  it("turns a choice into the new text, or nothing when it keeps or is not allowed", () => {
    expect(newText(text, undefined)).toBeUndefined();
    expect(newText(text, { kind: "keep" })).toBeUndefined();
    expect(newText(text, { kind: "remove" })).toBe("Ask Jo about the lift.");
    expect(newText(text, { kind: "clear" })).toBe("");
    expect(newText(name, { kind: "clear" })).toBeUndefined();
    expect(newText(name, { kind: "text", text: "  Pizza Place " })).toBe("Pizza Place");
    expect(newText(name, { kind: "text", text: "" })).toBeUndefined();
    expect(newText({ ...source, without: "" }, { kind: "remove" })).toBeUndefined();
  });
});

describe("applyContacts", () => {
  const file = read(FILE);
  const r = contactFindings(file);
  const apply = (pairs: Array<[string, ContactChoice]>) => applyContacts(file, r, new Map(pairs));

  it("removes the details from a note text and leaves everything else", () => {
    const c = apply([["note|a", { kind: "remove" }]]);
    expect(c).toMatchObject({ changed: 1, notesChanged: 1, stillHas: 0 });
    expect(note(c.notes, "a")?.note).toBe("Ask Jo about the lift.");
    expect(note(c.notes, "a")?.facts).toEqual(note(file.places.flatMap((p) => p.notes), "a")?.facts);
    expect(note(c.notes, "b")).toBe(file.places.flatMap((p) => p.notes).find((n) => n.id === "b"));
  });

  it("removes a whole note text", () => {
    const c = apply([["note|d", { kind: "clear" }]]);
    expect(note(c.notes, "d")?.note).toBeUndefined();
    expect(c.changed).toBe(1);
  });

  it("renames a source on every record that uses it, keeping answers, licences and dates", () => {
    const c = apply([["source|Survey by jo@example.org", { kind: "text", text: "Branch survey" }]]);
    expect(c).toMatchObject({ changed: 1, notesChanged: 3 });
    for (const id of ["a", "b", "c"]) {
      const f = note(c.notes, id)?.facts.find((x) => x.provenance);
      expect(f?.provenance?.source, id).toBe("Branch survey");
      expect(f?.provenance?.licence).toBe("CC0-1.0");
      expect(f?.provenance?.recordedOn).toBe("2026-10-01");
    }
  });

  it("does several changes in one note at once", () => {
    const c = apply([["note|a", { kind: "clear" }], ["source|Survey by jo@example.org", { kind: "remove" }], ["name|c", { kind: "remove" }]]);
    expect(c).toMatchObject({ changed: 3, notesChanged: 3 });
    expect(note(c.notes, "a")?.note).toBeUndefined();
    expect(note(c.notes, "a")?.facts.find((f) => f.provenance)?.provenance?.source).toBe("Survey by");
    expect(note(c.notes, "c")?.placeName).toBe("Pizza");
  });

  it("counts a change that still holds a detail, as the person chose", () => {
    const c = apply([["name|c", { kind: "text", text: "Pizza, call 416-555-0199" }]]);
    expect(c).toMatchObject({ changed: 1, stillHas: 1 });
  });

  it("changes nothing for choices that keep, are not allowed, or give the same text", () => {
    const c = apply([
      ["name|c", { kind: "clear" }],
      ["note|a", { kind: "keep" }],
      ["note|d", { kind: "text", text: "Call 416 555 0123 or 647-555-0100, ext. 2." }],
      ["source|Survey by jo@example.org", { kind: "text", text: CONTRIBUTOR_SOURCE }],
    ]);
    expect(c).toMatchObject({ changed: 0, notesChanged: 0, stillHas: 0 });
    expect(c.notes).toEqual(file.places.flatMap((p) => p.notes));
  });
});

describe("contactChanges", () => {
  const file = read(FILE);
  const r = contactFindings(file);

  it("lists what the copy holds now, in the list's order", () => {
    const choices = new Map<string, ContactChoice>([
      ["source|Survey by jo@example.org", { kind: "text", text: "Branch survey" }],
      ["note|d", { kind: "clear" }],
      ["name|c", { kind: "remove" }],
    ]);
    expect(contactChanges(r, applyContacts(file, r, choices)).map((c) => [c.finding.id, c.to, c.stillHas])).toEqual([
      ["name|c", "Pizza", false],
      ["note|d", "", false],
      ["source|Survey by jo@example.org", "Branch survey", false],
    ]);
  });

  it("is empty when nothing changed", () => {
    expect(contactChanges(r, applyContacts(file, r, new Map()))).toEqual([]);
  });
});

describe("cleanedFile", () => {
  it("is a notes export the App reads back, with no contact details left when all are removed", () => {
    const file = read(FILE);
    const r = contactFindings(file);
    const all = new Map<string, ContactChoice>(r.findings.map((f) => [f.id, f.field === "note" ? { kind: "clear" } : { kind: "remove" }]));
    const text = cleanedFile(applyContacts(file, r, all), TODAY);
    expect(JSON.parse(text)).toMatchObject({ exportedOn: "2026-11-21" });
    const back = importNotes(text);
    expect(back.error).toBeUndefined();
    expect(back.rejected).toBe(0);
    expect(contactFindings(read(text)).findings).toEqual([]);
    expect(looksLikeEmail(text) || looksLikePhone(text)).toBe(false);
  });
});

describe("contactsCsv", () => {
  it("says where the details are with counts, and never holds them", () => {
    const csv = contactsCsv(contactFindings(read(FILE)));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines).toEqual([
      CONTACTS_CSV_COLUMNS.join(","),
      "Pizza,name,0,1,1,0",
      "Library,note,1,0,1,0",
      "Park,note,0,2,1,0",
      "Café,source,1,0,3,3",
    ]);
    expect(looksLikeEmail(csv)).toBe(false);
    expect(looksLikePhone(csv)).toBe(false);
  });

  it("guards a place name a spreadsheet would run as a formula", () => {
    const csv = contactsCsv(contactFindings(read(exportNotes([testNote("x", "=X 416-555-0100", [])], "2026-11-01"))));
    expect(csv).toContain("'=X");
  });
});
