// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { EMPTY_ADD, planAdds, type AddOptions, type AddProblem } from "./bulkadd";
import { exportNotes, importNotes } from "./exchange";
import { OPEN_LICENCES } from "./facts";
import { readStreetFile, type StreetFile } from "./filestreets";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import {
  ADD_TEXT_ID,
  DATE_ID,
  LICENCE_ID,
  ONLY_ID,
  SEARCH_ID,
  SOURCE_ID,
  WHO_ME_HINT_ID,
  keyId,
  placeBoxId,
  problemTarget,
  readRecord,
  readTicked,
  renderFileAdd,
  valueId,
  whoId,
  type FileAddContext,
} from "./views-fileadd";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const RECORD: AddOptions = { key: "elevator", value: "yes", who: "source", source: "<i>Transit</i> list", licence: "CC-BY-4.0", recordedOn: "2026-11-01" };

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "<b>Bay</b> Station", [], "1 Bay St"),
        testNote("b", "King Station", [{ key: "elevator", value: "no" }], "2 King St W"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileAddContext> = {}): FileAddContext => ({
  text: "",
  error: undefined,
  file: file(),
  form: EMPTY_ADD,
  search: "",
  onlyUnknown: true,
  problems: [],
  plan: undefined,
  options: undefined,
  ticked: new Set(),
  made: undefined,
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  ...over,
});

const shown = (l: "en" | "fr" = "en", over: Partial<FileAddContext> = {}): FileAddContext => {
  const f = file();
  return ctx(l, { file: f, form: RECORD, options: RECORD, plan: planAdds(f.places, RECORD, TODAY), onlyUnknown: false, ...over });
};

