// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CONTRIBUTOR_SOURCE,
  COPY,
  FACT_KEYS,
  decodeTextExportHref,
  findBanned,
  groupPlaces,
  historyToText,
  placeHistory,
  placeId,
  type Note,
  type Place,
} from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 15));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("n1", "Library", [{ key: "elevator", value: "yes", on: "2024-01-10" }]),
  testNote("n2", "Library", [{ key: "elevator", value: "no", on: "2025-06-01", source: CONTRIBUTOR_SOURCE }]),
  testNote("n3", "Library", [
    { key: "elevator", value: "no", on: "2026-09-09" },
    { key: "automatic-door", value: "yes", on: "2026-09-09", source: "Town open data", licence: "OGL-Canada-2.0" },
  ]),
  testNote("d1", "Dojo", [], "4 Main St"),
];

const LIBRARY_ID = placeId({ placeName: "Library", address: "1 Main St" });
const DOJO_ID = placeId({ placeName: "Dojo", address: "4 Main St" });

function openHistory(id: string = LIBRARY_ID): void {
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("open-place", id));
  h.click(act("open-history", id));
}

function tableFor(key: string): HTMLTableElement {
  const t = h.root.querySelector<HTMLTableElement>(`table[data-kind="history"][data-key="${key}"]`);
  if (!t) throw new Error(`no history table for ${key}`);
  return t;
}

const rowsOf = (key: string): string[][] =>
  Array.from(tableFor(key).querySelectorAll("tbody tr")).map((r) => Array.from(r.querySelectorAll("th, td")).map((c) => c.textContent ?? ""));

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("opening the record history", () => {
  it("is offered on a place page in both languages", () => {
    h.seed(NOTES());
    for (const [locale, label] of [["en", "Record history"], ["fr", "Historique des données"]] as const) {
      h.mount(locale);
      h.click(act("view", "notes"));
      h.click(act("view", "places"));
      h.click(act("open-place", LIBRARY_ID));
      expect(h.root.querySelector(act("open-history", LIBRARY_ID))?.textContent).toBe(label);
    }
  });

  it("opens with the place in the heading and focus on it", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    expect(h.heading()).toBe("Record history: Library");
    expect(document.activeElement).toBe(h.root.querySelector("h2"));
    expect(document.title).toContain("Record history: Library");
    expect(h.shell?.getView()).toEqual({ kind: "history", id: LIBRARY_ID });
  });

  it("keeps the Notes section current in the navigation", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    expect(h.root.querySelector('nav [aria-current="page"]')?.textContent).toBe("Notes");
  });

  it("has its own address and opens from it", () => {
    h.seed(NOTES());
    h.mount("en", true);
    openHistory();
    expect(window.location.hash).toBe(`#/places/${LIBRARY_ID}/history`);
    h.click(act("view", "places"));
    window.location.hash = `#/places/${LIBRARY_ID}/history`;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(h.heading()).toBe("Record history: Library");
  });

  it("says so when the address names a place that is not on this device", () => {
    h.seed(NOTES());
    h.mount("en", true);
    window.location.hash = "#/places/nowhere-00000000/history";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(h.heading()).toBe("Record history");
    expect(h.text()).toContain(COPY.places.notFound.en);
    expect(h.root.querySelector("table")).toBeNull();
    expect(h.root.querySelector(act("view", "places"))).not.toBeNull();
  });

  it("goes back to the place, and back to all places", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    h.click(act("open-place", LIBRARY_ID));
    expect(h.shell?.getView()).toEqual({ kind: "place", id: LIBRARY_ID });
    h.click(act("open-history", LIBRARY_ID));
    h.click(act("view", "places"));
    expect(h.shell?.getView()).toEqual({ kind: "places" });
  });
});

