// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { findPlaces, readBack, removalFiles, removePlaces } from "./dropplaces";
import { exportNotes, importNotes } from "./exchange";
import { FILE_DROP_COPY as C, dropErrorText, problemText } from "./filedrop-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import {
  DROP_TEXT_ID,
  LIST_ID,
  REASON_ID,
  SEARCH_ID,
  keepId,
  pickId,
  problemTarget,
  renderChosen,
  renderFileDrop,
  renderFind,
  renderFound,
  renderList,
  renderOutcome,
  type DropOutcome,
  type FileDropContext,
} from "./views-filedrop";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(l: "en" | "fr" = "en"): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a1", "<b>Café</b>", [{ key: "elevator", value: "yes" }], "12 King St W"),
        testNote("a2", "<b>Café</b>", [], "12 King St W"),
        testNote("k", "Kiosk", [], null),
        testNote("b", "Bakery", [], "14 King St W"),
      ],
      "2026-11-01",
    ),
    TODAY,
    l,
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const placeOf = (name: string) => {
  const p = file().places.find((x) => x.name === name);
  if (!p) throw new Error("no place");
  return p;
};

function outcome(names: string[], reason = ""): DropOutcome {
  const f = file();
  const removal = removePlaces(f, f.places.filter((p) => names.includes(p.name)).map((p) => p.id));
  const files = removalFiles(removal, TODAY);
  return { removal, check: readBack(files.copy, removal), copy: files.copy, removed: files.removed, reason };
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileDropContext> = {}): FileDropContext => ({
  text: "",
  error: undefined,
  file: file(l),
  query: "",
  found: findPlaces(file(l), "", l),
  chosen: [],
  reason: "",
  problems: [],
  list: "",
  listResult: undefined,
  outcome: undefined,
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
  it("keeps the search and ties the no-place problem to it", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFind(ctx(l, { query: "king", problems: ["none"] })), l);
      const input = el.querySelector<HTMLInputElement>(`#${SEARCH_ID}`);
      expect(input?.value).toBe("king");
      expect(input?.getAttribute("aria-describedby")).toBe(`h-${SEARCH_ID} e-fdp-none`);
      expect(el.querySelector("#e-fdp-none")?.textContent).toBe(problemText("none", l));
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("renderFound", () => {
  it("lists each place found with a tick box on a 44 pixel label, ticked when chosen", () => {
    const f = findPlaces(file(), "", "en");
    const el = page(`<form>${renderFound(f, [placeOf("Kiosk")], "en")}</form>`, "en");
    expect(el.querySelector("#fdp-found")?.textContent).toBe("3 places found.");
    const labels = Array.from(el.querySelectorAll<HTMLLabelElement>("label.choice"));
    expect(labels.map((x) => x.textContent)).toEqual(["<b>Café</b>, 12 King St W", "Bakery, 14 King St W", "Kiosk, No address"]);
    for (const label of labels) {
      expect(label.style.minHeight).toBe("44px");
      expect(label.querySelector("input")?.id).toBe(label.htmlFor);
    }
    expect(el.querySelector<HTMLInputElement>(`#${pickId(placeOf("Kiosk").id)}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>(`#${pickId(placeOf("Bakery").id)}`)?.checked).toBe(false);
    expect(el.querySelector("b")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("says when nothing matches and shows no list", () => {
    const el = page(renderFound(findPlaces(file(), "pizza", "en"), [], "en"), "en");
    expect(el.querySelector("#fdp-found")?.textContent).toBe(C.noneFound.en);
    expect(el.querySelector("fieldset")).toBeNull();
  });
});

describe("renderList", () => {
  it("keeps the list, shows what it ticked, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderList(ctx(l, { list: "Kiosk\nPizza", listResult: "1 line ticked a place." })), l);
      expect(el.querySelector<HTMLTextAreaElement>(`#${LIST_ID}`)?.value).toBe("Kiosk\nPizza");
      expect(el.querySelector("#fdp-list-result")?.textContent).toBe("1 line ticked a place.");
      expect(el.querySelector("#fdp-list-result")?.getAttribute("tabindex")).toBe("-1");
      expect(el.querySelector('[data-action="fdp-list"]')?.textContent).toBe(C.listButton[l]);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("ties a list problem to the box", () => {
    const el = page(renderList(ctx("en", { problems: ["list-long"] })), "en");
    const box = el.querySelector(`#${LIST_ID}`);
    expect(box?.getAttribute("aria-invalid")).toBe("true");
    expect(box?.getAttribute("aria-describedby")).toBe(`h-${LIST_ID} e-${LIST_ID}`);
    expect(el.querySelector(`#e-${LIST_ID}`)?.textContent).toBe(problemText("list-long", "en"));
    expect(problemTarget("list-empty")).toBe(LIST_ID);
    expect(el.querySelector("#fdp-list-result")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("does not mark the reason for a list problem", () => {
    const el = page(renderChosen(ctx("en", { problems: ["list-empty"] })), "en");
    expect(el.querySelector(`#${REASON_ID}`)?.getAttribute("aria-invalid")).toBeNull();
  });
});

describe("renderChosen", () => {
  it("lists the places ticked, each with a button that names it", () => {
    const el = page(renderChosen(ctx("en", { chosen: [placeOf("Bakery"), placeOf("Kiosk")] })), "en");
    expect(el.querySelector("#fdp-chosen-title")?.textContent).toBe("Places to remove (2)");
    expect(Array.from(el.querySelectorAll(".fdp-chosen button")).map((b) => [b.id, b.textContent])).toEqual([
      [keepId(placeOf("Bakery").id), "Do not remove Bakery"],
      [keepId(placeOf("Kiosk").id), "Do not remove Kiosk"],
    ]);
    expect(el.querySelector('[data-action="fdp-remove"]')?.textContent).toBe("Remove 2 places from the copy");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("says when nothing is ticked", () => {
    const el = page(renderChosen(ctx()), "en");
    expect(el.querySelector("#fdp-none-chosen")?.textContent).toBe(C.noneChosen.en);
    expect(el.querySelector('[data-action="fdp-remove"]')?.textContent).toBe(C.removeNone.en);
  });

  it("marks the reason when it has a problem, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderChosen(ctx(l, { chosen: [placeOf("Kiosk")], reason: "a\tb", problems: ["control"] })), l);
      const input = el.querySelector<HTMLInputElement>(`#${REASON_ID}`);
      expect(input?.getAttribute("aria-invalid")).toBe("true");
      expect(input?.getAttribute("aria-describedby")).toBe(`h-${REASON_ID} e-${REASON_ID}`);
      expect(input?.value).toBe("a\tb");
      expect(el.querySelector(`#e-${REASON_ID}`)?.textContent).toBe(problemText("control", l));
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("renderOutcome", () => {
  it("offers the copy, the notes taken out and the list when the copy read back", () => {
    const el = page(renderOutcome(outcome(["<b>Café</b>"], "Closed"), ctx()), "en");
    expect(el.querySelector("#fdp-summary")?.textContent).toBe("1 place and 2 notes taken out; 2 places and 2 notes kept.");
    expect(el.querySelector("#fdp-check")?.textContent).toBe(C.readBackOk.en);
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>("a.linkbtn"));
    expect(links.map((a) => a.getAttribute("download"))).toEqual([
      "notes-without-1-place-2026-11-21.json",
      "notes-taken-out-1-place-2026-11-21.json",
      "places-taken-out-1-place-2026-11-21.txt",
    ]);
    const data = (a: HTMLAnchorElement | undefined): string => decodeURIComponent((a?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));
    expect(importNotes(data(links[0])).notes.map((n) => n.id).sort()).toEqual(["b", "k"]);
    expect(importNotes(data(links[1])).notes.map((n) => n.id).sort()).toEqual(["a1", "a2"]);
    expect(decodeTextExportHref(links[2]?.getAttribute("href") ?? "")).toContain("Why: Closed\n");
    expect(el.querySelector(".fdp-removed li")?.textContent).toBe("<b>Café</b>, 12 King St W");
    expect(el.querySelector("b")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("offers nothing when the copy did not read back", () => {
    const o = { ...outcome(["Kiosk"]), check: { ok: false as const, reason: "changed" as const } };
    const el = page(renderOutcome(o, ctx("fr")), "fr");
    expect(el.querySelector("#fdp-check")?.textContent).toBe(C.readBackFailed.fr);
    expect(el.querySelector("a.linkbtn")).toBeNull();
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });

  it("passes the App's audit in French", () => {
    const el = page(renderOutcome(outcome(["Kiosk", "Bakery"]), ctx("fr")), "fr");
    expect(el.querySelector("#fdp-summary")?.textContent).toBe("2 lieux et 2 notes retirées\u202F; 1 lieu et 2 notes gardées.");
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});

describe("renderFileDrop", () => {
  it("shows only the file form before a file is read", () => {
    const el = page(renderFileDrop(ctx("en", { file: undefined, found: undefined })), "en");
    expect(el.querySelector("#fdp-find-form")).toBeNull();
    expect(el.querySelector('[data-action="fdp-clear"]')?.textContent).toBe("Remove the file from the page");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("links a file error to the box", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileDrop(ctx(l, { text: "{", error: "not-json", file: undefined, found: undefined })), l);
      expect(el.querySelector("#fdp-errors a")?.getAttribute("href")).toBe(`#${DROP_TEXT_ID}`);
      expect(el.querySelector("#fdp-errors a")?.textContent).toBe(dropErrorText("not-json", l));
      expect(el.querySelector(`#${DROP_TEXT_ID}`)?.getAttribute("aria-invalid")).toBe("true");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("links each problem to where it is fixed", () => {
    const el = page(renderFileDrop(ctx("en", { reason: "x".repeat(501), problems: ["none", "too-long"] })), "en");
    expect(Array.from(el.querySelectorAll("#fdp-errors a")).map((a) => a.getAttribute("href"))).toEqual([`#${SEARCH_ID}`, `#${REASON_ID}`]);
    expect(problemTarget("none")).toBe(SEARCH_ID);
    expect(problemTarget("control")).toBe(REASON_ID);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows the search, the places, the choice and the copy once read, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileDrop(ctx(l, { chosen: [placeOf("Kiosk")], outcome: outcome(["Kiosk"]), statusMessage: C.opened[l] })), l);
      expect(el.querySelector("#fdp-status")?.textContent).toBe(C.opened[l]);
      expect(el.querySelectorAll("#fdp-found-list input")).toHaveLength(3);
      expect(el.querySelectorAll(".fdp-chosen li")).toHaveLength(1);
      expect(el.querySelector("#fdp-result")).not.toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});
