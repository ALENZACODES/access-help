// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, placeId, auditDom, decodeTextExportHref, loadNotes, type Locale, type Note } from "./index";
import { ASKED_KEY, loadAsked, recordAsk } from "./asked";
import { BIN_KEY, addToBin, loadBin } from "./bin";
import { MOVE_COPY, MOVE_ERRORS, PARTS, exportDevice, importDevice, mergeDevice, partCount, type DeviceData, type Part } from "./devicefile";
import { renderMove, type MoveContext } from "./views-move";
import { NEEDS_KEY } from "./needs";
import { SHORTLIST_KEY } from "./shortlist";
import { addStop, emptySurvey, loadSurvey, setLicence } from "./survey";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const POOL = placeId({ placeName: "Pool", address: "1 Main St" });
const note = (id: string, name: string): Note => testNote(id, name, [{ key: "elevator", value: "yes", source: CONTRIBUTOR_SOURCE }]);
const EMPTY: DeviceData = { notes: [], lists: { needs: {}, shortlist: [], checklist: {} }, asked: [], corrections: [], bin: [], survey: undefined };

function otherDevice(): DeviceData {
  const asked = recordAsk([], { id: "pool-22222222", name: "Pool", address: undefined }, ["elevator"], "phone", TODAY);
  if (asked === "full") throw new Error("full");
  return { ...EMPTY, notes: [note("n1", "Library"), note("n9", "Pool")], asked, bin: addToBin([], note("gone", "Arena"), TODAY) };
}

let h: Harness;
beforeEach(() => {
  h = createHarness(TODAY);
});
afterEach(() => {
  h.destroy();
});

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = h.root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

const said = async (): Promise<string> => {
  await Promise.resolve();
  return h.status();
};

function openMove(locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "help"));
  h.click(act("open-device"));
  h.click(act("open-move"));
}

function paste(text: string): void {
  $<HTMLTextAreaElement>("#move-text").value = text;
  h.click(act("move-look"));
}

describe("taking everything with you", () => {
  it("opens from the device page and offers one file with every part counted", () => {
    h.seed([note("n1", "Library")]);
    openMove();
    expect(h.heading()).toBe(MOVE_COPY.title.en);
    expect($('[data-part-count="notes"]').textContent).toBe("Notes: 1");
    const link = $<HTMLAnchorElement>("[data-move-download]");
    expect(link.getAttribute("download")).toBe("app-everything-2026-11-20.json");
    const r = importDevice(decodeTextExportHref(link.getAttribute("href") ?? "") ?? "", TODAY);
    expect(r.error === undefined && r.data.notes.map((n) => n.id)).toEqual(["n1"]);
  });

  it("has its own address under Help", () => {
    window.location.hash = "#/help/device/move";
    h.mount("fr", true);
    expect(h.heading()).toBe(MOVE_COPY.title.fr);
    expect(h.root.querySelector('nav [aria-current="page"]')?.getAttribute("data-value")).toBe("help");
  });
});

