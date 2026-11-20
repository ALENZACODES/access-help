// @vitest-environment jsdom
import axe from "axe-core";
import { coverageLines } from "./coverage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COPY,
  FACT_KEYS,
  addNote,
  collectSources,
  compareToText,
  decodeTextExportHref,
  detailCount,
  groupPlaces,
  memoryStore,
  mountShell,
  parseNote,
  placeToText,
  shortlistToText,
  sourcesToText,
  summarisePlaces,
  summaryToText,
  type FactKey,
  type KeyValueStore,
  type Note,
  type ShellHandle,
  type Violation,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));
let root: HTMLElement;
let shell: ShellHandle | undefined;
let store: KeyValueStore;
let audits: Violation[][];

function mount(locales: string[] = ["en"], hashRouting = false): ShellHandle {
  audits = [];
  shell = mountShell(root, { requestedLocales: locales, store, today: TODAY, onAudit: (v) => audits.push(v), hashRouting });
  return shell;
}

const act = (action: string, value?: string, key?: string): string =>
  `[data-action="${action}"]` + (key !== undefined ? `[data-key="${key}"]` : "") + (value !== undefined ? `[data-value="${value}"]` : "");

function click(sel: string): void {
  const el = root.querySelector<HTMLElement>(sel);
  expect(el, sel).not.toBeNull();
  el?.click();
}

const heading = (): string => root.querySelector("h2")?.textContent ?? "";
const text = (): string => root.textContent ?? "";
const flush = (): Promise<void> => Promise.resolve();

interface Rec {
  readonly key: FactKey;
  readonly value: "yes" | "no";
  readonly source: string;
  readonly on?: string;
}

function note(id: string, name: string, recs: readonly Rec[], address = "1 Main St"): Note {
  const facts = FACT_KEYS.map((key) => {
    const r = recs.find((x) => x.key === key);
    return r ? { key, value: r.value, provenance: { source: r.source, licence: "CC0-1.0", recordedOn: r.on ?? "2026-10-01" } } : { key, value: "unknown" };
  });
  const n = parseNote({ id, placeName: name, address, createdOn: "2026-10-01", licence: "CC0-1.0", facts });
  if (!n) throw new Error(`bad note ${id}`);
  return n;
}

const SURVEY = "City survey";
const OPEN = "Town open data";

const NOTES = (): Note[] => [
  note("a", "Archive", [
    { key: "elevator", value: "yes", source: SURVEY },
    { key: "automatic-door", value: "yes", source: OPEN, on: "2024-03-03" },
  ]),
  note("b", "Bakery", [{ key: "elevator", value: "no", source: SURVEY }]),
  note("c", "Cinema", [{ key: "elevator", value: "yes", source: OPEN }]),
  note("d", "Cinema", [{ key: "elevator", value: "no", source: SURVEY }]),
  note("e", "Dojo", []),
];

function seed(notes: Note[]): void {
  for (const n of notes.slice().reverse()) addNote(store, n);
}

const openPlaces = (): void => {
  click(act("view", "notes"));
  click(act("view", "places"));
};
const openSources = (): void => {
  openPlaces();
  click(act("view", "sources"));
};
const openSummary = (): void => {
  openPlaces();
  click(act("view", "summary"));
};

function table(kind: string): HTMLTableElement {
  const t = root.querySelector<HTMLTableElement>(`table[data-kind="${kind}"]`);
  if (!t) throw new Error(`no ${kind} table`);
  return t;
}

const cellsOf = (row: Element): Record<string, string> =>
  Object.fromEntries(Array.from(row.querySelectorAll("td")).map((td) => [td.getAttribute("data-col") ?? "", td.textContent ?? ""]));

function summaryRow(label: string): Record<string, string> {
  const row = Array.from(table("summary").querySelectorAll("tbody tr")).find((r) => r.querySelector("th")?.textContent === label);
  if (!row) throw new Error(`no row ${label}`);
  return cellsOf(row);
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  store = memoryStore();
  window.location.hash = "";
});

afterEach(() => {
  shell?.destroy();
  shell = undefined;
  vi.unstubAllGlobals();
});

