// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { auditCopy, auditDom, decodeTextExportHref, memoryStore, type Locale, type Note } from "./index";
import { emptyStatementForm, readStatement, type Finding } from "./statement";
import {
  CHECK_COPY,
  against,
  checkStrings,
  knownPlace,
  notesSay,
  notesSayText,
  renderNotesSay,
  statementFilename,
  statementText,
} from "./statement-check";
import { mountStatementReader, type StatementHandle } from "./statement-mount";
import { renderStatement } from "./views-statement";
import { AXE_OPTIONS } from "./shelltest";
import { addNote } from "./outbox";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));

const NOTES = (): Note[] => [
  testNote("a", "Library", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }]),
  testNote("b", "Library", [{ key: "step-free-entry", value: "no" }]),
];

const finding = (text: string, key: Finding["key"]): Finding => readStatement(text).find((f) => f.key === key) as Finding;

describe("knownPlace", () => {
  it("finds the place with the same name and address, ignoring case and accents", () => {
    expect(knownPlace(NOTES(), "LIBRARY", "1 main st.", "en")?.name).toBe("Library");
    expect(knownPlace(NOTES(), "Library", "2 Main St", "en")).toBeUndefined();
    expect(knownPlace(NOTES(), "  ", "1 Main St", "en")).toBeUndefined();
    expect(knownPlace([], "Library", "1 Main St", "en")).toBeUndefined();
  });
});

describe("what the notes say", () => {
  const lib = (): NonNullable<ReturnType<typeof knownPlace>> => knownPlace(NOTES(), "Library", "1 Main St", "en") as NonNullable<ReturnType<typeof knownPlace>>;

  it("reads agree, differ and no record from the places list", () => {
    expect(notesSay(lib(), "elevator")).toEqual({ kind: "agree", value: "yes", reports: 1 });
    expect(notesSay(lib(), "step-free-entry")).toEqual({ kind: "differ", reports: 2 });
    expect(notesSay(lib(), "automatic-door")).toEqual({ kind: "unknown" });
  });

  it("says it in words, with French typography and UNKNOWN", () => {
    expect(notesSayText({ kind: "agree", value: "yes", reports: 1 }, "en")).toBe("In your notes: Yes (1 report)");
    expect(notesSayText({ kind: "differ", reports: 2 }, "fr")).toBe("Dans vos notes\u00A0: Les rapports divergent (2 rapports)");
    expect(notesSayText({ kind: "unknown" }, "fr")).toBe("Dans vos notes\u00A0: UNKNOWN, aucune donnée");
  });

  it("flags only a clear disagreement with notes that agree", () => {
    const yes = { kind: "agree", value: "yes", reports: 1 } as const;
    const no = { kind: "agree", value: "no", reports: 1 } as const;
    expect(against(yes, finding("There is no elevator.", "elevator"))).toBe(true);
    expect(against(no, finding("There is an elevator.", "elevator"))).toBe(true);
    expect(against(yes, finding("There is an elevator.", "elevator"))).toBe(false);
    // Words pointing both ways, words about change, or reports that differ are never "against".
    expect(against(yes, finding("There is an elevator. There is no elevator.", "elevator"))).toBe(false);
    expect(against(yes, finding("The elevator is out of service.", "elevator"))).toBe(false);
    expect(against({ kind: "differ", reports: 2 }, finding("There is no elevator.", "elevator"))).toBe(false);
    expect(against({ kind: "unknown" }, finding("There is no elevator.", "elevator"))).toBe(false);
  });

  it("renders nothing for a place not in the notes", () => {
    expect(renderNotesSay(undefined, finding("There is no elevator.", "elevator"), "en")).toBe("");
    expect(renderNotesSay(lib(), finding("There is no elevator.", "elevator"), "en")).toContain("data-against");
  });
});

