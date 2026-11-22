// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { FILE_RENAME_COPY as C, problemText, renameErrorText, type EditProblem } from "./filerename-copy";
import type { Note } from "./model";
import type { Place } from "./places";
import { applyRename, checkCopy, placesOf, renamedFile, searchPlaces, type RenameChange } from "./renameplace";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import {
  ADDRESS_ID,
  mixedId,
  JOIN_ID,
  NAME_ID,
  RENAME_TEXT_ID,
  SEARCH_ID,
  pickId,
  problemTarget,
  renderChanges,
  renderCopy,
  renderEdit,
  renderFileRename,
  renderFind,
  renderMixed,
  type FileRenameContext,
} from "./views-filerename";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NOTES: Note[] = [
  testNote("a1", "<b>Café</b>", [{ key: "elevator", value: "yes" }], "12 King St W"),
  testNote("a2", "<b>Café</b>", [], "12 King St W"),
  testNote("k", "Kiosk", [], null),
  testNote("b", "Bakery", [], "14 King St W"),
];
const places = (): Place[] => placesOf(NOTES, "en");
const placeOf = (name: string): Place => {
  const p = places().find((x) => x.name === name);
  if (!p) throw new Error("no place");
  return p;
};

function renamed(): { changes: RenameChange[]; copy: { text: string; check: ReturnType<typeof checkCopy> } } {
  const r = applyRename(NOTES, places(), placeOf("Kiosk"), { name: "Kiosk", address: "Union Station" });
  if (!r.ok) throw new Error("rename failed");
  const text = renamedFile(r.notes, TODAY);
  return { changes: [r.change], copy: { text, check: checkCopy(text, NOTES, [r.change], "en") } };
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileRenameContext> = {}): FileRenameContext => ({
  text: "",
  error: undefined,
  loaded: true,
  query: "",
  found: searchPlaces(places(), "", l),
  places: places(),
  picked: undefined,
  editing: undefined,
  to: { name: "", address: "" },
  joins: undefined,
  allowJoin: false,
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

describe("renderFind", () => {
  it("lists each place found as a choice on a 44 pixel label, with the one picked selected", () => {
    const el = page(renderFind(ctx("en", { picked: placeOf("Kiosk").id })), "en");
    expect(el.querySelector("#frn-found")?.textContent).toBe("3 places found.");
    const labels = Array.from(el.querySelectorAll<HTMLLabelElement>("label.choice"));
    expect(labels.map((x) => x.textContent)).toEqual(["<b>Café</b>, 12 King St W", "Bakery, 14 King St W", "Kiosk, No address"]);
    for (const label of labels) {
      expect(label.style.minHeight).toBe("44px");
      expect(label.querySelector("input")?.getAttribute("type")).toBe("radio");
    }
    expect(el.querySelector<HTMLInputElement>(`#${pickId(placeOf("Kiosk").id)}`)?.checked).toBe(true);
    expect(el.querySelector("b")).toBeNull();
    expect(el.querySelector('[data-action="frn-choose"]')?.textContent).toBe(C.choose.en);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("ties the no-choice problem to the list, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFind(ctx(l, { problems: ["no-choice"] })), l);
      expect(el.querySelector("#frn-pick-form fieldset")?.getAttribute("aria-describedby")).toBe("e-frn-pick");
      expect(el.querySelector("#e-frn-pick")?.textContent).toBe(problemText("no-choice", l));
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("shows no list when nothing matches", () => {
    const el = page(renderFind(ctx("en", { query: "pizza", found: searchPlaces(places(), "pizza", "en") })), "en");
    expect(el.querySelector("#frn-found")?.textContent).toBe(C.noneFound.en);
    expect(el.querySelector("#frn-pick-form")).toBeNull();
    expect(el.querySelector<HTMLInputElement>(`#${SEARCH_ID}`)?.value).toBe("pizza");
  });
});

describe("renderMixed", () => {
  const mixed = (): Place[] => placesOf([...NOTES, testNote("a3", "<B>Cafe</B>", [], "12 King St. W.")], "en");

  it("lists each place written more than one way with its spellings and a button that names it", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderMixed(mixed(), l), l);
      const cafe = mixed().find((p) => p.notes.length === 3);
      if (!cafe) throw new Error("no place");
      expect(el.querySelector("#frn-mixed")?.textContent).toBe(l === "en" ? "Places written more than one way (1)" : "Lieux écrits de plusieurs façons (1)");
      expect(el.querySelector(".frn-mixed li span")?.textContent).toContain("<b>Café</b>, 12 King St W");
      const b = el.querySelector(`#${mixedId(cafe.id)}`);
      expect(b?.textContent).toBe(l === "en" ? `Rename ${cafe.name}` : `Renommer ${cafe.name}`);
      expect(b?.getAttribute("data-id")).toBe(cafe.id);
      expect(el.querySelector("b")).toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("shows nothing when every place is written one way", () => {
    expect(renderMixed(places(), "en")).toBe("");
  });

  it("shows under the search, but not while a place is being renamed", () => {
    expect(page(renderFileRename(ctx("en", { places: mixed() })), "en").querySelector("#frn-mixed")).not.toBeNull();
    expect(page(renderFileRename(ctx("en", { places: mixed(), editing: placeOf("Kiosk") })), "en").querySelector("#frn-mixed")).toBeNull();
  });
});

describe("renderEdit", () => {
  it("names the place, counts its notes and fills in its name and address", () => {
    const p = placeOf("<b>Café</b>");
    const el = page(renderEdit(p, ctx("en", { to: { name: p.name, address: "12 King St W" } })), "en");
    expect(el.querySelector("#frn-edit")?.textContent).toBe("Rename “<b>Café</b>, 12 King St W”");
    expect(el.textContent).toContain("The change goes in 2 notes.");
    expect(el.querySelector<HTMLInputElement>(`#${NAME_ID}`)?.value).toBe("<b>Café</b>");
    expect(el.querySelector<HTMLInputElement>(`#${ADDRESS_ID}`)?.value).toBe("12 King St W");
    expect(el.querySelector(`#${JOIN_ID}`)).toBeNull();
    expect(el.querySelector('[data-action="frn-back"]')?.textContent).toBe(C.back.en);
    expect(el.querySelector("b")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("ties each problem to its field", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderEdit(placeOf("Kiosk"), ctx(l, { to: { name: "", address: "1\n2" }, problems: ["name-empty", "address-control"] })), l);
      expect(el.querySelector(`#${NAME_ID}`)?.getAttribute("aria-invalid")).toBe("true");
      expect(el.querySelector(`#${NAME_ID}`)?.getAttribute("aria-describedby")).toBe(`h-frn-edit e-${NAME_ID}`);
      expect(el.querySelector(`#e-${ADDRESS_ID}`)?.textContent).toBe(problemText("address-control", l));
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("says which place it would be read as one with, and asks with a box", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderEdit(placeOf("Kiosk"), ctx(l, { to: { name: "Bakery", address: "14 King St W" }, joins: { name: "Bakery", address: "14 King St W" }, problems: ["joins"] })), l);
      expect(el.querySelector("#frn-joins")?.textContent).toContain("Bakery, 14 King St W");
      const box = el.querySelector<HTMLInputElement>(`#${JOIN_ID}`);
      expect(box?.checked).toBe(false);
      expect(box?.getAttribute("aria-describedby")).toBe(`frn-joins e-${JOIN_ID}`);
      expect(box?.closest("label")?.style.minHeight).toBe("44px");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("problemTarget", () => {
  it("sends each problem to where it is fixed", () => {
    const targets = (["no-choice", "name-empty", "name-long", "name-control", "address-long", "address-control", "unchanged", "joins"] as EditProblem[]).map((p) => problemTarget(p, ctx()));
    expect(targets).toEqual([pickId(placeOf("<b>Café</b>").id), NAME_ID, NAME_ID, NAME_ID, ADDRESS_ID, ADDRESS_ID, NAME_ID, JOIN_ID]);
    expect(problemTarget("no-choice", { found: undefined })).toBe(SEARCH_ID);
  });
});

describe("renderChanges and renderCopy", () => {
  it("lists the changes with a button to take back the last one", () => {
    const { changes } = renamed();
    const el = page(renderChanges(ctx("en", { changes })), "en");
    expect(el.querySelector("#frn-changes")?.textContent).toBe("Changes in the copy (1)");
    expect(el.querySelector(".frn-changes li")?.textContent).toBe("“Kiosk, No address” became “Kiosk, Union Station” (1 note)");
    expect(el.querySelector('[data-action="frn-undo"]')?.textContent).toBe("Remove the last change");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("says when there is no change yet, with nothing to take back", () => {
    const el = page(renderChanges(ctx()), "en");
    expect(el.textContent).toContain(C.noChanges.en);
    expect(el.querySelector('[data-action="frn-undo"]')).toBeNull();
  });

  it("offers the copy and the list once the copy read back", () => {
    const { changes, copy } = renamed();
    const el = page(renderCopy(copy, ctx("en", { changes })), "en");
    expect(el.querySelector("#frn-summary")?.textContent).toBe("1 change, 1 note changed; 4 notes in all, read as 3 places.");
    expect(el.querySelector("#frn-check")?.textContent).toBe(C.checkOk.en);
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>("a.linkbtn"));
    expect(links.map((a) => a.getAttribute("download"))).toEqual(["notes-renamed-1-change-2026-11-21.json", "places-renamed-1-change-2026-11-21.txt"]);
    expect(decodeTextExportHref(links[1]?.getAttribute("href") ?? "")).toContain("1. “Kiosk, No address” became “Kiosk, Union Station” (1 note)\n");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("offers nothing when the copy did not read back", () => {
    const { changes, copy } = renamed();
    const el = page(renderCopy({ ...copy, check: { ok: false, reason: "changed" } }, ctx("fr", { changes })), "fr");
    expect(el.querySelector("#frn-check")?.textContent).toBe(C.checkFailed.fr);
    expect(el.querySelector("a.linkbtn")).toBeNull();
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});

describe("renderFileRename", () => {
  it("shows only the file form before a file is read", () => {
    const el = page(renderFileRename(ctx("en", { loaded: false, found: undefined })), "en");
    expect(el.querySelector("#frn-find-form")).toBeNull();
    expect(el.querySelector('[data-action="frn-clear"]')?.textContent).toBe("Remove the file from the page");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("links a file error to the box", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileRename(ctx(l, { loaded: false, found: undefined, text: "{", error: "not-json" })), l);
      expect(el.querySelector("#frn-errors a")?.getAttribute("href")).toBe(`#${RENAME_TEXT_ID}`);
      expect(el.querySelector("#frn-errors a")?.textContent).toBe(renameErrorText("not-json", l));
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("shows the edit form instead of the search while a place is being renamed", () => {
    const el = page(renderFileRename(ctx("en", { editing: placeOf("Kiosk"), to: { name: "Kiosk", address: "" } })), "en");
    expect(el.querySelector("#frn-edit-form")).not.toBeNull();
    expect(el.querySelector("#frn-find-form")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows the changes and the copy, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const { changes, copy } = renamed();
      const el = page(renderFileRename(ctx(l, { changes, copy, statusMessage: C.saved[l] })), l);
      expect(el.querySelector("#frn-status")?.textContent).toBe(C.saved[l]);
      expect(el.querySelectorAll(".frn-changes li")).toHaveLength(1);
      expect(el.querySelector("#frn-copy")).not.toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});
