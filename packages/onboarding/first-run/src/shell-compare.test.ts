// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHECKLIST_KEY,
  NEEDS_KEY,
  SHORTLIST_KEY,
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

function mount(locales: string[] = ["en"], extra: { hashRouting?: boolean } = {}): ShellHandle {
  audits = [];
  shell = mountShell(root, { requestedLocales: locales, store, today: TODAY, onAudit: (v) => audits.push(v), ...extra });
  return shell;
}

const act = (action: string, value?: string, key?: string): string =>
  `[data-action="${action}"]` + (key !== undefined ? `[data-key="${key}"]` : "") + (value !== undefined ? `[data-value="${value}"]` : "");

function click(sel: string): void {
  const el = root.querySelector<HTMLElement>(sel);
  expect(el, sel).not.toBeNull();
  el?.click();
}

const heading = (): string => root.querySelector("h2")?.textContent ?? "";
const text = (): string => root.textContent ?? "";

function mk(id: string, name: string, details: Partial<Record<FactKey, Tri>>, on = "2026-11-01"): Note {
  const f = emptyForm(TODAY);
  return toNote(
    { ...f, placeName: name, address: "", observedOn: on, licence: "CC0-1.0", details: { ...f.details, "automatic-door": "yes", ...details } },
    new Date(`${on}T00:00:00Z`),
    () => id,
  );
}

const NOTES = (): Note[] => [
  mk("a", "Archive", { elevator: "yes", "step-free-entry": "yes" }),
  mk("b", "Bakery", {}),
  mk("c", "Cinema", { elevator: "yes" }),
  mk("d", "Cinema", { elevator: "no" }, "2026-11-05"),
  mk("e", "Dojo", { elevator: "no" }),
];

function seed(notes: Note[]): void {
  for (const n of notes.slice().reverse()) addNote(store, n);
}

/** The open button inside the card whose title contains the name. */
function cardButton(name: string, action: string): HTMLElement {
  const card = Array.from(root.querySelectorAll<HTMLElement>("article.card")).find((c) => c.querySelector("h4")?.textContent === name);
  const el = card?.querySelector<HTMLElement>(`[data-action="${action}"]`);
  if (!el) throw new Error(`${name} ${action}`);
  return el;
}

function openPlaces(): void {
  click(act("view", "notes"));
  click(act("view", "places"));
}

function names(): string[] {
  return Array.from(root.querySelectorAll("article.card h4")).map((h) => h.textContent ?? "");
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  store = memoryStore();
  window.location.hash = "";
});

afterEach(() => {
  shell?.destroy();
  shell = undefined;
  vi.unstubAllGlobals();
});

describe("order and shortlist", () => {
  it("changes the order without moving focus", () => {
    seed(NOTES());
    mount();
    openPlaces();
    expect(names()).toEqual(["Archive", "Bakery", "Cinema", "Dojo"]);
    const sort = root.querySelector<HTMLSelectElement>("#sort")!;
    sort.focus();
    sort.value = "reports";
    sort.dispatchEvent(new Event("change", { bubbles: true }));
    expect(names()).toEqual(["Cinema", "Archive", "Dojo", "Bakery"]);
    expect(document.activeElement).toBe(sort);
    expect(text()).toContain("does not say which place is more accessible");
  });

  it("ignores a sort value it does not know", () => {
    seed(NOTES());
    mount();
    openPlaces();
    const sort = root.querySelector<HTMLSelectElement>("#sort")!;
    const before = names();
    sort.insertAdjacentHTML("beforeend", '<option value="best">best</option>');
    sort.value = "best";
    sort.dispatchEvent(new Event("change", { bubbles: true }));
    expect(names()).toEqual(before);
  });

  it("adds to and removes from the shortlist, saves it, and filters to it", () => {
    seed(NOTES());
    mount();
    openPlaces();
    cardButton("Bakery", "toggle-shortlist").click();
    expect(JSON.parse(store.getItem(SHORTLIST_KEY) ?? "[]")).toHaveLength(1);
    expect(cardButton("Bakery", "toggle-shortlist").textContent).toBe("Remove from shortlist");
    expect(document.activeElement).toBe(cardButton("Bakery", "toggle-shortlist"));
    click(act("shortlist-only"));
    expect(names()).toEqual(["Bakery"]);
    expect(root.querySelector(act("shortlist-only"))?.getAttribute("aria-pressed")).toBe("true");
    cardButton("Bakery", "toggle-shortlist").click();
    expect(store.getItem(SHORTLIST_KEY)).toBeNull();
    expect(text()).toContain("Your shortlist is empty.");
  });

  it("forgets a shortlisted place when its last note is removed", () => {
    seed(NOTES());
    mount();
    openPlaces();
    cardButton("Bakery", "toggle-shortlist").click();
    click(act("view", "notes"));
    click(act("remove-note", "b"));
    click(act("confirm-remove", "b"));
    expect(store.getItem(SHORTLIST_KEY)).toBeNull();
  });

  it("starts from a stored shortlist", () => {
    seed(NOTES());
    mount();
    openPlaces();
    const id = cardButton("Dojo", "toggle-shortlist").dataset["value"];
    shell?.destroy();
    store.setItem(SHORTLIST_KEY, JSON.stringify([id]));
    mount();
    openPlaces();
    expect(cardButton("Dojo", "toggle-shortlist").textContent).toBe("Remove from shortlist");
  });
});

