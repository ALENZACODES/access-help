// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { readStreetFile, type StreetFile } from "./filestreets";
import { DEFAULT_FIRST, formFor, placeNeeds, rankPlaces, rankStreets } from "./lookfirst";
import { testNote } from "./testnotes";
import {
  AREA_ID,
  COUNT_ID,
  FIRST_TEXT_ID,
  OLD_ID,
  fieldId,
  keyId,
  orderId,
  readFirstForm,
  renderFileFirst,
  renderFirstForm,
  renderNeeds,
  renderRanking,
  renderStreet,
  viewId,
  type FileFirstContext,
} from "./views-filefirst";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes([testNote("a", "<b>Café</b>", [{ key: "elevator", value: "yes" }], "12 King St W"), testNote("b", "Kiosk", [], null)], "2026-11-01"),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileFirstContext> = {}): FileFirstContext => ({
  text: "",
  error: undefined,
  file: file(),
  options: DEFAULT_FIRST,
  form: formFor(DEFAULT_FIRST),
  problems: [],
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  ...over,
});

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><h2>First</h2>${inner}</main>`;
  return document.body;
}

describe("renderNeeds", () => {
  it("escapes the place's name and lists its reasons, passing the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const p = file().places.find((x) => x.name === "<b>Café</b>");
      if (!p) throw new Error("no place");
      const el = page(`<h3>List</h3><ol>${renderNeeds(placeNeeds(p, FACT_KEYS, true, TODAY), 0, l)}</ol>`, l);
      expect(el.querySelector("b")).toBeNull();
      expect(el.querySelector("h4")?.textContent).toBe("<b>Café</b>");
      expect(el.querySelectorAll(".ffl-reasons li")).toHaveLength(1);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("says when a place has no address", () => {
    const p = file().places.find((x) => x.name === "Kiosk");
    if (!p) throw new Error("no place");
    const el = page(`<h3>List</h3><ol>${renderNeeds(placeNeeds(p, FACT_KEYS, true, TODAY), 1, "en")}</ol>`, "en");
    expect(el.querySelector("p span")?.textContent).toBe("No address");
    expect(el.querySelector("p.hint")?.textContent).toBe("Nothing recorded yet");
  });
});

describe("renderRanking", () => {
  it("lists the first places in order with both downloads", () => {
    const el = page(renderRanking(ctx(), file()), "en");
    expect(el.querySelector("#ffl-summary")?.textContent).toBe("2 places have something to look at; all are listed.");
    expect(Array.from(el.querySelectorAll(".ffl-places h4")).map((h) => h.textContent)).toEqual(["Kiosk", "<b>Café</b>"]);
    expect(Array.from(el.querySelectorAll("a.linkbtn")).map((a) => a.getAttribute("download"))).toEqual(["notes-first-2-places-2026-11-21.json", "ranking-2-places-2026-11-21.csv", "list-2-places-2026-11-21.txt"]);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows no downloads or list when nothing is open", () => {
    const el = page(renderRanking(ctx("en", { options: { ...DEFAULT_FIRST, area: "nowhere" } }), file()), "en");
    expect(el.querySelector("a.linkbtn")).toBeNull();
    expect(el.querySelector(".ffl-places")).toBeNull();
    expect(el.querySelector("#ffl-list")?.textContent).toBe("First places (0)");
  });

  it("says a year-old record is not wrong only when year-old records count", () => {
    expect(page(renderRanking(ctx(), file()), "en").textContent).toContain("A year-old record is not wrong.");
    expect(page(renderRanking(ctx("en", { options: { ...DEFAULT_FIRST, includeOld: false } }), file()), "en").textContent).not.toContain("A year-old record is not wrong.");
  });
});

describe("the streets view", () => {
  it("lists each street as the person's own text with what is open, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const s = rankStreets(rankPlaces(file(), DEFAULT_FIRST, TODAY, l), l).streets[0];
      if (!s) throw new Error("no street");
      const el = page(`<h3>Streets</h3><ol>${renderStreet(s, 0, l)}</ol>`, l);
      expect(el.querySelector("h4 [data-user-content]")?.textContent).toBe("King Street West");
      expect(el.querySelector(".ffl-street-places li")?.textContent).toBe("<b>Café</b>, 12 King St W");
      expect(el.querySelector("b")).toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("shows the streets, their downloads and the places with no street", () => {
    const el = page(renderRanking(ctx("en", { options: { ...DEFAULT_FIRST, view: "streets" }, form: formFor({ ...DEFAULT_FIRST, view: "streets" }) }), file()), "en");
    expect(el.querySelector("#ffl-summary")?.textContent).toBe("1 street has something to look at; it is listed. 1 place with no street in the address.");
    expect(el.querySelector("#ffl-list")?.textContent).toBe("First streets (1)");
    expect(el.querySelector(".ffl-no-street")?.textContent).toBe("Kiosk, No address");
    expect(el.querySelector<HTMLInputElement>(`#${viewId("streets")}`)?.checked).toBe(true);
    expect(Array.from(el.querySelectorAll("a.linkbtn")).map((a) => a.getAttribute("download"))).toEqual(["notes-first-1-streets-2026-11-21.json", "ranking-1-streets-2026-11-21.csv", "list-1-streets-2026-11-21.txt"]);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });
});