describe("getting there", () => {
  it("offers both pages from the places screen, in English and French", () => {
    seed(NOTES());
    mount();
    openPlaces();
    expect(root.querySelector(act("view", "summary"))?.textContent).toBe("What your notes say");
    expect(root.querySelector(act("view", "sources"))?.textContent).toBe("Where details come from");
    click(act("set-locale", "fr"));
    expect(root.querySelector(act("view", "summary"))?.textContent).toBe("Ce que disent vos notes");
    expect(root.querySelector(act("view", "sources"))?.textContent).toBe("D’où viennent les détails");
  });

  it("moves focus to the heading and keeps Notes as the current section", () => {
    seed(NOTES());
    mount();
    openSources();
    expect(heading()).toBe("Where details come from");
    expect(document.activeElement?.tagName).toBe("H2");
    expect(root.querySelector('nav [aria-current="page"]')?.textContent).toBe("Notes");
    click(act("view", "places"));
    openSummary();
    expect(heading()).toBe("What your notes say");
    expect(root.querySelector('nav [aria-current="page"]')?.textContent).toBe("Notes");
  });

  it("goes back to the places screen", () => {
    seed(NOTES());
    mount();
    openSources();
    click(act("view", "places"));
    expect(heading()).toBe("Places");
    openSummary();
    click(act("view", "places"));
    expect(heading()).toBe("Places");
  });

  it("writes its own address and opens from it", () => {
    seed(NOTES());
    mount(["en"], true);
    openPlaces();
    click(act("view", "sources"));
    expect(window.location.hash).toBe("#/places/sources");
    click(act("view", "places"));
    click(act("view", "summary"));
    expect(window.location.hash).toBe("#/places/summary");
    window.location.hash = "#/places/sources";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(heading()).toBe("Where details come from");
    window.location.hash = "#/places/summary";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(heading()).toBe("What your notes say");
  });

  it("opens a place whose name is not one of its pages, and says a missing place is missing", () => {
    seed(NOTES());
    mount(["en"], true);
    window.location.hash = "#/places/sourcesx";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(root.querySelector('[role="note"]')?.textContent).toContain("not found on this device");
  });
});

describe("where details come from", () => {
  it("adds up each source's details and says that it is not a check", () => {
    seed(NOTES());
    mount();
    openSources();
    const rows = Array.from(table("sources").querySelectorAll("tbody tr"));
    expect(rows.map((r) => r.querySelector("th")?.textContent)).toEqual([SURVEY, OPEN]);
    expect(cellsOf(rows[0] as Element)).toMatchObject({ details: "3", yes: "1", no: "2", licences: "CC0-1.0", range: "2026-10-01", old: "0" });
    expect(cellsOf(rows[1] as Element)).toMatchObject({ details: "2", yes: "2", no: "0", range: "2024-03-03 – 2026-10-01", old: "1" });
    expect(text()).toContain("does not say that any source is right");
  });

  it("agrees with the model and with the details it did not record", () => {
    seed(NOTES());
    mount();
    openSources();
    const report = collectSources(NOTES(), TODAY);
    const items = Array.from(root.querySelectorAll(".totals li")).map((li) => li.textContent);
    expect(items).toEqual([`Details with a record: ${report.recorded}`, `Details with no record: ${report.unknown}`]);
    expect(report.recorded + report.unknown).toBe(NOTES().length * FACT_KEYS.length);
  });

  it("names the App's own source in French", () => {
    addNote(store, note("a", "Archive", [{ key: "elevator", value: "yes", source: "Contributor report" }]));
    mount(["fr"]);
    openSources();
    expect(table("sources").querySelector("tbody th")?.textContent).toBe("Rapport d’un contributeur");
    expect(root.querySelector("caption")?.textContent).toContain("Une ligne par source");
  });

  it("says so when nothing is recorded, and shows no table", () => {
    seed([note("e", "Dojo", [])]);
    mount();
    openSources();
    expect(root.querySelector("table")).toBeNull();
    expect(text()).toContain("No details are recorded yet");
    expect(text()).toContain(`Details with no record: ${FACT_KEYS.length}`);
  });

  it("works with no notes at all", () => {
    mount();
    openSources();
    expect(root.querySelector("table")).toBeNull();
    expect(text()).toContain("Details with a record: 0");
    expect(audits.at(-1)).toEqual([]);
  });

  it("offers the same numbers as a text file made on the device", () => {
    seed(NOTES());
    mount();
    openSources();
    const link = root.querySelector<HTMLAnchorElement>("a[download]")!;
    expect(link.getAttribute("download")).toBe("sources-2026-11-15-en.txt");
    expect(link.textContent).toBe("Download as text");
    expect(link.style.minHeight).toBe("44px");
    expect(decodeTextExportHref(link.getAttribute("href") ?? "")).toBe(sourcesToText(collectSources(NOTES(), TODAY), "en"));
    expect(text()).toContain("Nothing is sent anywhere");
  });

  it("changes language in place", () => {
    seed(NOTES());
    mount();
    openSources();
    click(act("set-locale", "fr"));
    expect(heading()).toBe("D’où viennent les détails");
    const link = root.querySelector<HTMLAnchorElement>("a[download]")!;
    expect(link.getAttribute("download")).toBe("sources-2026-11-15-fr.txt");
    expect(decodeTextExportHref(link.getAttribute("href") ?? "")).toContain("Détails avec donnée\u00A0: 5");
  });
});

