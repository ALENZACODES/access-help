// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { t } from "./copy";
import { exportNotes, importNotes } from "./exchange";
import { FILE_LETTERS_COPY as C, letterText, problemText } from "./fileletters-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import type { Tracking } from "./lettertrack";
import { makeLetters, type Letter, type LetterOptions } from "./letters";
import { decodeTextExportHref } from "./textexport";
import { testNote } from "./testnotes";
import {
  CONTACT_ID,
  EMPTY_TRACK,
  LETTERS_TEXT_ID,
  OLD_ID,
  SENDER_ID,
  languageId,
  problemTarget,
  readLetterForm,
  renderTrackSection,
  renderTracking,
  TRACK_TEXT_ID,
  renderFileLetters,
  renderLetter,
  renderLetterForm,
  renderLetters,
  type FileLettersContext,
} from "./views-fileletters";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FORM: LetterOptions = { sender: "Ana Silva", contact: "ana@example.org", language: "en", includeOld: false };

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "<b>Library</b>", [{ key: "elevator", value: "yes" }], "100 King St W"),
        testNote("c", "Cart", [], null),
        testNote("b", "Bank", [
          { key: "step-free-entry", value: "yes" },
          { key: "accessible-washroom", value: "yes" },
          { key: "automatic-door", value: "yes" },
          { key: "elevator", value: "yes" },
        ]),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileLettersContext> = {}): FileLettersContext => ({
  text: "",
  error: undefined,
  file: file(),
  form: FORM,
  applied: FORM,
  problems: [],
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  track: EMPTY_TRACK,
  ...over,
});

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1>${inner}</main>`;
  return document.body;
}

const ALL_YES = [
  { key: "step-free-entry", value: "yes" },
  { key: "accessible-washroom", value: "yes" },
  { key: "automatic-door", value: "yes" },
  { key: "elevator", value: "yes" },
] as const;

function readOnly(notes: ReturnType<typeof testNote>[]): StreetFile {
  const r = readStreetFile(exportNotes(notes, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

function letterAt(f: StreetFile, i: number): Letter {
  const l = makeLetters(f, false, TODAY, "en").letters[i];
  if (!l) throw new Error(`no letter ${i}`);
  return l;
}

const hrefOf = (el: ParentNode, sel: string): string => el.querySelector<HTMLAnchorElement>(sel)?.getAttribute("href") ?? "";

describe("renderFileLetters", () => {
  it("shows only the file form before a file is read", () => {
    const el = page(renderFileLetters(ctx("en", { file: undefined, applied: undefined })), "en");
    expect(el.querySelector("#flt-file-form")).not.toBeNull();
    expect(el.querySelector("#flt-letter-form")).toBeNull();
    expect(el.querySelector("#flt-results")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows the signer's form once a file is read, and the letters only once they are written", () => {
    const el = page(renderFileLetters(ctx("en", { applied: undefined })), "en");
    expect(el.querySelector("#flt-letter-form")).not.toBeNull();
    expect(el.querySelector("#flt-results")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("lists each letter with the place's name escaped, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileLetters(ctx(l)), l);
      const items = Array.from(el.querySelectorAll(".flt-letters > li"));
      expect(items.map((x) => x.querySelector("h4")?.textContent)).toEqual(["<b>Library</b>", "Cart"]);
      expect(el.querySelector(".flt-letters b")).toBeNull();
      expect(items[1]?.textContent).toContain(t(C.noAddress, l));
      expect(el.querySelector("#flt-results")?.textContent).toBe(`${t(C.resultsTitle, l)} (2)`);
      expect(auditDom(el, { locale: l }), l).toEqual([]);
    }
  });

  it("names the problem when the text is not an export, and links the summary to the box", () => {
    const el = page(renderFileLetters(ctx("en", { file: undefined, applied: undefined, error: "not-json" })), "en");
    expect(el.querySelector("#flt-errors")?.getAttribute("role")).toBe("alert");
    expect(hrefOf(el, "#flt-errors a")).toBe(`#${LETTERS_TEXT_ID}`);
    expect(el.querySelector(`#${LETTERS_TEXT_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${LETTERS_TEXT_ID} e-${LETTERS_TEXT_ID}`);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("says when no place has anything to ask, with no downloads", () => {
    const el = page(renderFileLetters(ctx("en", { file: readOnly([testNote("b", "Bank", ALL_YES)]) })), "en");
    expect(el.querySelector("#flt-summary")?.textContent).toBe("No place has anything to ask about. 1 place with nothing to ask gets no letter.");
    expect(el.querySelectorAll("a.linkbtn")).toHaveLength(0);
    expect(el.querySelector(".flt-letters")).toBeNull();
  });
});