describe("what the history shows", () => {
  it("has one table for each detail with a record, and Unknown for the others", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    expect(Array.from(h.root.querySelectorAll('table[data-kind="history"]')).map((t) => t.getAttribute("data-key"))).toEqual(["automatic-door", "elevator"]);
    expect(Array.from(h.root.querySelectorAll("[data-history-unknown]")).map((p) => p.getAttribute("data-history-unknown"))).toEqual([
      "step-free-entry",
      "accessible-washroom",
    ]);
    for (const p of Array.from(h.root.querySelectorAll("[data-history-unknown]"))) {
      expect(p.textContent).toBe("Unknown. Nothing has been recorded for this detail.");
    }
    expect(Array.from(h.root.querySelectorAll("main h3")).map((x) => x.textContent)).toEqual(FACT_KEYS.map((k) => COPY.facts[k].en));
  });

  it("lists every record newest first with its answer, source, licence, tier, kind and change", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    expect(rowsOf("elevator")).toEqual([
      ["2026-09-09", "No", "City survey", "CC0-1.0", "Tier 0, not reviewed", "Named source", "Same answer"],
      ["2025-06-01", "No", "Contributor report", "CC0-1.0", "Tier 0, not reviewed", "Report by a person", "Different answer"],
      ["2024-01-10", "Yes", "City survey", "CC0-1.0", "Tier 0, not reviewed", "Named source", "First record"],
    ]);
    expect(rowsOf("automatic-door")).toEqual([
      ["2026-09-09", "Yes", "Town open data", "OGL-Canada-2.0", "Tier 0, not reviewed", "Named source", "First record"],
    ]);
  });

  it("shows the same records in French, with the contributor source translated", () => {
    h.seed(NOTES());
    h.mount("fr");
    openHistory();
    expect(h.heading()).toBe("Historique des données\u00A0: Library");
    expect(rowsOf("elevator")[1]).toEqual([
      "2025-06-01",
      "Non",
      "Rapport d’un contributeur",
      "CC0-1.0",
      "Niveau 0, non examiné",
      "Rapport d’une personne",
      "Réponse différente",
    ]);
    expect(h.text()).toContain(COPY.history.noPick.fr);
    expect(h.text()).toContain(COPY.tier.explain.fr);
  });

  it("counts the records and matches what the place holds", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    const place = groupPlaces(NOTES(), "en").find((p) => p.id === LIBRARY_ID) as Place;
    expect(h.root.querySelector("[data-history-records]")?.textContent).toBe(String(placeHistory(place).records));
    expect(h.root.querySelectorAll('table[data-kind="history"] tbody tr')).toHaveLength(4);
  });

  it("captions each table with the detail and the number of records", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    expect(tableFor("elevator").querySelector("caption")?.textContent).toBe("Records for: Elevator (3 records)");
    expect(tableFor("automatic-door").querySelector("caption")?.textContent).toBe("Records for: Automatic door (1 record)");
    h.mount("fr");
    openHistory();
    expect(tableFor("elevator").querySelector("caption")?.textContent).toBe("Données pour\u00A0: Ascenseur (3 données)");
  });

  it("says it does not pick an answer, and what tier 0 means", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    expect(h.root.querySelector('main [role="note"]')?.textContent).toBe(COPY.history.noPick.en);
    expect(h.text()).toContain(COPY.tier.explain.en);
  });

  it("shows no table and no source for a place with nothing recorded", () => {
    h.seed(NOTES());
    h.mount();
    openHistory(DOJO_ID);
    expect(h.heading()).toBe("Record history: Dojo");
    expect(h.root.querySelector("table")).toBeNull();
    expect(h.root.querySelector("[data-history-records]")?.textContent).toBe("0");
    expect(h.text()).toContain(COPY.history.noRecords.en);
    expect(h.root.querySelectorAll("[data-history-unknown]")).toHaveLength(FACT_KEYS.length);
    expect(h.root.querySelector("main")?.textContent).not.toMatch(/CC0|survey/);
  });

  it("shows text a person typed as text, never as markup", () => {
    h.seed([testNote("x1", "<b>Bold</b> & Co", [{ key: "elevator", value: "yes", source: '<img src=x onerror="1">' }])]);
    h.mount();
    const id = placeId({ placeName: "<b>Bold</b> & Co", address: "1 Main St" });
    openHistory(id);
    expect(h.heading()).toBe("Record history: <b>Bold</b> & Co");
    expect(h.root.querySelector("main b")).toBeNull();
    expect(h.root.querySelector("main img")).toBeNull();
    expect(rowsOf("elevator")[0]?.[2]).toBe('<img src=x onerror="1">');
  });

  it("follows a new note: the history grows after a record is added", () => {
    h.seed(NOTES().slice(0, 2));
    h.mount();
    openHistory();
    expect(rowsOf("elevator")).toHaveLength(2);
    h.destroy();
    h.seed([NOTES()[2] as Note]);
    h.mount();
    openHistory();
    expect(rowsOf("elevator")).toHaveLength(3);
  });
});