describe("bringing a file in", () => {
  it("says what is wrong with the text, with focus in the box", async () => {
    openMove();
    paste("not a file");
    expect(document.activeElement?.id).toBe("move-text");
    expect($("#e-move-text").textContent).toBe(MOVE_ERRORS["not-json"].en);
    expect(await said()).toBe(MOVE_ERRORS["not-json"].en);
    expect($<HTMLTextAreaElement>("#move-text").value).toBe("not a file");
  });

  it("recognises the App's other files and points to where they go", async () => {
    openMove();
    paste(JSON.stringify({ format: "app-notes", version: 1, notes: [] }));
    expect($("#e-move-text").textContent).toBe(MOVE_ERRORS["is-notes"].en);
    h.click(act("view", "notes"));
    expect(h.heading()).toBe("My notes");
    openMove();
    paste(JSON.stringify({ format: "app-lists", version: 1 }));
    expect(await said()).toBe(MOVE_ERRORS["is-lists"].en);
    expect($(`#e-move-text + p ${act("view", "places")}`).textContent).toBe(MOVE_COPY.goLists.en);
  });

  it("shows what each part would add, with useful parts chosen, before changing anything", () => {
    h.seed([note("n1", "Library (mine)")]);
    openMove();
    paste(exportDevice(otherDevice(), "2026-11-20"));
    expect(document.activeElement?.id).toBe("move-preview");
    const row = (p: Part): string[] => Array.from(h.root.querySelectorAll(`[data-plan="${p}"] td`)).slice(0, 4).map((td) => td.textContent ?? "");
    expect(row("notes")).toEqual(["2", "1", "1", "0"]);
    expect(row("asked")).toEqual(["1", "1", "0", "0"]);
    expect(row("bin")).toEqual(["1", "1", "0", "0"]);
    const chosen = Array.from(h.root.querySelectorAll<HTMLInputElement>('[data-action="move-part"]')).filter((c) => c.checked).map((c) => c.dataset["key"]);
    expect(chosen).toEqual(["notes", "asked", "bin"]);
    // Nothing has changed yet.
    expect(loadNotes(h.store).notes.map((n) => n.id)).toEqual(["n1"]);
    expect(h.store.getItem(ASKED_KEY)).toBeNull();
  });

  it("brings in only the chosen parts, keeps this device's note, and says what came in", async () => {
    h.seed([note("n1", "Library (mine)")]);
    openMove();
    paste(exportDevice(otherDevice(), "2026-11-20"));
    $<HTMLInputElement>('[data-action="move-part"][data-key="bin"]').click();
    expect(document.activeElement?.getAttribute("data-key")).toBe("bin");
    h.click(act("move-apply"));
    expect(await said()).toBe("Brought in: Notes (1), Questions you sent (1).");
    expect(document.activeElement).toBe(h.root.querySelector("h2"));
    expect(loadNotes(h.store).notes.map((n) => [n.id, n.placeName])).toEqual([
      ["n1", "Library (mine)"],
      ["n9", "Pool"],
    ]);
    expect(loadAsked(h.store).map((r) => r.id)).toEqual(["pool-22222222"]);
    expect(h.store.getItem(BIN_KEY)).toBeNull();
    // The preview is gone and the box is empty, ready for another file.
    expect(h.root.querySelector("#move-preview")).toBeNull();
    expect($<HTMLTextAreaElement>("#move-text").value).toBe("");
  });

  it("asks for a part when none is chosen", async () => {
    openMove();
    paste(exportDevice(otherDevice(), "2026-11-20"));
    for (const box of Array.from(h.root.querySelectorAll<HTMLInputElement>('[data-action="move-part"]'))) $<HTMLInputElement>(`[data-action="move-part"][data-key="${box.dataset["key"] ?? ""}"]`).click();
    h.click(act("move-apply"));
    expect(await said()).toBe(MOVE_COPY.noneChosen.en);
    expect(document.activeElement?.getAttribute("data-action")).toBe("move-part");
    expect(loadNotes(h.store).notes).toEqual([]);
  });

  it("says when a file adds nothing, and can be cancelled", async () => {
    h.seed([note("n1", "Library")]);
    openMove();
    paste(exportDevice({ ...EMPTY, notes: [note("n1", "Library")] }, "2026-11-20"));
    expect(h.text()).toContain(MOVE_COPY.nothing.en);
    expect(h.root.querySelector(act("move-apply"))).toBeNull();
    h.click(act("move-cancel"));
    expect(await said()).toBe(MOVE_COPY.cancelled.en);
    expect(h.root.querySelector("#move-preview")).toBeNull();
  });

  it("makes the same move between two devices: what leaves one arrives in the other", () => {
    h.seed([note("a1", "Library"), note("a2", "Cafe")]);
    h.store.setItem(BIN_KEY, JSON.stringify(addToBin([], note("a3", "Arena"), TODAY)));
    openMove();
    const text = decodeTextExportHref($<HTMLAnchorElement>("[data-move-download]").getAttribute("href") ?? "") ?? "";
    h.destroy();
    h = createHarness(TODAY);
    openMove();
    paste(text);
    h.click(act("move-apply"));
    expect(loadNotes(h.store).notes.map((n) => n.id)).toEqual(["a1", "a2"]);
    expect(loadBin(h.store, TODAY).map((e) => e.note.id)).toEqual(["a3"]);
  });
});

