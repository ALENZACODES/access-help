// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, DRAFT_KEY, ITEMS, loadNotes, type Note } from "./index";
import { BIN_COPY, BIN_KEY, loadBin } from "./bin";
import { CORRECTIONS_KEY, EDIT_COPY, loadCorrections } from "./noteedit";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote, type TestRecord } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const mine = (id: string, name: string, records: TestRecord[]): Note => testNote(id, name, records.map((r) => ({ source: CONTRIBUTOR_SOURCE, on: "2026-11-10", ...r })));

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([
    mine("own", "Library", [{ key: "elevator", value: "yes" }]),
    testNote("city", "Arena", [{ key: "elevator", value: "no" }], "2 Main St"),
  ]);
});

afterEach(() => {
  h.destroy();
});

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = h.root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

const said = async (): Promise<string> => {
  await Promise.resolve();
  return h.status();
};

function notes(locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "notes"));
}

function setRadio(name: string, value: string): void {
  $<HTMLInputElement>(`input[name="${name}"][value="${value}"]`).checked = true;
}

describe("correcting a note", () => {
  it("offers to correct only the person's own notes, and says why not for the rest", () => {
    notes();
    expect(h.root.querySelector(act("edit-note", "own"))).not.toBeNull();
    expect(h.root.querySelector(act("edit-note", "city"))).toBeNull();
    const arena = $(act("remove-note", "city")).closest("article");
    expect(arena?.querySelector("[data-not-own]")?.textContent).toBe(EDIT_COPY.notOwn.en);
  });

  it("opens the form with the note's values, under its own title and button", () => {
    notes();
    h.click(act("edit-note", "own"));
    expect(h.heading()).toBe(EDIT_COPY.title.en);
    expect($<HTMLInputElement>("#f-placeName").value).toBe("Library");
    expect($<HTMLInputElement>("#f-observedOn").value).toBe("2026-11-10");
    expect($<HTMLSelectElement>("#f-licence").value).toBe("CC0-1.0");
    expect($<HTMLInputElement>('input[name="detail-elevator"][value="yes"]').checked).toBe(true);
    expect($('[data-action="submit-form"]').textContent).toBe(EDIT_COPY.submit.en);
    // A correction is not a new note: no survey or page-reader shortcuts here.
    expect(h.root.querySelector(act("survey-open"))).toBeNull();
  });

  it("saves the correction in place, keeps the id and first day, and shows what changed", async () => {
    notes();
    h.click(act("edit-note", "own"));
    setRadio("detail-elevator", "no");
    setRadio("detail-automatic-door", "yes");
    $<HTMLInputElement>("#f-address").value = "1 Main Street";
    h.click(act("submit-form"));
    expect(await said()).toBe(EDIT_COPY.corrected.en);
    expect(h.heading()).toBe("My notes");
    const own = loadNotes(h.store).notes.find((n) => n.id === "own");
    expect(own?.createdOn).toBe("2026-10-01");
    expect(own?.address).toBe("1 Main Street");
    expect(own?.facts.find((f) => f.key === "elevator")?.value).toBe("no");
    expect(loadNotes(h.store).notes).toHaveLength(2);
    expect(loadCorrections(h.store)).toEqual([
      {
        noteId: "own",
        on: "2026-11-19",
        parts: ["address", "automatic-door", "elevator"],
        changes: [
          { part: "address", from: "1 Main St", to: "1 Main Street" },
          { part: "automatic-door", from: "unknown", to: "yes" },
          { part: "elevator", from: "yes", to: "no" },
        ],
      },
    ]);
    const history = Array.from(h.root.querySelectorAll("[data-note-history] li li")).map((li) => li.textContent);
    expect(history).toEqual(["address: “1 Main St” → “1 Main Street”", "Automatic door: Unknown → Yes", "Elevator: Yes → No"]);
    expect($('[data-corrected="2026-11-19"]').textContent).toBe("Corrected on 2026-11-19: address, Automatic door, Elevator");
  });

  it("says when nothing changed, and logs nothing", async () => {
    notes();
    h.click(act("edit-note", "own"));
    h.click(act("submit-form"));
    expect(await said()).toBe(EDIT_COPY.unchanged.en);
    expect(h.store.getItem(CORRECTIONS_KEY)).toBeNull();
  });

  it("uses the form's rules: a missing licence stops the correction", () => {
    notes();
    h.click(act("edit-note", "own"));
    $<HTMLSelectElement>("#f-licence").value = "";
    h.click(act("submit-form"));
    expect(document.activeElement?.id).toBe("error-summary");
    expect(loadNotes(h.store).notes.find((n) => n.id === "own")?.licence).toBe("CC0-1.0");
  });

  it("leaves the unfinished new-note draft alone", () => {
    notes();
    h.click(act("add-note"));
    const name = $<HTMLInputElement>("#f-placeName");
    name.value = "Half-typed place";
    name.dispatchEvent(new Event("input", { bubbles: true }));
    h.click(act("cancel-form"));
    h.click(act("edit-note", "own"));
    const edit = $<HTMLInputElement>("#f-placeName");
    edit.value = "Library (main)";
    edit.dispatchEvent(new Event("input", { bubbles: true }));
    h.click(act("cancel-form"));
    expect(JSON.parse(h.store.getItem(DRAFT_KEY) ?? "{}").placeName).toBe("Half-typed place");
    // And "Add a note" opens the plain form again, with the draft.
    h.click(act("add-note"));
    expect(h.heading()).toBe("Add a note");
    expect($<HTMLInputElement>("#f-placeName").value).toBe("Half-typed place");
  });
});

