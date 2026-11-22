// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { addressRows, type AddressProblem } from "./addressfill";
import { auditDom } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import {
  ADDRESS_TEXT_ID,
  POSTAL_ID,
  addressOf,
  fieldId,
  groupName,
  isAddressPick,
  keepId,
  readAddressPicks,
  renderFileAddress,
  renderRow,
  suggestionId,
  typedId,
  type AddressPick,
  type FileAddressContext,
} from "./views-fileaddress";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "<b>Café</b>", [], null),
        testNote("b", "<b>Café</b>", [], "12 King St W"),
        testNote("k", "Kiosk", [], "Main Street"),
        testNote("l", "Library", [], "1 Main St"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileAddressContext> = {}): FileAddressContext => {
  const f = file();
  return {
    text: "",
    error: undefined,
    file: f,
    report: addressRows(f),
    picks: new Map(),
    typed: new Map(),
    problems: new Map(),
    noneError: false,
    made: undefined,
    postal: false,
    locale: l,
    today: TODAY,
    statusMessage: undefined,
    ...over,
  };
};

function host(html: string, l: "en" | "fr" = "en"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><div id="host">${html}</div></main>`;
  return document.getElementById("host") as HTMLElement;
}

const rows = () => ctx().report!.rows;
const CAFE = () => rows()[0]!.id;
const KIOSK = () => rows()[1]!.id;

describe("the page before a file is read", () => {
  it("has the form and the remove control, with no results", () => {
    const root = host(renderFileAddress(ctx("en", { file: undefined, report: undefined })));
    expect(root.querySelector("h2")?.textContent).toBe("Add missing addresses");
    expect(root.querySelector('[data-action="fad-clear"]')?.textContent).toBe("Remove the file and the copy");
    expect(root.querySelector("#fad-results")).toBeNull();
  });

  it("links a file error to the box and marks it invalid", () => {
    const root = host(renderFileAddress(ctx("en", { file: undefined, report: undefined, error: "no-notes" })));
    expect(root.querySelector("#fad-errors a")?.getAttribute("href")).toBe(`#${ADDRESS_TEXT_ID}`);
    expect(root.querySelector(`#${ADDRESS_TEXT_ID}`)?.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("the places", () => {
  it("lists each place with what is missing, escaping what the file holds", () => {
    const root = host(renderFileAddress(ctx()));
    expect(root.querySelector("#fad-results")?.textContent).toBe("Places to add an address to (2)");
    expect(root.querySelector("#fad-summary")?.textContent).toBe("4 places: 1 with no address, 1 with no street the App can read, 1 with an address offered.");
    expect(root.querySelector("#fad-place-0")?.textContent).toBe("<b>Café</b> — No address — 1 note");
    expect(root.querySelector("#fad-place-0 b")).toBeNull();
    expect(root.querySelector("#fad-place-1")?.textContent).toBe("Kiosk, Main Street — No house number and street the App can read — 1 note");
  });

  it("offers the address from the file, with leave-as-it-is checked", () => {
    const root = host(renderFileAddress(ctx()));
    expect(Array.from(root.querySelectorAll(`input[name="${groupName(0)}"]`)).map((i) => (i as HTMLInputElement).value)).toEqual(["keep", "s:0", "typed"]);
    expect(root.querySelector(`label[for="${suggestionId(0, 0)}"]`)?.textContent).toBe("Use 12 King St W (another place named <b>Café</b> has it)");
    expect(root.querySelector(`label[for="${suggestionId(0, 0)}"] b`)).toBeNull();
    expect(root.querySelector(`#${keepId(0)}`)?.hasAttribute("checked")).toBe(true);
    expect(root.querySelectorAll(".fad-rows > li")[1]?.querySelector(".hint")?.textContent).toBe("No other place with this name has an address in this file.");
    expect(root.querySelector('a[download="places-without-address-2026-11-21.csv"]')).not.toBeNull();
  });

  it("offers the list as text that matches the page", () => {
    const root = host(renderFileAddress(ctx()));
    const a = root.querySelector('a[download="places-without-address-2026-11-21.txt"]');
    expect(a?.textContent).toBe("Download the list (text)");
    const text = decodeTextExportHref(a?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("1. <b>Café</b> — No address — 1 note\n    In the file: 12 King St W\n");
  });

  it("has the postal-code option, off unless asked, described by its hint", () => {
    const off = host(renderFileAddress(ctx()));
    expect(off.querySelector<HTMLInputElement>(`#${POSTAL_ID}`)?.hasAttribute("checked")).toBe(false);
    expect(off.querySelector(`#${POSTAL_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${POSTAL_ID}`);
    expect(off.querySelector(`label[for="${POSTAL_ID}"]`)?.textContent).toBe("Also list places whose address has no postal code");
    const on = host(renderFileAddress(ctx("en", { postal: true })));
    expect(on.querySelector<HTMLInputElement>(`#${POSTAL_ID}`)?.hasAttribute("checked")).toBe(true);
    expect(on.querySelector("#fad-summary")?.textContent).toContain("with no postal code the App can read");
  });

  it("says so when every place has a readable address", () => {
    const r = readStreetFile(exportNotes([testNote("x", "X", [], "1 Main St")], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    const root = host(renderFileAddress(ctx("en", { file: r.file, report: addressRows(r.file) })));
    expect(root.querySelector("#fad-none")?.textContent).toBe("Every place in this file has an address the App can read a street from.");
    expect(root.querySelector("#fad-fix-form")).toBeNull();
  });

  it("shows the picks and typed address it was given", () => {
    const root = host(renderFileAddress(ctx("en", { picks: new Map<string, AddressPick>([[CAFE(), "s:0"], [KIOSK(), "typed"]]), typed: new Map([[KIOSK(), "7 Main St"]]) })));
    expect(root.querySelector(`#${suggestionId(0, 0)}`)?.hasAttribute("checked")).toBe(true);
    expect(root.querySelector(`#${typedId(1)}`)?.hasAttribute("checked")).toBe(true);
    expect(root.querySelector<HTMLInputElement>(`#${fieldId(1)}`)?.value).toBe("7 Main St");
  });

  it("warns, without blocking, when a typed address has no street the App can read", () => {
    const root = host(renderFileAddress(ctx("en", { picks: new Map<string, AddressPick>([[KIOSK(), "typed"]]), typed: new Map([[KIOSK(), "By the north gate"]]) })));
    expect(root.querySelector(`#w-${fieldId(1)}`)?.textContent).toContain("cannot read a house number and street");
    expect(root.querySelector(`#${fieldId(1)}`)?.getAttribute("aria-describedby")).toBe(`h-${fieldId(1)} w-${fieldId(1)}`);
    expect(root.querySelector(`#${fieldId(1)}`)?.hasAttribute("aria-invalid")).toBe(false);
    expect(root.querySelector("#fad-errors")).toBeNull();
  });

  it("marks a typed address with a problem and links to it from the summary", () => {
    const problems = new Map<string, AddressProblem>([[KIOSK(), "control"]]);
    const root = host(renderFileAddress(ctx("en", { picks: new Map<string, AddressPick>([[KIOSK(), "typed"]]), typed: new Map([[KIOSK(), "a\tb"]]), problems })));
    const field = root.querySelector(`#${fieldId(1)}`);
    expect(field?.getAttribute("aria-invalid")).toBe("true");
    expect(field?.getAttribute("aria-describedby")).toBe(`h-${fieldId(1)} e-${fieldId(1)}`);
    expect(Array.from(root.querySelectorAll("#fad-errors a")).map((a) => [a.getAttribute("href"), a.textContent])).toEqual([
      [`#${fieldId(1)}`, "Address for place 2 — Remove the line breaks and tabs from the address."],
    ]);
  });

  it("links the nothing-changed problem to the first place's choices", () => {
    expect(host(renderFileAddress(ctx("en", { noneError: true }))).querySelector("#fad-errors a")?.getAttribute("href")).toBe(`#${keepId(0)}`);
  });

  it("shows the copy with its summary, what it changed and the download", () => {
    const made = new Map([[CAFE(), "12 King St W"], [KIOSK(), "By the gate"]]);
    const root = host(renderFileAddress(ctx("en", { made })));
    expect(root.querySelector("#fad-copy-summary")?.textContent).toBe("2 places were given an address, on 2 notes; the App can read the street of 1.");
    expect(root.querySelector("#fad-copy-places")?.textContent).toBe("The file had 4 places; the copy has 3, as 1 joined another.");
    expect(Array.from(root.querySelectorAll(".fad-changes li")).map((li) => li.textContent)).toEqual([
      "<b>Café</b>: 12 King St W (joins the place with this name already at this address; their records go together)",
      "Kiosk: By the gate (no street the App can read)",
    ]);
    const href = root.querySelector('a[download="notes-addresses-added-2026-11-21.json"]')?.getAttribute("href") ?? "";
    const back = importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.find((n) => n.id === "a")?.address).toBe("12 King St W");
  });
});

describe("turning a pick into an address", () => {
  it("leaves the place, takes an offered address by index, or checks the typed one", () => {
    const row = rows()[0]!;
    expect(addressOf(row, undefined, undefined)).toBeUndefined();
    expect(addressOf(row, "keep", "1 Main St")).toBeUndefined();
    expect(addressOf(row, "s:0", undefined)).toEqual({ to: "12 King St W" });
    expect(addressOf(row, "s:3", undefined)).toBeUndefined();
    expect(addressOf(row, "typed", " 5 Main St ")).toEqual({ to: "5 Main St" });
    expect(addressOf(row, "typed", "")).toEqual({ problem: "empty" });
    expect(addressOf(row, "typed", undefined)).toEqual({ problem: "empty" });
  });

  it("knows which values are picks", () => {
    for (const v of ["keep", "typed", "s:0", "s:12"]) expect(isAddressPick(v)).toBe(true);
    for (const v of [undefined, "", "s:", "s:x", "address"]) expect(isAddressPick(v)).toBe(false);
  });

  it("reads the checked pick and typed address of each place", () => {
    const c = ctx();
    const root = host(renderFileAddress(c));
    root.querySelector<HTMLInputElement>(`#${suggestionId(0, 0)}`)!.checked = true;
    root.querySelector<HTMLInputElement>(`#${fieldId(1)}`)!.value = "7 Main St";
    const { picks, typed } = readAddressPicks(root, c.report!);
    expect([...picks]).toEqual([[CAFE(), "s:0"]]);
    expect([...typed]).toEqual([[KIOSK(), "7 Main St"]]);
  });

  it("renders one place on its own with its index in the ids", () => {
    const c = ctx();
    const html = renderRow(c.report!.rows[1]!, 1, c);
    expect(html).toContain(`id="${fieldId(1)}"`);
    expect(html).toContain("Address for place 2");
  });
});

describe("accessibility", () => {
  for (const l of ["en", "fr"] as const) {
    it(`has no axe or App audit problems with places, errors, a warning and a copy (${l})`, async () => {
      const root = host(
        renderFileAddress(
          ctx(l, {
            made: new Map([[CAFE(), "12 King St W"]]),
            picks: new Map<string, AddressPick>([[KIOSK(), "typed"]]),
            typed: new Map([[KIOSK(), "By the gate"]]),
            noneError: true,
            statusMessage: "ok",
          }),
        ),
        l,
      );
      expect(root.querySelector("#fad-errors")).not.toBeNull();
      expect(root.querySelector(`#w-${fieldId(1)}`)).not.toBeNull();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(auditDom(document.body, { locale: l })).toEqual([]);
    });

    it(`has no axe problems before a file is read (${l})`, async () => {
      host(renderFileAddress(ctx(l, { file: undefined, report: undefined, error: "empty" })), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(auditDom(document.body, { locale: l })).toEqual([]);
    });
  }

  it("gives every control a 44 by 44 target and a label", () => {
    const root = host(renderFileAddress(ctx()));
    for (const label of Array.from(root.querySelectorAll("label.choice"))) expect(label.getAttribute("style")).toContain("min-height:44px;min-width:44px");
    // Radios and checkboxes get their target from the label around them, as elsewhere in the App.
    for (const box of Array.from(root.querySelectorAll('input[type="checkbox"]'))) expect(box.closest("label.choice")?.getAttribute("style"), box.id).toContain("min-height:44px;min-width:44px");
    for (const input of Array.from(root.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), textarea'))) {
      expect(input.getAttribute("style"), input.id).toContain("min-height:44px");
      expect(root.querySelector(`label[for="${input.id}"]`), input.id).not.toBeNull();
    }
  });

  it("puts the French page in French", () => {
    const root = host(renderFileAddress(ctx("fr")), "fr");
    expect(root.querySelector("section")?.getAttribute("lang")).toBe("fr");
    expect(root.querySelector(`label[for="${keepId(0)}"]`)?.textContent).toBe("Laisser tel quel");
  });
});
