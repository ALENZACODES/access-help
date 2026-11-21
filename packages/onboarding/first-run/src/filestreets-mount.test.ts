// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_STREETS_COPY as C, sortedText, streetsErrorText } from "./filestreets-copy";
import { mountFileStreets, type FileStreetsHandle } from "./filestreets-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { BOTH_SIDES_ID, ONLY_OPEN_ID, PEOPLE_ID, byRadioId } from "./views-filestreets";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const FILE = exportNotes(
  [
    testNote("k1", "Library", [{ key: "elevator", value: "yes" }], "100 King St W"),
    testNote("k2", "Café", [], "12 King Street West"),
    testNote("e1", "Bakery", [], "5 Elm Ave"),
    testNote("r1", "Pharmacie", [], "1 rue Principale"),
    testNote("n1", "Market", [], "Toronto"),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileStreetsHandle | undefined;
let audits: Violation[][];

beforeEach(() => {
  document.documentElement.lang = "en";
  document.body.innerHTML =
    '<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><div id="host"></div></main>';
  root = document.getElementById("host") as HTMLElement;
  audits = [];
  window.localStorage.clear();
});

afterEach(() => {
  handle?.destroy();
  handle = undefined;
});

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileStreetsHandle {
  document.documentElement.lang = locale;
  handle = mountFileStreets(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
  return handle;
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

const status = async (): Promise<string> => {
  await Promise.resolve();
  return document.querySelector('[role="status"][aria-live]')?.textContent ?? "";
};

const lastAudit = (): string[] => (audits.at(-1) ?? []).map((v) => `${v.rule}: ${v.detail}`);
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function read(text = FILE): void {
  $<HTMLTextAreaElement>("#fst-text").value = text;
  $<HTMLFormElement>("#fst-file-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function share(n: string): void {
  $<HTMLInputElement>(`#${PEOPLE_ID}`).value = n;
  $<HTMLFormElement>("#fst-options-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

const linkNamed = (label: string): HTMLAnchorElement | undefined => Array.from(root.querySelectorAll<HTMLAnchorElement>("a.linkbtn")).find((a) => a.textContent === label);

describe("sorting by street", () => {
  it("lists each street in house-number order and the places with no street, and announces the counts", async () => {
    mount();
    read();
    expect(document.activeElement?.id).toBe("fst-summary");
    expect(Array.from(root.querySelectorAll(".fst-groups h4")).map((h) => h.textContent)).toEqual(["Elm Avenue (1 place)", "King Street West (2 places)", "rue Principale (1 place)"]);
    expect(Array.from(root.querySelectorAll('[data-group="king street west"] li')).map((li) => li.textContent)).toEqual(["Café, 12 King Street West", "Library, 100 King St W"]);
    expect(root.querySelector(".fst-ungrouped")?.textContent).toBe("Market, Toronto");
    expect(await status()).toBe(sortedText(5, 3, 1, "en"));
    expect(lastAudit()).toEqual([]);
  });

  it("gives each street its own notes file and visit sheet, each link named for the street", () => {
    mount();
    read();
    const notes = linkNamed(`${C.downloadNotes.en} (King Street West)`);
    expect(notes).toBeDefined();
    const back = importNotes(decodeURIComponent((notes?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.map((n) => n.id)).toEqual(["k2", "k1"]);
    const sheet = linkNamed(`${C.downloadSheet.en} (King Street West)`);
    expect(decodeTextExportHref(sheet?.getAttribute("href") ?? "")).toContain("[ ] Café\n    12 King Street West");
  });

  it("names the problem when the text is not an export", () => {
    mount();
    read("nope");
    expect(document.activeElement?.id).toBe("fst-errors");
    expect($("#fst-errors").textContent).toContain(streetsErrorText("not-json", "en"));
    expect($("#fst-text").getAttribute("aria-invalid")).toBe("true");
    root.querySelector<HTMLAnchorElement>("#fst-errors a")?.click();
    expect(document.activeElement?.id).toBe("fst-text");
    expect(lastAudit()).toEqual([]);
  });
});

describe("sharing among people", () => {
  it("makes a list per person with whole streets, and announces the sizes", async () => {
    const h = mount();
    read();
    share("2");
    expect(h.options().people).toBe(2);
    expect(document.activeElement?.id).toBe("fst-lists");
    expect(Array.from(root.querySelectorAll(".fst-batches h4")).map((x) => x.textContent)).toEqual(["Person 1 (3 places)", "Person 2 (2 places)"]);
    expect(await status()).toBe(`${C.updated.en} Person 1: 3, Person 2: 2.`);
    expect(linkNamed(`${C.downloadNotes.en} (Person 2)`)).toBeDefined();
    expect(linkNamed(`${C.downloadSheet.en} (Person 1)`)).toBeDefined();
    expect(lastAudit()).toEqual([]);
  });

  it("refuses a number that is not 1 to 20, keeps what was typed and ties the error to the field", () => {
    const h = mount();
    read();
    share("25");
    expect(h.options().people).toBe(1);
    expect(document.activeElement?.id).toBe("fst-errors");
    const input = $<HTMLInputElement>(`#${PEOPLE_ID}`);
    expect(input.value).toBe("25");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(`h-${PEOPLE_ID} e-${PEOPLE_ID}`);
    root.querySelector<HTMLAnchorElement>(`#fst-errors a[href="#${PEOPLE_ID}"]`)?.click();
    expect(document.activeElement?.id).toBe(PEOPLE_ID);
    expect(lastAudit()).toEqual([]);
  });

  it("downloads every list as one text to print", () => {
    mount();
    read();
    share("2");
    const text = decodeTextExportHref(linkNamed(C.downloadAll.en)?.getAttribute("href") ?? "") ?? "";
    expect(text.match(/^Visit sheet: Person/gm)).toHaveLength(2);
  });

  it("goes back to one list per street with 1", () => {
    mount();
    read();
    share("3");
    share("1");
    expect(root.querySelector(".fst-batches")).toBeNull();
    expect(root.querySelectorAll(".fst-groups > li")).toHaveLength(3);
  });
});

describe("list options", () => {
  it("groups by postal area when chosen, and keeps the choice on screen", () => {
    const h = mount();
    read(
      exportNotes(
        [testNote("a", "Library", [], "100 King St W, Toronto, ON M5H 2N2"), testNote("b", "Pool", [], "9 Lake Rd, Kingston ON K7L 3N6"), testNote("c", "Kiosk", [], "5 Rink Rd")],
        "2026-11-01",
      ),
    );
    $<HTMLInputElement>(`#${byRadioId("postal")}`).checked = true;
    share("1");
    expect(h.options().by).toBe("postal");
    expect(Array.from(root.querySelectorAll(".fst-groups h4")).map((x) => x.textContent)).toEqual(["K7L (1 place)", "M5H (1 place)"]);
    expect($("#fst-ungrouped").textContent).toBe("Places with no postal code in the address (1)");
    expect($<HTMLInputElement>(`#${byRadioId("postal")}`).checked).toBe(true);
    expect(lastAudit()).toEqual([]);
  });

  it("walks one side of the street, then the other, when chosen", () => {
    const h = mount();
    read(exportNotes(["1", "2", "3", "4"].map((n) => testNote(`p${n}`, `Shop ${n}`, [], `${n} Elm Ave`)), "2026-11-01"));
    $<HTMLInputElement>(`#${BOTH_SIDES_ID}`).checked = true;
    share("1");
    expect(h.options().bothSides).toBe(true);
    expect(Array.from(root.querySelectorAll(".fst-groups li li")).map((li) => li.textContent?.split(",")[0])).toEqual(["Shop 1", "Shop 3", "Shop 4", "Shop 2"]);
  });

  it("keeps the other choices when the number of people is not valid", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${BOTH_SIDES_ID}`).checked = true;
    share("0");
    expect(h.options().bothSides).toBe(true);
    expect($<HTMLInputElement>(`#${BOTH_SIDES_ID}`).checked).toBe(true);
  });

  it("leaves out places with nothing to look at when asked, and says how many", () => {
    const h = mount();
    read(
      exportNotes(
        [
          testNote("d", "Done", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }, { key: "automatic-door", value: "no" }, { key: "accessible-washroom", value: "yes" }], "2 Elm Ave"),
          testNote("o", "Open", [], "4 Elm Ave"),
        ],
        "2026-11-01",
      ),
    );
    $<HTMLInputElement>(`#${ONLY_OPEN_ID}`).checked = true;
    share("1");
    expect(h.options().onlyOpen).toBe(true);
    expect($("#fst-summary").textContent).toBe("1 place on 1 street; 0 places with no street. 1 place with nothing to look at is left out.");
    expect(Array.from(root.querySelectorAll(".fst-groups li li")).map((li) => li.textContent?.split(",")[0])).toEqual(["Open"]);
    expect(lastAudit()).toEqual([]);
  });

  it("downloads every list as a CSV", () => {
    mount();
    read();
    share("2");
    const csv = decodeURIComponent((linkNamed(C.downloadCsv.en)?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(csv).toContain("list,group,house_number,place_name,address,no_record,reports_differ");
    expect(csv.split("\r\n").filter((x) => /^[12],/.test(x))).toHaveLength(5);
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>("#fst-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#fst-text").value).toBe(FILE);
    expect(h.file()).toBeUndefined();
    expect(await status()).toBe(C.opened.en);
  });

  it("refuses a file that is too large before reading it", async () => {
    let reads = 0;
    mount("en", () => {
      reads++;
      return Promise.resolve("");
    });
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    const input = $<HTMLInputElement>("#fst-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fst-errors").textContent).toContain(streetsErrorText("too-large", "en"));
  });

  it("switches to French and keeps the lists", () => {
    const h = mount();
    read();
    share("2");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fst-title").textContent).toBe(C.title.fr);
    expect(Array.from(root.querySelectorAll(".fst-batches h4")).map((x) => x.textContent)).toEqual(["Personne 1 (3 lieux)", "Personne 2 (2 lieux)"]);
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    $('[data-action="fst-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fst-text");
    expect(await status()).toBe(C.cleared.en);
    expect(window.localStorage.length).toBe(0);
    h.destroy();
    handle = undefined;
    expect(document.querySelectorAll('[role="status"][aria-live]')).toHaveLength(0);
  });
});

// One axe run per language and screen.
describe("axe", () => {
  it.each(["en", "fr"] as const)("passes on the empty form (%s)", async (l) => {
    mount(l);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the streets (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the lists per person with an error (%s)", async (l) => {
    mount(l);
    read();
    share("2");
    share("x");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });
});