describe("recently removed", () => {
  it("moves a removed note there, says so, and counts it on My notes", async () => {
    notes();
    h.click(act("remove-note", "own"));
    h.click(act("confirm-remove", "own"));
    expect(await said()).toBe(BIN_COPY.moved.en);
    expect(loadBin(h.store, TODAY).map((e) => [e.note.id, e.removedOn])).toEqual([["own", "2026-11-19"]]);
    expect($(act("view", "removed")).textContent).toBe("Recently removed (1)");
    expect(loadNotes(h.store).notes.map((n) => n.id)).toEqual(["city"]);
  });

  it("puts a note back unchanged, with its correction still shown", async () => {
    notes();
    h.click(act("edit-note", "own"));
    setRadio("detail-elevator", "no");
    h.click(act("submit-form"));
    h.click(act("remove-note", "own"));
    h.click(act("confirm-remove", "own"));
    h.click(act("view", "removed"));
    h.click(act("bin-restore", "own"));
    expect(await said()).toBe("The note was put back: Library");
    expect(h.store.getItem(BIN_KEY)).toBeNull();
    h.click(act("view", "notes"));
    expect($('[data-corrected]').textContent).toBe("Corrected on 2026-11-19: Elevator");
    expect(loadNotes(h.store).notes[0]?.id).toBe("own");
  });

  it("asks before removing for good, can keep it, then removes it and its corrections", async () => {
    notes();
    h.click(act("edit-note", "own"));
    setRadio("detail-elevator", "no");
    h.click(act("submit-form"));
    h.click(act("remove-note", "own"));
    h.click(act("confirm-remove", "own"));
    h.click(act("view", "removed"));
    h.click(act("bin-delete", "own"));
    expect(document.activeElement?.getAttribute("data-action")).toBe("bin-delete-confirm");
    h.click(act("bin-delete-cancel", "own"));
    expect(document.activeElement?.getAttribute("data-action")).toBe("bin-delete");
    expect(await said()).toBe(BIN_COPY.kept.en);
    h.click(act("bin-delete", "own"));
    h.click(act("bin-delete-confirm", "own"));
    expect(await said()).toBe("The note was removed for good: Library");
    expect(h.store.getItem(BIN_KEY)).toBeNull();
    expect(h.store.getItem(CORRECTIONS_KEY)).toBeNull();
    expect(h.text()).toContain(BIN_COPY.none.en);
  });

  it("empties everything after asking", async () => {
    notes();
    for (const id of ["own", "city"]) {
      h.click(act("remove-note", id));
      h.click(act("confirm-remove", id));
    }
    h.click(act("view", "removed"));
    h.click(act("bin-empty"));
    h.click(act("bin-empty-cancel"));
    expect(loadBin(h.store, TODAY)).toHaveLength(2);
    h.click(act("bin-empty"));
    h.click(act("bin-empty-confirm"));
    expect(await said()).toBe(BIN_COPY.emptied.en);
    expect(h.store.getItem(BIN_KEY)).toBeNull();
  });

  it("will not put a note back when the notes are full", async () => {
    notes();
    h.click(act("remove-note", "own"));
    h.click(act("confirm-remove", "own"));
    h.destroy();
    h = createHarness(TODAY);
    const bin = { note: mine("own", "Library", [{ key: "elevator", value: "yes" }]), removedOn: "2026-11-19" };
    h.store.setItem(BIN_KEY, JSON.stringify([bin]));
    h.seed(Array.from({ length: 200 }, (_, i) => testNote(`f${i}`, `F${i}`, [{ key: "elevator", value: "yes" }])));
    window.location.hash = "#/notes/removed";
    h.mount("en", true);
    h.click(act("bin-restore", "own"));
    expect(await said()).toBe(BIN_COPY.full.en);
    expect(loadBin(h.store, TODAY)).toHaveLength(1);
  });

  it("shows both on the device page, where they can be cleared", () => {
    notes();
    h.click(act("edit-note", "own"));
    setRadio("detail-elevator", "no");
    h.click(act("submit-form"));
    h.click(act("remove-note", "city"));
    h.click(act("confirm-remove", "city"));
    h.click(act("view", "help"));
    h.click(act("open-device"));
    expect($("#item-bin").textContent).toBe(BIN_COPY.deviceTitle.en);
    expect($("#state-bin").textContent).toMatch(/^Saved\. 1 entry/);
    expect($("#item-corrections").textContent).toBe(EDIT_COPY.deviceTitle.en);
    expect(ITEMS.map((i) => i.id)).toContain("corrections");
    h.click(act("device-clear", "bin"));
    h.click(act("device-confirm", "bin"));
    expect(h.store.getItem(BIN_KEY)).toBeNull();
  });
});

