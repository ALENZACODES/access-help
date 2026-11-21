// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { NO_FIXES, checkAddresses } from "./addresscheck";
import { auditDom } from "./audit";
import { exportNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import {
  ADDRESS_TEXT_ID,
  firstFixId,
  hasFix,
  nameId,
  postalId,
  readFixes,
  renderCopy,
  renderFileAddress,
  renderIssue,
  renderNames,
  renderStreets,
  streetId,
  type FileAddressContext,
} from "./views-fileaddress";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(notes = [
  testNote("d", "<b>Deli</b>", [], "7 Queen St E, M5C 2NO"),
  testNote("k", "Kiosk", [], "Market Square"),
  testNote("a", "A", [], "1 King St W"),
  testNote("b", "B", [], "2 King Street West"),
]): StreetFile {
  const r = readStreetFile(exportNotes(notes, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileAddressContext> = {}): FileAddressContext => ({
  text: "",
  error: undefined,
  file: file(),
  picked: NO_FIXES,
  applied: NO_FIXES,
  copyMade: false,
  noneError: false,
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  ...over,
});

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1>${inner}</main>`;
  return document.body;
}

describe("renderFileAddress", () => {
  it("lists each kind of issue with its places, escaped, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileAddress(ctx(l)), l);
      expect(el.querySelector("b")).toBeNull();
      expect(el.querySelector(".fad-no-street li")?.textContent).toBe("Kiosk, Market Square");
      expect(el.querySelector(`label[for="${postalId(1)}"]`)?.textContent).toBe(l === "en" ? "Use M5C 2NO → M5C 2N0" : "Utiliser M5C 2NO → M5C 2N0");
      expect(el.querySelectorAll(`#${streetId(0)} option`)).toHaveLength(3);
      expect(el.querySelector("#fad-fix-form")).not.toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("offers to tick every suggested code only when there is one", () => {
    expect(page(renderFileAddress(ctx()), "en").querySelector('[data-action="fad-tick-all"]')).not.toBeNull();
    const streetsOnly = page(renderFileAddress(ctx("en", { file: file([testNote("a", "A", [], "1 King St W"), testNote("b", "B", [], "2 King Street West")]) })), "en");
    expect(streetsOnly.querySelector("#fad-fix-form")).not.toBeNull();
    expect(streetsOnly.querySelector('[data-action="fad-tick-all"]')).toBeNull();
  });

  it("offers no fix form when there is nothing to fix, only the lists", () => {
    const el = page(renderFileAddress(ctx("en", { file: file([testNote("k", "Kiosk", [], "Market Square")]) })), "en");
    expect(el.querySelector("#fad-fix-form")).toBeNull();
    expect(el.querySelector(".fad-no-street")).not.toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows no download and no lists for clean addresses", () => {
    const el = page(renderFileAddress(ctx("en", { file: file([testNote("a", "A", [], "1 Oak St, M5H 2N2")]) })), "en");
    expect(el.querySelector("a.linkbtn")).toBeNull();
    expect(el.querySelector("#fad-summary")?.textContent).toBe("1 place. Nothing in these addresses keeps the App from reading them.");
  });

  it("links the file error and the missing choice from the summary", () => {
    document.body.innerHTML = renderFileAddress(ctx("en", { error: "empty", file: undefined }));
    expect(document.querySelector("#fad-errors a")?.getAttribute("href")).toBe(`#${ADDRESS_TEXT_ID}`);
    document.body.innerHTML = renderFileAddress(ctx("en", { noneError: true }));
    expect(document.querySelector("#fad-errors a")?.getAttribute("href")).toBe(`#${postalId(1)}`);
    expect(document.querySelector("#e-fad-fix")).not.toBeNull();
  });
});

describe("issues with no fix", () => {
  it("shows a corner with its explanation, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileAddress(ctx(l, { file: file([testNote("s", "Stand", [], "King St & Bay St")]) })), l);
      expect(el.querySelector("#fad-intersection")?.textContent).toBe(l === "en" ? "Addresses at a crossing of streets (1)" : "Adresses à un croisement de rues (1)");
      expect(el.querySelector(".fad-intersection input")).toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("pieces", () => {
  it("shows a code that cannot be read without a fix", () => {
    const r = checkAddresses(file([testNote("s", "Shop", [], "9 Queen St E, D5H 2N2")]), "en");
    const i = r.issues[0];
    if (!i) throw new Error("no issue");
    const el = page(`<ul>${renderIssue(i, 0, ctx())}</ul>`, "en");
    expect(el.querySelector("input")).toBeNull();
    expect(el.querySelector(".hint [data-user-content]")?.textContent).toBe("D5H 2N2");
  });

  it("shows the street picks and finds the first fix to focus", () => {
    const r = checkAddresses(file(), "en");
    document.body.innerHTML = renderStreets(r.streets, { [r.streets[0]?.key ?? ""]: "King St W" }, "en");
    expect((document.getElementById(streetId(0)) as HTMLSelectElement).value).toBe("King St W");
    expect(renderStreets([], {}, "en")).toBe("");
    expect(firstFixId(r)).toBe(postalId(1));
    expect(firstFixId(checkAddresses(file([testNote("a", "A", [], "1 King St W"), testNote("b", "B", [], "2 King Street West")]), "en"))).toBe(streetId(0));
    expect(firstFixId(checkAddresses(file([testNote("k", "K", [], "Market Square")]), "en"))).toBeUndefined();
  });

  it("reads the ticked and picked fixes", () => {
    document.body.innerHTML = renderFileAddress(ctx());
    (document.getElementById(postalId(1)) as HTMLInputElement).checked = true;
    (document.getElementById(streetId(0)) as HTMLSelectElement).value = "King Street West";
    const f = readFixes(document.body);
    expect(f.postal).toHaveLength(1);
    expect(Object.values(f.streets)).toEqual(["King Street West"]);
    expect(hasFix(f)).toBe(true);
    expect(hasFix(NO_FIXES)).toBe(false);
  });

  it("shows the copy only once it is made with a fix", () => {
    const f = file();
    const r = checkAddresses(f, "en");
    const key = r.streets[0]?.key ?? "";
    expect(renderCopy(ctx(), f, r)).toBe("");
    expect(renderCopy(ctx("en", { copyMade: true }), f, r)).toBe("");
    const el = page(`<h2>A</h2>${renderCopy(ctx("en", { copyMade: true, applied: { postal: [], streets: { [key]: "King St W" }, names: {} } }), f, r)}`, "en");
    expect(el.querySelector("#fad-copy-summary")?.textContent).toBe("The copy changes the address of 1 place (1 note).");
  });
});

describe("one address, several names", () => {
  const named = (): StreetFile => file([testNote("a", "<i>Joe</i>", [], "5 Elm Ave"), testNote("b", "Joes", [], "5 Elm Avenue")]);

  it("offers to keep every name by default, or one name, as the person's own words, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const r = checkAddresses(named(), l);
      const el = page(`<h2>A</h2><form>${renderNames(r.names, {}, l)}</form>`, l);
      expect(el.querySelector("i")).toBeNull();
      expect(el.querySelector<HTMLInputElement>(`#${nameId(0, 0)}`)?.checked).toBe(true);
      expect(el.querySelectorAll('input[name="name-0"]')).toHaveLength(3);
      expect(el.querySelector("legend [data-user-content]")?.textContent).toBe("5 Elm Ave");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
    expect(renderNames([], {}, "en")).toBe("");
  });

  it("reads the name picked, and a group left as it is picks nothing", () => {
    const r = checkAddresses(named(), "en");
    document.body.innerHTML = renderNames(r.names, {}, "en");
    expect(readFixes(document.body).names).toEqual({});
    (document.getElementById(nameId(0, 2)) as HTMLInputElement).checked = true;
    const picked = readFixes(document.body).names;
    expect(Object.values(picked)).toEqual([r.names[0]?.places[1]?.id]);
    expect(hasFix({ ...NO_FIXES, names: picked })).toBe(true);
  });

  it("offers the names as the first fix when there is nothing else to fix", () => {
    const sameStreet = file([testNote("a", "Joe", [], "5 Elm Ave"), testNote("b", "Joes", [], "5 Elm Ave")]);
    expect(firstFixId(checkAddresses(sameStreet, "en"))).toBe(nameId(0, 0));
  });
});