describe("what your notes say", () => {
  it("counts places, and each row adds up to them", () => {
    seed(NOTES());
    mount();
    openSummary();
    expect(table("summary").getAttribute("data-places")).toBe("4");
    expect(summaryRow("Elevator")).toEqual({ yes: "1", no: "1", differ: "1", unknown: "1" });
    expect(summaryRow("Automatic door")).toEqual({ yes: "1", no: "0", differ: "0", unknown: "3" });
    for (const r of Array.from(table("summary").querySelectorAll("tbody tr"))) {
      expect(Object.values(cellsOf(r)).reduce((n, v) => n + Number(v), 0)).toBe(4);
    }
  });

  it("matches the model for every detail", () => {
    seed(NOTES());
    mount();
    openSummary();
    const s = summarisePlaces(groupPlaces(NOTES(), "en"), TODAY);
    expect(table("summary").querySelectorAll("tbody tr")).toHaveLength(s.rows.length);
    for (const r of s.rows) {
      expect(summaryRow(COPY.facts[r.key].en), r.key).toEqual({ yes: String(r.yes), no: String(r.no), differ: String(r.differ), unknown: String(r.unknown) });
    }
    expect(root.querySelector('a[download]')?.getAttribute("download")).toBe("summary-2026-11-15-en.txt");
  });

  it("lists places with records over a year old and opens them", () => {
    seed(NOTES());
    mount();
    openSummary();
    const items = Array.from(root.querySelectorAll(".old-places li"));
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain("Archive");
    expect(items[0]?.textContent).toContain("Automatic door");
    (items[0]?.querySelector("button") as HTMLElement).click();
    expect(heading()).toBe("Archive");
  });

  it("says when no place has old records", () => {
    seed([note("a", "Archive", [{ key: "elevator", value: "yes", source: SURVEY }])]);
    mount();
    openSummary();
    expect(root.querySelector(".old-places")).toBeNull();
    expect(text()).toContain("No place has records over a year old");
  });

  it("says so when there are no places, and shows no table", () => {
    mount();
    openSummary();
    expect(root.querySelector("table")).toBeNull();
    expect(text()).toContain("No places yet");
  });

  it("downloads the same numbers", () => {
    seed(NOTES());
    mount();
    openSummary();
    const link = root.querySelector<HTMLAnchorElement>("a[download]")!;
    expect(decodeTextExportHref(link.getAttribute("href") ?? "")).toBe(
      `${summaryToText(summarisePlaces(groupPlaces(NOTES(), "en"), TODAY), "en")}\n${coverageLines(groupPlaces(NOTES(), "en"), "en").join("\n")}\n`,
    );
  });
});