describe("records saved more than once", () => {
  const TWICE = (): Note[] => [
    testNote("r1", "Hall", [{ key: "elevator", value: "yes", on: "2026-05-05" }]),
    testNote("r2", "Hall", [{ key: "elevator", value: "yes", on: "2026-05-05" }]),
    testNote("r3", "Hall", [{ key: "elevator", value: "no", on: "2026-06-06" }]),
  ];
  const HALL_ID = placeId({ placeName: "Hall", address: "1 Main St" });

  it("counts different records apart from records, and they are equal when nothing is saved twice", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    expect(h.root.querySelector("[data-history-records]")?.textContent).toBe("4");
    expect(h.root.querySelector("[data-history-distinct]")?.textContent).toBe("4");
    expect(h.root.querySelector("[data-history-repeated]")).toBeNull();
  });

  it("says so when a record is saved twice, still lists both rows, and leads to the page about it", () => {
    h.seed(TWICE());
    h.mount();
    openHistory(HALL_ID);
    expect(h.root.querySelector("[data-history-records]")?.textContent).toBe("3");
    expect(h.root.querySelector("[data-history-distinct]")?.textContent).toBe("2");
    expect(rowsOf("elevator")).toHaveLength(3);
    expect(h.root.querySelector("[data-history-repeated]")?.textContent).toContain(COPY.history.repeated.en);
    h.click(`[data-history-repeated] ${act("view", "repeats")}`);
    expect(h.shell?.getView()).toEqual({ kind: "repeats" });
    expect(h.root.querySelector(`article[data-place="${HALL_ID}"]`)).not.toBeNull();
  });

  it("says the same in French and passes the audit", () => {
    h.seed(TWICE());
    h.mount("fr");
    openHistory(HALL_ID);
    expect(h.root.querySelector("[data-history-repeated]")?.textContent).toContain(COPY.history.repeated.fr);
    expect(h.text()).toContain("Données différentes\u00A0: 2");
    expect(h.auditLines()).toEqual([]);
  });

  it("shows zero different records for a place with nothing recorded", () => {
    h.seed(NOTES());
    h.mount();
    openHistory(DOJO_ID);
    expect(h.root.querySelector("[data-history-distinct]")?.textContent).toBe("0");
  });
});

describe("the history as a text file", () => {
  it("offers a download that holds exactly the text built from the same history", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    const link = h.root.querySelector<HTMLAnchorElement>("a[download^='history-']");
    expect(link?.textContent).toBe("Download the history as text");
    expect(link?.getAttribute("download")).toBe(`history-${LIBRARY_ID}-en.txt`);
    const place = groupPlaces(NOTES(), "en").find((p) => p.id === LIBRARY_ID) as Place;
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toBe(historyToText(place, placeHistory(place), "en", TODAY));
  });

  it("is in French on the French page", () => {
    h.seed(NOTES());
    h.mount("fr");
    openHistory();
    const link = h.root.querySelector<HTMLAnchorElement>("a[download^='historique-']");
    expect(link?.textContent).toBe("Télécharger l’historique en texte");
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toContain("Niveau 0, non examiné");
  });

  it("says the file is made on this device", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    expect(h.text()).toContain(COPY.textExport.keepNote.en);
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit (%s)", async (locale) => {
    h.seed(NOTES());
    h.mount(locale);
    openHistory();
    const full = await axe.run(document.body, AXE_OPTIONS);
    expect(full.violations.map((v) => `${v.id}: ${v.help}`), `history ${locale}`).toEqual([]);
    h.click(act("view", "places"));
    h.click(act("open-place", DOJO_ID));
    h.click(act("open-history", DOJO_ID));
    const empty = await axe.run(document.body, AXE_OPTIONS);
    expect(empty.violations.map((v) => `${v.id}: ${v.help}`), `empty history ${locale}`).toEqual([]);
    expect(h.auditLines(), locale).toEqual([]);
  });

  it("puts each table in a focusable region named by its caption, with scoped headers", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    for (const t of Array.from(h.root.querySelectorAll('table[data-kind="history"]'))) {
      const wrap = t.closest(".table-wrap");
      expect(wrap?.getAttribute("tabindex")).toBe("0");
      expect(wrap?.getAttribute("role")).toBe("region");
      expect(wrap?.getAttribute("aria-labelledby")).toBe(t.querySelector("caption")?.id);
      for (const th of Array.from(t.querySelectorAll("thead th"))) expect(th.getAttribute("scope")).toBe("col");
      for (const th of Array.from(t.querySelectorAll("tbody th"))) expect(th.getAttribute("scope")).toBe("row");
    }
    const ids = Array.from(h.root.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("makes every control at least 44 pixels", () => {
    h.seed(NOTES());
    h.mount();
    openHistory();
    for (const el of Array.from(h.root.querySelectorAll<HTMLElement>("main button, main a.linkbtn"))) expect(el.style.minHeight, el.textContent ?? "").toBe("44px");
  });

  it("uses no wording that claims a record was reviewed or is right", () => {
    h.seed(NOTES());
    for (const locale of ["en", "fr"]) {
      h.mount(locale);
      openHistory();
      const main = h.root.querySelector("main")?.textContent ?? "";
      expect(findBanned(main), locale).toBeUndefined();
      expect(main).not.toMatch(/\b(reliable|trusted|fiable|best|meilleur)\b/i);
    }
  });
});
