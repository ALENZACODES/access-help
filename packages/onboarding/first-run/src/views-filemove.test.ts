// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { FILE_MOVE_COPY as C, moveErrorText, problemText, type StepProblem } from "./filemove-copy";
import { parseNote, type Note } from "./model";
import { applyMove, checkMoves, findPlaces, movedFile, placesOf, type MoveChange } from "./movenote";
import type { Place } from "./places";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import {
  MOVE_TEXT_ID,
  NEW_ADDRESS_ID,
  NEW_ID,
  NEW_NAME_ID,
  SEARCH_ID,
  TARGET_SEARCH_ID,
  noteRadioId,
  placeRadioId,
  problemTarget,
  renderChanges,
  renderCopy,
  renderFileMove,
  renderFind,
  renderNotes,
  renderTarget,
  targetRadioId,
  type FileMoveContext,
} from "./views-filemove";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NOTES: Note[] = [
  testNote("a1", "<b>Café</b>", [{ key: "elevator", value: "yes" }], "12 King St W"),
  parseNote({ ...testNote("a2", "<b>Café</b>", [], "12 King St W"), note: "Ramp <i>at</i> back" }) as Note,
  testNote("k1", "Kiosk", [], null),
  testNote("b1", "Bakery", [], "14 King St W"),
];
const places = (): Place[] => placesOf(NOTES, "en");
const placeOf = (name: string): Place => {
  const p = places().find((x) => x.name === name);
  if (!p) throw new Error("no place");
  return p;
};
const noteOf = (id: string): Note => NOTES.find((n) => n.id === id) as Note;

function moved(): { changes: MoveChange[]; copy: { text: string; check: ReturnType<typeof checkMoves> } } {
  const r = applyMove(NOTES, places(), "k1", { kind: "place", placeId: placeOf("Bakery").id });
  if (!r.ok) throw new Error("move failed");
  const text = movedFile(r.notes, TODAY);
  return { changes: [r.change], copy: { text, check: checkMoves(text, NOTES, [r.change], "en") } };
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileMoveContext> = {}): FileMoveContext => ({
  text: "",
  error: undefined,
  loaded: true,
  query: "",
  found: findPlaces(places(), "", l),
  pickedPlace: undefined,
  place: undefined,
  pickedNote: undefined,
  note: undefined,
  targetQuery: "",
  targets: undefined,
  target: undefined,
  newName: "",
  newAddress: "",
  problems: [],
  changes: [],
  copy: undefined,
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  ...over,
});

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><h2>Tool</h2>${inner}</main>`;
  return document.body;
}

const targetCtx = (l: "en" | "fr" = "en", over: Partial<FileMoveContext> = {}): FileMoveContext => {
  const others = places().filter((p) => p.name !== "<b>Café</b>");
  return ctx(l, { place: placeOf("<b>Café</b>"), note: noteOf("a2"), targets: { places: others, total: others.length }, ...over });
};

describe("renderFind", () => {
  it("lists the places found as choices on 44 pixel labels, with the one picked selected", () => {
    const el = page(renderFind(ctx("en", { pickedPlace: placeOf("Kiosk").id })), "en");
    expect(el.querySelector("#fmv-found")?.textContent).toBe("3 places found.");
    const labels = Array.from(el.querySelectorAll<HTMLLabelElement>("#fmv-place-form label.choice"));
    expect(labels.map((x) => x.textContent)).toEqual(["<b>Café</b>, 12 King St W", "Bakery, 14 King St W", "Kiosk, No address"]);
    for (const label of labels) expect(label.style.minHeight).toBe("44px");
    expect(el.querySelector<HTMLInputElement>(`#${placeRadioId(placeOf("Kiosk").id)}`)?.checked).toBe(true);
    expect(el.querySelector("b")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("ties the no-place problem to the list, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFind(ctx(l, { problems: ["no-place"] })), l);
      expect(el.querySelector("#fmv-place-form fieldset")?.getAttribute("aria-describedby")).toBe("e-fmv-place");
      expect(el.querySelector("#e-fmv-place")?.textContent).toBe(problemText("no-place", l));
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("renderNotes", () => {
  it("lists the notes under the place, each telling what it holds", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderNotes(placeOf("<b>Café</b>"), ctx(l, { pickedNote: "a2" })), l);
      const labels = Array.from(el.querySelectorAll("#fmv-note-form label.choice")).map((x) => x.textContent);
      expect(labels).toHaveLength(2);
      expect(el.querySelector<HTMLInputElement>(`#${noteRadioId("a2")}`)?.checked).toBe(true);
      expect(el.querySelector("i")).toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
    const en = page(renderNotes(placeOf("<b>Café</b>"), ctx()), "en");
    expect(en.querySelector("#fmv-notes")?.textContent).toBe("Notes under “<b>Café</b>, 12 King St W” (2)");
    expect(en.textContent).toContain("Made on 2026-10-01, 0 records. Text: “Ramp <i>at</i> back”.");
    expect(en.querySelector('[data-action="fmv-back-places"]')?.textContent).toBe(C.backToPlaces.en);
  });

  it("ties the no-note problem to the list", () => {
    const el = page(renderNotes(placeOf("Kiosk"), ctx("en", { problems: ["no-note"] })), "en");
    expect(el.querySelector("#fmv-note-form fieldset")?.getAttribute("aria-describedby")).toBe("e-fmv-note");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });
});