describe("compare", () => {
  function pick(...n: string[]): void {
    for (const name of n) cardButton(name, "toggle-compare").click();
  }

  it("needs two places and shows a table with no ranking", () => {
    seed(NOTES());
    mount();
    openPlaces();
    pick("Archive");
    expect(root.querySelector(act("open-compare"))).toBeNull();
    expect(text()).toContain("Choose two or three places to compare.");
    pick("Cinema");
    expect(cardButton("Cinema", "toggle-compare").getAttribute("aria-pressed")).toBe("true");
    click(act("open-compare"));
    expect(shell?.getView().kind).toBe("compare");
    expect(heading()).toBe("Compare places");
    const heads = Array.from(root.querySelectorAll("thead th")).map((h) => h.textContent);
    expect(heads).toEqual(["Detail", "Archive", "Cinema"]);
    expect(root.querySelectorAll("tbody tr")).toHaveLength(4);
    expect(text()).toContain("Reports differ");
    expect(text()).toContain("Nothing is scored or ranked.");
  });

  it("limits the selection to three and says so", () => {
    seed(NOTES());
    mount();
    openPlaces();
    pick("Archive", "Bakery", "Cinema", "Dojo");
    expect(root.querySelectorAll(`[data-action="toggle-compare"][aria-pressed="true"]`)).toHaveLength(3);
    expect(text()).toContain("You can compare up to three places.");
  });

  it("shows statuses for the requested details and keeps unknown as Unknown", () => {
    seed(NOTES());
    mount();
    openPlaces();
    click(act("filter", "yes", "elevator"));
    pick("Archive", "Bakery", "Dojo");
    click(act("open-compare"));
    const cells = Array.from(root.querySelectorAll("tbody td")).map((c) => c.querySelector(".status")?.textContent);
    expect(cells).toEqual(["Matches", "Unknown", "Does not match"]);
    expect(root.querySelectorAll("tbody tr")).toHaveLength(1);
  });

  it("clears the selection", () => {
    seed(NOTES());
    mount();
    openPlaces();
    pick("Archive", "Bakery");
    click(act("compare-clear"));
    expect(root.querySelector(act("open-compare"))).toBeNull();
    expect(root.querySelector(`[aria-pressed="true"][data-action="toggle-compare"]`)).toBeNull();
  });

  it("opens from its address and says when a place is gone", () => {
    seed(NOTES());
    mount(["en"], { hashRouting: true });
    window.location.hash = "#/compare/archive-00000000,bakery-00000000";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(root.querySelector('[role="note"]')?.textContent).toContain("no longer on this device");
  });
});