describe("the other parts and the other imports", () => {
  it("says how old the file is in the preview", () => {
    openMove();
    paste(exportDevice(otherDevice(), "2026-06-01"));
    expect($("[data-move-made]").textContent).toBe(`File made on 2026-06-01, 172 days ago. ${MOVE_COPY.oldFile.en}`);
  });

  it("brings in must-haves and the shortlist, and a survey only when there is none here", () => {
    const stop = addStop(emptySurvey(TODAY), "Kiosk", "", TODAY);
    if (!stop.ok) throw new Error("survey");
    const theirs: DeviceData = { ...otherDevice(), lists: { needs: { elevator: "yes" }, shortlist: [POOL], checklist: {} }, survey: setLicence(stop.survey, "CC0-1.0") };
    openMove();
    paste(exportDevice(theirs, "2026-11-20"));
    h.click(act("move-apply"));
    expect(JSON.parse(h.store.getItem(NEEDS_KEY) ?? "{}")).toEqual({ elevator: "yes" });
    // The shortlist names a place by its id; the Pool note came with the same file.
    expect(JSON.parse(h.store.getItem(SHORTLIST_KEY) ?? "[]")).toEqual([POOL]);
    expect(loadSurvey(h.store, TODAY)?.stops.map((s) => s.placeName)).toEqual(["Kiosk"]);
    // A second file with another survey does not replace the walk in progress.
    const other = addStop(emptySurvey(TODAY), "Arena", "", TODAY);
    if (!other.ok) throw new Error("survey");
    paste(exportDevice({ ...EMPTY, survey: setLicence(other.survey, "CC0-1.0") }, "2026-11-20"));
    expect(Array.from(h.root.querySelectorAll('[data-plan="survey"] td')).slice(0, 3).map((td) => td.textContent)).toEqual(["1", "0", "1"]);
    expect(h.text()).toContain(MOVE_COPY.nothing.en);
  });

  it("sends an everything file pasted into the notes import or the lists restore to the right page", () => {
    h.mount("en");
    h.click(act("view", "notes"));
    $<HTMLTextAreaElement>("#import-text").value = exportDevice(otherDevice(), "2026-11-20");
    h.click(act("import-run"));
    expect(h.text()).toContain(MOVE_COPY.isDeviceFile.en);
    $<HTMLTextAreaElement>("#import-text").value = exportDevice(otherDevice(), "2026-11-20");
    h.click(act("import-preview"));
    expect(h.text()).toContain(MOVE_COPY.isDeviceFile.en);
    expect(loadNotes(h.store).notes).toEqual([]);
    h.click(act("view", "places"));
    $<HTMLTextAreaElement>("#restore-text").value = exportDevice(otherDevice(), "2026-11-20");
    h.click(act("backup-restore"));
    expect(h.text()).toContain(MOVE_COPY.isDeviceFile.en);
  });
});

