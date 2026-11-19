// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AGE_BANDS,
  CONTRIBUTOR_SOURCE,
  COPY,
  LATEST_PAGE,
  agesReport,
  agesToText,
  decodeTextExportHref,
  extraCopies,
  findBanned,
  findRepeats,
  groupPlaces,
  latestRecords,
  latestToText,
  placeId,
  repeatsToText,
  type Note,
} from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote, type TestRecord } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 15));
let h: Harness;

const LIFT: TestRecord = { key: "elevator", value: "yes", on: "2026-05-05" };

const NOTES = (): Note[] => [
  testNote("l1", "Library", [LIFT, { key: "automatic-door", value: "no", on: "2026-10-10", source: CONTRIBUTOR_SOURCE }]),
  testNote("l2", "Library", [LIFT]),
  testNote("l3", "Library", [{ key: "elevator", value: "no", on: "2024-02-02" }]),
  testNote("b1", "Bakery", [{ key: "elevator", value: "no", on: "2025-08-08", source: "Town open data", licence: "OGL-Canada-2.0" }], "2 Main St"),
  testNote("d1", "Dojo", [], "4 Main St"),
];

/** One record a day, so every record has its own date and the order is easy to read. */
const MANY = (n: number): Note[] =>
  Array.from({ length: n }, (_, i) =>
    testNote(`m${i}`, "Depot", [{ key: "elevator", value: i % 2 === 0 ? "yes" : "no", on: `2026-0${1 + Math.floor(i / 28)}-${String((i % 28) + 1).padStart(2, "0")}` }]),
  );

const LIBRARY_ID = placeId({ placeName: "Library", address: "1 Main St" });
const places = () => groupPlaces(NOTES(), "en");
const flush = (): Promise<void> => Promise.resolve();

function open(view: "latest" | "ages" | "repeats"): void {
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("view", view));
}

const cellsOf = (row: Element): Record<string, string> =>
  Object.fromEntries(Array.from(row.querySelectorAll("td")).map((td) => [td.getAttribute("data-col") ?? "", td.textContent ?? ""]));

function agesRow(label: string): Record<string, string> {
  const row = Array.from(h.root.querySelectorAll('table[data-kind="ages"] tbody tr')).find((r) => r.querySelector("th")?.textContent === label);
  if (!row) throw new Error(`no row ${label}`);
  return cellsOf(row);
}

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("the three pages are offered on the places screen", () => {
  const PAGES = [
    ["latest", "Latest records", "Dernières données", "#/places/latest"],
    ["ages", "How old the records are", "Âge des données", "#/places/record-ages"],
    ["repeats", "Records saved more than once", "Données enregistrées plusieurs fois", "#/places/repeated-records"],
  ] as const;

  it.each(PAGES)("%s: a button in both languages that opens the page with focus on its heading", (view, en, fr) => {
    h.seed(NOTES());
    for (const [locale, label] of [["en", en], ["fr", fr]] as const) {
      h.mount(locale);
      h.click(act("view", "notes"));
      h.click(act("view", "places"));
      expect(h.root.querySelector(act("view", view))?.textContent).toBe(label);
      h.click(act("view", view));
      expect(h.heading()).toBe(label);
      expect(document.activeElement).toBe(h.root.querySelector("h2"));
      expect(h.root.querySelector('nav [aria-current="page"]')?.textContent).toBe("Notes");
    }
  });

  it.each(PAGES)("%s: has its own address and opens from it", (view, en, _fr, hash) => {
    h.seed(NOTES());
    h.mount("en", true);
    open(view);
    expect(window.location.hash).toBe(hash);
    h.click(act("view", "places"));
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(h.heading()).toBe(en);
    expect(h.shell?.getView()).toEqual({ kind: view });
  });

  it.each(PAGES)("%s: works with no notes and goes back to places", (view) => {
    h.mount();
    open(view);
    expect(h.root.querySelector("main table")).toBeNull();
    expect(h.root.querySelector("main a[download]")).toBeNull();
    h.click(act("view", "places"));
    expect(h.shell?.getView()).toEqual({ kind: "places" });
  });

  it.each(PAGES)("%s: changes no note", (view) => {
    h.seed(NOTES());
    h.mount();
    const before = JSON.stringify(h.shell?.getNotes());
    open(view);
    expect(JSON.stringify(h.shell?.getNotes())).toBe(before);
  });
});

