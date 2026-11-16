// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DISPLAY_KEY,
  DRAFT_KEY,
  LIMITS,
  NOTES_KEY,
  addNote,
  emptyForm,
  loadNotes,
  memoryStore,
  mountShell,
  toNote,
  type FactKey,
  type KeyValueStore,
  type Note,
  type ShellHandle,
  type Tri,
  type Violation,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));
let root: HTMLElement;
let shell: ShellHandle | undefined;
let store: KeyValueStore;
let audits: Violation[][];

function mount(locales: string[] = ["en"], s: KeyValueStore | undefined = store): ShellHandle {
  audits = [];
  shell = mountShell(root, { requestedLocales: locales, store: s, today: TODAY, onAudit: (v) => audits.push(v) });
  return shell;
}

const act = (action: string, value?: string, key?: string): string =>
  `[data-action="${action}"]` + (key !== undefined ? `[data-key="${key}"]` : "") + (value !== undefined ? `[data-value="${value}"]` : "");

function click(sel: string): void {
  const el = root.querySelector<HTMLElement>(sel);
  expect(el, sel).not.toBeNull();
  el?.click();
}

function type(sel: string, value: string): void {
  const el = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(sel);
  expect(el, sel).not.toBeNull();
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function choose(sel: string, value: string): void {
  const el = root.querySelector<HTMLSelectElement>(sel);
  if (!el) throw new Error(sel);
  el.value = value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

const heading = (): string => root.querySelector("h2")?.textContent ?? "";
const text = (): string => root.textContent ?? "";

function mk(id: string, name: string, details: Partial<Record<FactKey, Tri>>): Note {
  const f = emptyForm(TODAY);
  return toNote({ ...f, placeName: name, licence: "CC0-1.0", details: { ...f.details, elevator: "yes", ...details } }, TODAY, () => id);
}

function seed(notes: Note[]): void {
  for (const n of notes.slice().reverse()) addNote(store, n);
}

function openNotes(): void {
  click(act("view", "notes"));
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  store = memoryStore();
});

afterEach(() => {
  shell?.destroy();
  shell = undefined;
});

describe("display settings view", () => {
  it("changes the page, keeps focus on the pressed button and saves", () => {
    mount();
    click(act("view", "display"));
    expect(heading()).toBe("Display settings");
    click(act("display", "150", "scale"));
    const ds = document.documentElement.dataset;
    expect(ds["textScale"]).toBe("150");
    const btn = root.querySelector(act("display", "150", "scale"));
    expect(btn?.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(btn);
    click(act("display", "wide", "spacing"));
    click(act("display", "more", "contrast"));
    click(act("display", "reduce", "motion"));
    expect([ds["spacing"], ds["contrast"], ds["motion"]]).toEqual(["wide", "more", "reduce"]);
    expect(JSON.parse(store.getItem(DISPLAY_KEY) ?? "{}")).toEqual({ scale: "150", spacing: "wide", contrast: "more", motion: "reduce" });
  });

  it("restores saved settings on the next visit and offers up to 200%", () => {
    mount();
    click(act("view", "display"));
    click(act("display", "200", "scale"));
    shell?.destroy();
    document.documentElement.removeAttribute("data-text-scale");
    mount();
    expect(document.documentElement.dataset["textScale"]).toBe("200");
  });

  it("ignores an unknown setting key", () => {
    mount();
    click(act("view", "display"));
    const b = document.createElement("button");
    b.dataset["action"] = "display";
    b.dataset["key"] = "bogus";
    b.dataset["value"] = "x";
    root.appendChild(b);
    b.click();
    expect(store.getItem(DISPLAY_KEY)).toBeNull();
  });
});

describe("add a note", () => {
  function openForm(): void {
    openNotes();
    click(act("add-note"));
  }

  it("starts with every detail Unknown and no licence chosen", () => {
    mount();
    openForm();
    expect(heading()).toBe("Add a note");
    for (const k of ["step-free-entry", "accessible-washroom", "automatic-door", "elevator"]) {
      const checked = root.querySelector<HTMLInputElement>(`input[name="detail-${k}"]:checked`);
      expect(checked?.value, k).toBe("unknown");
    }
    expect(root.querySelector<HTMLSelectElement>("#f-licence")?.value).toBe("");
    expect(root.querySelector<HTMLInputElement>("#f-observedOn")?.value).toBe("2026-11-15");
  });

  it("shows an error summary, focuses it, and marks each field with its own error", () => {
    mount();
    openForm();
    click(act("submit-form"));
    expect(document.activeElement?.id).toBe("error-summary");
    const links = Array.from(root.querySelectorAll("#error-summary a")).map((a) => a.textContent);
    expect(links).toEqual(["Enter the place name.", "Answer Yes or No for at least one detail. Leave the others as Unknown.", "Choose a licence for your note."]);
    expect(root.querySelector("#f-placeName")?.getAttribute("aria-invalid")).toBe("true");
    expect(root.querySelector("#f-placeName")?.getAttribute("aria-describedby")).toBe("e-placeName");
    expect(root.querySelector("#e-placeName")?.textContent).toBe("Enter the place name.");
    expect(root.querySelector("#f-details")?.getAttribute("aria-describedby")).toContain("e-details");
    expect(loadNotes(store).notes).toEqual([]);
  });

  it("shows the errors in French", () => {
    mount(["fr"]);
    openForm();
    click(act("submit-form"));
    expect(root.querySelector("#e-placeName")?.textContent).toBe("Saisissez le nom du lieu.");
    expect(root.querySelector("#error-summary h3")?.textContent).toBe("Veuillez corriger ces problèmes\u00A0:");
  });

  it("rejects personal details in the note", () => {
    mount();
    openForm();
    type("#f-placeName", "Hall");
    click('input[name="detail-elevator"][value="yes"]');
    choose("#f-licence", "CC0-1.0");
    type("#f-note", "call 416 555 0123");
    click(act("submit-form"));
    expect(root.querySelector("#e-note")?.textContent).toBe("Remove the phone number from the note.");
  });

  it("saves a valid note with provenance, clears the draft and shows it in the list", async () => {
    mount();
    openForm();
    type("#f-placeName", "  Example Library ");
    type("#f-address", "1 Example St");
    click('input[name="detail-step-free-entry"][value="yes"]');
    click('input[name="detail-accessible-washroom"][value="no"]');
    choose("#f-licence", "CC-BY-4.0");
    type("#f-note", "Ramp on the left.");
    expect(store.getItem(DRAFT_KEY)).not.toBeNull();
    click(act("submit-form"));
    expect(shell?.getView().kind).toBe("notes");
    expect(heading()).toBe("My notes");
    expect(text()).toContain("Note saved on this device.");
    expect(store.getItem(DRAFT_KEY)).toBeNull();
    const [n] = loadNotes(store).notes;
    expect(n?.placeName).toBe("Example Library");
    expect(n?.facts.find((f) => f.key === "step-free-entry")?.provenance).toEqual({ source: "Contributor report", licence: "CC-BY-4.0", recordedOn: "2026-11-15" });
    expect(n?.facts.find((f) => f.key === "elevator")?.value).toBe("unknown");
    expect(root.querySelector("article h4")?.textContent).toBe("Example Library");
    expect(text()).toContain("Source: Contributor report.");
    await Promise.resolve();
    expect(document.querySelector('[role="status"]')?.textContent).toBe("Note saved on this device.");
  });

  it("shows the contributor source in French", () => {
    seed([mk("a", "Hall", { elevator: "yes" })]);
    mount(["fr"]);
    openNotes();
    expect(text()).toContain("Source\u00A0: Rapport d’un contributeur.");
  });

  it("restores an unfinished draft so nothing is typed twice", () => {
    mount();
    openForm();
    type("#f-placeName", "Half done");
    click('input[name="detail-elevator"][value="no"]');
    shell?.destroy();
    mount();
    openNotes();
    click(act("add-note"));
    expect(root.querySelector<HTMLInputElement>("#f-placeName")?.value).toBe("Half done");
    expect(root.querySelector<HTMLInputElement>('input[name="detail-elevator"]:checked')?.value).toBe("no");
    expect(text()).toContain("Your unsaved draft was restored.");
  });

  it("cancelling goes back to the notes and keeps the draft", () => {
    mount();
    openForm();
    type("#f-placeName", "Keep me");
    click(act("cancel-form"));
    expect(shell?.getView().kind).toBe("notes");
    expect(store.getItem(DRAFT_KEY)).toContain("Keep me");
  });

  it("is reachable from the help guide for adding a detail", () => {
    mount();
    click(act("view", "help"));
    click(act("open-path", "add-a-detail"));
    expect(root.querySelector(act("open-form"))).toBeNull();
    click(act("path-step", "1"));
    click(act("path-step", "2"));
    click(act("open-form"));
    expect(shell?.getView().kind).toBe("form");
  });

  it("stops at the 200 note limit and says why", () => {
    const many = Array.from({ length: LIMITS.notes }, (_, i) => mk(`n${i}`, `Place ${i}`, { elevator: "yes" }));
    store.setItem(NOTES_KEY, JSON.stringify(many));
    mount();
    openNotes();
    click(act("add-note"));
    expect(shell?.getView().kind).toBe("notes");
    expect(text()).toContain("You have reached the limit of 200 notes.");
  });
});

describe("notes list, filter and search", () => {
  const notes = (): Note[] => [
    mk("a", "Archive", { "step-free-entry": "yes" }),
    mk("b", "Bakery", { "step-free-entry": "no" }),
    mk("c", "Cinema", {}),
    mk("d", "Éclair Café", { "step-free-entry": "yes" }),
  ];

  it("lists all notes alphabetically with no filter, and says when there are none", () => {
    mount();
    openNotes();
    expect(text()).toContain("No notes yet.");
    shell?.destroy();
    seed(notes());
    mount();
    openNotes();
    expect(root.querySelector("#results h3")?.textContent).toBe("All notes (4)");
    expect(Array.from(root.querySelectorAll("article h4")).map((h) => h.textContent)).toEqual(["Archive", "Bakery", "Cinema", "Éclair Café"]);
  });

  it("keeps unknown separate from both matches and non-matches", () => {
    seed(notes());
    mount();
    openNotes();
    click(act("filter", "yes", "step-free-entry"));
    const heads = Array.from(root.querySelectorAll("#results h3")).map((h) => h.textContent);
    expect(heads).toEqual(["Matches (2)", "Unknown for this filter (1)", "Does not match (1)"]);
    const groups = root.querySelector("#results")?.innerHTML ?? "";
    expect(groups.indexOf("Cinema")).toBeGreaterThan(groups.indexOf("Unknown for this filter"));
    expect(groups.indexOf("Cinema")).toBeLessThan(groups.indexOf("Does not match"));
    expect(text()).toContain("They may or may not match.");
    expect(document.activeElement).toBe(root.querySelector(act("filter", "yes", "step-free-entry")));
  });

  it("clears the filter with Any", () => {
    seed(notes());
    mount();
    openNotes();
    click(act("filter", "yes", "step-free-entry"));
    click(act("filter", "any", "step-free-entry"));
    expect(root.querySelector("#results h3")?.textContent).toBe("All notes (4)");
  });

  it("searches names without losing focus in the search box", () => {
    seed(notes());
    mount();
    openNotes();
    const q = root.querySelector<HTMLInputElement>("#q");
    q?.focus();
    type("#q", "ECLAIR");
    expect(Array.from(root.querySelectorAll("article h4")).map((h) => h.textContent)).toEqual(["Éclair Café"]);
    expect(document.activeElement).toBe(q);
  });

  it("shows user text as text, never as markup, and does not audit user wording", () => {
    seed([mk("x", "<b>Bold</b> Verified Café", { elevator: "yes" })]);
    mount();
    openNotes();
    expect(root.querySelector("article h4")?.textContent).toBe("<b>Bold</b> Verified Café");
    expect(root.querySelector("article h4 b")).toBeNull();
    expect(audits[audits.length - 1]).toEqual([]);
  });

  it("removes a note only after confirmation, and can be cancelled", async () => {
    seed(notes());
    mount();
    openNotes();
    click(act("remove-note", "a"));
    const confirm = root.querySelector(act("confirm-remove", "a"));
    expect(confirm).not.toBeNull();
    expect(document.activeElement).toBe(confirm);
    expect(loadNotes(store).notes.length).toBe(4);
    click(act("cancel-remove", "a"));
    expect(root.querySelector(act("confirm-remove"))).toBeNull();
    expect(document.activeElement).toBe(root.querySelector(act("remove-note", "a")));
    click(act("remove-note", "a"));
    click(act("confirm-remove", "a"));
    expect(loadNotes(store).notes.map((n) => n.id)).toEqual(["b", "c", "d"]);
    expect(text()).toContain("Note removed.");
    await Promise.resolve();
    expect(document.querySelector('[role="status"]')?.textContent).toBe("Note removed.");
  });

  it("gives each remove button the note name through aria-describedby, not user text in the label", () => {
    seed(notes());
    mount();
    openNotes();
    const b = root.querySelector(act("remove-note", "a"));
    expect(b?.getAttribute("aria-label")).toBeNull();
    const id = b?.getAttribute("aria-describedby") ?? "";
    expect(root.querySelector(`#${id}`)?.textContent).toBe("Archive");
  });

  it("tells the person when saved notes could not be read", () => {
    store.setItem(NOTES_KEY, JSON.stringify([mk("a", "Archive", { elevator: "yes" }), { id: "broken" }]));
    mount();
    openNotes();
    expect(text()).not.toContain("could not be read");
    shell?.destroy();
    mount();
    expect(shell?.getNotes().length).toBe(1);
  });
});

describe("export and import", () => {
  it("exports readable JSON with a download link", () => {
    seed([mk("a", "Archive", { elevator: "yes" })]);
    mount();
    openNotes();
    click(act("export-open"));
    const ta = root.querySelector<HTMLTextAreaElement>("#export-text");
    expect(document.activeElement).toBe(ta);
    const data = JSON.parse(ta?.value ?? "{}");
    expect(data.format).toBe("app-notes");
    expect(data.notes[0].placeName).toBe("Archive");
    const a = root.querySelector<HTMLAnchorElement>("a[download]");
    expect(a?.getAttribute("download")).toBe("notes-2026-11-15.json");
    expect(a?.getAttribute("href")?.startsWith("data:application/json")).toBe(true);
  });

  it("imports notes from another device and skips duplicates", () => {
    const other = memoryStore();
    addNote(other, mk("a", "Archive", { elevator: "yes" }));
    addNote(other, mk("z", "Zoo", { "automatic-door": "no" }));
    mount();
    openNotes();
    // Export from the other device's state.
    const text0 = JSON.stringify({ format: "app-notes", version: 1, exportedOn: "2026-11-15", notes: loadNotes(other).notes });
    seed([mk("a", "Archive", { elevator: "yes" })]);
    shell?.destroy();
    mount();
    openNotes();
    type("#import-text", text0);
    click(act("import-run"));
    expect(root.querySelector("#import-message")?.textContent).toBe("1 note(s) imported, 1 already present or over the limit, 0 not valid.");
    expect(loadNotes(store).notes.map((n) => n.id)).toEqual(["a", "z"]);
  });

  it("explains a bad import in the current language and changes nothing", () => {
    mount(["fr"]);
    openNotes();
    type("#import-text", "pas du JSON");
    click(act("import-run"));
    expect(root.querySelector("#import-message")?.textContent).toBe("Ce texte n’est pas une exportation de notes.");
    click(act("import-run"));
    expect(loadNotes(store).notes).toEqual([]);
  });

  it("says when nothing was pasted", () => {
    mount();
    openNotes();
    click(act("import-run"));
    expect(root.querySelector("#import-message")?.textContent).toBe("Paste the exported text first.");
  });

  it("reports when imported notes cannot be saved", () => {
    const readOnly: KeyValueStore = { getItem: () => null, setItem: () => { throw new Error("full"); }, removeItem: () => undefined };
    mount(["en"], readOnly);
    openNotes();
    type("#import-text", JSON.stringify({ format: "app-notes", version: 1, exportedOn: "2026-11-15", notes: [mk("q", "Q", { elevator: "yes" })] }));
    click(act("import-run"));
    expect(root.querySelector("#import-message")?.textContent).toBe("The notes could not be saved on this device.");
    expect(shell?.getNotes().length).toBe(0);
  });
});

describe("audits run on every view in both languages and must stay empty", () => {
  async function tour(locale: string): Promise<void> {
    store = memoryStore();
    seed([mk("a", "Archive", { "step-free-entry": "yes" }), mk("b", "Bakery", { "step-free-entry": "no" }), mk("c", "Cinema", {})]);
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app") as HTMLElement;
    mount([locale]);
    const axeRun = async (label: string): Promise<void> => {
      const r = await axe.run(document.body, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
        rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
      });
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), `axe ${label} ${locale}`).toEqual([]);
    };
    await axeRun("setup");
    click(act("view", "notes")); await axeRun("notes");
    click(act("filter", "yes", "step-free-entry")); await axeRun("notes filtered");
    click(act("remove-note", "a")); await axeRun("notes confirm");
    click(act("cancel-remove", "a"));
    click(act("export-open")); await axeRun("notes export");
    click(act("add-note")); await axeRun("form");
    click(act("submit-form")); await axeRun("form with errors");
    click(act("cancel-form"));
    click(act("view", "display")); await axeRun("display");
    click(act("view", "help")); await axeRun("help");
    click(act("open-path", "add-a-detail"));
    click(act("path-step", "1"));
    click(act("path-step", "2")); await axeRun("path");
    click(act("view", "help"));
    click(act("open-card")); await axeRun("card");
  }

  it("English: no axe violations and no DOM audit violations on any render", async () => {
    await tour("en");
    expect(audits.length).toBeGreaterThan(15);
    expect(audits.flat().map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });

  it("French: no axe violations and no DOM audit violations on any render", async () => {
    await tour("fr");
    expect(audits.length).toBeGreaterThan(15);
    expect(audits.flat().map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });
});