describe("the text file", () => {
  const form = { ...emptyStatementForm(TODAY), placeName: "Library", address: "1 Main St", pageUrl: "https://example.org/access", observedOn: "2026-11-18" };

  it("lists each detail's sentences with their cues, the page and the date, and no answers", () => {
    const text = statementText(form, readStatement("There is no elevator. Accessible washrooms upstairs."), "en");
    expect(text.split("\n")).toEqual([
      CHECK_COPY.fileTitle.en,
      "=".repeat(CHECK_COPY.fileTitle.en.length),
      "",
      CHECK_COPY.fileWarning.en,
      "",
      "Library, 1 Main St",
      "Page: https://example.org/access",
      "Read on 2026-11-18",
      "",
      "Step-free entrance: 0 sentences",
      "- No sentence names this detail.",
      "",
      "Accessible washroom: 1 sentence",
      "- Words that usually mean it has one: “Accessible washrooms upstairs.”",
      "",
      "Automatic door: 0 sentences",
      "- No sentence names this detail.",
      "",
      "Elevator: 1 sentence",
      "- Words that usually mean it does not: “There is no elevator.”",
      "",
    ]);
  });

  it("uses French typography in French", () => {
    const text = statementText(form, readStatement("Il n’y a pas d’ascenseur."), "fr");
    expect(text).toContain("Page Web\u00A0: https://example.org/access");
    expect(text).toContain("Ascenseur\u00A0: 1 phrase");
    expect(text).toContain("«\u202FIl n’y a pas d’ascenseur.\u202F»");
    expect(text).not.toMatch(/inconnu/i);
  });

  it("is named for the date and language", () => {
    expect(statementFilename("2026-11-18", "en")).toBe("place-page-2026-11-18-en.txt");
    expect(statementFilename("2026-11-18", "fr")).toBe("page-lieu-2026-11-18-fr.txt");
  });
});

describe("on screen", () => {
  let handle: StatementHandle | undefined;
  afterEach(() => {
    handle?.destroy();
    handle = undefined;
  });

  it("passes the copy audit", () => {
    expect(auditCopy(checkStrings())).toEqual([]);
  });

  it.each(["en", "fr"] as Locale[])("shows what the notes say under each detail and passes the audits (%s)", async (l) => {
    const known = knownPlace(NOTES(), "Library", "1 Main St", l);
    document.documentElement.lang = l;
    document.body.innerHTML =
      `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1>` +
      renderStatement({ form: { ...emptyStatementForm(TODAY), placeName: "Library", address: "1 Main St" }, findings: readStatement("There is no elevator."), errors: [], locale: l, statusMessage: undefined, known }) +
      `</main></div>`;
    const root = document.getElementById("r") as HTMLElement;
    expect(root.querySelector("[data-known-place]")?.textContent).toBe(CHECK_COPY.known[l]);
    expect(Array.from(root.querySelectorAll("[data-notes-say]")).map((e) => e.getAttribute("data-notes-say"))).toEqual(["differ", "unknown", "unknown", "yes"]);
    expect(root.querySelector('[data-finding="elevator"] [data-against]')).not.toBeNull();
    expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it("finds the place from the notes on this device, and offers the sentences as a file", () => {
    const store = memoryStore();
    for (const n of NOTES()) addNote(store, n);
    document.documentElement.lang = "en";
    document.body.innerHTML = '<a class="skip-link" href="#main">Skip</a><main id="main"><h1>The App</h1><div id="host"></div></main>';
    const host = document.getElementById("host") as HTMLElement;
    handle = mountStatementReader(host, { locale: "en", store, today: TODAY });
    (host.querySelector("#st-name") as HTMLInputElement).value = "library";
    (host.querySelector("#st-address") as HTMLInputElement).value = "1 Main St";
    (host.querySelector("#st-text") as HTMLTextAreaElement).value = "There is no elevator.";
    (host.querySelector('[data-action="statement-read"]') as HTMLButtonElement).click();
    expect(host.querySelector("[data-known-place]")).not.toBeNull();
    expect(host.querySelector('[data-finding="elevator"] [data-notes-say]')?.textContent).toBe("In your notes: Yes (1 report)");
    const link = host.querySelector<HTMLAnchorElement>("a[download]");
    expect(link?.getAttribute("download")).toBe("place-page-2026-11-19-en.txt");
    expect(link?.textContent).toBe(CHECK_COPY.download.en);
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toContain("- Words that usually mean it does not: “There is no elevator.”");
  });

  it("says nothing about notes for a new place", () => {
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById("host") as HTMLElement;
    handle = mountStatementReader(host, { locale: "en", store: memoryStore(), today: TODAY });
    (host.querySelector("#st-name") as HTMLInputElement).value = "New Cafe";
    (host.querySelector("#st-text") as HTMLTextAreaElement).value = "There is no elevator.";
    (host.querySelector('[data-action="statement-read"]') as HTMLButtonElement).click();
    expect(host.querySelector("[data-known-place]")).toBeNull();
    expect(host.querySelector("[data-notes-say]")).toBeNull();
  });
});
