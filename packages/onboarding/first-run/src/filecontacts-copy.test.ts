import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { CONTACT_FIELDS, contactFindings, type CleanedCopy, type ContactsReport, type Finding } from "./contactdetails";
import { exportNotes } from "./exchange";
import {
  FILE_CONTACTS_COPY as C,
  changeText,
  contactProblemText,
  contactsErrorText,
  contactsFilename,
  contactsSummary,
  copySummary,
  fieldText,
  fileContactsStrings,
  findingHeading,
  kindsText,
} from "./filecontacts-copy";
import { readStreetFile } from "./filestreets";
import { parseNote } from "./model";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function report(): ContactsReport {
  const n = parseNote({ ...testNote("a", "Library", [{ key: "elevator", value: "yes", source: "Walk, jo@example.org" }]), note: "Call 416-555-0100 or 647-555-0101." });
  if (!n) throw new Error("bad note");
  const r = readStreetFile(
    exportNotes([n, testNote("b", "Kiosk 905-555-0102", [{ key: "elevator", value: "no", source: "Walk, jo@example.org" }])], "2026-11-01"),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return contactFindings(r.file);
}

const find = (id: string): Finding => {
  const f = report().findings.find((x) => x.id === id);
  if (!f) throw new Error(id);
  return f;
};

const copy = (changed: number, notesChanged: number, stillHas: number): CleanedCopy => ({ notes: [], changed, notesChanged, stillHas });

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileContactsStrings())).toEqual([]);
  });

  it("holds no banned word or “inconnu”", () => {
    for (const [path, p] of fileContactsStrings()) {
      expect(findBanned(p.en), path).toBeUndefined();
      expect(findBanned(p.fr), path).toBeUndefined();
      expect(p.fr.toLowerCase(), path).not.toContain("inconnu");
    }
  });

  it("names every control that removes something as one", () => {
    for (const k of ["clear", "remove", "removeAll"] as const) {
      expect(C[k].en.startsWith("Remove"), k).toBe(true);
      expect(C[k].fr.startsWith("Retirer"), k).toBe(true);
    }
  });

  it("says the App removes nothing unless asked, and that the list holds no details", () => {
    expect(C.rule.en).toContain("never removes anything unless you ask");
    expect(C.privacy.en).toContain("never what they are");
    expect(C.privacy.fr).toContain("jamais ce qu’elles sont");
    expect(C.downloadCsv.en).toContain("without the details");
  });

  it("has words for every field, problem and file error", () => {
    for (const l of ["en", "fr"] as const) {
      for (const f of CONTACT_FIELDS) {
        expect(fieldText(f, l).length).toBeGreaterThan(0);
        expect(C.textHint[f][l].length).toBeGreaterThan(0);
      }
      for (const p of ["empty", "too-long", "control", "contributor"] as const) expect(contactProblemText(p, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(contactsErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("item lines", () => {
  it("counts what was found by kind, with singular and plural", () => {
    expect(kindsText(find("note|a"), "en")).toBe("2 phone numbers");
    expect(kindsText(find("source|Walk, jo@example.org"), "en")).toBe("1 email");
    expect(kindsText(find("note|a"), "fr")).toBe("2 numéros de téléphone");
    expect(kindsText({ ...find("note|a"), contacts: [{ kind: "email", start: 0, end: 1 }, { kind: "phone", start: 2, end: 3 }] }, "en")).toBe("1 email, 1 phone number");
  });

  it("heads an item with its field, where it is and what was found", () => {
    expect(findingHeading(find("name|b"), "en")).toBe("Place name — Kiosk 905-555-0102 — 1 phone number");
    expect(findingHeading(find("note|a"), "fr")).toBe("Texte de la note — Library — 2 numéros de téléphone");
    expect(findingHeading(find("source|Walk, jo@example.org"), "en")).toBe("Source name — used by 2 records in 2 notes — 1 email");
    expect(findingHeading(find("source|Walk, jo@example.org"), "fr")).toBe("Nom de la source — utilisée par 2 données dans 2 notes — 1 courriel");
  });
});

describe("summaries", () => {
  it("counts the notes, emails, phone numbers and items", () => {
    expect(contactsSummary(report(), "en")).toBe("2 notes: 1 email and 3 phone numbers in 3 items.");
    const fr = contactsSummary(report(), "fr");
    expect(fr).toBe("2 notes\u00A0: 1 courriel et 3 numéros de téléphone dans 3 éléments.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("tells what the copy changed, and what still holds a detail by choice", () => {
    expect(copySummary(copy(2, 3, 0), "en")).toBe("2 items changed in 3 notes.");
    expect(copySummary(copy(1, 1, 1), "en")).toBe("1 item changed in 1 note; 1 still holds contact details, as you chose.");
    expect(copySummary(copy(3, 2, 2), "en")).toBe("3 items changed in 2 notes; 2 still hold contact details, as you chose.");
    const fr = copySummary(copy(3, 2, 2), "fr");
    expect(fr).toBe("3 éléments changés dans 2 notes\u202F; 2 en contiennent encore, comme vous l’avez choisi.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(copySummary(copy(1, 1, 0), "fr")).toBe("1 élément changé dans 1 note.");
  });

  it("shows each change, and a removed note text in words", () => {
    expect(changeText({ finding: find("name|b"), to: "Kiosk", stillHas: false }, "en")).toBe("Place name, Kiosk 905-555-0102: Kiosk");
    expect(changeText({ finding: find("note|a"), to: "", stillHas: false }, "en")).toBe("Note text, Library: note text removed");
    expect(changeText({ finding: find("source|Walk, jo@example.org"), to: "Walk", stillHas: false }, "en")).toBe("Source name: Walk");
    const fr = changeText({ finding: find("note|a"), to: "", stillHas: false }, "fr");
    expect(fr).toBe("Texte de la note, Library\u00A0: texte de la note retiré");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("file names", () => {
  it("dates the copy and the list, in each language, without accents", () => {
    expect(contactsFilename("copy", TODAY, "en")).toBe("notes-without-contact-details-2026-11-21.json");
    expect(contactsFilename("csv", TODAY, "en")).toBe("where-contact-details-are-2026-11-21.csv");
    expect(contactsFilename("copy", TODAY, "fr")).toBe("notes-sans-coordonnees-2026-11-21.json");
    expect(contactsFilename("csv", TODAY, "fr")).toBe("ou-sont-les-coordonnees-2026-11-21.csv");
    for (const k of ["copy", "csv"] as const) for (const l of ["en", "fr"] as const) expect(contactsFilename(k, TODAY, l)).toMatch(/^[a-z0-9.-]+$/);
  });
});