describe("latest records", () => {
  const lines = (): string[] => Array.from(h.root.querySelectorAll("ul.latest li")).map((li) => (li.textContent ?? "").replace(/[ \n\t]+/g, " "));

  it("lists every record newest first under its month, with source, licence, date and tier", () => {
    h.seed(NOTES());
    h.mount();
    open("latest");
    expect(Array.from(h.root.querySelectorAll("main h3")).map((x) => x.textContent)).toEqual(["October 2026", "May 2026", "August 2025", "February 2024"]);
    expect(lines()).toEqual([
      "2026-10-10: Library Automatic door: No. Contributor report · CC0-1.0 · Tier 0, not reviewed",
      "2026-05-05: Library Elevator: Yes. City survey · CC0-1.0 · Tier 0, not reviewed",
      "2026-05-05: Library Elevator: Yes. City survey · CC0-1.0 · Tier 0, not reviewed",
      "2025-08-08: Bakery Elevator: No. Town open data · OGL-Canada-2.0 · Tier 0, not reviewed",
      "2024-02-02: Library Elevator: No. City survey · CC0-1.0 · Tier 0, not reviewed",
    ]);
    expect(h.root.querySelector("section[data-latest-records]")?.getAttribute("data-latest-records")).toBe(String(latestRecords(places()).length));
  });

  it("marks each date as a date and says the list does not rank", () => {
    h.seed(NOTES());
    h.mount();
    open("latest");
    expect(Array.from(h.root.querySelectorAll("ul.latest time")).map((t) => t.getAttribute("datetime"))).toEqual(["2026-10-10", "2026-05-05", "2026-05-05", "2025-08-08", "2024-02-02"]);
    expect(h.root.querySelector('main [role="note"]')?.textContent).toBe(COPY.latest.noRank.en);
    expect(h.text()).toContain(COPY.tier.explain.en);
  });

  it("shows months and records in French", () => {
    h.seed(NOTES());
    h.mount("fr");
    open("latest");
    expect(Array.from(h.root.querySelectorAll("main h3")).map((x) => x.textContent)).toEqual(["octobre 2026", "mai 2026", "août 2025", "février 2024"]);
    expect(lines()[0]).toBe("2026-10-10\u00A0: Library Porte automatique\u00A0: Non. Rapport d’un contributeur · CC0-1.0 · Niveau 0, non examiné");
  });

  it("filters by kind of record, keeps focus on the choice and announces the result", async () => {
    h.seed(NOTES());
    h.mount();
    open("latest");
    expect(Array.from(h.root.querySelectorAll('[data-action="latest-filter"]')).map((b) => b.textContent)).toEqual([
      "Every kind (5)",
      "Report by a person (1)",
      "Named source (4)",
    ]);
    h.click(act("latest-filter", "person"));
    expect(lines()).toHaveLength(1);
    expect(h.root.querySelector(act("latest-filter", "person"))?.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(h.root.querySelector(act("latest-filter", "person")));
    await flush();
    expect(h.status()).toBe("Report by a person. 1 record shown, out of 1.");
    h.click(act("latest-filter", ""));
    expect(lines()).toHaveLength(5);
    await flush();
    expect(h.status()).toBe("Every kind. 5 records shown, out of 5.");
  });

  it("says there is nothing when a kind has no record, and ignores a kind it does not know", () => {
    h.seed([testNote("x", "Hall", [{ key: "elevator", value: "yes" }])]);
    h.mount();
    open("latest");
    h.click(act("latest-filter", "person"));
    expect(h.root.querySelector("[data-latest-none]")?.textContent).toBe("No records to show.");
    const b = h.root.querySelector<HTMLElement>(act("latest-filter", "person"));
    b?.setAttribute("data-value", "nonsense");
    b?.click();
    expect(h.root.querySelector(act("latest-filter", ""))?.getAttribute("aria-pressed")).toBe("true");
    expect(lines()).toHaveLength(1);
  });

  it("opens the record history of the place from its name", () => {
    h.seed(NOTES());
    h.mount();
    open("latest");
    const b = h.root.querySelector<HTMLElement>(`ul.latest ${act("open-history", LIBRARY_ID)}`);
    expect(b?.textContent).toBe("Library");
    b?.click();
    expect(h.shell?.getView()).toEqual({ kind: "history", id: LIBRARY_ID });
  });

  it("shows one page first, adds a page at a time and moves focus to the first new record", async () => {
    const n = LATEST_PAGE * 2 + 5;
    h.seed(MANY(n));
    h.mount();
    open("latest");
    expect(lines()).toHaveLength(LATEST_PAGE);
    expect(h.root.querySelector("[data-latest-shown]")?.textContent).toBe(`${LATEST_PAGE} records shown, out of ${n}.`);
    h.click(act("latest-more"));
    expect(lines()).toHaveLength(LATEST_PAGE * 2);
    expect(document.activeElement?.id).toBe(`latest-record-${LATEST_PAGE}`);
    await flush();
    expect(h.status()).toBe(`${LATEST_PAGE * 2} records shown, out of ${n}.`);
    h.click(act("latest-more"));
    expect(lines()).toHaveLength(n);
    expect(h.root.querySelector(act("latest-more"))).toBeNull();
    const ids = Array.from(h.root.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("goes back to one page and every kind after leaving", () => {
    h.seed(MANY(LATEST_PAGE + 3));
    h.mount();
    open("latest");
    h.click(act("latest-more"));
    h.click(act("latest-filter", "named-source"));
    expect(lines()).toHaveLength(LATEST_PAGE);
    h.click(act("view", "places"));
    h.click(act("view", "latest"));
    expect(lines()).toHaveLength(LATEST_PAGE);
    expect(h.root.querySelector(act("latest-filter", ""))?.getAttribute("aria-pressed")).toBe("true");
  });

  it("puts every record in the download, not only the ones on screen, and follows the filter", () => {
    h.seed(NOTES());
    h.mount();
    open("latest");
    const link = (): HTMLAnchorElement | null => h.root.querySelector<HTMLAnchorElement>("main a[download]");
    expect(link()?.getAttribute("download")).toBe("latest-records-2026-11-15-en.txt");
    expect(decodeTextExportHref(link()?.getAttribute("href") ?? "")).toBe(latestToText(latestRecords(places()), "en", TODAY));
    h.click(act("latest-filter", "person"));
    expect(link()?.getAttribute("download")).toBe("latest-records-person-2026-11-15-en.txt");
    expect(decodeTextExportHref(link()?.getAttribute("href") ?? "")).toBe(latestToText(latestRecords(places(), "person"), "en", TODAY, "person"));
  });

  it("shows a place name as text, never as markup", () => {
    h.seed([testNote("x", "<i>Hall</i>", [{ key: "elevator", value: "yes" }])]);
    h.mount();
    open("latest");
    expect(h.root.querySelector("ul.latest button")?.textContent).toBe("<i>Hall</i>");
    expect(h.root.querySelector("main i")).toBeNull();
  });
});

describe("how old the records are", () => {
  it("shows a row for each detail whose bands add up to its records", () => {
    h.seed(NOTES());
    h.mount();
    open("ages");
    expect(agesRow("Elevator")).toEqual({ under3: "0", under12: "2", under24: "1", over24: "1", records: "4", unknown: "1", range: "2024-02-02 to 2026-05-05" });
    expect(agesRow("Automatic door")).toEqual({ under3: "1", under12: "0", under24: "0", over24: "0", records: "1", unknown: "2", range: "2026-10-10" });
    expect(agesRow("Step-free entrance")).toEqual({ under3: "0", under12: "0", under24: "0", over24: "0", records: "0", unknown: "3", range: "–" });
    for (const row of Array.from(h.root.querySelectorAll('table[data-kind="ages"] tbody tr'))) {
      const c = cellsOf(row);
      expect(AGE_BANDS.reduce((n, b) => n + Number(c[b]), 0)).toBe(Number(c["records"]));
    }
  });

  it("shows the totals, and they match the report", () => {
    h.seed(NOTES());
    h.mount();
    open("ages");
    const report = agesReport(places(), TODAY);
    expect(h.root.querySelector("[data-ages-records]")?.textContent).toBe(String(report.records));
    expect(h.root.querySelector("[data-ages-old]")?.textContent).toBe(String(report.old));
    expect(h.root.querySelector('table[data-kind="ages"]')?.getAttribute("data-places")).toBe("3");
  });

  it("says an old record is not shown as wrong, in both languages", () => {
    h.seed(NOTES());
    for (const locale of ["en", "fr"] as const) {
      h.mount(locale);
      open("ages");
      expect(h.root.querySelector('main [role="note"]')?.textContent).toBe(COPY.ages.notWrong[locale]);
    }
  });

  it("has French headers and range", () => {
    h.seed(NOTES());
    h.mount("fr");
    open("ages");
    expect(Array.from(h.root.querySelectorAll('table[data-kind="ages"] thead th')).map((x) => x.textContent)).toEqual([
      "Détail",
      "Moins de 3 mois",
      "De 3 à 11 mois",
      "De 1 an à moins de 2",
      "2 ans ou plus",
      "Données",
      "Lieux sans donnée",
      "Dates de saisie",
    ]);
    expect(agesRow("Ascenseur")["range"]).toBe("2024-02-02 au 2026-05-05");
  });

  it("shows no table when places exist but nothing is recorded", () => {
    h.seed([testNote("d1", "Dojo")]);
    h.mount();
    open("ages");
    expect(h.root.querySelector("main table")).toBeNull();
    expect(h.text()).toContain(COPY.ages.empty.en);
    expect(h.root.querySelector("[data-ages-records]")?.textContent).toBe("0");
  });

  it("offers the counts as text and a way on to the details to ask about again", () => {
    h.seed(NOTES());
    h.mount();
    open("ages");
    const link = h.root.querySelector<HTMLAnchorElement>("main a[download]");
    expect(link?.textContent).toBe("Download these counts as text");
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toBe(agesToText(agesReport(places(), TODAY), "en", TODAY));
    h.click(`main ${act("view", "review")}`);
    expect(h.shell?.getView()).toEqual({ kind: "review" });
  });
});

describe("records saved more than once", () => {
  it("lists the place and the record, with how often it was saved", () => {
    h.seed(NOTES());
    h.mount();
    open("repeats");
    expect(Array.from(h.root.querySelectorAll("article.repeat-place h3")).map((x) => x.textContent)).toEqual(["Library"]);
    const li = h.root.querySelector("article.repeat-place li");
    expect((li?.textContent ?? "").replace(/\s+/g, " ")).toBe("Elevator: Yes. City survey · CC0-1.0 · 2026-05-05 · Tier 0, not reviewed. Saved 2 times.");
    expect(li?.getAttribute("data-copies")).toBe("2");
  });

  it("shows the totals, and they match the list", () => {
    h.seed(NOTES());
    h.mount();
    open("repeats");
    const list = findRepeats(places());
    expect(h.root.querySelector("[data-repeats-groups]")?.textContent).toBe("1");
    expect(h.root.querySelector("[data-repeats-extra]")?.textContent).toBe(String(extraCopies(list)));
  });

  it("says it is one record and that nothing is removed, in both languages", () => {
    h.seed(NOTES());
    for (const locale of ["en", "fr"] as const) {
      h.mount(locale);
      open("repeats");
      expect(h.root.querySelector('main [role="note"]')?.textContent).toBe(COPY.repeats.oneRecord[locale]);
    }
    expect(h.root.querySelector("article.repeat-place li")?.textContent).toContain("Enregistrée 2 fois.");
  });

  it("says so when no record is saved twice", () => {
    h.seed(NOTES().slice(2));
    h.mount();
    open("repeats");
    expect(h.root.querySelector("[data-repeats-none]")?.textContent).toBe("No record is saved more than once.");
    expect(h.root.querySelector("article")).toBeNull();
  });

  it("opens the place or its record history, and ties the buttons to the place", () => {
    h.seed(NOTES());
    h.mount();
    open("repeats");
    const title = h.root.querySelector("article.repeat-place h3");
    for (const b of Array.from(h.root.querySelectorAll("article.repeat-place button"))) expect(b.getAttribute("aria-describedby")).toBe(title?.id);
    h.click(`article ${act("open-history", LIBRARY_ID)}`);
    expect(h.shell?.getView()).toEqual({ kind: "history", id: LIBRARY_ID });
    h.click(act("view", "places"));
    h.click(act("view", "repeats"));
    h.click(`article ${act("open-place", LIBRARY_ID)}`);
    expect(h.shell?.getView()).toEqual({ kind: "place", id: LIBRARY_ID });
  });

  it("offers the list as text", () => {
    h.seed(NOTES());
    h.mount();
    open("repeats");
    const link = h.root.querySelector<HTMLAnchorElement>("main a[download]");
    expect(link?.getAttribute("download")).toBe("repeated-records-2026-11-15-en.txt");
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toBe(repeatsToText(findRepeats(places()), "en", TODAY));
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit on all three pages (%s)", async (locale) => {
    h.seed([...NOTES(), ...MANY(LATEST_PAGE)]);
    h.mount(locale);
    const run = async (label: string): Promise<void> => {
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), `${label} ${locale}`).toEqual([]);
    };
    open("latest");
    await run("latest");
    h.click(act("latest-more"));
    await run("latest more");
    h.click(act("view", "places"));
    h.click(act("view", "ages"));
    await run("ages");
    h.click(act("view", "places"));
    h.click(act("view", "repeats"));
    await run("repeats");
    expect(h.auditLines(), locale).toEqual([]);
  });

  it("passes the audit with no notes in either language", () => {
    for (const locale of ["en", "fr"]) {
      h.mount(locale);
      for (const view of ["latest", "ages", "repeats"] as const) open(view);
      expect(h.auditLines(), locale).toEqual([]);
    }
  });

  it("makes every control at least 44 pixels on all three pages", () => {
    h.seed(NOTES());
    h.mount();
    for (const view of ["latest", "ages", "repeats"] as const) {
      open(view);
      for (const el of Array.from(h.root.querySelectorAll<HTMLElement>("main button, main a.linkbtn"))) expect(el.style.minHeight, `${view} ${el.textContent ?? ""}`).toBe("44px");
    }
  });

  it("puts the ages table in a focusable region named by its caption", () => {
    h.seed(NOTES());
    h.mount();
    open("ages");
    const wrap = h.root.querySelector(".table-wrap");
    expect(wrap?.getAttribute("tabindex")).toBe("0");
    expect(wrap?.getAttribute("aria-labelledby")).toBe("ages-caption");
    expect(h.root.querySelector("#ages-caption")?.textContent).toBe(COPY.ages.caption.en);
  });

  it("uses no banned wording and never ranks or scores", () => {
    h.seed(NOTES());
    for (const locale of ["en", "fr"]) {
      h.mount(locale);
      for (const view of ["latest", "ages", "repeats"] as const) {
        open(view);
        const main = (h.root.querySelector("main")?.textContent ?? "").replace(COPY.latest.noRank.en, "").replace(COPY.latest.noRank.fr, "");
        expect(findBanned(main), `${view} ${locale}`).toBeUndefined();
        expect(main, `${view} ${locale}`).not.toMatch(/\b(best|worst|score|rank|meilleur|pire|classement|reliable|fiable)\b/i);
      }
    }
  });
});
