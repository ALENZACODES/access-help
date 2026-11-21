// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { contactFindings, type ContactChoice, type ContactProblem } from "./contactdetails";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { parseNote } from "./model";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import {
  CONTACTS_TEXT_ID,
  choiceOf,
  fieldId,
  groupName,
  isContactPick,
  markedText,
  pickId,
  picksFor,
  readContactPicks,
  renderFileContacts,
  type ContactPick,
  type FileContactsContext,
} from "./views-filecontacts";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(): StreetFile {
  const n = parseNote({ ...testNote("a", "<b>Library</b>", [{ key: "elevator", value: "yes", source: "jo@example.org" }]), note: "Ask <i>Jo</i> at jo@example.org." });
  if (!n) throw new Error("bad note");
  const r = readStreetFile(exportNotes([n, testNote("b", "Kiosk 905-555-0102", [])], "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

// Items: 0 Kiosk's name, 1 the Library note text, 2 the source (all email, so nothing left after removing).
const NAME = 0;
const TEXT = 1;
const SOURCE = 2;

const ctx = (l: "en" | "fr" = "en", over: Partial<FileContactsContext> = {}): FileContactsContext => {
  const f = file();
  return {
    text: "",
    error: undefined,
    file: f,
    report: contactFindings(f),
    picks: new Map(),
    typed: new Map(),
    problems: new Map(),
    noneError: false,
    made: undefined,
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

const findings = () => ctx().report!.findings;
const id = (i: number): string => findings()[i]!.id;

describe("the page before a file is read", () => {
  it("has the form and the remove control, with no results", () => {
    const root = host(renderFileContacts(ctx("en", { file: undefined, report: undefined })));
    expect(root.querySelector("h2")?.textContent).toBe("Remove contact details");
    expect(root.querySelector('[data-action="fct-clear"]')?.textContent).toBe("Remove the file and the copy from the page");
    expect(root.querySelector("#fct-results")).toBeNull();
  });

  it("links a file error to the box and marks it invalid", () => {
    const root = host(renderFileContacts(ctx("en", { file: undefined, report: undefined, error: "empty" })));
    expect(root.querySelector("#fct-errors a")?.getAttribute("href")).toBe(`#${CONTACTS_TEXT_ID}`);
    expect(root.querySelector(`#${CONTACTS_TEXT_ID}`)?.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("the items", () => {
  it("summarises what was found and offers where they are as a CSV without the details", () => {
    const root = host(renderFileContacts(ctx()));
    expect(root.querySelector("#fct-results")?.textContent).toBe("Contact details found (3)");
    expect(root.querySelector("#fct-summary")?.textContent).toBe("2 notes: 2 emails and 1 phone number in 3 items.");
    const href = root.querySelector('a[download="where-contact-details-are-2026-11-21.csv"]')?.getAttribute("href") ?? "";
    expect(decodeURIComponent(href)).not.toContain("jo@example.org");
    expect(decodeURIComponent(href)).not.toContain("905-555-0102");
  });

  it("shows each text with the details marked, everything escaped", () => {
    const root = host(renderFileContacts(ctx()));
    const found = root.querySelectorAll(".fct-found");
    expect(found[TEXT]?.textContent).toBe("Ask <i>Jo</i> at jo@example.org.");
    expect(found[TEXT]?.querySelector("i")).toBeNull();
    expect(Array.from(found[TEXT]!.querySelectorAll("mark")).map((m) => m.textContent)).toEqual(["jo@example.org"]);
    expect(root.querySelector("#fct-item-0")?.textContent).toBe("Place name — Kiosk 905-555-0102 — 1 phone number");
  });

  it("previews what removing the details leaves, or says it would leave nothing", () => {
    const root = host(renderFileContacts(ctx()));
    const items = root.querySelectorAll(".fct-items > li");
    expect(items[NAME]?.querySelector(".hint")?.textContent).toBe("Without the contact details: Kiosk");
    expect(items[TEXT]?.querySelector(".hint")?.textContent).toBe("Without the contact details: Ask <i>Jo</i> at.");
    expect(items[SOURCE]?.querySelector(".hint")?.textContent).toBe("Removing the contact details would leave nothing, so write the text again or keep it.");
  });

  it("offers only the choices that fit each field, with keep checked", () => {
    const root = host(renderFileContacts(ctx()));
    const values = (i: number) => Array.from(root.querySelectorAll(`input[name="${groupName(i)}"]`)).map((x) => (x as HTMLInputElement).value);
    expect(values(NAME)).toEqual(["keep", "remove", "text"]);
    expect(values(TEXT)).toEqual(["keep", "remove", "clear", "text"]);
    expect(values(SOURCE)).toEqual(["keep", "text"]);
    expect(root.querySelector(`#${pickId(TEXT, "keep")}`)?.hasAttribute("checked")).toBe(true);
    expect(root.querySelector(`label[for="${pickId(TEXT, "clear")}"]`)?.textContent).toBe("Remove the whole note text");
  });

  it("writes note text in a text area and names in a one-line box, filled with the file's text", () => {
    const root = host(renderFileContacts(ctx()));
    expect(root.querySelector(`#${fieldId(TEXT)}`)?.tagName).toBe("TEXTAREA");
    expect(root.querySelector(`#${fieldId(NAME)}`)?.tagName).toBe("INPUT");
    expect(root.querySelector<HTMLInputElement>(`#${fieldId(NAME)}`)?.value).toBe("Kiosk 905-555-0102");
    expect(root.querySelector(`#h-${fieldId(SOURCE)}`)?.textContent).toContain("Every record from this source takes the new name.");
  });

  it("says so when nothing is found", () => {
    const r = readStreetFile(exportNotes([testNote("x", "X", [])], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    const root = host(renderFileContacts(ctx("en", { file: r.file, report: contactFindings(r.file) })));
    expect(root.querySelector("#fct-none")).not.toBeNull();
    expect(root.querySelector("#fct-fix-form")).toBeNull();
  });

  it("warns, without blocking, when written text still holds a detail", () => {
    const root = host(renderFileContacts(ctx("en", { picks: new Map<string, ContactPick>([[id(NAME), "text"]]), typed: new Map([[id(NAME), "Kiosk, 905-555-0102"]]) })));
    expect(root.querySelector(`#w-${fieldId(NAME)}`)?.textContent).toContain("still holds an email or a phone number");
    expect(root.querySelector(`#${fieldId(NAME)}`)?.getAttribute("aria-describedby")).toBe(`h-${fieldId(NAME)} w-${fieldId(NAME)}`);
    expect(root.querySelector("#fct-errors")).toBeNull();
  });

  it("marks written text with a problem and links to it from the summary", () => {
    const problems = new Map<string, ContactProblem>([[id(SOURCE), "contributor"]]);
    const root = host(renderFileContacts(ctx("en", { picks: new Map<string, ContactPick>([[id(SOURCE), "text"]]), typed: new Map([[id(SOURCE), "Contributor report"]]), problems })));
    expect(root.querySelector(`#${fieldId(SOURCE)}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(Array.from(root.querySelectorAll("#fct-errors a")).map((a) => [a.getAttribute("href"), a.textContent])).toEqual([
      [`#${fieldId(SOURCE)}`, "Text for item 3 — Contributor report is the App’s own label. Choose another name."],
    ]);
  });

  it("links the nothing-changed problem to the first item's choices", () => {
    expect(host(renderFileContacts(ctx("en", { noneError: true }))).querySelector("#fct-errors a")?.getAttribute("href")).toBe(`#${pickId(0, "keep")}`);
  });

  it("shows the copy with its summary, what it changed and the download", () => {
    const made = new Map<string, ContactChoice>([[id(NAME), { kind: "remove" }], [id(TEXT), { kind: "clear" }]]);
    const root = host(renderFileContacts(ctx("en", { made })));
    expect(root.querySelector("#fct-copy-summary")?.textContent).toBe("2 items changed in 2 notes.");
    expect(Array.from(root.querySelectorAll(".fct-changes li")).map((li) => li.textContent)).toEqual([
      "Place name, Kiosk 905-555-0102: Kiosk",
      "Note text, <b>Library</b>: note text removed",
    ]);
    const href = root.querySelector('a[download="notes-without-contact-details-2026-11-21.json"]')?.getAttribute("href") ?? "";
    const back = importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.find((n) => n.id === "b")?.placeName).toBe("Kiosk");
    expect(back.notes.find((n) => n.id === "a")?.note).toBeUndefined();
  });
});

describe("picks and choices", () => {
  it("lists the picks each item offers", () => {
    expect(findings().map(picksFor)).toEqual([
      ["keep", "remove", "text"],
      ["keep", "remove", "clear", "text"],
      ["keep", "text"],
    ]);
  });

  it("turns a pick into a choice, keeping for a pick the item does not offer", () => {
    const [name, text, source] = findings();
    expect(choiceOf(name!, undefined, undefined)).toEqual({ kind: "keep" });
    expect(choiceOf(name!, "remove", undefined)).toEqual({ kind: "remove" });
    expect(choiceOf(name!, "clear", undefined)).toEqual({ kind: "keep" });
    expect(choiceOf(source!, "remove", undefined)).toEqual({ kind: "keep" });
    expect(choiceOf(text!, "clear", undefined)).toEqual({ kind: "clear" });
    expect(choiceOf(name!, "text", "Kiosk")).toEqual({ kind: "text", text: "Kiosk" });
    expect(choiceOf(name!, "text", "")).toEqual({ problem: "empty" });
    // Writing with nothing typed uses the file's text, which changes nothing.
    expect(choiceOf(name!, "text", undefined)).toEqual({ kind: "text", text: "Kiosk 905-555-0102" });
  });

  it("knows which values are picks", () => {
    for (const v of ["keep", "remove", "clear", "text"]) expect(isContactPick(v)).toBe(true);
    for (const v of [undefined, "", "write", "KEEP"]) expect(isContactPick(v)).toBe(false);
  });

  it("marks each detail in the text", () => {
    expect(markedText(findings()[NAME]!)).toBe("Kiosk <mark>905-555-0102</mark>");
  });

  it("reads the checked pick of each item and text that differs from the file", () => {
    const c = ctx();
    const root = host(renderFileContacts(c));
    root.querySelector<HTMLInputElement>(`#${pickId(TEXT, "clear")}`)!.checked = true;
    root.querySelector<HTMLInputElement>(`#${fieldId(NAME)}`)!.value = "Kiosk";
    const { picks, typed } = readContactPicks(root, c.report!);
    expect([...picks]).toEqual([[id(TEXT), "clear"]]);
    expect([...typed]).toEqual([[id(NAME), "Kiosk"]]);
  });
});

describe("accessibility", () => {
  for (const l of ["en", "fr"] as const) {
    it(`has no axe or App audit problems with items, errors, a warning and a copy (${l})`, async () => {
      const root = host(
        renderFileContacts(
          ctx(l, {
            made: new Map<string, ContactChoice>([[id(TEXT), { kind: "remove" }]]),
            picks: new Map<string, ContactPick>([[id(NAME), "text"], [id(SOURCE), "text"]]),
            typed: new Map([[id(NAME), "Kiosk 905-555-0102!"], [id(SOURCE), ""]]),
            problems: new Map<string, ContactProblem>([[id(SOURCE), "empty"]]),
            statusMessage: "ok",
          }),
        ),
        l,
      );
      expect(root.querySelector("#fct-errors")).not.toBeNull();
      expect(root.querySelector(`#w-${fieldId(NAME)}`)).not.toBeNull();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(auditDom(document.body, { locale: l })).toEqual([]);
    });

    it(`has no axe problems before a file is read (${l})`, async () => {
      host(renderFileContacts(ctx(l, { file: undefined, report: undefined, error: "not-json" })), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(auditDom(document.body, { locale: l })).toEqual([]);
    });
  }

  it("gives every control a 44 by 44 target and a label", () => {
    const root = host(renderFileContacts(ctx()));
    for (const label of Array.from(root.querySelectorAll("label.choice"))) expect(label.getAttribute("style")).toContain("min-height:44px;min-width:44px");
    for (const input of Array.from(root.querySelectorAll('input:not([type="radio"]), textarea'))) {
      expect(input.getAttribute("style"), input.id).toContain("min-height:44px");
      expect(root.querySelector(`label[for="${input.id}"]`), input.id).not.toBeNull();
    }
  });

  it("puts the French page in French", () => {
    const root = host(renderFileContacts(ctx("fr")), "fr");
    expect(root.querySelector("section")?.getAttribute("lang")).toBe("fr");
    expect(root.querySelector(`label[for="${pickId(TEXT, "remove")}"]`)?.textContent).toBe("Retirer les coordonnées");
    expect(root.querySelectorAll(".fct-items > li")[NAME]?.querySelector(".hint")?.textContent).toBe("Sans les coordonnées\u00A0: Kiosk");
  });
});