describe("renderTarget", () => {
  it("offers the other places and a place not in the file, with its own search", () => {
    const el = page(renderTarget(noteOf("a2"), targetCtx()), "en");
    expect(el.querySelector("#fmv-target")?.textContent).toBe("Move the note made on 2026-10-01, under “<b>Café</b>, 12 King St W”");
    expect(Array.from(el.querySelectorAll("#fmv-move-form label.choice")).map((x) => x.textContent)).toEqual(["Bakery, 14 King St W", "Kiosk, No address", C.newPlace.en]);
    expect(el.querySelector(`#${TARGET_SEARCH_ID}`)).not.toBeNull();
    expect(el.querySelector(`#${NEW_NAME_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${NEW_ID}`);
    expect(el.querySelector('[data-action="fmv-back-notes"]')?.textContent).toBe(C.backToNotes.en);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("keeps what was typed and chosen, and ties each problem to its field, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderTarget(noteOf("a2"), targetCtx(l, { target: "new", newName: "", newAddress: "a\tb", problems: ["name-empty", "address-control"] })), l);
      expect(el.querySelector<HTMLInputElement>(`#${NEW_ID}`)?.checked).toBe(true);
      expect(el.querySelector(`#${NEW_NAME_ID}`)?.getAttribute("aria-invalid")).toBe("true");
      expect(el.querySelector(`#${NEW_ADDRESS_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${NEW_ID} e-${NEW_ADDRESS_ID}`);
      expect(el.querySelector<HTMLInputElement>(`#${NEW_ADDRESS_ID}`)?.value).toBe("a\tb");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("ties a target problem to the list of places", () => {
    const el = page(renderTarget(noteOf("a2"), targetCtx("en", { problems: ["exists"] })), "en");
    expect(el.querySelector("#e-fmv-target")?.textContent).toBe(problemText("exists", "en"));
    expect(el.querySelector("#fmv-move-form fieldset")?.getAttribute("aria-describedby")).toBe("e-fmv-target");
  });
});

describe("problemTarget", () => {
  it("sends each problem to where it is fixed", () => {
    const c = targetCtx();
    const targets: Record<StepProblem, string> = {
      "no-place": placeRadioId(placeOf("<b>Café</b>").id),
      "no-note": noteRadioId(placeOf("<b>Café</b>").notes[0]?.id ?? ""),
      "no-target": targetRadioId(placeOf("Bakery").id),
      "same-place": targetRadioId(placeOf("Bakery").id),
      "name-empty": NEW_NAME_ID,
      "name-long": NEW_NAME_ID,
      "name-control": NEW_NAME_ID,
      "address-long": NEW_ADDRESS_ID,
      "address-control": NEW_ADDRESS_ID,
      exists: TARGET_SEARCH_ID,
    };
    for (const [p, id] of Object.entries(targets)) expect(problemTarget(p as StepProblem, c), p).toBe(id);
    expect(problemTarget("no-place", { found: undefined, place: undefined, targets: undefined })).toBe(SEARCH_ID);
    expect(problemTarget("no-target", { found: undefined, place: undefined, targets: { places: [], total: 0 } })).toBe(NEW_ID);
  });
});

describe("renderChanges and renderCopy", () => {
  it("lists the moves with a button to take back the last one", () => {
    const { changes } = moved();
    const el = page(renderChanges(ctx("en", { changes })), "en");
    expect(el.querySelector("#fmv-changes")?.textContent).toBe("Moves in the copy (1)");
    expect(el.querySelector(".fmv-changes li")?.textContent).toBe("The note made on 2026-10-01 went from “Kiosk, No address” to “Bakery, 14 King St W”");
    expect(el.querySelector('[data-action="fmv-undo"]')?.textContent).toBe("Remove the last move");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
    expect(page(renderChanges(ctx()), "en").querySelector('[data-action="fmv-undo"]')).toBeNull();
  });

  it("offers the copy and the list once the copy read back, and nothing when it did not", () => {
    const { changes, copy } = moved();
    const el = page(renderCopy(copy, ctx("en", { changes })), "en");
    expect(el.querySelector("#fmv-summary")?.textContent).toBe("1 note moved; 4 notes in all, read as 2 places.");
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>("a.linkbtn"));
    expect(links.map((a) => a.getAttribute("download"))).toEqual(["notes-1-move-2026-11-21.json", "list-1-move-2026-11-21.txt"]);
    expect(decodeTextExportHref(links[1]?.getAttribute("href") ?? "")).toContain("1. The note made on 2026-10-01 went from");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
    const bad = page(renderCopy({ ...copy, check: { ok: false, reason: "moved" } }, ctx("fr", { changes })), "fr");
    expect(bad.querySelector("#fmv-check")?.textContent).toBe(C.checkFailed.fr);
    expect(bad.querySelector("a.linkbtn")).toBeNull();
  });
});

describe("renderFileMove", () => {
  it("shows only the file form before a file is read, and links a file error to the box", () => {
    expect(page(renderFileMove(ctx("en", { loaded: false, found: undefined })), "en").querySelector("#fmv-find-form")).toBeNull();
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileMove(ctx(l, { loaded: false, found: undefined, error: "not-json", text: "{" })), l);
      expect(el.querySelector("#fmv-errors a")?.getAttribute("href")).toBe(`#${MOVE_TEXT_ID}`);
      expect(el.querySelector("#fmv-errors a")?.textContent).toBe(moveErrorText("not-json", l));
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("shows one step at a time: places, then notes, then where the note goes", () => {
    const find = page(renderFileMove(ctx()), "en");
    expect([find.querySelector("#fmv-find-form"), find.querySelector("#fmv-note-form"), find.querySelector("#fmv-move-form")].map((x) => x !== null)).toEqual([true, false, false]);
    const notes = page(renderFileMove(ctx("en", { place: placeOf("Kiosk") })), "en");
    expect([notes.querySelector("#fmv-find-form"), notes.querySelector("#fmv-note-form"), notes.querySelector("#fmv-move-form")].map((x) => x !== null)).toEqual([false, true, false]);
    const target = page(renderFileMove(targetCtx()), "en");
    expect([target.querySelector("#fmv-find-form"), target.querySelector("#fmv-note-form"), target.querySelector("#fmv-move-form")].map((x) => x !== null)).toEqual([false, false, true]);
    expect(auditDom(target, { locale: "en" })).toEqual([]);
  });

  it("shows the moves and the copy, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const { changes, copy } = moved();
      const el = page(renderFileMove(ctx(l, { changes, copy, statusMessage: C.saved[l] })), l);
      expect(el.querySelector("#fmv-status")?.textContent).toBe(C.saved[l]);
      expect(el.querySelector("#fmv-copy")).not.toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});
