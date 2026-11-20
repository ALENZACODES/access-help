// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CSV_FILE_ERRORS, CSV_IMPORT_COPY } from "./csvimport";
import { loadNotes } from "./outbox";
import { CSV_COLUMNS, notesToCsv } from "./notes-csv";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const HEAD = CSV_COLUMNS.join(",");
const GOOD = [HEAD, ",Arena,5 Park Rd,elevator,yes,City survey,CC0-1.0,2026-10-01,2026-10-02", ",Arena,5 Park Rd,automatic-door,no,City survey,CC0-1.0,2026-10-01,2026-10-02", ",,,elevator,yes,City survey,CC0-1.0,2026-10-01,"].join("\r\n");
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([testNote("a", "Library", [{ key: "elevator", value: "yes" }])]);
});

afterEach(() => h.destroy());

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = h.root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

const said = async (): Promise<string> => {
  await Promise.resolve();
  return h.status();
};

function open(locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "csvimport"));
}

function paste(text: string): void {
  $<HTMLTextAreaElement>("#csv-text").value = text;
}

describe("bringing notes in from a spreadsheet", () => {
  it("opens from My notes with the columns, licences and an empty template", () => {
    open();
    expect(h.heading()).toBe(CSV_IMPORT_COPY.title.en);
    expect(Array.from(h.root.querySelectorAll('[aria-labelledby="csv-columns-title"] code')).map((c) => c.textContent)).toEqual([...CSV_COLUMNS]);
    const tpl = $<HTMLAnchorElement>("[data-csv-template]");
    expect(decodeURIComponent((tpl.getAttribute("href") ?? "").split(",").slice(1).join(","))).toBe(`\uFEFF${HEAD}\r\n`);
  });

  it("shows what would be added, with the rows not used and why, and focuses the summary", async () => {
    open();
    paste(GOOD);
    h.click(act("csv-preview"));
    expect(document.activeElement?.id).toBe("csv-preview");
    expect(Array.from(h.root.querySelectorAll("#csv-preview > ul li")).map((li) => li.textContent)).toEqual(["Rows read: 3.", "Notes to add: 1.", "1 row not used."]);
    expect(Array.from(h.root.querySelectorAll("#csv-preview tbody td")).map((td) => td.textContent)).toEqual(["4", "place_name", "The place name is empty."]);
    expect(await said()).toBe("What would be added. 1");
    expect(h.root.querySelector("[data-csv-fix]")).not.toBeNull();
  });

  it("adds the notes, says so, and goes back to My notes", async () => {
    open();
    paste(GOOD);
    h.click(act("csv-preview"));
    h.click(act("csv-add"));
    expect(await said()).toBe("1 note was added from the spreadsheet.");
    const notes = loadNotes(h.store).notes;
    expect(notes.map((n) => n.placeName)).toEqual(["Library", "Arena"]);
    expect(notes[1]?.facts.find((f) => f.key === "automatic-door")).toMatchObject({ value: "no", provenance: { source: "City survey", licence: "CC0-1.0", recordedOn: "2026-10-01" } });
    expect(h.root.querySelector("#csv-text")).toBeNull();
  });

  it("offers to take the added notes back right away, and only then", async () => {
    open();
    paste(`${GOOD}\r\n,Pool,,elevator,no,City survey,CC0-1.0,2026-10-01,`);
    h.click(act("csv-preview"));
    h.click(act("csv-add"));
    expect(h.root.querySelector(act("csv-undo"))?.textContent).toBe("Take back the 2 notes just added");
    h.click(act("csv-undo"));
    expect(await said()).toBe("The 2 notes from the spreadsheet were taken back.");
    expect(loadNotes(h.store).notes.map((n) => n.placeName)).toEqual(["Library"]);
    expect(h.root.querySelector(act("csv-undo"))).toBeNull();
  });

  it("stops offering to take them back once the person moves on", () => {
    open();
    paste(GOOD);
    h.click(act("csv-preview"));
    h.click(act("csv-add"));
    expect(h.root.querySelector(act("csv-undo"))?.textContent).toBe("Take back the note just added");
    h.click(act("view", "places"));
    h.click(act("view", "notes"));
    expect(h.root.querySelector(act("csv-undo"))).toBeNull();
    expect(loadNotes(h.store).notes).toHaveLength(2);
  });

  it("looks again instead of adding when the rows changed after the preview", async () => {
    open();
    paste(GOOD);
    h.click(act("csv-preview"));
    paste(`${GOOD}\r\n,Pool,,elevator,no,City survey,CC0-1.0,2026-10-01,`);
    h.click(act("csv-add"));
    expect(loadNotes(h.store).notes).toHaveLength(1);
    expect($("#csv-message").textContent).toBe(CSV_IMPORT_COPY.changed.en);
    expect(h.root.querySelector(act("csv-add"))?.textContent).toBe("Add 2 notes");
    expect(await said()).toContain(CSV_IMPORT_COPY.changed.en);
  });

  it("lists each note with its details, lets one be left out, and adds only the ones chosen", async () => {
    open();
    paste(`${GOOD}\r\n,Library,1 Main St,automatic-door,yes,Site visit,CC0-1.0,2026-10-05,`);
    h.click(act("csv-preview"));
    const items = Array.from(h.root.querySelectorAll(".csv-notes li"));
    expect(items.map((li) => li.textContent)).toEqual([
      "Arena, 5 Park Rd Automatic door: No; Elevator: Yes",
      "Library, 1 Main St Automatic door: Yes Your notes already have this place; this adds another note about it.",
    ]);
    const boxes = h.root.querySelectorAll<HTMLInputElement>('[data-action="csv-choose"]');
    expect(boxes[1]?.getAttribute("aria-describedby")).toBe("csv-note-1-same");
    const arena = boxes[0]?.getAttribute("data-value") ?? "";
    h.click(`[data-action="csv-choose"][data-value="${arena}"]`);
    expect(document.activeElement?.getAttribute("data-value")).toBe(arena);
    expect(h.root.querySelector(act("csv-add"))?.textContent).toBe("Add 1 note");
    h.click(`[data-action="csv-choose"][data-value="${boxes[1]?.getAttribute("data-value") ?? ""}"]`);
    expect(h.root.querySelector(act("csv-add"))).toBeNull();
    expect(h.text()).toContain(CSV_IMPORT_COPY.noneChosen.en);
    h.click(`[data-action="csv-choose"][data-value="${arena}"]`);
    h.click(act("csv-add"));
    expect(await said()).toBe("1 note was added from the spreadsheet.");
    expect(loadNotes(h.store).notes.map((n) => n.placeName)).toEqual(["Library", "Arena"]);
  });

  it("takes cells pasted from a spreadsheet, and says where they disagree with the notes here", () => {
    open();
    paste("Place\tAddress\tElevator\tSource\tLicence\tDate\nLibrary\t1 Main St\tNo\tSite visit\tCC0-1.0\t2026-11-01");
    h.click(act("csv-preview"));
    expect($(".csv-notes .hint[id]").textContent).toBe(" Your notes already have this place; this adds another note about it. Elevator: this file says No; your notes say Yes.");
  });

  it("says what is wrong with the whole file, and focuses that message", () => {
    open();
    paste("name,value\nLibrary,yes");
    h.click(act("csv-preview"));
    expect(document.activeElement?.id).toBe("csv-message");
    expect(h.text()).toContain(CSV_FILE_ERRORS["missing-columns"].en);
    expect(h.root.querySelector("#csv-preview")).toBeNull();
  });

  it("offers no add button when nothing would be added, and closes without adding", async () => {
    open();
    paste(notesToCsv(loadNotes(h.store).notes));
    h.click(act("csv-preview"));
    expect(h.root.querySelector(act("csv-add"))).toBeNull();
    expect(h.text()).toContain("1 note already on this device, left as it is.");
    h.click(act("csv-cancel"));
    expect(await said()).toBe(CSV_IMPORT_COPY.closed.en);
    expect(document.activeElement?.id).toBe("csv-text");
    expect(h.root.querySelector("#csv-preview")).toBeNull();
  });

  it("reads a chosen file into the box", async () => {
    open();
    const input = $<HTMLInputElement>("#csv-file");
    const file = new File([GOOD], "places.csv", { type: "text/csv" });
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(await said()).toBe(CSV_IMPORT_COPY.fileRead.en);
    expect(document.activeElement?.id).toBe("csv-file");
    // A text box gives its value back with plain line ends; the reader takes either.
    expect($<HTMLTextAreaElement>("#csv-text").value).toBe(GOOD.replace(/\r\n/g, "\n"));
    h.click(act("csv-preview"));
    expect(h.root.querySelector(act("csv-add"))?.textContent).toBe("Add 1 note");

  });

  it("says when a file cannot be read", async () => {
    open();
    const input = $<HTMLInputElement>("#csv-file");
    const broken = { size: 10, text: () => Promise.reject(new Error("no")) };
    Object.defineProperty(input, "files", { value: [broken] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(await said()).toBe(CSV_IMPORT_COPY.fileFailed.en);
  });

  it("in French, reads a file saved with semicolons and offers to take the notes back, with the App's audit clean", async () => {
    open("fr");
    paste(["lieu;adresse;détail;valeur;source;licence;date", "Aréna;5, ch. du Parc;ascenseur;oui;Relevé municipal;CC0-1.0;2026-10-01"].join("\r\n"));
    h.click(act("csv-preview"));
    expect(Array.from(h.root.querySelectorAll("#csv-preview > ul li")).map((li) => li.textContent)).toEqual(["Lignes lues\u00A0: 1.", "Notes à ajouter\u00A0: 1."]);
    expect($(".csv-notes li").textContent).toBe("Aréna, 5, ch. du Parc Ascenseur\u00A0: Oui");
    h.click(act("csv-add"));
    expect(await said()).toBe("1 note a été ajoutée depuis le tableur.");
    expect(h.root.querySelector(act("csv-undo"))?.textContent).toBe("Retirer la note qui vient d’être ajoutée");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(h.auditLines()).toEqual([]);
    h.click(act("csv-undo"));
    expect(await said()).toBe("La note du tableur a été retirée.");
    expect(loadNotes(h.store).notes.map((n) => n.placeName)).toEqual(["Library"]);
  });

  it("has its own address", () => {
    window.location.hash = "#/notes/import-csv";
    h.mount("fr", true);
    expect(h.heading()).toBe(CSV_IMPORT_COPY.title.fr);
  });

  it.each(["en", "fr"] as const)("the page, a file problem and a preview pass axe and the App's audit (%s)", async (l) => {
    open(l);
    for (const step of [
      () => undefined,
      () => {
        paste('place_name,detail,value\n"x');
        h.click(act("csv-preview"));
      },
      () => {
        paste(GOOD);
        h.click(act("csv-preview"));
      },
    ]) {
      step();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      expect(h.auditLines()).toEqual([]);
    }
  });
});
