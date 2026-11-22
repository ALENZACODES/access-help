// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { compare, snapshot, sourcesSince } from "./asof";
import { auditDom } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { parseNote, type Note } from "./model";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { ASOF_TEXT_ID, DAY_ID, TO_ID, renderFileAsof, renderTable, type FileAsofContext } from "./views-fileasof";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function madeOn(n: Note, day: string): Note {
  const out = parseNote({ ...n, createdOn: day });
  if (!out) throw new Error("bad note");
  return out;
}

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        madeOn(testNote("a", "<b>Library</b>", [{ key: "elevator", value: "yes", on: "2026-03-10" }], "1 King St W"), "2026-03-10"),
        madeOn(testNote("b", "Park", [{ key: "elevator", value: "no", on: "2026-08-01" }], null), "2026-08-01"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileAsofContext> = {}): FileAsofContext => ({
  text: "",
  error: undefined,
  file: file(),
  day: "",
  to: "",
  problem: undefined,
  toProblem: undefined,
  snapshot: undefined,
  comparison: undefined,
  sources: [],
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  ...over,
});

const shown = (l: "en" | "fr" = "en", day = "2026-03-31"): FileAsofContext => {
  const f = file();
  const s = snapshot(f, day);
  return ctx(l, { file: f, day, snapshot: s, comparison: compare(f, s, l) });
};

function host(html: string, l: "en" | "fr" = "en"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><div id="host">${html}</div></main>`;
  return document.getElementById("host") as HTMLElement;
}

describe("the page", () => {
  it("has the file form and the remove control, with no day form before a file is read", () => {
    const root = host(renderFileAsof(ctx("en", { file: undefined })));
    expect(root.querySelector("h2")?.textContent).toBe("A notes file as it was on a day");
    expect(root.querySelector('[data-action="fas-clear"]')?.textContent).toBe("Remove the file and the comparison from the page");
    expect(root.querySelector("#fas-day-form")).toBeNull();
  });

  it("links a file error to the box and marks it invalid", () => {
    const root = host(renderFileAsof(ctx("en", { file: undefined, error: "no-notes" })));
    expect(root.querySelector("#fas-errors a")?.getAttribute("href")).toBe(`#${ASOF_TEXT_ID}`);
    expect(root.querySelector(`#${ASOF_TEXT_ID}`)?.getAttribute("aria-invalid")).toBe("true");
  });

  it("asks for the day once a file is read, with a focusable heading", () => {
    const root = host(renderFileAsof(ctx()));
    expect(root.querySelector("#fas-day-title")?.getAttribute("tabindex")).toBe("-1");
    expect(root.querySelector(`#${DAY_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${DAY_ID}`);
    expect(root.querySelector("#fas-results")).toBeNull();
  });

  it("marks a problem with the day and links to it, keeping what was typed", () => {
    const root = host(renderFileAsof(ctx("en", { day: "2030-01-01", problem: "future" })));
    expect(root.querySelector("#fas-errors a")?.getAttribute("href")).toBe(`#${DAY_ID}`);
    expect(root.querySelector(`#${DAY_ID}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(root.querySelector(`#${DAY_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${DAY_ID} e-${DAY_ID}`);
    expect(root.querySelector<HTMLInputElement>(`#${DAY_ID}`)?.value).toBe("2030-01-01");
    expect(root.querySelector(`#e-${DAY_ID}`)?.textContent).toBe("Choose today or a day before it.");
  });
});

describe("the results", () => {
  it("sums up the file on the day", () => {
    const root = host(renderFileAsof(shown()));
    expect(root.querySelector("#fas-results")?.textContent).toBe("The file on 2026-03-31");
    expect(root.querySelector("#fas-summary")?.textContent).toBe("On 2026-03-31 the file held 1 of its 2 notes, 1 place of 2; 1 note was made later, and 0 records in the others were made later.");
  });

  it("shows a table with a caption, column headers and a row for each detail", () => {
    const root = host(renderFileAsof(shown()));
    expect(root.querySelector("#fas-table caption")?.textContent).toBe("Places with an answer, on the day and now");
    expect(Array.from(root.querySelectorAll("#fas-table thead th")).map((th) => [th.getAttribute("scope"), th.textContent])).toEqual([
      ["col", "Detail"],
      ["col", "On the day"],
      ["col", "Now"],
      ["col", "Change"],
    ]);
    const rows = Array.from(root.querySelectorAll("#fas-table tbody tr"));
    expect(rows).toHaveLength(4);
    const elevator = rows.find((r) => r.querySelector("th")?.textContent === "Elevator")!;
    expect(elevator.querySelector("th")?.getAttribute("scope")).toBe("row");
    expect(Array.from(elevator.querySelectorAll("td")).map((td) => td.textContent)).toEqual([
      "1 (1 Yes, 0 No, 0 with reports that differ, 0 Unknown)",
      "2 (1 Yes, 1 No, 0 with reports that differ, 0 Unknown)",
      "+1",
    ]);
  });

  it("lists the places answered since, detail by detail, escaping what the file holds", () => {
    const root = host(renderFileAsof(shown("en", "2026-01-01")));
    expect(Array.from(root.querySelectorAll(".fas-answered li")).map((li) => li.textContent)).toEqual(["<b>Library</b>, 1 King St W", "Park"]);
    expect(root.querySelector(".fas-answered b")).toBeNull();
    expect(Array.from(root.querySelectorAll("h4 + p.hint")).map((p) => p.textContent)).toContain("No place got an answer for this detail since the day.");
  });

  it("offers the file as it was, and the comparison as CSV and text", () => {
    const root = host(renderFileAsof(shown()));
    const href = root.querySelector('a[download="notes-as-of-2026-03-31.json"]')?.getAttribute("href") ?? "";
    expect(importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, ""))).notes.map((n) => n.id)).toEqual(["a"]);
    expect(root.querySelector('a[download="comparison-since-2026-03-31.csv"]')).not.toBeNull();
    const text = decodeTextExportHref(root.querySelector('a[download="comparison-since-2026-03-31.txt"]')?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("      - Park: not in the file → No\n");
  });

  it("renders the table on its own in French", () => {
    const { comparison } = shown("fr");
    const root = host(renderTable(comparison!, "fr"), "fr");
    expect(root.querySelector("caption")?.textContent).toBe("Lieux avec une réponse, à la date et maintenant");
    expect(root.querySelector("tbody td span")?.textContent).toContain("UNKNOWN");
  });
});