describe("the 30 days, through the App", () => {
  it("shows a note on its 30th day and never one past it, by the page's own address", () => {
    h.destroy();
    h = createHarness(TODAY);
    const keep = { note: mine("keep", "Kiosk", [{ key: "elevator", value: "yes" }]), removedOn: "2026-10-21" };
    const old = { note: mine("old", "Old Hall", [{ key: "elevator", value: "yes" }]), removedOn: "2026-10-20" };
    h.store.setItem(BIN_KEY, JSON.stringify([keep, old]));
    window.location.hash = "#/notes/removed";
    h.mount("en", true);
    expect(h.heading()).toBe(BIN_COPY.title.en);
    expect(Array.from(h.root.querySelectorAll("[data-bin]")).map((e) => e.getAttribute("data-bin"))).toEqual(["keep"]);
    expect($('[data-bin="keep"] [data-bin-left]').textContent).toBe("Removed on 2026-10-21 · 1 day left");
    // The next change writes the list back without the expired note.
    h.click(act("bin-delete", "keep"));
    h.click(act("bin-delete-cancel", "keep"));
    h.click(act("bin-restore", "keep"));
    expect(h.store.getItem(BIN_KEY)).toBeNull();
    expect(loadNotes(h.store).notes.map((n) => n.id)).toEqual(["keep"]);
  });
});

describe("undo right after removing", () => {
  it("offers Undo with focus on it, and puts the note back", async () => {
    notes();
    h.click(act("remove-note", "own"));
    h.click(act("confirm-remove", "own"));
    const undo = $(act("bin-restore", "own"));
    expect(undo.textContent).toBe(BIN_COPY.undo.en);
    expect(document.activeElement).toBe(undo);
    h.click(act("bin-restore", "own"));
    expect(await said()).toBe("The note was put back: Library");
    expect(loadNotes(h.store).notes.map((n) => n.id)).toEqual(["own", "city"]);
    expect(h.root.querySelector(act("bin-restore", "own"))).toBeNull();
    expect(h.store.getItem(BIN_KEY)).toBeNull();
  });

  it("goes away as soon as the person does something else; the note stays in Recently removed", () => {
    notes();
    h.click(act("remove-note", "own"));
    h.click(act("confirm-remove", "own"));
    h.click(act("export-open"));
    expect(h.root.querySelector(act("bin-restore", "own"))).toBeNull();
    expect(loadBin(h.store, TODAY).map((e) => e.note.id)).toEqual(["own"]);
  });

  it("is offered in French with French typography", () => {
    notes("fr");
    h.click(act("remove-note", "city"));
    h.click(act("confirm-remove", "city"));
    expect($(act("bin-restore", "city")).textContent).toBe("Annuler\u00A0: remettre la note");
    expect(h.auditLines()).toEqual([]);
  });
});

describe("accessibility", () => {
  it.each(["en", "fr"] as const)("the correction form, the notes and Recently removed pass axe and the App's audit (%s)", async (l) => {
    notes(l);
    for (const step of [
      () => h.click(act("edit-note", "own")),
      () => {
        setRadio("detail-elevator", "no");
        h.click(act("submit-form"));
      },
      () => {
        h.click(act("remove-note", "city"));
        h.click(act("confirm-remove", "city"));
      },
      () => h.click(act("view", "removed")),
      () => h.click(act("bin-delete", "city")),
    ]) {
      step();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }
    expect(h.auditLines()).toEqual([]);
  });
});