describe("places where reports differ", () => {
  it("lists them with the details that differ and opens the place", () => {
    seed(NOTES());
    mount();
    openSummary();
    const items = Array.from(root.querySelectorAll(".differ-places li"));
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain("Cinema");
    expect(items[0]?.textContent).toContain("Elevator");
    expect(text()).toContain("does not pick one");
    (items[0]?.querySelector("button") as HTMLElement).click();
    expect(heading()).toBe("Cinema");
    expect(text()).toContain("Reports differ");
  });

  it("says when none differ", () => {
    seed([note("a", "Archive", [{ key: "elevator", value: "yes", source: SURVEY }])]);
    mount();
    openSummary();
    expect(root.querySelector(".differ-places")).toBeNull();
    expect(text()).toContain("No place has reports that differ.");
  });

  it("follows the source choice, since details from other sources count as Unknown", () => {
    seed(NOTES());
    mount();
    openSummary();
    click(act("summary-source", OPEN));
    expect(root.querySelector(".differ-places")).toBeNull();
    click(act("summary-source", ""));
    expect(root.querySelector(".differ-places")).not.toBeNull();
  });

  it("is in French", () => {
    seed(NOTES());
    mount(["fr"]);
    openSummary();
    expect(text()).toContain("Lieux aux rapports divergents");
    expect(text()).toContain("n’en choisit aucun");
  });
});

describe("one source at a time", () => {
  const pressed = (): string[] => Array.from(root.querySelectorAll('[data-action="summary-source"][aria-pressed="true"]')).map((b) => b.textContent ?? "");

  it("offers a button for each source only when there are two or more", () => {
    seed([note("a", "Archive", [{ key: "elevator", value: "yes", source: SURVEY }])]);
    mount();
    openSummary();
    expect(root.querySelector('[data-action="summary-source"]')).toBeNull();
    shell?.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app") as HTMLElement;
    store = memoryStore();
    seed(NOTES());
    mount();
    openSummary();
    expect(Array.from(root.querySelectorAll('[data-action="summary-source"]')).map((b) => b.textContent)).toEqual(["All sources", SURVEY, OPEN]);
    expect(pressed()).toEqual(["All sources"]);
  });

  it("counts details from the chosen source and treats the rest as Unknown", () => {
    seed(NOTES());
    mount();
    openSummary();
    click(act("summary-source", OPEN));
    expect(pressed()).toEqual([OPEN]);
    expect(summaryRow("Elevator")).toEqual({ yes: "1", no: "0", differ: "0", unknown: "3" });
    expect(summaryRow("Automatic door")).toEqual({ yes: "1", no: "0", differ: "0", unknown: "3" });
    expect(text()).toContain("Details from other sources count as Unknown here");
    click(act("summary-source", SURVEY));
    expect(summaryRow("Elevator")).toEqual({ yes: "1", no: "2", differ: "0", unknown: "1" });
    expect(table("summary").getAttribute("data-places")).toBe("4");
  });

  it("keeps focus on the button that was pressed and says what changed", async () => {
    seed(NOTES());
    mount();
    openSummary();
    click(act("summary-source", OPEN));
    expect((document.activeElement as HTMLElement).getAttribute("data-value")).toBe(OPEN);
    await flush();
    expect(document.querySelector('[role="status"]')?.textContent).toBe(OPEN);
    click(act("summary-source", ""));
    expect((document.activeElement as HTMLElement).textContent).toBe("All sources");
    await flush();
    expect(document.querySelector('[role="status"]')?.textContent).toBe("All sources");
    expect(text()).not.toContain("count as Unknown here");
  });

  it("goes back to all sources after leaving the page", () => {
    seed(NOTES());
    mount();
    openSummary();
    click(act("summary-source", OPEN));
    click(act("view", "places"));
    click(act("view", "summary"));
    expect(pressed()).toEqual(["All sources"]);
  });

  it("keeps the choice when the language changes", () => {
    seed(NOTES());
    mount();
    openSummary();
    click(act("summary-source", OPEN));
    click(act("set-locale", "fr"));
    expect(pressed()).toEqual([OPEN]);
    expect(text()).toContain("Ceux des autres sources comptent comme UNKNOWN ici");
  });

  it("falls back to all sources when the chosen one is gone", () => {
    seed(NOTES());
    mount();
    openSummary();
    click(act("summary-source", OPEN));
    // Hand the shell a source name that no note has.
    const stale = root.querySelector<HTMLElement>(act("summary-source", OPEN))!;
    stale.setAttribute("data-value", "Not a source");
    stale.click();
    expect(pressed()).toEqual(["All sources"]);
    expect(summaryRow("Elevator")).toEqual({ yes: "1", no: "1", differ: "1", unknown: "1" });
  });
});

