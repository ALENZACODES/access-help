// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { exportNotes } from "./exchange";
import { DEFAULT_LIST_OPTIONS, groupFile, readStreetFile, shareGroups, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import {
  BOTH_SIDES_ID,
  ONLY_OPEN_ID,
  PEOPLE_ID,
  STREETS_TEXT_ID,
  byRadioId,
  isGroupBy,
  peopleFrom,
  renderBatch,
  renderFileStreets,
  renderGroup,
  renderOptions,
  renderUngrouped,
  sharedText,
  type FileStreetsContext,
} from "./views-filestreets";

const TODAY = new Date(Date.UTC(2026, 10, 20));

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes([testNote("a", "Library", [], "100 King St W"), testNote("b", "<b>Café</b>", [], "12 King St W"), testNote("c", "Kiosk", [], null)], "2026-11-01"),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en"): FileStreetsContext => ({
  text: "",
  error: undefined,
  file: file(),
  options: DEFAULT_LIST_OPTIONS,
  peopleText: "1",
  peopleError: false,
  locale: l,
  today: TODAY,
  statusMessage: undefined,
});

/** A list sits under the page's h2 and a "Streets" h3. */
function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><h2>Sort</h2><h3>Streets</h3>${inner}</main>`;
  return document.body;
}

describe("renderGroup", () => {
  it("lists a street's places in order, escapes names, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const g = groupFile(file(), DEFAULT_LIST_OPTIONS, l).groups[0];
      if (!g) throw new Error("no group");
      const el = page(`<ul>${renderGroup(g, 0, ctx(l))}</ul>`, l);
      expect(el.querySelector("b")).toBeNull();
      expect(Array.from(el.querySelectorAll("ol li")).map((li) => li.textContent?.split(",")[0])).toEqual(["<b>Café</b>", "Library"]);
      expect(el.querySelectorAll("a.linkbtn")).toHaveLength(2);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("renderUngrouped", () => {
  it("is empty without places and lists them with a hint otherwise", () => {
    expect(renderUngrouped([], "street", 0, ctx())).toBe("");
    const g = groupFile(file(), DEFAULT_LIST_OPTIONS, "en");
    const el = page(renderUngrouped(g.ungrouped, "street", 1, ctx()), "en");
    expect(el.querySelector("#fst-ungrouped")?.textContent).toBe("Places with no street in the address (1)");
    expect(el.querySelector(".fst-ungrouped")?.textContent).toBe("Kiosk, No address");
  });
});

describe("renderBatch", () => {
  it("shows an empty list with its heading only", () => {
    const batches = shareGroups(groupFile(file(), DEFAULT_LIST_OPTIONS, "en"), 4);
    const empty = batches.find((b) => b.size === 0);
    if (!empty) throw new Error("no empty batch");
    const el = page(`<ul>${renderBatch(empty, "street", ctx())}</ul>`, "en");
    expect(el.querySelector("h4")?.textContent).toBe(`Person ${empty.index + 1} (0 places)`);
    expect(el.querySelectorAll("a.linkbtn")).toHaveLength(0);
  });
});

describe("isGroupBy", () => {
  it("knows the two ways to group", () => {
    expect(isGroupBy("street")).toBe(true);
    expect(isGroupBy("postal")).toBe(true);
    expect(isGroupBy("city")).toBe(false);
    expect(isGroupBy(null)).toBe(false);
  });
});

describe("renderOptions", () => {
  it("shows the chosen options as checked", () => {
    const el = page(renderOptions({ ...ctx(), options: { by: "postal", bothSides: true, onlyOpen: true, people: 3 }, peopleText: "3" }), "en");
    expect(el.querySelector<HTMLInputElement>(`#${byRadioId("postal")}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>(`#${byRadioId("street")}`)?.checked).toBe(false);
    expect(el.querySelector<HTMLInputElement>(`#${BOTH_SIDES_ID}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>(`#${ONLY_OPEN_ID}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>(`#${PEOPLE_ID}`)?.value).toBe("3");
  });

  it("ties a wrong number of people to its error, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderOptions({ ...ctx(l), peopleText: "40", peopleError: true }), l);
      const input = el.querySelector<HTMLInputElement>(`#${PEOPLE_ID}`);
      expect(input?.getAttribute("aria-invalid")).toBe("true");
      expect(input?.getAttribute("aria-describedby")).toBe(`h-${PEOPLE_ID} e-${PEOPLE_ID}`);
      expect(el.querySelector(`#e-${PEOPLE_ID}`)?.textContent).not.toBe("");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("renderFileStreets", () => {
  it("lists both errors in the summary, each linked to its field", () => {
    document.documentElement.lang = "en";
    document.body.innerHTML = `<main><h1>The App</h1>${renderFileStreets({ ...ctx(), error: "not-json", peopleError: true, peopleText: "0" })}</main>`;
    const links = Array.from(document.querySelectorAll("#fst-errors a")).map((a) => a.getAttribute("href"));
    expect(links).toEqual([`#${STREETS_TEXT_ID}`, `#${PEOPLE_ID}`]);
    expect(document.querySelector("#fst-errors")?.getAttribute("role")).toBe("alert");
  });

  it("shows no results before a file is read", () => {
    document.body.innerHTML = renderFileStreets({ ...ctx(), file: undefined });
    expect(document.querySelector("#fst-summary")).toBeNull();
    expect(document.querySelector("#fst-options-form")).toBeNull();
  });
});

describe("peopleFrom", () => {
  it("takes a whole number from 1 to 20", () => {
    expect(peopleFrom("1")).toBe(1);
    expect(peopleFrom(" 20 ")).toBe(20);
    expect(peopleFrom("05")).toBe(5);
  });

  it("refuses anything else", () => {
    for (const s of ["", "0", "21", "2.5", "-1", "1e1", "two", "100"]) expect(peopleFrom(s)).toBeUndefined();
  });
});

describe("sharedText", () => {
  it("says how many places are on each list, with French spacing", () => {
    const batches = shareGroups(groupFile(file(), DEFAULT_LIST_OPTIONS, "en"), 2);
    expect(sharedText(batches, "en")).toBe("Person 1: 2, Person 2: 1");
    expect(sharedText(batches, "fr")).toBe("Personne 1\u00A0: 2, Personne 2\u00A0: 1");
  });
});