describe("renderFirstForm", () => {
  it("shows the chosen options", () => {
    const el = page(renderFirstForm(ctx("en", { form: { view: "places", order: "oldest", keys: ["elevator"], includeOld: false, area: "M5H", count: "7" } })), "en");
    expect(el.querySelector<HTMLInputElement>(`#${orderId("oldest")}`)?.checked).toBe(true);
    expect(FACT_KEYS.filter((k) => el.querySelector<HTMLInputElement>(`#${keyId(k)}`)?.checked)).toEqual(["elevator"]);
    expect(el.querySelector<HTMLInputElement>(`#${OLD_ID}`)?.checked).toBe(false);
    expect(el.querySelector<HTMLInputElement>(`#${AREA_ID}`)?.value).toBe("M5H");
    expect(el.querySelector<HTMLInputElement>(`#${COUNT_ID}`)?.value).toBe("7");
  });

  it("ties each problem to its field and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(
        renderFirstForm(
          ctx(l, {
            form: { ...formFor(DEFAULT_FIRST), keys: [], area: "x".repeat(61), count: "0" },
            problems: [
              { field: "keys", code: "keys" },
              { field: "area", code: "area" },
              { field: "count", code: "count" },
            ],
          }),
        ),
        l,
      );
      expect(el.querySelector("#e-ffl-keys")).not.toBeNull();
      expect(el.querySelector(`#${AREA_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${AREA_ID} e-${AREA_ID}`);
      expect(el.querySelector(`#${COUNT_ID}`)?.getAttribute("aria-describedby")).toBe(`e-${COUNT_ID}`);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("renderFileFirst", () => {
  it("links the file error and each problem from the summary", () => {
    document.body.innerHTML = renderFileFirst(ctx("en", { error: "empty", problems: [{ field: "keys", code: "keys" }, { field: "count", code: "count" }] }));
    expect(Array.from(document.querySelectorAll("#ffl-errors a")).map((a) => a.getAttribute("href"))).toEqual([`#${FIRST_TEXT_ID}`, `#${fieldId("keys")}`, `#${COUNT_ID}`]);
    expect(fieldId("keys")).toBe(keyId("step-free-entry"));
    expect(fieldId("area")).toBe(AREA_ID);
  });

  it("shows no ranking before a file is read", () => {
    document.body.innerHTML = renderFileFirst(ctx("en", { file: undefined }));
    expect(document.querySelector("#ffl-summary")).toBeNull();
  });
});

describe("readFirstForm", () => {
  it("reads the choices on the page, and falls back when there is no form", () => {
    document.body.innerHTML = renderFirstForm(ctx());
    (document.getElementById(orderId("differ")) as HTMLInputElement).checked = true;
    (document.getElementById(viewId("streets")) as HTMLInputElement).checked = true;
    (document.getElementById(keyId("elevator")) as HTMLInputElement).checked = false;
    (document.getElementById(AREA_ID) as HTMLInputElement).value = "Queen";
    const f = readFirstForm(document.body, formFor(DEFAULT_FIRST));
    expect(f).toEqual({ view: "streets", order: "differ", keys: ["step-free-entry", "accessible-washroom", "automatic-door"], includeOld: true, area: "Queen", count: "10" });
    document.body.innerHTML = "";
    expect(readFirstForm(document.body, formFor(DEFAULT_FIRST))).toEqual(formFor(DEFAULT_FIRST));
  });
});