describe("what I asked", () => {
  function openPlan(name: string, ...filters: FactKey[]): void {
    openPlaces();
    for (const k of filters) click(act("filter", "yes", k));
    cardButton(name, "open-plan").click();
  }

  it("lists a checkbox and a field for each question and saves them without redrawing", () => {
    seed(NOTES());
    mount();
    openPlan("Bakery", "elevator", "step-free-entry");
    expect(root.querySelectorAll("ol > li")).toHaveLength(2);
    const box = root.querySelector<HTMLInputElement>('input[data-action="asked"][data-key="elevator"]')!;
    box.click();
    expect(JSON.parse(store.getItem(CHECKLIST_KEY) ?? "{}")).toMatchObject({ [box.dataset["value"] as string]: { elevator: { asked: true, answer: "" } } });
    const field = root.querySelector<HTMLInputElement>('input[data-action="answer"][data-key="elevator"]')!;
    field.value = "It is behind the front desk";
    field.dispatchEvent(new Event("change", { bubbles: true }));
    const copyable = root.querySelector<HTMLTextAreaElement>("#plan-text")!.value;
    expect(copyable).toContain("[asked]");
    expect(copyable).toContain("What the place said: It is behind the front desk");
    expect(root.querySelector('input[data-action="answer"][data-key="elevator"]')).toBe(field);
  });

  it("keeps the detail Unknown: notes never become reports", () => {
    seed(NOTES());
    mount();
    openPlan("Bakery", "elevator");
    const field = root.querySelector<HTMLInputElement>('input[data-action="answer"]')!;
    field.value = "Yes, there is one";
    field.dispatchEvent(new Event("change", { bubbles: true }));
    expect(root.querySelector("dl.plan strong")?.textContent).toBe("Unknown");
    expect(loadNotes(store).notes).toHaveLength(5);
  });

  it("refuses contact details, says why and keeps focus on the field", () => {
    seed(NOTES());
    mount();
    openPlan("Bakery", "elevator");
    const field = root.querySelector<HTMLInputElement>('input[data-action="answer"]')!;
    field.value = "call 416 555 0100";
    field.dispatchEvent(new Event("change", { bubbles: true }));
    const again = root.querySelector<HTMLInputElement>('input[data-action="answer"]')!;
    expect(again.getAttribute("aria-invalid")).toBe("true");
    expect(root.querySelector(".error")?.textContent).toContain("phone numbers");
    expect(document.activeElement).toBe(again);
    expect(store.getItem(CHECKLIST_KEY)).toBeNull();
  });

  it("asks again for answers a year old", () => {
    seed([mk("o", "Old Hall", { elevator: "yes" }, "2025-06-01")]);
    mount();
    openPlan("Old Hall", "elevator");
    expect(text()).toContain("Is this still the case");
    expect(text()).toContain("Recorded answer is a year old or more");
  });

  it("clears notes for one place after a confirmation", () => {
    seed(NOTES());
    mount();
    openPlan("Bakery", "elevator");
    expect(root.querySelector(act("clear-checklist"))).toBeNull();
    root.querySelector<HTMLInputElement>('input[data-action="asked"]')!.click();
    click(act("clear-checklist"));
    expect(text()).toContain("This cannot be undone.");
    click(act("cancel-clear-checklist"));
    expect(store.getItem(CHECKLIST_KEY)).not.toBeNull();
    click(act("clear-checklist"));
    click(act("confirm-clear-checklist"));
    expect(store.getItem(CHECKLIST_KEY)).toBeNull();
    expect(text()).toContain("Your notes for this place were cleared.");
  });

  it("opens the note form for this place and comes back to it after saving", () => {
    seed(NOTES());
    mount();
    openPlan("Bakery", "elevator");
    click(act("report-place", undefined, "elevator"));
    expect(shell?.getView().kind).toBe("form");
    expect(root.querySelector<HTMLInputElement>("#f-placeName")?.value).toBe("Bakery");
    const yes = root.querySelector<HTMLInputElement>('input[name="detail-elevator"][value="yes"]')!;
    yes.checked = true;
    yes.dispatchEvent(new Event("change", { bubbles: true }));
    const licence = root.querySelector<HTMLSelectElement>("#f-licence")!;
    licence.value = "CC0-1.0";
    licence.dispatchEvent(new Event("change", { bubbles: true }));
    root.querySelector<HTMLFormElement>("#note-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(shell?.getView().kind).toBe("plan");
    expect(loadNotes(store).notes).toHaveLength(6);
    expect(root.querySelector("dl.plan strong")?.textContent).toBe("Matches");
  });

  it("cancelling that form returns to the place's plan", () => {
    seed(NOTES());
    mount();
    openPlan("Bakery", "elevator");
    click(act("report-place", undefined, "elevator"));
    click(act("cancel-form"));
    expect(shell?.getView().kind).toBe("plan");
  });
});

describe("copy plan", () => {
  function planOpen(): void {
    seed(NOTES());
    mount();
    openPlaces();
    click(act("filter", "yes", "elevator"));
    cardButton("Bakery", "open-plan").click();
  }

  it("copies with the clipboard when there is one", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", { value: { writeText }, configurable: true });
    planOpen();
    click(act("copy-plan"));
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0]?.[0]).toContain("Bakery");
    Object.defineProperty(window.navigator, "clipboard", { value: undefined, configurable: true });
  });

  it("selects the text when copying is not possible", () => {
    Object.defineProperty(window.navigator, "clipboard", { value: undefined, configurable: true });
    planOpen();
    click(act("copy-plan"));
    expect(document.activeElement).toBe(root.querySelector("#plan-text"));
  });
});