describe("downloads on other pages", () => {
  it("gives a place its own text file, the same as the model writes", () => {
    seed(NOTES());
    mount();
    openPlaces();
    (Array.from(root.querySelectorAll("article.card")).find((c) => c.querySelector("h4")?.textContent === "Cinema")?.querySelector(act("open-place")) as HTMLElement).click();
    const link = root.querySelector<HTMLAnchorElement>("a[download]")!;
    const place = groupPlaces(NOTES(), "en").find((p) => p.name === "Cinema")!;
    expect(link.getAttribute("download")).toBe(`place-${place.id}-en.txt`);
    expect(decodeTextExportHref(link.getAttribute("href") ?? "")).toBe(placeToText(place, "en", TODAY));
    expect(decodeTextExportHref(link.getAttribute("href") ?? "")).toContain("Reports differ");
  });

  it("gives a comparison its own text file, with what was asked for", () => {
    seed(NOTES());
    mount();
    openPlaces();
    click(act("filter", "yes", "elevator"));
    for (const name of ["Archive", "Cinema"]) {
      (Array.from(root.querySelectorAll("article.card")).find((c) => c.querySelector("h4")?.textContent === name)?.querySelector(act("toggle-compare")) as HTMLElement).click();
    }
    click(act("open-compare"));
    const link = root.querySelector<HTMLAnchorElement>("a[download]")!;
    const places = groupPlaces(NOTES(), "en").filter((p) => p.name === "Archive" || p.name === "Cinema");
    expect(decodeTextExportHref(link.getAttribute("href") ?? "")).toBe(compareToText(places, { elevator: "yes" }, "en", TODAY));
    expect(link.getAttribute("download")).toBe("compare-2-places-en.txt");
  });
});

describe("sources on a place's page", () => {
  const openPlace = (name: string): void => {
    openPlaces();
    (Array.from(root.querySelectorAll("article.card")).find((c) => c.querySelector("h4")?.textContent === name)?.querySelector(act("open-place")) as HTMLElement).click();
  };
  const items = (): string[] => Array.from(root.querySelectorAll(".place-sources li")).map((li) => li.textContent ?? "");

  it("lists the sources behind this place's recorded details, with counts and dates", () => {
    seed(NOTES());
    mount();
    openPlace("Archive");
    expect(root.querySelector("h3")?.textContent).toBe("Where this place’s details come from");
    // Equal counts are listed by name.
    expect(items()).toEqual([`${SURVEY}: 1 detail, 2026-10-01`, `${OPEN}: 1 detail, 2024-03-03`]);
  });

  it("only counts this place's notes", () => {
    seed(NOTES());
    mount();
    openPlace("Cinema");
    expect(items()).toEqual([`${SURVEY}: 1 detail, 2026-10-01`, `${OPEN}: 1 detail, 2026-10-01`]);
  });

  it("says so for a place with nothing recorded, and lists no source", () => {
    seed(NOTES());
    mount();
    openPlace("Dojo");
    expect(root.querySelector(".place-sources")).toBeNull();
    expect(text()).toContain("No details are recorded for this place.");
  });

  it("counts details in the right form in each language", () => {
    expect([0, 1, 2, 5].map((n) => detailCount(n, "en"))).toEqual(["0 details", "1 detail", "2 details", "5 details"]);
    expect([0, 1, 2, 5].map((n) => detailCount(n, "fr"))).toEqual(["0 détail", "1 détail", "2 détails", "5 détails"]);
  });

  it("is in French, with a no-break space before the colon", () => {
    seed(NOTES());
    mount(["fr"]);
    openPlace("Archive");
    expect(root.querySelector("h3")?.textContent).toBe("D’où viennent les détails de ce lieu");
    expect(items()).toEqual([`${SURVEY}\u00A0: 1 détail, 2026-10-01`, `${OPEN}\u00A0: 1 détail, 2024-03-03`]);
  });
});

