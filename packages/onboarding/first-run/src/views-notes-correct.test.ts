// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, auditDom, type Locale, type Note } from "./index";
import { BIN_COPY } from "./bin";
import { CSV_COPY } from "./notes-csv";
import { EDIT_COPY, logCorrection, type Correction } from "./noteedit";
import { renderNotes, type NotesContext } from "./views-notes";
import { AXE_OPTIONS } from "./shelltest";
import { testNote, type TestRecord } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const mine = (id: string, name: string, records: TestRecord[]): Note => testNote(id, name, records.map((r) => ({ source: CONTRIBUTOR_SOURCE, ...r })));

const NOTES = (): Note[] => [
  mine("own", "Library", [{ key: "elevator", value: "no" }]),
  testNote("city", "Arena", [{ key: "elevator", value: "yes" }], "2 Main St"),
  mine("mixed", "Pool", [{ key: "elevator", value: "yes", on: "2026-01-01" }, { key: "automatic-door", value: "no", on: "2026-02-01" }]),
];

const LOG = (): Correction[] =>
  logCorrection(
    logCorrection([], "own", [{ part: "elevator", from: "unknown", to: "yes" }], new Date(Date.UTC(2026, 10, 1))),
    "own",
    [{ part: "elevator", from: "yes", to: "no" }],
    TODAY,
  );

function ctx(more: Partial<NotesContext> = {}): NotesContext {
  return {
    notes: NOTES(),
    req: {},
    query: "",
    locale: "en",
    today: TODAY,
    pendingRemove: undefined,
    exportText: undefined,
    importText: "",
    importMessage: undefined,
    statusMessage: undefined,
    hasSavedNeeds: false,
    corrections: LOG(),
    binCount: 2,
    ...more,
  };
}

function mount(html: string, l: Locale): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1>${html}</main></div>`;
  return document.getElementById("r") as HTMLElement;
}

const card = (root: HTMLElement, id: string): Element | null | undefined => root.querySelector(`[data-action="remove-note"][data-value="${id}"]`)?.closest("article");

describe("notes with corrections, removals and the spreadsheet", () => {
  it.each(["en", "fr"] as const)("pass axe and the App's audit (%s)", async (l) => {
    const root = mount(renderNotes(ctx({ locale: l, undoId: "gone", statusMessage: BIN_COPY.moved[l] })), l);
    expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it("offers Correct only on the person's own note, and says why on the others", () => {
    const root = mount(renderNotes(ctx()), "en");
    expect(card(root, "own")?.querySelector('[data-action="edit-note"]')).not.toBeNull();
    expect(card(root, "city")?.querySelector('[data-action="edit-note"]')).toBeNull();
    expect(card(root, "city")?.querySelector("[data-not-own]")?.textContent).toBe(EDIT_COPY.notOwn.en);
    expect(card(root, "mixed")?.querySelector('[data-action="edit-note"]')).toBeNull();
    expect(card(root, "mixed")?.querySelector("[data-mixed]")?.textContent).toBe(EDIT_COPY.mixed.en);
  });

  it("shows the last correction and every change, newest first", () => {
    const root = mount(renderNotes(ctx({ locale: "fr" })), "fr");
    const own = card(root, "own");
    expect(own?.querySelector("[data-corrected]")?.textContent).toBe("Corrigée le 2026-11-19\u00A0: Ascenseur");
    expect(own?.querySelector("[data-note-history] summary")?.textContent).toBe(`${EDIT_COPY.history.fr} (2)`);
    expect(Array.from(own?.querySelectorAll("[data-note-history] > ul > li") ?? []).map((li) => li.textContent)).toEqual([
      "2026-11-19Ascenseur\u00A0: Oui → Non",
      "2026-11-01Ascenseur\u00A0: UNKNOWN → Oui",
    ]);
    expect(card(root, "city")?.querySelector("[data-note-history]")).toBeNull();
  });

  it("counts Recently removed and offers Undo only when asked to", () => {
    const plain = mount(renderNotes(ctx()), "en");
    expect(plain.querySelector('[data-action="view"][data-value="removed"]')?.textContent).toBe("Recently removed (2)");
    expect(plain.querySelector('[data-action="bin-restore"]')).toBeNull();
    const undo = mount(renderNotes(ctx({ undoId: "gone" })), "en");
    expect(undo.querySelector('[data-action="bin-restore"][data-value="gone"]')?.textContent).toBe(BIN_COPY.undo.en);
  });

  it("offers the spreadsheet with its hint, and not without notes", () => {
    const root = mount(renderNotes(ctx()), "en");
    const link = root.querySelector("[data-notes-csv]");
    expect(link?.textContent).toBe(CSV_COPY.download.en);
    expect(root.querySelector(`#${link?.getAttribute("aria-describedby") ?? "x"}`)?.textContent).toBe(CSV_COPY.hint.en);
    expect(mount(renderNotes(ctx({ notes: [] })), "en").querySelector("[data-notes-csv]")).toBeNull();
  });
});