function host(html: string, l: "en" | "fr" = "en"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><div id="host">${html}</div></main>`;
  return document.getElementById("host") as HTMLElement;
}

describe("the page before a file is read", () => {
  it("has the file form and the remove control, with no record form", () => {
    const root = host(renderFileAdd(ctx("en", { file: undefined })));
    expect(root.querySelector("h2")?.textContent).toBe("Add one record to many places");
    expect(root.querySelector('[data-action="fbd-clear"]')?.textContent).toBe("Remove the file and the copy from the page");
    expect(root.querySelector("#fbd-options-form")).toBeNull();
  });

  it("links a file error to the box and marks it invalid", () => {
    const root = host(renderFileAdd(ctx("en", { file: undefined, error: "not-json" })));
    expect(root.querySelector("#fbd-errors a")?.getAttribute("href")).toBe(`#${ADD_TEXT_ID}`);
    expect(root.querySelector(`#${ADD_TEXT_ID}`)?.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("the record form", () => {
  it("starts with nothing chosen and no default licence, showing only places with no record", () => {
    const root = host(renderFileAdd(ctx()));
    expect(root.querySelectorAll("#fbd-options-form input[type=radio]:checked, #fbd-options-form input[type=radio][checked]")).toHaveLength(0);
    expect(root.querySelector<HTMLSelectElement>(`#${LICENCE_ID}`)?.value).toBe("");
    expect(Array.from(root.querySelectorAll(`#${LICENCE_ID} option`)).map((o) => o.getAttribute("value"))).toEqual(["", ...OPEN_LICENCES]);
    expect(root.querySelector<HTMLInputElement>(`#${DATE_ID}`)?.value).toBe("");
    expect(root.querySelector(`#${ONLY_ID}`)?.hasAttribute("checked")).toBe(true);
    expect(Array.from(root.querySelectorAll("#fbd-options-form legend")).map((x) => x.textContent)).toEqual(["Detail", "Answer", "Who recorded it"]);
  });

  it("says what choosing I checked it myself saves, tied to that choice", () => {
    const root = host(renderFileAdd(ctx()));
    expect(root.querySelector(`#${whoId("me")}`)?.getAttribute("aria-describedby")).toBe(WHO_ME_HINT_ID);
    expect(root.querySelector(`#${WHO_ME_HINT_ID}`)?.textContent).toContain("Saved as Contributor report");
    expect(root.querySelector(`#${whoId("source")}`)?.hasAttribute("aria-describedby")).toBe(false);
    const fr = host(renderFileAdd(ctx("fr")), "fr");
    expect(fr.querySelector(`#${WHO_ME_HINT_ID}`)?.textContent).toContain("Rapport d’un contributeur");
  });

  it("marks each problem on its field and links to it from the summary", () => {
    const problems: AddProblem[] = ["no-key", "no-value", "no-who", "source-contributor", "no-licence", "date-future"];
    const root = host(renderFileAdd(ctx("en", { problems, form: { ...EMPTY_ADD, source: "Contributor report", recordedOn: "2030-01-01" } })));
    expect(Array.from(root.querySelectorAll("#fbd-errors a")).map((a) => a.getAttribute("href"))).toEqual([
      `#${keyId("step-free-entry")}`,
      `#${valueId("yes")}`,
      `#${whoId("me")}`,
      `#${SOURCE_ID}`,
      `#${LICENCE_ID}`,
      `#${DATE_ID}`,
    ]);
    expect(root.querySelector(`#${SOURCE_ID}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(root.querySelector(`#${SOURCE_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${SOURCE_ID} e-${SOURCE_ID}-source-contributor`);
    expect(root.querySelector(`#${DATE_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${DATE_ID} e-${DATE_ID}-date-future`);
    expect(root.querySelector<HTMLInputElement>(`#${DATE_ID}`)?.value).toBe("2030-01-01");
  });

  it("sends each problem to the field it is about", () => {
    expect(problemTarget("source-long")).toBe(SOURCE_ID);
    expect(problemTarget("date-bad")).toBe(DATE_ID);
    expect(problemTarget("no-places")).toBe(placeBoxId(0));
  });

  it("reads the record and the filters from the page", () => {
    const root = host(renderFileAdd(ctx()));
    root.querySelector<HTMLInputElement>(`#${keyId("automatic-door")}`)!.checked = true;
    root.querySelector<HTMLInputElement>(`#${valueId("no")}`)!.checked = true;
    root.querySelector<HTMLInputElement>(`#${whoId("me")}`)!.checked = true;
    root.querySelector<HTMLSelectElement>(`#${LICENCE_ID}`)!.value = "CC0-1.0";
    root.querySelector<HTMLInputElement>(`#${DATE_ID}`)!.value = "2026-10-01";
    root.querySelector<HTMLInputElement>(`#${SEARCH_ID}`)!.value = "King";
    root.querySelector<HTMLInputElement>(`#${ONLY_ID}`)!.checked = false;
    expect(readRecord(root)).toEqual({
      form: { key: "automatic-door", value: "no", who: "me", source: "", licence: "CC0-1.0", recordedOn: "2026-10-01" },
      search: "King",
      onlyUnknown: false,
    });
  });
});

describe("the places shown", () => {
  it("states the record and summarises what it would do", () => {
    const root = host(renderFileAdd(shown()));
    expect(root.querySelector("#fbd-list")?.textContent).toBe("Places shown (2)");
    expect(root.querySelector("#fbd-the-record")?.textContent).toBe("Elevator: Yes — <i>Transit</i> list, CC-BY-4.0, dated 2026-11-01");
    expect(root.querySelector("#fbd-the-record i")).toBeNull();
    expect(root.querySelector("#fbd-summary")?.textContent).toBe("2 places shown: 1 with no record, 0 that agree, 1 where reports would differ, 0 where they already differ.");
  });

  it("lists each place unticked, saying what it holds now and what the record would do", () => {
    const root = host(renderFileAdd(shown()));
    expect(Array.from(root.querySelectorAll(".fbd-places label")).map((x) => x.textContent)).toEqual([
      "<b>Bay</b> Station, 1 Bay St — now Unknown; first record for this detail",
      "King Station, 2 King St W — now No; reports would differ",
    ]);
    expect(root.querySelector(".fbd-places b")).toBeNull();
    expect(root.querySelectorAll(".fbd-places input[checked]")).toHaveLength(0);
    expect(root.querySelector('[data-action="fbd-tick-all"]')?.textContent).toBe("Tick every place shown");
  });

  it("lists a place that already holds the record with no tick box, and points the tick problem at a place that has one", () => {
    const r = readStreetFile(
      exportNotes(
        [
          testNote("x", "Bay Station", [{ key: "elevator", value: "yes", source: "<i>Transit</i> list", licence: "CC-BY-4.0", on: "2026-11-01" }], "1 Bay St"),
          testNote("y", "King Station", [], "2 King St W"),
        ],
        "2026-11-01",
      ),
      TODAY,
      "en",
    );
    if (!r.ok) throw new Error(r.error);
    const plan = planAdds(r.file.places, RECORD, TODAY);
    const root = host(renderFileAdd(ctx("en", { file: r.file, form: RECORD, options: RECORD, plan, problems: ["no-places"] })));
    expect(root.querySelector(`#${placeBoxId(0)}`)).toBeNull();
    expect(root.querySelector("#fbd-repeat-0")?.textContent).toContain("already holds this exact record");
    expect(root.querySelector(`#${placeBoxId(1)}`)).not.toBeNull();
    expect(root.querySelector("#fbd-errors a")?.getAttribute("href")).toBe(`#${placeBoxId(1)}`);
    const only = planAdds([r.file.places[0]!], RECORD, TODAY);
    const all = host(renderFileAdd(ctx("en", { file: r.file, form: RECORD, options: RECORD, plan: only })));
    expect(all.querySelector("#fbd-none")?.textContent).toBe("Every place shown already holds this exact record. Nothing would be added.");
    expect(all.querySelector("#fbd-places-form")).toBeNull();
  });

  it("says so when no place matches", () => {
    const root = host(renderFileAdd(shown("en", { plan: [] })));
    expect(root.querySelector("#fbd-none")?.textContent).toBe("No place matches.");
    expect(root.querySelector("#fbd-places-form")).toBeNull();
  });

  it("marks the list when no place is ticked, and links to it", () => {
    const root = host(renderFileAdd(shown("en", { problems: ["no-places"] })));
    expect(root.querySelector("#fbd-errors a")?.getAttribute("href")).toBe(`#${placeBoxId(0)}`);
    expect(root.querySelector("#e-fbd-places")?.textContent).toBe("Tick at least one place.");
  });

  it("reads which places are ticked", () => {
    const c = shown();
    const root = host(renderFileAdd(c));
    root.querySelector<HTMLInputElement>(`#${placeBoxId(1)}`)!.checked = true;
    expect([...readTicked(root, c.plan!)]).toEqual([c.plan![1]!.place.id]);
  });

  it("shows the copy with its summary and downloads once made", () => {
    const c = shown();
    const made = new Set(c.plan!.map((a) => a.place.id));
    const root = host(renderFileAdd({ ...c, ticked: made, made }));
    expect(root.querySelector("#fbd-copy-summary")?.textContent).toBe("Record added to 2 places, in 2 new notes; reports now differ at 1 place.");
    const href = root.querySelector('a[download="notes-record-added-2026-11-21.json"]')?.getAttribute("href") ?? "";
    const back = importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.map((n) => n.id)).toEqual(["a", "b", "add-20261121-1", "add-20261121-2"]);
    expect(root.querySelector('a[download="records-added-2026-11-21.csv"]')).not.toBeNull();
  });
});

describe("accessibility", () => {
  for (const l of ["en", "fr"] as const) {
    it(`has no axe or App audit problems with the record, places and a copy (${l})`, async () => {
      const c = shown(l);
      const made = new Set([c.plan![0]!.place.id]);
      host(renderFileAdd({ ...c, ticked: made, made, statusMessage: "ok" }), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(auditDom(document.body, { locale: l })).toEqual([]);
    });

    it(`has no axe or App audit problems with every record problem shown (${l})`, async () => {
      const problems: AddProblem[] = ["no-key", "no-value", "no-who", "source-empty", "no-licence", "date-empty"];
      host(renderFileAdd(ctx(l, { problems })), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(auditDom(document.body, { locale: l })).toEqual([]);
    });

    it(`has no axe problems before a file is read (${l})`, async () => {
      host(renderFileAdd(ctx(l, { file: undefined, error: "empty" })), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
    });
  }

  it("gives every control a 44 by 44 target and a label", () => {
    const root = host(renderFileAdd(shown()));
    for (const box of Array.from(root.querySelectorAll('input[type="checkbox"], input[type="radio"]'))) expect(box.closest("label.choice")?.getAttribute("style"), box.id).toContain("min-height:44px;min-width:44px");
    for (const input of Array.from(root.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), textarea, select'))) {
      expect(input.getAttribute("style"), input.id).toContain("min-height:44px");
      expect(root.querySelector(`label[for="${input.id}"]`), input.id).not.toBeNull();
    }
  });

  it("puts the French page in French with UNKNOWN", () => {
    const root = host(renderFileAdd(shown("fr")), "fr");
    expect(root.querySelector("section")?.getAttribute("lang")).toBe("fr");
    expect(root.querySelector(".fbd-places label")?.textContent).toBe("<b>Bay</b> Station, 1 Bay St — maintenant\u00A0: UNKNOWN\u202F; première donnée pour ce détail");
    expect(root.textContent?.toLowerCase()).not.toContain("inconnu");
  });
});