describe("shortlist file", () => {
  const card = (name: string): HTMLElement =>
    Array.from(root.querySelectorAll<HTMLElement>("article.card")).find((c) => c.querySelector("h4")?.textContent === name) as HTMLElement;

  it("appears only when the shortlist has a place, and holds just those places", () => {
    seed(NOTES());
    mount();
    openPlaces();
    expect(Array.from(root.querySelectorAll("a[download]")).map((a) => a.textContent)).not.toContain("Download shortlist as text");
    (card("Bakery").querySelector(act("toggle-shortlist")) as HTMLElement).click();
    (card("Archive").querySelector(act("toggle-shortlist")) as HTMLElement).click();
    const link = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[download]")).find((a) => a.textContent === "Download shortlist as text")!;
    expect(link.getAttribute("download")).toBe("shortlist-2-places-en.txt");
    const places = groupPlaces(NOTES(), "en").filter((p) => p.name === "Archive" || p.name === "Bakery");
    expect(decodeTextExportHref(link.getAttribute("href") ?? "")).toBe(shortlistToText(places, "en", TODAY));
  });

  it("goes away again when the shortlist is emptied", () => {
    seed(NOTES());
    mount();
    openPlaces();
    (card("Bakery").querySelector(act("toggle-shortlist")) as HTMLElement).click();
    (card("Bakery").querySelector(act("toggle-shortlist")) as HTMLElement).click();
    expect(Array.from(root.querySelectorAll("a[download]")).map((a) => a.textContent)).not.toContain("Download shortlist as text");
  });

  it("is named in French", () => {
    seed(NOTES());
    mount(["fr"]);
    openPlaces();
    (card("Bakery").querySelector(act("toggle-shortlist")) as HTMLElement).click();
    expect(Array.from(root.querySelectorAll("a[download]")).map((a) => a.textContent)).toContain("Télécharger la liste courte en texte");
  });
});

describe("accessibility and wording", () => {
  const axeRun = async (label: string, locale: string): Promise<void> => {
    const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.help}`), `axe ${label} ${locale}`).toEqual([]);
  };

  it.each(["en", "fr"] as const)("passes axe and the App's own audit on every new screen (%s)", async (locale) => {
    seed(NOTES());
    mount([locale]);
    openPlaces();
    await axeRun("places", locale);
    click(act("view", "sources"));
    await axeRun("sources", locale);
    click(act("view", "places"));
    click(act("view", "summary"));
    await axeRun("summary", locale);
    click(act("summary-source", OPEN));
    await axeRun("summary filtered", locale);
    expect(audits.flat().map((v) => `${v.rule}: ${v.detail}`), locale).toEqual([]);
  });

  it("passes the audit with no notes in either language", () => {
    for (const locale of ["en", "fr"]) {
      shell?.destroy();
      document.body.innerHTML = '<div id="app"></div>';
      root = document.getElementById("app") as HTMLElement;
      store = memoryStore();
      mount([locale]);
      openSources();
      click(act("view", "places"));
      click(act("view", "summary"));
      expect(audits.flat().map((v) => `${v.rule}: ${v.detail}`), locale).toEqual([]);
    }
  });

  it("makes every control at least 44 pixels and gives every table a caption", () => {
    seed(NOTES());
    mount();
    openSources();
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("main button, main a.linkbtn"))) expect(el.style.minHeight, el.textContent ?? "").toBe("44px");
    expect(table("sources").querySelector("caption")?.textContent).not.toBe("");
    expect(root.querySelector(".table-wrap")?.getAttribute("tabindex")).toBe("0");
  });

  it("never says a source or detail is verified, reliable or the best", () => {
    seed(NOTES());
    mount();
    for (const open of [openSources, openSummary]) {
      open();
      expect(text()).not.toMatch(/verif|reliable|trusted|official|guarantee|\bbest\b|real-time/i);
      click(act("view", "places"));
    }
  });
});