describe("the signer's form", () => {
  it("keeps what was typed and ticked", () => {
    const el = page(renderLetterForm(ctx("en", { form: { sender: "A & B", contact: '"x"', language: "both", includeOld: true } })), "en");
    expect(el.querySelector<HTMLInputElement>(`#${SENDER_ID}`)?.value).toBe("A & B");
    expect(el.querySelector<HTMLInputElement>(`#${CONTACT_ID}`)?.value).toBe('"x"');
    expect(el.querySelector<HTMLInputElement>(`#${languageId("both")}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>(`#${OLD_ID}`)?.checked).toBe(true);
  });

  it("marks a field with a problem and links the summary to it", () => {
    const el = page(renderFileLetters(ctx("fr", { form: { ...FORM, sender: "" }, applied: undefined, problems: ["sender-empty", "contact-long"] })), "fr");
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>("#flt-errors a")).map((a) => a.getAttribute("href"));
    expect(links).toEqual([`#${SENDER_ID}`, `#${CONTACT_ID}`]);
    const sender = el.querySelector(`#${SENDER_ID}`);
    expect(sender?.getAttribute("aria-invalid")).toBe("true");
    expect(sender?.getAttribute("aria-describedby")).toBe(`h-${SENDER_ID} e-${SENDER_ID}`);
    expect(el.querySelector(`#e-${SENDER_ID}`)?.textContent).toBe(problemText("sender-empty", "fr"));
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });

  it("sends each problem to its field", () => {
    expect(problemTarget("sender-control")).toBe(SENDER_ID);
    expect(problemTarget("contact-control")).toBe(CONTACT_ID);
  });

  it("reads the form back, keeping the fallback for a language it does not know", () => {
    const el = page(renderLetterForm(ctx("en", { form: { ...FORM, language: "fr" } })), "en");
    expect(readLetterForm(el, FORM)).toEqual({ ...FORM, language: "fr" });
    for (const r of Array.from(el.querySelectorAll<HTMLInputElement>('input[name="language"]'))) r.checked = false;
    expect(readLetterForm(el, { ...FORM, language: "both" }).language).toBe("both");
    expect(readLetterForm(document.createElement("div"), FORM)).toEqual(FORM);
  });
});

describe("the letters", () => {
  it("offers every letter, a tracking list and the places' notes as downloads", () => {
    const f = file();
    const el = page(renderLetters(ctx(), f, FORM), "en");
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>("a.linkbtn"));
    expect(links.slice(0, 3).map((a) => a.getAttribute("download"))).toEqual(["letters-2026-11-21.txt", "letters-tracking-2026-11-21.csv", "notes-of-places-written-to-2026-11-21.json"]);
    expect(decodeTextExportHref(links[0]?.getAttribute("href") ?? "")).toContain(letterText(letterAt(f, 0), FORM));
    const notes = decodeURIComponent((links[2]?.getAttribute("href") ?? "").replace(/^data:[^,]*,/, ""));
    expect(importNotes(notes).notes.map((n) => n.id).sort()).toEqual(["a", "c"]);
  });

  it("shows each letter behind a disclosure, with its own download named for the place", () => {
    const letter = letterAt(file(), 1);
    const el = page(`<ol>${renderLetter(letter, 1, FORM, ctx())}</ol>`, "en");
    expect(el.querySelector("details summary")?.textContent).toBe(C.showLetter.en);
    expect(el.querySelector("pre")?.textContent).toBe(letterText(letter, FORM));
    const a = el.querySelector<HTMLAnchorElement>("a.linkbtn");
    expect(a?.textContent).toBe(`${C.downloadOne.en}: Cart`);
    expect(a?.getAttribute("download")).toBe("letter-002-2026-11-21.txt");
  });

  it("lists what each letter asks with the App's names for the details", () => {
    const el = page(renderLetters(ctx("fr"), file(), FORM), "fr");
    expect(el.querySelector(".flt-letters > li p:nth-of-type(2)")?.textContent).toBe(
      "Entrée sans marche (aucune donnée), Toilettes accessibles (aucune donnée), Porte automatique (aucune donnée)",
    );
  });
});