describe("a second day, changes and sources", () => {
  it("has the optional second day, described by its hint, and marks a problem with it", () => {
    const root = host(renderFileAsof(ctx()));
    expect(root.querySelector(`#${TO_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${TO_ID}`);
    const bad = host(renderFileAsof(ctx("en", { day: "2026-03-31", to: "2026-03-01", toProblem: "not-after" })));
    expect(bad.querySelector("#fas-errors a")?.getAttribute("href")).toBe(`#${TO_ID}`);
    expect(bad.querySelector(`#${TO_ID}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(bad.querySelector<HTMLInputElement>(`#${TO_ID}`)?.value).toBe("2026-03-01");
  });

  it("titles the results and heads the table with the second day", () => {
    const f = file();
    const s = snapshot(f, "2026-03-31");
    const root = host(renderFileAsof(ctx("en", { file: f, day: "2026-03-31", to: "2026-09-30", snapshot: s, comparison: compare(f, s, "en", snapshot(f, "2026-09-30")) })));
    expect(root.querySelector("#fas-results")?.textContent).toBe("The file from 2026-03-31 to 2026-09-30");
    expect(root.querySelectorAll("#fas-table thead th")[2]?.textContent).toBe("On 2026-09-30");
    expect(root.querySelector('a[download="comparison-2026-03-31-2026-09-30.csv"]')).not.toBeNull();
  });

  it("lists the places that read differently, detail by detail", () => {
    const root = host(renderFileAsof(shown()));
    expect(Array.from(root.querySelectorAll(".fas-changed li")).map((li) => li.textContent)).toEqual(["Park: not in the file → No"]);
    expect(Array.from(root.querySelectorAll("h4 ~ p.hint")).map((p) => p.textContent)).toContain("No place reads differently for this detail.");
  });

  it("offers the places that read differently as a CSV, only when there are some", () => {
    const root = host(renderFileAsof(shown()));
    const href = root.querySelector('a[download="places-changed-2026-03-31.csv"]')?.getAttribute("href") ?? "";
    expect(decodeURIComponent(href)).toContain("elevator,Park,,absent,no");
    const f = file();
    const s = snapshot(f, "2026-11-21");
    const same = host(renderFileAsof(ctx("en", { file: f, day: "2026-11-21", snapshot: s, comparison: compare(f, s, "en") })));
    expect(same.querySelector('a[download^="places-changed"]')).toBeNull();
  });

  it("lists who added records since, or says no one did", () => {
    const f = file();
    const c = shown();
    const root = host(renderFileAsof({ ...c, sources: sourcesSince(f, "2026-03-31") }));
    expect(Array.from(root.querySelectorAll(".fas-sources li")).map((li) => li.textContent)).toEqual(["City survey: 1 record at 1 place"]);
    const none = host(renderFileAsof(shown()));
    expect(none.querySelector("#fas-sources + p")?.textContent).toBe("No record was made since the day.");
  });
});

describe("accessibility", () => {
  for (const l of ["en", "fr"] as const) {
    it(`has no axe or App audit problems with results (${l})`, async () => {
      host(renderFileAsof({ ...shown(l, "2026-01-01"), statusMessage: "ok" }), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(auditDom(document.body, { locale: l })).toEqual([]);
    });

    it(`has no axe or App audit problems with a problem shown (${l})`, async () => {
      host(renderFileAsof(ctx(l, { day: "x", problem: "bad" })), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(auditDom(document.body, { locale: l })).toEqual([]);
    });

    it(`has no axe problems before a file is read (${l})`, async () => {
      host(renderFileAsof(ctx(l, { file: undefined, error: "empty" })), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
    });
  }

  it("gives every control a 44 pixel target and a label", () => {
    const root = host(renderFileAsof(shown()));
    for (const input of Array.from(root.querySelectorAll("input, textarea"))) {
      expect(input.getAttribute("style"), input.id).toContain("min-height:44px");
      expect(root.querySelector(`label[for="${input.id}"]`), input.id).not.toBeNull();
    }
    for (const a of Array.from(root.querySelectorAll("a[download]"))) expect(a.getAttribute("style")).toContain("min-height:44px;min-width:44px");
  });
});
