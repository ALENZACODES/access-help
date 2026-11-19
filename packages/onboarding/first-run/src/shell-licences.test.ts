// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, decodeTextExportHref, type Note } from "./index";
import { LICENCE_COPY, collectLicences, licencesToText } from "./licences";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("l1", "Library", [
    { key: "step-free-entry", value: "yes", licence: "ODbL-1.0", source: "Map survey", on: "2025-03-01" },
    { key: "elevator", value: "no", licence: "CC0-1.0", on: "2026-02-10" },
  ]),
  testNote("b1", "Bakery", [{ key: "automatic-door", value: "yes", licence: "CC0-1.0", source: CONTRIBUTOR_SOURCE, on: "2026-09-09" }], "2 Main St"),
];

function open(): void {
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("view", "sources"));
}

const rows = (): Array<Record<string, string>> =>
  Array.from(h.root.querySelectorAll('table[data-kind="licences"] tbody tr')).map((r) => ({
    licence: r.querySelector("th")?.textContent ?? "",
    ...Object.fromEntries(Array.from(r.querySelectorAll("td")).map((td) => [td.getAttribute("data-col") ?? "", td.textContent ?? ""])),
  }));

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("records by licence on the sources page", () => {
  it("shows one row per licence, with counts that add up", () => {
    h.seed(NOTES());
    h.mount();
    open();
    expect(rows()).toEqual([
      { licence: "CC0-1.0", records: "2", yes: "1", no: "1", sources: "City survey, Contributor report", notes: "2", range: "2026-02-10 – 2026-09-09" },
      { licence: "ODbL-1.0", records: "1", yes: "1", no: "0", sources: "Map survey", notes: "1", range: "2025-03-01" },
    ]);
    expect(h.root.querySelector('table[data-kind="licences"]')?.getAttribute("data-records")).toBe("3");
  });

  it("shows every string of the section, in both languages", () => {
    h.seed(NOTES());
    for (const l of ["en", "fr"] as const) {
      h.mount(l);
      open();
      const section = h.root.querySelector("section.licences")?.textContent ?? "";
      for (const key of ["title", "intro", "noAdvice", "caption", "licence", "records", "sources", "notes", "range", "download"] as const) {
        expect(section, `${key} ${l}`).toContain(LICENCE_COPY[key][l]);
      }
    }
  });

  it("names the table region by its caption and lets the keyboard reach it", () => {
    h.seed(NOTES());
    h.mount();
    open();
    const wrap = h.root.querySelector("section.licences .table-wrap");
    expect(wrap?.getAttribute("tabindex")).toBe("0");
    expect(wrap?.getAttribute("role")).toBe("region");
    expect(h.root.querySelector(`#${wrap?.getAttribute("aria-labelledby") ?? "x"}`)?.textContent).toBe(LICENCE_COPY.caption.en);
  });

  it("keeps the sources download first and offers the licence counts as their own file", () => {
    h.seed(NOTES());
    h.mount();
    open();
    const links = Array.from(h.root.querySelectorAll<HTMLAnchorElement>("main a[download]"));
    expect(links.map((a) => a.getAttribute("download"))).toEqual(["sources-2026-11-19-en.txt", "records-by-licence-2026-11-19-en.txt"]);
    expect(decodeTextExportHref(links[1]?.getAttribute("href") ?? "")).toBe(licencesToText(collectLicences(NOTES()), "en", TODAY));
  });

  it("is not shown when the notes hold no record", () => {
    h.seed([testNote("e1", "Empty", [])]);
    h.mount();
    open();
    expect(h.root.querySelector("section.licences")).toBeNull();
  });

  it.each(["en", "fr"] as const)("passes axe and the App's own audit (%s)", async (locale) => {
    h.seed(NOTES());
    h.mount(locale);
    open();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(h.auditLines(), locale).toEqual([]);
    for (const el of Array.from(h.root.querySelectorAll<HTMLElement>("section.licences a"))) expect(el.style.minHeight).toBe("44px");
  });
});