describe("following up", () => {
  const tr: Tracking = {
    notSent: [{ line: 2, name: "<i>Kiosk</i>", address: "", sentOn: "", replyOn: "" }],
    waiting: [
      { line: 3, name: "Bank", address: "40 King St W", sentOn: "2026-09-01", replyOn: "", days: 81 },
      { line: 4, name: "Café", address: "", sentOn: "2026-11-20", replyOn: "", days: 1 },
    ],
    replied: [{ line: 5, name: "Library", address: "", sentOn: "2026-10-01", replyOn: "2026-10-09" }],
    unusable: [{ line: 6, name: "", address: "", sentOn: "x", replyOn: "", problem: "no-name" }],
  };

  it("lists rows to fix first, then waits, longest first, with the long ones in bold, and passes the audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(`<div lang="${l}"><h2>T</h2><h3>F</h3>${renderTracking(tr, l)}</div>`, l);
      expect(Array.from(el.querySelectorAll("h4")).map((h) => h.id)).toEqual(["flt-track-unusable", "flt-track-waiting", "flt-track-not-sent", "flt-track-replied"]);
      expect(Array.from(el.querySelectorAll("#flt-track-waiting + ul strong")).map((s) => s.textContent)).toEqual([l === "en" ? "Sent 2026-09-01, waiting 81 days" : "Envoyée le 2026-09-01, en attente depuis 81\u00A0jours"]);
      expect(el.querySelector("#flt-track-due")).not.toBeNull();
      expect(el.querySelector("#flt-track-not-sent + ul i")).toBeNull();
      expect(el.querySelector("#flt-track-unusable + ul")?.textContent).toBe(l === "en" ? "Line 6: no place name" : "Ligne 6\u00A0: aucun nom de lieu");
      expect(auditDom(el, { locale: l }), l).toEqual([]);
    }
  });

  it("leaves out empty groups and the follow-up note when no wait is long", () => {
    const el = page(renderTracking({ notSent: [], waiting: [{ line: 4, name: "Café", address: "", sentOn: "2026-11-20", replyOn: "", days: 1 }], replied: [], unusable: [] }, "en"), "en");
    expect(Array.from(el.querySelectorAll("h4")).map((h) => h.id)).toEqual(["flt-track-waiting"]);
    expect(el.querySelector("#flt-track-due")).toBeNull();
    expect(el.querySelector("strong")).toBeNull();
    expect(el.textContent).not.toContain(C.track.afterReply.en);
  });

  it("names a list problem, links it to the box, and offers removing only when there is something to remove", () => {
    const empty = page(renderTrackSection({ text: "", error: undefined, missing: undefined, tracking: undefined, statusMessage: undefined }, "en"), "en");
    expect(empty.querySelector('[data-action="flt-track-clear"]')).toBeNull();
    const el = page("<h2>T</h2>" + renderTrackSection({ text: "a,b", error: "missing-columns", missing: ["sent_on"], tracking: undefined, statusMessage: undefined }, "en"), "en");
    expect(el.querySelector("#flt-track-errors a")?.getAttribute("href")).toBe(`#${TRACK_TEXT_ID}`);
    expect(el.querySelector("#flt-track-errors")?.textContent).toContain("The list is missing columns: sent_on.");
    expect(el.querySelector(`#${TRACK_TEXT_ID}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(el.querySelector('[data-action="flt-track-clear"]')?.textContent).toBe(C.track.clear.en);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });
});