describe("the screen", () => {
  function ctx(more: Partial<MoveContext> = {}): MoveContext {
    return { current: EMPTY, locale: "en", today: TODAY, pasteText: "", error: undefined, plans: undefined, chosen: new Set(), noneChosen: false, statusMessage: undefined, ...more };
  }

  function mount(html: string, l: Locale): HTMLElement {
    document.documentElement.lang = l;
    document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1>${html}</main></div>`;
    return document.getElementById("r") as HTMLElement;
  }

  it.each(["en", "fr"] as const)("passes axe and the App's audit: empty, with an error, and with a preview (%s)", async (l) => {
    const { plans } = mergeDevice(EMPTY, otherDevice(), new Set(PARTS));
    for (const c of [ctx({ locale: l }), ctx({ locale: l, error: "wrong-version" }), ctx({ locale: l, plans, chosen: new Set<Part>(["notes"]), noneChosen: true })]) {
      const root = mount(renderMove(c), l);
      expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }
  });

  it("names each choice after its part, and offers none for a part that adds nothing", () => {
    const { plans } = mergeDevice(EMPTY, otherDevice(), new Set(PARTS));
    const root = mount(renderMove(ctx({ plans, chosen: new Set<Part>(["notes"]) })), "en");
    expect(root.querySelector('[data-plan="notes"] label')?.textContent).toBe("Bring in Notes");
    expect(root.querySelector('[data-plan="survey"] input')).toBeNull();
    expect(root.querySelector("#move-text")?.getAttribute("aria-describedby")).toBe("h-move-text");
  });

  it("ties the error to the box", () => {
    const root = mount(renderMove(ctx({ error: "empty", locale: "fr" })), "fr");
    const box = root.querySelector("#move-text");
    expect(box?.getAttribute("aria-describedby")).toBe("h-move-text e-move-text");
    expect(box?.getAttribute("aria-invalid")).toBe("true");
    expect(root.querySelector("#e-move-text")?.textContent).toBe(MOVE_ERRORS.empty.fr);
  });
});

describe("the way in", () => {
  it.each(["en", "fr"] as const)("is on the device page (%s)", (l) => {
    h.mount(l);
    h.click(act("view", "help"));
    h.click(act("open-device"));
    expect($(act("open-move")).textContent).toBe(MOVE_COPY.open[l]);
    h.click(act("open-move"));
    expect(h.heading()).toBe(MOVE_COPY.title[l]);
    h.click(act("open-device"));
    expect(h.root.querySelector(act("open-move"))).not.toBeNull();
    expect(h.auditLines()).toEqual([]);
  });
});

describe("in French", () => {
  it("moves everything with French copy and typography from start to finish", async () => {
    h.seed([note("n1", "Bibliothèque")]);
    openMove("fr");
    paste("pas un fichier");
    expect($("#e-move-text").textContent).toBe(MOVE_ERRORS["not-json"].fr);
    paste(exportDevice(otherDevice(), "2026-11-19"));
    expect($("[data-move-made]").textContent).toBe("Fichier créé le 2026-11-19, il y a 1 jour.");
    expect($('[data-plan="notes"] th').textContent).toBe("Notes");
    expect($('[data-plan="asked"] th').textContent).toBe("Questions envoyées");
    h.click(act("move-apply"));
    expect(await said()).toBe("Importé\u00A0: Notes (1), Questions envoyées (1), Retirées récemment (1).");
    expect(h.auditLines()).toEqual([]);
  });
});

describe("the screen's numbers", () => {
  function ctxFor(current: DeviceData, more: Partial<MoveContext> = {}): MoveContext {
    return { current, locale: "en", today: TODAY, pasteText: "", error: undefined, plans: undefined, chosen: new Set(), noneChosen: false, statusMessage: undefined, ...more };
  }

  it("lists every part of this device with its count, and the file holds them all", () => {
    const stop = addStop(emptySurvey(TODAY), "Kiosk", "", TODAY);
    if (!stop.ok) throw new Error("survey");
    const current: DeviceData = { ...otherDevice(), lists: { needs: { elevator: "yes" }, shortlist: [POOL], checklist: {} }, survey: stop.survey };
    document.body.innerHTML = renderMove(ctxFor(current));
    const counts = Array.from(document.querySelectorAll("[data-part-count]")).map((li) => li.textContent);
    expect(counts).toEqual([
      "Notes: 2",
      "Must-haves, shortlist and checklist: 2",
      "Questions you sent: 1",
      "Corrections to notes: 0",
      "Recently removed: 1",
      "Unfinished survey: 1",
    ]);
    const href = document.querySelector("[data-move-download]")?.getAttribute("href") ?? "";
    const r = importDevice(decodeTextExportHref(href) ?? "", TODAY);
    if (r.error) throw new Error(r.error);
    // Every part reads back with the same count as on this device.
    for (const p of PARTS) expect(partCount(r.data, p), p).toBe(partCount(current, p));
    expect(r.error === undefined && r.data.survey?.stops.map((s) => s.placeName)).toEqual(["Kiosk"]);
  });

  it("shows what had no room in its own column", () => {
    const current: DeviceData = { ...EMPTY, notes: Array.from({ length: 199 }, (_, i) => note(`m${i}`, `M${i}`)) };
    const { plans } = mergeDevice(current, otherDevice(), new Set(PARTS));
    document.body.innerHTML = renderMove(ctxFor(current, { plans, chosen: new Set<Part>(["notes"]) }));
    const cells = Array.from(document.querySelectorAll('[data-plan="notes"] td')).slice(0, 4).map((td) => td.textContent);
    expect(cells).toEqual(["2", "1", "0", "1"]);
    expect(document.querySelector('[data-plan="notes"] input')?.hasAttribute("checked")).toBe(true);
    expect(document.querySelector('[data-plan="corrections"] td:last-child')?.textContent).toBe("—");
  });
});