describe.each(["en", "fr"] as const)("audits across the new screens (%s)", (locale) => {
  it("has no DOM audit violations and no axe violations", async () => {
    seed(NOTES());
    store.setItem(NEEDS_KEY, JSON.stringify({ elevator: "yes" }));
    mount([locale]);
    const axeRun = async (label: string): Promise<void> => {
      const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false } } });
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), `axe ${label} ${locale}`).toEqual([]);
    };
    click(act("view", "notes"));
    click(act("view", "places")); await axeRun("places");
    cardButton("Archive", "toggle-shortlist").click();
    click(act("shortlist-only")); await axeRun("shortlist");
    click(act("shortlist-only"));
    cardButton("Archive", "toggle-compare").click();
    cardButton("Cinema", "toggle-compare").click(); await axeRun("compare bar");
    click(act("open-compare")); await axeRun("compare");
    click(act("view", "places"));
    cardButton("Bakery", "open-plan").click(); await axeRun("plan");
    root.querySelector<HTMLInputElement>('input[data-action="asked"]')!.click();
    click(act("clear-checklist")); await axeRun("plan confirm");
    click(act("cancel-clear-checklist"));
    click(act("report-place", undefined, "elevator")); await axeRun("report form");
    expect(audits.flat().map((v) => `${v.rule}: ${v.detail}`), locale).toEqual([]);
  });
});

describe("my lists backup", () => {
  it("shows backup text with the current lists and a download link", () => {
    seed(NOTES());
    mount();
    openPlaces();
    click(act("filter", "yes", "elevator"));
    click(act("save-needs"));
    cardButton("Bakery", "toggle-shortlist").click();
    click(act("backup-open"));
    const text = root.querySelector<HTMLTextAreaElement>("#backup-text")!.value;
    expect(JSON.parse(text)).toMatchObject({ format: "app-lists", needs: { elevator: "yes" } });
    expect(JSON.parse(text).shortlist).toHaveLength(1);
    expect(root.querySelector<HTMLAnchorElement>("a[download^='lists-']")?.getAttribute("download")).toBe("lists-2026-11-15.json");
    expect(document.activeElement).toBe(root.querySelector(act("backup-hide")));
    click(act("backup-hide"));
    expect(root.querySelector("#backup-text")).toBeNull();
  });

  it("restores into an empty device and says what was added", () => {
    seed(NOTES());
    mount();
    openPlaces();
    const id = cardButton("Bakery", "toggle-shortlist").dataset["value"];
    const backup = JSON.stringify({ format: "app-lists", version: 1, needs: { elevator: "yes" }, shortlist: [id, "gone-00000000"], checklist: { [id as string]: { elevator: { asked: true, answer: "Ask at desk" } } } });
    shell?.destroy();
    store = memoryStore();
    seed(NOTES());
    mount();
    openPlaces();
    const ta = root.querySelector<HTMLTextAreaElement>("#restore-text")!;
    ta.value = backup;
    click(act("backup-restore"));
    expect(root.querySelector("#restore-message")?.textContent).toBe("Restored: 1 must-have(s), 1 place(s) added to the shortlist, 1 note(s).");
    expect(JSON.parse(store.getItem(SHORTLIST_KEY) ?? "[]")).toEqual([id]);
    expect(JSON.parse(store.getItem(CHECKLIST_KEY) ?? "{}")[id as string].elevator.answer).toBe("Ask at desk");
    expect(cardButton("Bakery", "toggle-shortlist").textContent).toBe("Remove from shortlist");
  });

  it("explains unreadable text and changes nothing", () => {
    seed(NOTES());
    mount();
    openPlaces();
    for (const [text, expected] of [["", "Paste the backup text first."], ["{nope", "not a backup"], ['{"format":"app-notes"}', "not a backup of lists"]] as const) {
      root.querySelector<HTMLTextAreaElement>("#restore-text")!.value = text;
      click(act("backup-restore"));
      expect(root.querySelector("#restore-message")?.textContent).toContain(expected);
    }
    expect(store.getItem(SHORTLIST_KEY)).toBeNull();
    expect(store.getItem(NEEDS_KEY)).toBeNull();
  });

  it("has no audit or axe violations with the backup open, in both languages", async () => {
    for (const locale of ["en", "fr"]) {
      document.body.innerHTML = '<div id="app"></div>';
      root = document.getElementById("app") as HTMLElement;
      store = memoryStore();
      seed(NOTES());
      shell?.destroy();
      mount([locale]);
      openPlaces();
      click(act("backup-open"));
      root.querySelector<HTMLTextAreaElement>("#restore-text")!.value = "{nope";
      click(act("backup-restore"));
      const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false } } });
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), locale).toEqual([]);
      expect(audits.flat().map((v) => `${v.rule}: ${v.detail}`), locale).toEqual([]);
    }
  });
});
